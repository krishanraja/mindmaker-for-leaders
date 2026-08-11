import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callLLMWithFallback } from '../_shared/llm-fallback.ts';
import { createLogger } from '../_shared/logger.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { getUserContext } from '../_shared/user-context.ts';
import { ensureTentativeInsight, groundIndependentEvidence } from '../_shared/blind-spot-core.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = createLogger('blind-spot');

interface BlindSpotCandidate {
  insight: string;
  evidence: string[];
  question: string;
  experiment: string;
  confidence: number;
  insufficientEvidence: boolean;
}

const SYSTEM_PROMPT = `You are CTRL, a genuinely curious decision partner for a busy leader. Surface ONE possible leadership blind spot from the supplied facts.

This is reflection, not diagnosis. The user should feel seen, never judged.

Rules:
- Return valid JSON only.
- Use only the supplied facts. Never invent motives, company details, or behavior.
- Write tentatively: "I wonder if..." or "There may be...". Never state a personality label as fact.
- A blind spot is a recurring gap between intention and action, attention and importance, or delegation and control.
- Do not repeat a known strength as a weakness.
- Evidence must be two short paraphrases of supplied facts. If there are not two independent facts, set insufficient_evidence true.
- Give one curious question and one experiment that takes 15 minutes or less.
- No jargon, therapy language, management cliches, em dashes, or corporate tone.

Return exactly:
{
  "insight": "...",
  "evidence": ["...", "..."],
  "question": "...",
  "experiment": "...",
  "confidence": 0.0,
  "insufficient_evidence": false
}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clean(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function discoveryCandidate(): BlindSpotCandidate {
  return {
    insight: 'I do not know enough yet to call this a blind spot. Pretending otherwise would not help you.',
    evidence: [],
    question: 'What responsibility keeps finding its way back to you, even after you thought you had handed it over?',
    experiment: 'Take 10 minutes and name the last three times it came back. Look for the same reason in all three.',
    confidence: 0,
    insufficientEvidence: true,
  };
}

async function loadSourceFacts(admin: SupabaseClient, userId: string): Promise<string[]> {
  const [context, casesResult] = await Promise.all([
    getUserContext(admin, userId),
    admin
      .from('decision_cases')
      .select('statement, recommendation, confidence, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const decisionFacts = ((casesResult.data as Array<{ statement?: string; recommendation?: string }> | null) ?? [])
    .flatMap((item) => [item.statement, item.recommendation])
    .map((item) => clean(item, 500))
    .filter(Boolean);

  return [
    context.role && `Role: ${context.role}`,
    context.company && `Company: ${context.company}`,
    ...context.objectives.map((item) => `Objective: ${item}`),
    ...context.blockers.map((item) => `Blocker: ${item}`),
    ...context.recentDecisions.map((item) => `Decision: ${item}`),
    ...decisionFacts.map((item) => `Decision record: ${item}`),
    ...context.confirmedPatterns.map((item) => `Known pattern: ${item}`),
    ...context.strengths.map((item) => `Strength: ${item}`),
    ...context.weaknesses.map((item) => `Known gap: ${item}`),
  ].filter((item): item is string => Boolean(item));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId || userError) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'confirm' ? 'confirm' : 'generate';
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (action === 'confirm') {
      const insight = ensureTentativeInsight(clean(body?.candidate?.insight, 600));
      const evidence = Array.isArray(body?.candidate?.evidence)
        ? body.candidate.evidence.map((item: unknown) => clean(item, 240)).filter(Boolean).slice(0, 4)
        : [];
      const confidence = Math.min(1, Math.max(0, Number(body?.candidate?.confidence) || 0.5));
      if (insight.length < 12) return json({ error: 'Invalid blind spot' }, 400);

      // Never trust the client round-trip as proof. Re-ground the candidate
      // against the user's current facts, and keep the same two-independent-
      // anchors floor used during generation.
      const sourceFacts = await loadSourceFacts(admin, userId);
      const groundedEvidence = groundIndependentEvidence(evidence, sourceFacts);
      if (body?.candidate?.insufficientEvidence || groundedEvidence.length < 2) {
        return json({ error: 'This reflection needs more evidence before it can be saved.' }, 409);
      }

      const { data, error } = await admin.rpc('confirm_blind_spot_pattern', {
        p_user_id: userId,
        p_pattern_text: insight,
        p_evidence_count: groundedEvidence.length,
        p_confidence: confidence,
      });
      if (error) throw error;
      const confirmation = Array.isArray(data) ? data[0] : data;
      return json({
        ok: true,
        pattern_id: confirmation?.pattern_id,
        created: Boolean(confirmation?.created),
      });
    }

    const rate = await checkRateLimit(
      { identifier: 'blind-spot', maxRequests: 12, windowMs: 60 * 60 * 1000 },
      userId,
      admin,
    );
    if (!rate.allowed) return json({ error: 'Give this one a little time before asking again.' }, 429);

    const sourceFacts = await loadSourceFacts(admin, userId);

    if (sourceFacts.length < 2) return json({ candidate: discoveryCandidate(), source_count: sourceFacts.length });

    const excluded = Array.isArray(body?.exclude)
      ? body.exclude.map((item: unknown) => clean(item, 400)).filter(Boolean).slice(0, 3)
      : [];

    const completion = await callLLMWithFallback({
      model: 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 650,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `SUPPLIED FACTS:\n${sourceFacts.map((fact, index) => `${index + 1}. ${fact}`).join('\n')}\n\nDO NOT REPEAT:\n${excluded.length ? excluded.join('\n') : '(none)'}`,
        },
      ],
    }, { useCache: false });

    const parsed = JSON.parse(completion.content || '{}');
    const evidence = Array.isArray(parsed.evidence)
      ? parsed.evidence.map((item: unknown) => clean(item, 240)).filter(Boolean).slice(0, 2)
      : [];
    const groundedEvidence = groundIndependentEvidence(evidence, sourceFacts);
    const insufficient = Boolean(parsed.insufficient_evidence) || groundedEvidence.length < 2;

    const candidate: BlindSpotCandidate = insufficient
      ? discoveryCandidate()
      : {
          insight: ensureTentativeInsight(clean(parsed.insight, 600)),
          evidence: groundedEvidence,
          question: clean(parsed.question, 360),
          experiment: clean(parsed.experiment, 360),
          confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.6)),
          insufficientEvidence: false,
        };

    if (!candidate.insight || !candidate.question || !candidate.experiment) {
      return json({ candidate: discoveryCandidate(), source_count: sourceFacts.length });
    }

    return json({ candidate, source_count: sourceFacts.length, model: completion.model });
  } catch (error) {
    log.error('blind spot failed', { error });
    return json({ error: 'I could not look for a blind spot right now. Try again shortly.' }, 500);
  }
});
