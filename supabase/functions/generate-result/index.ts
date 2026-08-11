import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLMWithFallback } from '../_shared/llm-fallback.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { cleanConversationText } from '../_shared/briefing-conversation-core.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are CTRL, writing a short future memory for a busy leader who just answered five questions.

Voice:
- Warm, direct and slightly curious. Treat them as a peer.
- Present tense, even when describing the future.
- Specific to what they said. Never invent company facts, motives, results or numbers.
- No corporate language, hype, clichés, therapy language, em dashes, exclamation marks or emoji.
- Keep human judgement and the final choice with the leader.

Return valid JSON only:
{"twelve_months":"60 to 90 words","three_years":"40 to 60 words"}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function clampPercent(value: unknown): number {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function fallback(answers: { q2: string; q4: string; q5: string }) {
  const time = answers.q2 === 'think' ? 'thinking clearly' : answers.q2 === 'do' ? 'doing the work only you should do' : answers.q2 === 'talk' ? 'having the conversations that move the business' : 'seeing what actually deserves your attention';
  const company = answers.q4 === 'leaner' ? 'smaller and sharper' : answers.q4 === 'hybrid' ? 'run by humans and agents as one team' : answers.q4 === 'autonomous' ? 'a system you direct rather than carry' : 'recognisably yours, only clearer';
  return {
    twelve_months: `A year from now, you have made the call on ${answers.q5}. Your week has room for ${time}, because the repeatable middle no longer waits for you. The work still feels like yours. Far less of it depends on you being everywhere at once.`,
    three_years: `Three years from now, the company is ${company}. The system handles more of the drag, but the choices that shape the business stay human. Your attention goes where judgement matters.`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? '').trim();
    const q2 = ['think', 'do', 'talk', 'watch'].includes(body?.answers?.q2) ? body.answers.q2 : null;
    const q4 = ['same', 'leaner', 'hybrid', 'autonomous'].includes(body?.answers?.q4) ? body.answers.q4 : null;
    const q5 = cleanConversationText(body?.answers?.q5, 800);
    const archetypeTitle = cleanConversationText(body?.archetype?.title, 240);
    const variant = body?.archetype?.variant === 'B' ? 'B' : 'A';
    if (!id || !q2 || !q4 || q5.length < 3 || !archetypeTitle) return json({ error: 'Incomplete answers' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    const rate = await checkRateLimit(
      { identifier: 'generate-onboarding-result', maxRequests: 4, windowMs: 60 * 60 * 1000 },
      id,
      admin,
    );
    if (!rate.allowed) return json({ error: 'Result already generated recently.' }, 429);

    const answers = { q1: clampPercent(body.answers.q1), q2, q3: clampPercent(body.answers.q3), q4, q5 };
    await admin.from('cannes_responses').update({
      q1_week_needs_me: answers.q1,
      q2_extra_self: q2,
      q3_company_ai: answers.q3,
      q4_company_future: q4,
      q5_decision: q5,
      archetype_title: archetypeTitle,
      archetype_variant: variant,
    }).eq('id', id);

    let prose = fallback(answers);
    let model: string | null = null;
    let usedFallback = true;
    try {
      const completion = await callLLMWithFallback({
        model: 'gpt-4o-mini',
        temperature: 0.55,
        max_tokens: 520,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `How much of the week needs them: ${answers.q1}/100\nExtra self spends time on: ${q2}\nHow much AI can handle: ${answers.q3}/100\nCompany they want: ${q4}\nDecision delayed: ${q5}\nArchetype: ${archetypeTitle}` },
        ],
      }, { useCache: false });
      const parsed = JSON.parse(completion.content || '{}');
      const twelve = cleanConversationText(parsed.twelve_months, 1200);
      const three = cleanConversationText(parsed.three_years, 900);
      if (twelve.length >= 80 && three.length >= 60) {
        prose = { twelve_months: twelve, three_years: three };
        usedFallback = false;
        model = completion.model;
      }
    } catch {
      // The deterministic result is complete and already grounded in their words.
    }

    await admin.from('cannes_responses').update({
      result_prose_12mo: prose.twelve_months,
      result_prose_3yr: prose.three_years,
    }).eq('id', id);
    return json({
      archetype_title: archetypeTitle,
      twelve_months: prose.twelve_months,
      three_years: prose.three_years,
      fallback: usedFallback,
      model,
    });
  } catch {
    return json({ error: 'I could not build that result just now.' }, 500);
  }
});
