/**
 * Cleanup Expired Data Edge Function
 *
 * Enforces data retention policies by cleaning up expired records.
 * Designed to be called via Supabase cron or external scheduler.
 *
 * Compliance: GDPR Art. 5(1)(e) - storage limitation principle
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isCronRequest, isServiceRequest } from '../_shared/service-request.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This endpoint deletes and redacts data, so it is server-to-server only.
    // It previously accepted any caller, which meant an unauthenticated POST
    // could force a retention sweep. pg_cron presents the Vault-held shared
    // secret; an operator presents the service role key.
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authorized =
      isServiceRequest(req.headers.get('Authorization'), serviceRoleKey) ||
      isCronRequest(req.headers.get('X-CTRL-Cron-Secret'), Deno.env.get('CTRL_CRON_SECRET') ?? '');
    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
    );

    const results: Record<string, unknown> = {};

    // 1. Clean up expired memories via existing DB function
    const { data: memoryCleanup, error: memoryError } = await supabase
      .rpc('cleanup_expired_memories');

    results.expired_memories = memoryError
      ? { error: memoryError.message }
      : { cleaned: memoryCleanup };

    // 2. Clean up expired AI cache entries (older than 7 days)
    const cacheExpiry = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: cacheCount, error: cacheError } = await supabase
      .from('ai_cache')
      .delete()
      .lt('expires_at', cacheExpiry)
      .select('*', { count: 'exact', head: true });

    results.expired_cache = cacheError
      ? { error: cacheError.message }
      : { cleaned: cacheCount || 0 };

    // 3. Redact expired evidence. Never deleted: a shipped provenance pointer
    //    must still resolve, to a truthful redacted state rather than a hole
    //    (CH-06). Emptying the quote is what removes the third party's words.
    const { data: redacted, error: redactError } = await supabase
      .from('evidence')
      .update({ quote: '', redacted_at: new Date().toISOString() })
      .lt('retention_expires_at', new Date().toISOString())
      .is('redacted_at', null)
      .select('id');

    results.redacted_evidence = redactError
      ? { error: redactError.message }
      : { redacted: redacted?.length || 0 };

    // 4. Log cleanup to audit
    await supabase.from('data_audit_log').insert({
      action_type: 'DELETE',
      table_name: 'RETENTION_CLEANUP',
      metadata: {
        results,
        run_at: new Date().toISOString(),
        trigger: 'scheduled',
      },
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: 'Cleanup failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
