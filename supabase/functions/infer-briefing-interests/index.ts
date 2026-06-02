/**
 * infer-briefing-interests
 *
 * Reads `user_memory` and proposes briefing interests so users never get asked
 * twice. High-confidence inferences (>= 0.85) are auto-added to
 * `briefing_interests`. Medium-confidence (0.55..0.85) land in
 * `suggested_briefing_interests` for one-tap accept/dismiss on the Briefing
 * tab. Below 0.55 are discarded.
 *
 * Trigger surfaces:
 *   - `extract-user-context` calls this fire-and-forget after storing facts.
 *   - Daily Postgres cron (configured separately) for drift correction.
 *   - On-demand from the client when the user has < 3 active interests.
 *
 * Idempotent: skips any (kind, lower(text)) already present in either table.
 *
 * Auth: accepts a user JWT (preferred) or service-role with explicit
 * `target_user_id` body param (used by cron).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { fetchWithTimeout, ProviderUnavailableError } from '../_shared/with-timeout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AUTO_THRESHOLD = 0.85;
const SUGGEST_THRESHOLD = 0.55;
const MAX_FACTS_INPUT = 80;
const MAX_OUTPUT_PER_KIND = 8;

interface InferredItem {
  kind: 'beat' | 'entity' | 'exclude';
  text: string;
  confidence: number;
  reason?: string;
}

interface InferenceResult {
  beats: InferredItem[];
  entities: InferredItem[];
  excludes: InferredItem[];
}

const SYSTEM_PROMPT = `You translate a leader's stored profile facts into briefing interests so we never have to ask them the same question twice.

You output THREE lists:
- beats: broad topics they would want news about (e.g., "AI agent infrastructure", "fintech regulation", "supply chain disruption").
- entities: specific people, companies, products, or competitors they care about (e.g., "Anthropic", "Stripe", "OpenAI", a specific competitor).
- excludes: topics they have explicitly rejected or that are clearly off-pattern (e.g., crypto for a healthcare exec who said "no crypto").

Rules:
- Be conservative. Confidence < 0.55 means "do not include".
- Confidence >= 0.85 only when the fact directly maps (e.g., "company is a Series B fintech" -> entity: company name 0.95, beat: "fintech funding" 0.9).
- Use medium confidence (0.55-0.85) for adjacent inferences ("CEO at fintech" -> beat: "founder leadership lessons" 0.7).
- NEVER invent facts. NEVER include style instructions (e.g., "shorter briefings"). Those are directives, not interests.
- Keep text short (<= 4 words for beats, <= 3 words for entities). Title case.
- Max 8 items per list. Prefer quality over quantity.
- "reason" must cite the specific fact_key it came from, e.g., "from business.industry: fintech".

Output STRICT JSON:
{ "beats": [{ "text": "...", "confidence": 0.0, "reason": "..." }], "entities": [...], "excludes": [...] }`;

async function callInference(facts: Array<Record<string, unknown>>, openaiKey: string): Promise<InferenceResult> {
  const factSummary = facts
    .map(
      (f) =>
        `[${f.fact_category}] ${f.fact_key} = ${f.fact_value}${f.fact_context ? ` (${f.fact_context})` : ''} [conf=${f.confidence_score}]`,
    )
    .join('\n');

  let response: Response;
  try {
    response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Here are the leader's stored facts. Infer their briefing interests.\n\n${factSummary}`,
          },
        ],
      }),
      provider: 'openai',
      timeoutMs: 12000,
    });
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      throw new Error(`OpenAI inference unavailable: ${err.message}`);
    }
    throw err;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI inference failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw) as Partial<InferenceResult>;

  const normalize = (arr: InferredItem[] | undefined, kind: InferredItem['kind']): InferredItem[] =>
    (arr ?? [])
      .filter((it) => it && typeof it.text === 'string' && it.text.trim().length > 0)
      .map((it) => ({
        kind,
        text: it.text.trim(),
        confidence: typeof it.confidence === 'number' ? Math.max(0, Math.min(1, it.confidence)) : 0,
        reason: it.reason?.trim() || undefined,
      }))
      .slice(0, MAX_OUTPUT_PER_KIND);

  return {
    beats: normalize(parsed.beats, 'beat'),
    entities: normalize(parsed.entities, 'entity'),
    excludes: normalize(parsed.excludes, 'exclude'),
  };
}

async function inferForUser(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: facts, error: factsError } = await supabase
    .from('user_memory')
    .select('fact_key, fact_category, fact_label, fact_value, fact_context, confidence_score, verification_status')
    .eq('user_id', userId)
    .eq('is_current', true)
    .in('verification_status', ['verified', 'inferred'])
    .order('confidence_score', { ascending: false })
    .limit(MAX_FACTS_INPUT);

  if (factsError) throw factsError;
  if (!facts || facts.length === 0) {
    return { auto_added: 0, suggested: 0, skipped: 0, reason: 'no_facts' };
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

  const inferred = await callInference(facts, openaiKey);
  const all: InferredItem[] = [...inferred.beats, ...inferred.entities, ...inferred.excludes];

  const [{ data: existingInterests }, { data: existingSuggested }] = await Promise.all([
    supabase
      .from('briefing_interests')
      .select('kind, text')
      .eq('user_id', userId),
    supabase
      .from('suggested_briefing_interests')
      .select('kind, text')
      .eq('user_id', userId)
      .is('dismissed_at', null),
  ]);

  const seen = new Set<string>();
  const key = (kind: string, text: string) => `${kind}::${text.toLowerCase().trim()}`;
  for (const row of (existingInterests ?? []) as Array<{ kind: string; text: string }>) {
    seen.add(key(row.kind, row.text));
  }
  for (const row of (existingSuggested ?? []) as Array<{ kind: string; text: string }>) {
    seen.add(key(row.kind, row.text));
  }

  const autoRows: Array<Record<string, unknown>> = [];
  const suggestedRows: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (const item of all) {
    const k = key(item.kind, item.text);
    if (seen.has(k)) {
      skipped++;
      continue;
    }
    seen.add(k);

    if (item.confidence >= AUTO_THRESHOLD) {
      autoRows.push({
        user_id: userId,
        kind: item.kind,
        text: item.text,
        weight: Math.max(1.0, item.confidence),
        source: 'inferred_auto',
        is_active: true,
      });
    } else if (item.confidence >= SUGGEST_THRESHOLD) {
      suggestedRows.push({
        user_id: userId,
        kind: item.kind,
        text: item.text,
        confidence: item.confidence,
        reason: item.reason ?? null,
        source: 'inferred_suggested',
      });
    } else {
      skipped++;
    }
  }

  if (autoRows.length > 0) {
    const { error } = await supabase.from('briefing_interests').insert(autoRows);
    if (error) console.error('Auto-insert briefing_interests failed:', error);
  }
  if (suggestedRows.length > 0) {
    const { error } = await supabase.from('suggested_briefing_interests').insert(suggestedRows);
    if (error) console.error('Insert suggested_briefing_interests failed:', error);
  }

  return {
    auto_added: autoRows.length,
    suggested: suggestedRows.length,
    skipped,
    facts_considered: facts.length,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    let userId: string | null = null;
    let body: { target_user_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser(token);
      if (userData?.user) userId = userData.user.id;
    }

    if (!userId && body.target_user_id) {
      userId = body.target_user_id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const result = await inferForUser(supabase, userId);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('infer-briefing-interests error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
