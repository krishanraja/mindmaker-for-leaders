/**
 * One-off backfill: strip third-party names already stored in Memory.
 *
 * Extraction now refuses to write another person's name, but rows written
 * before that change still hold them. Until this has run, CTRL cannot
 * truthfully say it holds personal data about its user and about nobody
 * else, so the claim is gated on this function completing.
 *
 * Reuses the exact transform the write path uses, rather than reimplementing
 * the rules in SQL, so the two can never drift apart.
 *
 * Dry run by default. Pass {"apply": true} to write. Service role only.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isServiceRequest } from '../_shared/service-request.ts';
import { loadGlobalTraining } from '../_shared/training-loader.ts';
import { pseudonymiseThirdParties } from '../_shared/guardrails-core.ts';
import { encrypt } from '../_shared/memory-crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!isServiceRequest(req.headers.get('Authorization'), serviceRoleKey)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const apply = body?.apply === true;

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey);
    const training = await loadGlobalTraining(supabase);

    let offset = 0;
    let scanned = 0;
    let changed = 0;
    const samples: Array<{ id: string; before: string; after: string }> = [];

    for (;;) {
      const { data: rows, error } = await supabase
        .from('user_memory')
        .select('id, user_id, fact_value, fact_context')
        .order('created_at', { ascending: true })
        .range(offset, offset + BATCH - 1);

      if (error) throw error;
      if (!rows || rows.length === 0) break;

      for (const row of rows) {
        scanned += 1;
        const value = pseudonymiseThirdParties(row.fact_value ?? '', training);
        const context = pseudonymiseThirdParties(row.fact_context ?? '', training);
        if (value.replacements + context.replacements === 0) continue;

        changed += 1;
        if (samples.length < 20) {
          samples.push({ id: row.id, before: row.fact_value ?? '', after: value.text });
        }
        if (!apply) continue;

        // Keep the encrypted shadow in step with the plaintext it mirrors.
        // Leaving it stale would preserve the removed name in ciphertext,
        // which defeats the point of the sweep.
        const { ciphertext, iv } = await encrypt(
          JSON.stringify({ fact_value: value.text, fact_context: context.text }),
        );

        const { error: updateError } = await supabase
          .from('user_memory')
          .update({
            fact_value: value.text,
            fact_context: context.text,
            encrypted_content: JSON.stringify({ ciphertext, iv }),
            encryption_version: 1,
          })
          .eq('id', row.id);

        if (updateError) {
          console.error(`backfill-pseudonymise: row ${row.id} failed`, updateError.message);
          continue;
        }

        // Records that a change happened without restating the removed name.
        await supabase.from('fact_extraction_log').insert({
          user_id: row.user_id,
          session_id: null,
          raw_fact: { fact_key: 'backfill_pseudonymise', memory_id: row.id },
          reason_id: 'third_party_pseudonymised',
          reason: 'third-party name replaced with role during backfill',
          training_material_version: training.version,
        }).then(() => {}, () => {});
      }

      if (rows.length < BATCH) break;
      offset += BATCH;
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: apply ? 'applied' : 'dry-run',
        scanned,
        changed,
        samples,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('backfill-pseudonymise error:', error);
    return new Response(
      JSON.stringify({ error: 'Backfill failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
