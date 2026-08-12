import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { strongestOnboardingLane } from '../_shared/onboarding-lens.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? '').trim();
  const destination = body?.destination === 'ctrl' ? 'ctrl' : null;
  if (!id || !destination) return json({ error: 'Invalid handoff' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  await admin.from('cannes_responses').update({
    fork_choice: destination,
    fork_clicked_at: new Date().toISOString(),
    entry_variant: body?.variant === 'decide' ? 'decide' : null,
  }).eq('id', id);

  if (body?.consent !== true) return json({ ok: true, handoff: null });
  const { data: row } = await admin
    .from('cannes_responses')
    .select('entry_variant, q2_extra_self, q4_company_future, q5_decision, archetype_title, company_domain, enrichment_name, enrichment_role, enrichment_company, enrichment_company_blurb, resolved_linkedin_url, company_context, enrichment_signals, providers_hit, enrichment_status')
    .eq('id', id)
    .maybeSingle();
  if (!row) return json({ ok: true, handoff: null });

  const dossierConfirmed = body?.dossier_confirmed === true && row.enrichment_status === 'ready';
  const confirmedAt = dossierConfirmed ? new Date().toISOString() : null;
  if (dossierConfirmed) {
    await admin.from('cannes_responses').update({ dossier_confirmed_at: confirmedAt }).eq('id', id);
  }
  const signals = dossierConfirmed && Array.isArray(row.enrichment_signals)
    ? row.enrichment_signals.slice(0, 3)
    : [];

  const idempotencyKey = `${id}:ctrl`;
  const { data: handoff, error } = await admin.from('portfolio_handoff').upsert({
    source: 'ctrl_onboarding',
    source_response_id: id,
    entry_variant: row.entry_variant,
    q2: row.q2_extra_self,
    q4: row.q4_company_future,
    anxiety_lane: strongestOnboardingLane({
      q5: row.q5_decision,
      q2: row.q2_extra_self,
      q4: row.q4_company_future,
    }),
    company_domain: dossierConfirmed ? row.company_domain : null,
    person_name: dossierConfirmed ? row.enrichment_name : null,
    role_title: dossierConfirmed ? row.enrichment_role : null,
    linkedin_url: dossierConfirmed ? row.resolved_linkedin_url : null,
    company_name: dossierConfirmed ? row.enrichment_company : null,
    company_summary: dossierConfirmed ? row.enrichment_company_blurb : null,
    company_logo_url: dossierConfirmed ? row.company_context?.logoUrl ?? null : null,
    company_signals: signals,
    dossier_strength: dossierConfirmed ? {
      providerCount: Array.isArray(row.providers_hit) ? row.providers_hit.length : 0,
      signalCount: signals.length,
      verifiedSignalCount: signals.filter((signal: { verified?: boolean }) => signal?.verified === true).length,
    } : {},
    dossier_confirmed_at: confirmedAt,
    archetype_title: row.archetype_title,
    destination,
    idempotency_key: idempotencyKey,
  }, { onConflict: 'idempotency_key' }).select('id').single();
  if (error) return json({ ok: true, handoff: null });
  return json({ ok: true, handoff: handoff?.id ?? null });
});
