/**
 * Delete Account Edge Function
 *
 * Server-side account deletion for GDPR Art. 17 (Right to Erasure).
 * Performs cascading deletion of all user data with full audit trail.
 *
 * Requires authenticated user JWT.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user-scoped client to verify identity
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;

    // Verify confirmation email matches (extra safety)
    const body = await req.json().catch(() => ({}));
    if (body.confirmEmail && body.confirmEmail.toLowerCase() !== userEmail?.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Email confirmation does not match' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for deletions (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Log deletion request to security audit
    await supabaseAdmin.from('security_audit_log').insert({
      action: 'ACCOUNT_DELETION_REQUESTED',
      resource_type: 'user',
      resource_id: userId,
      user_id: userId,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      details: { email: userEmail, timestamp: new Date().toISOString() },
    }).then(() => {}, () => {});

    const deletionErrors: string[] = [];

    // 1. Delete assessment-related data (respecting FK constraints).
    //
    // Bug fix during the data-path audit: this code previously filtered on
    // `owner_user_id`, a column that doesn't exist on leader_assessments.
    // The real ownership chain is leader_assessments → leaders → user_id
    // (or leaders.email = auth.users.email for older rows). Without this
    // fix, assessment cleanup silently failed for every account deletion
    // since the rename - orphaned PII left behind. The leader_assessments
    // FK is ON DELETE CASCADE, so deleting the leaders row at step 4 will
    // remove assessments transitively, but we still want explicit child
    // deletion here to avoid relying solely on cascade and to keep the
    // audit log accurate.
    const { data: leaderRows } = await supabaseAdmin
      .from('leaders')
      .select('id')
      .eq('user_id', userId);
    const leaderIds = (leaderRows ?? []).map((l: { id: string }) => l.id);

    if (leaderIds.length > 0) {
      const { data: assessments } = await supabaseAdmin
        .from('leader_assessments')
        .select('id')
        .in('leader_id', leaderIds);

      if (assessments?.length) {
        const assessmentIds = assessments.map((a: { id: string }) => a.id);

        const childDeletes = await Promise.allSettled([
          supabaseAdmin.from('leader_dimension_scores').delete().in('assessment_id', assessmentIds),
          supabaseAdmin.from('leader_risk_signals').delete().in('assessment_id', assessmentIds),
          supabaseAdmin.from('leader_tensions').delete().in('assessment_id', assessmentIds),
          supabaseAdmin.from('leader_org_scenarios').delete().in('assessment_id', assessmentIds),
          supabaseAdmin.from('leader_first_moves').delete().in('assessment_id', assessmentIds),
          supabaseAdmin.from('leader_prompt_sets').delete().in('assessment_id', assessmentIds),
        ]);

        childDeletes.forEach((result, i) => {
          if (result.status === 'rejected') {
            deletionErrors.push(`assessment_child_${i}: ${result.reason}`);
          }
        });

        const { error: assessmentError } = await supabaseAdmin
          .from('leader_assessments')
          .delete()
          .in('leader_id', leaderIds);
        if (assessmentError) deletionErrors.push(`leader_assessments: ${assessmentError.message}`);
      }
    }

    // 2. Delete user data tables
    const userDataDeletes = await Promise.allSettled([
      supabaseAdmin.from('user_memory').delete().eq('user_id', userId),
      supabaseAdmin.from('user_memory_settings').delete().eq('user_id', userId),
      supabaseAdmin.from('user_patterns').delete().eq('user_id', userId),
      supabaseAdmin.from('user_decisions').delete().eq('user_id', userId),
      supabaseAdmin.from('weekly_checkins').delete().eq('user_id', userId),
      supabaseAdmin.from('ai_conversations').delete().eq('user_id', userId),
      supabaseAdmin.from('conversation_sessions').delete().eq('user_id', userId),
      supabaseAdmin.from('notification_preferences').delete().eq('user_id', userId),
      supabaseAdmin.from('leader_missions').delete().eq('user_id', userId),
      supabaseAdmin.from('briefings').delete().eq('user_id', userId),
      // Briefing-side tables added in the audit data-path pass; tolerate
      // the table being absent on older deployments via .catch on the .from
      // chain (Supabase returns the error in the result, not as a throw).
      supabaseAdmin.from('briefing_interests').delete().eq('user_id', userId),
      supabaseAdmin.from('suggested_briefing_interests').delete().eq('user_id', userId),
    ]);

    userDataDeletes.forEach((result, i) => {
      if (result.status === 'rejected') {
        deletionErrors.push(`user_data_${i}: ${result.reason}`);
      }
    });

    // 2b. Comprehensive sweep of every remaining user-owned table.
    //
    // GDPR Art. 17 completeness: the explicit lists above missed ~22 tables
    // that carry a user_id and hold personal data (conversations, business
    // context, Edge profiles, generated artifacts, decision history, etc.).
    // We sweep them all here so erasure is actually complete. Run twice so
    // that rows freed by the first pass (FK children) let parents delete on
    // the second pass. Audit/consent tables are deliberately excluded - they
    // are the evidence of the erasure itself, retained under Art. 17(3)(b).
    const sweepTables = [
      'ai_insights_generated', 'booking_requests', 'briefing_lens_feedback',
      'chat_messages', 'constructs', 'conversion_analytics', 'criteria',
      'decision_alerts', 'decision_cases',
      'decision_claims', 'decision_events', 'decision_evidence', 'decision_tensions',
      'edge_actions', 'edge_feedback', 'edge_profiles', 'edge_subscriptions',
      'engagement_analytics', 'evidence', 'evidence_sources',
      'fact_extraction_log', 'feedback', 'generated_artifacts',
      'harness_runs', 'index_participant_data', 'ledger',
      'lead_qualification_scores', 'lead_qualifications',
      'llm_call_log', 'prompt_library_profiles', 'proposals', 'roi_actuals',
      'skill_exports', 'skill_provenance', 'sort_grades', 'sort_items',
      'training_material', 'user_briefing_directives', 'user_business_context',
      'user_memory_budget', 'user_roles', 'velocity_events',
    ];
    for (let pass = 0; pass < 2; pass++) {
      const results = await Promise.allSettled(
        sweepTables.map((t) => supabaseAdmin.from(t).delete().eq('user_id', userId)),
      );
      if (pass === 1) {
        results.forEach((r, i) => {
          if (r.status === 'rejected') deletionErrors.push(`sweep_${sweepTables[i]}: ${r.reason}`);
          else if (r.value?.error) deletionErrors.push(`sweep_${sweepTables[i]}: ${r.value.error.message}`);
        });
      }
    }

    // 2c. Identity tables keyed by email / surrogate id rather than user_id.
    // unified_profiles uses a random uuid PK matched on email; profile_insights
    // hangs off it via profile_id.
    if (userEmail) {
      const { data: upRows } = await supabaseAdmin
        .from('unified_profiles')
        .select('id')
        .eq('email', userEmail);
      const upIds = (upRows ?? []).map((r: { id: string }) => r.id);
      if (upIds.length > 0) {
        const { error: piErr } = await supabaseAdmin.from('profile_insights').delete().in('profile_id', upIds);
        if (piErr) deletionErrors.push(`profile_insights: ${piErr.message}`);
        const { error: upErr } = await supabaseAdmin.from('unified_profiles').delete().in('id', upIds);
        if (upErr) deletionErrors.push(`unified_profiles: ${upErr.message}`);
      }
    }

    // 2d. The profiles row (holds email + edge_delivery_email), keyed by id.
    const { error: profilesRowErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (profilesRowErr) deletionErrors.push(`profiles: ${profilesRowErr.message}`);

    // 3. Purge Storage. Audio briefings frequently contain the leader's
    // spoken name, company, and strategic decisions - they are PII. The DB
    // delete above already removed the briefings rows, but the underlying
    // MP3s in the ctrl-briefings bucket would otherwise survive forever
    // (GDPR Art. 17 violation). Same logic applies to any uploaded files
    // in the `documents` bucket.
    //
    // Path convention: <user_id>/... so we list the user's folder and
    // remove every object found. Best-effort: a partial purge logs an
    // error but doesn't fail the deletion request - the audit log captures
    // it for follow-up.
    const purgeBucket = async (bucket: string): Promise<string | null> => {
      try {
        const { data: files, error: listErr } = await supabaseAdmin.storage
          .from(bucket)
          .list(userId, { limit: 1000 });
        if (listErr) return `${bucket}: list failed - ${listErr.message}`;
        if (!files || files.length === 0) return null;
        const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
        const { error: removeErr } = await supabaseAdmin.storage
          .from(bucket)
          .remove(paths);
        if (removeErr) return `${bucket}: remove failed - ${removeErr.message}`;
        console.log(`Purged ${paths.length} object(s) from ${bucket} for ${userId}`);
        return null;
      } catch (e) {
        return `${bucket}: ${e instanceof Error ? e.message : String(e)}`;
      }
    };

    for (const bucket of ['ctrl-briefings', 'documents']) {
      const err = await purgeBucket(bucket);
      if (err) deletionErrors.push(`storage_${bucket}: ${err}`);
    }

    // 4. Delete profile last (FK parent)
    const { error: profileError } = await supabaseAdmin
      .from('leaders')
      .delete()
      .eq('user_id', userId);
    if (profileError) deletionErrors.push(`leaders: ${profileError.message}`);

    // 5. Log successful deletion to audit
    await supabaseAdmin.from('data_audit_log').insert({
      user_id: userId,
      action_type: 'DELETE',
      table_name: 'ALL_USER_DATA',
      metadata: {
        email: userEmail,
        deletion_errors: deletionErrors.length > 0 ? deletionErrors : null,
        completed_at: new Date().toISOString(),
      },
    }).then(() => {}, () => {});

    // Log completion to security audit
    await supabaseAdmin.from('security_audit_log').insert({
      action: 'ACCOUNT_DELETION_COMPLETED',
      resource_type: 'user',
      resource_id: userId,
      user_id: userId,
      details: {
        email: userEmail,
        errors: deletionErrors.length > 0 ? deletionErrors : null,
        completed_at: new Date().toISOString(),
      },
    }).then(() => {}, () => {});

    // 6. Delete the auth identity itself. Without this the user's email
    // survives in auth.users and they could still sign in - the data was
    // gone but the account was not. This is the actual "erasure". Done last,
    // after the audit rows are written, so those inserts still reference a
    // valid user id.
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      deletionErrors.push(`auth_user: ${authDeleteError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account and all associated data have been deleted',
        errors: deletionErrors.length > 0 ? deletionErrors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Account deletion error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete account. Please contact support.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
