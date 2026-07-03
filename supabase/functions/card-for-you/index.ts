// card-for-you - the personalized read behind a Home news card.
//
// Given one story (headline + summary + take + category), reads it through
// THIS leader's real brain context (role, company, industry, objectives,
// blockers, recent decisions via _shared/user-context.ts) and returns a
// short, specific "how this applies to your business / role" paragraph in
// the chief-of-staff voice. Grounded ONLY in facts the brain actually holds -
// the prompt forbids invented specifics. The client caches per card and
// falls back to a deterministic line if this call fails, so the sheet never
// blocks on us.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchWithTimeout, ProviderUnavailableError } from '../_shared/with-timeout.ts';
import { createLogger } from '../_shared/logger.ts';
import { getUserContext } from '../_shared/user-context.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = createLogger('card-for-you');

const SYSTEM_PROMPT = `You are CTRL, a business leader's AI-native chief of staff. Given ONE news story and what you genuinely know about the leader, write how this story applies to THEIR business and role.

RULES:
- 2-3 sentences, 60 words maximum. Direct, warm, advisory, first person ("I'd...").
- Ground EVERY claim in the provided leader facts. If a fact is not provided, do not invent it. Never fabricate company names, numbers, team details, or initiatives.
- If the leader context is thin, stay honest: apply the story to their role or industry in general terms rather than pretending to know specifics.
- Plain language a non-technical leader gets instantly. No jargon, no hedging filler, no em dashes (use hyphens).
- Lead with the implication, not a restatement of the story.

Return JSON: {"for_you": "..."}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { headline, say, pov, category, source } = await req.json();
    if (!headline || typeof headline !== 'string') {
      return new Response(JSON.stringify({ error: 'headline is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId || userErr) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Light per-user cap: the client caches per card, so normal use is a few
    // calls a day; this only blunts an abusive loop.
    const rate = await checkRateLimit(
      { identifier: 'card-for-you', maxRequests: 60, windowMs: 60 * 60 * 1000 },
      userId,
      admin,
    );
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limited' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ctx = await getUserContext(admin, userId);
    const leaderFacts = [
      ctx.role && `Role: ${ctx.role}`,
      ctx.company && `Company: ${ctx.company}`,
      ctx.industry && `Industry: ${ctx.industry}`,
      ctx.teamSize && `Team size: ${ctx.teamSize}`,
      ctx.objectives.length > 0 && `Current objectives: ${ctx.objectives.slice(0, 3).join('; ')}`,
      ctx.blockers.length > 0 && `Known blockers: ${ctx.blockers.slice(0, 2).join('; ')}`,
      ctx.recentDecisions.length > 0 && `Recent decisions weighed: ${ctx.recentDecisions.slice(0, 2).join('; ')}`,
    ].filter(Boolean).join('\n');

    const storyBits = [
      `Headline: ${headline}`,
      say && `Summary: ${say}`,
      pov && `Editorial take: ${pov}`,
      category && `Category: ${category}`,
      source && `Source: ${source}`,
    ].filter(Boolean).join('\n');

    let response: Response;
    try {
      response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `THE STORY:\n${storyBits}\n\nWHAT I KNOW ABOUT THE LEADER:\n${leaderFacts || '(almost nothing yet - keep it honest and role-general)'}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
          max_tokens: 220,
        }),
        provider: 'OpenAI',
        timeoutMs: 10000,
      });
    } catch (err) {
      if (err instanceof ProviderUnavailableError) log.error('OpenAI timeout', { error: err.message });
      else log.error('OpenAI fetch error', { error: err });
      return new Response(JSON.stringify({ error: 'generation failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      log.error('OpenAI API error', { status: response.status });
      return new Response(JSON.stringify({ error: 'generation failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let forYou = '';
    try {
      forYou = String(JSON.parse(data.choices?.[0]?.message?.content ?? '{}').for_you ?? '').trim();
    } catch { /* fall through to the empty check */ }
    // House style + honesty floor: no em dashes; never return an empty line.
    forYou = forYou.replace(/[\u2014\u2013]/g, '-');
    if (!forYou) {
      return new Response(JSON.stringify({ error: 'empty generation' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ for_you: forYou }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    log.error('card-for-you error', { error: err });
    return new Response(JSON.stringify({ error: 'unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
