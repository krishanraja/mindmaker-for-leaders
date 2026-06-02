/**
 * nudge-briefing
 *
 * Voice-steering for the Briefing tab. User says something short like
 * "less Stripe", "more on Anthropic funding", or "make it shorter". We
 * classify the utterance and apply the right side-effect immediately so the
 * UI can show a confirmation toast.
 *
 * Output actions:
 *   - add_interest    -> insert briefing_interests (kind=beat|entity)
 *   - add_exclude     -> insert briefing_interests (kind=exclude)
 *   - add_directive   -> upsert user_briefing_directives.body
 *   - request_custom  -> caller should open custom briefing flow with a prompt
 *
 * Returns immediately. Heavy regen happens lazily (next briefing pull).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'add_interest' | 'add_exclude' | 'add_directive' | 'request_custom' | 'noop';

interface ClassifierOutput {
  action: Action;
  kind?: 'beat' | 'entity';
  text?: string;
  reason?: string;
  directive_text?: string;
  custom_prompt?: string;
}

const SYSTEM_PROMPT = `You classify a leader's short voice nudge about their daily news briefing into one structured action.

Possible actions:
- "add_interest": user wants MORE of a topic or entity. Choose kind="entity" for specific people/companies/products, or kind="beat" for topics. Provide concise text (<= 4 words for beats, <= 3 for entities, Title Case).
- "add_exclude": user wants LESS of something. Provide text identifying what to drop.
- "add_directive": user gave a STYLE/FORMAT rule for future briefings (e.g., "keep it under 3 minutes", "no jargon", "always lead with risk"). Put the rule in directive_text as a clean imperative sentence.
- "request_custom": user asked for a one-off briefing on a specific topic right now (e.g., "give me a deep dive on Anthropic funding"). Put the topic in custom_prompt.
- "noop": utterance unclear, ambiguous, or not actionable.

Output STRICT JSON: { "action": "...", "kind": "...", "text": "...", "reason": "...", "directive_text": "...", "custom_prompt": "..." }
Only include fields relevant to the chosen action. Never invent specifics the user didn't say.`;

async function classify(transcript: string, openaiKey: string): Promise<ClassifierOutput> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Utterance: "${transcript.trim()}"` },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Classifier failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw) as ClassifierOutput;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const transcript: string = (body.transcript || '').trim();
    const briefingId: string | null = body.briefing_id || null;

    if (!transcript) {
      return new Response(JSON.stringify({ error: 'transcript required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

    const cls = await classify(transcript, openaiKey);
    const supabase = createClient(supabaseUrl, serviceKey);
    let applied = false;
    let message = "Got it.";
    let customPrompt: string | undefined;
    const payload: Record<string, unknown> = {};

    switch (cls.action) {
      case 'add_interest': {
        if (cls.text && (cls.kind === 'beat' || cls.kind === 'entity')) {
          const { error } = await supabase.from('briefing_interests').insert({
            user_id: userId,
            kind: cls.kind,
            text: cls.text,
            weight: 1.5,
            source: 'manual',
            is_active: true,
          });
          applied = !error;
          payload.kind = cls.kind;
          payload.text = cls.text;
          message = `Added "${cls.text}" to your briefing.`;
        }
        break;
      }
      case 'add_exclude': {
        if (cls.text) {
          const { error } = await supabase.from('briefing_interests').insert({
            user_id: userId,
            kind: 'exclude',
            text: cls.text,
            weight: 1.0,
            source: 'manual',
            is_active: true,
          });
          applied = !error;
          payload.text = cls.text;
          message = `Got it - dropped ${cls.text}.`;
        }
        break;
      }
      case 'add_directive': {
        const text = (cls.directive_text || '').trim();
        if (text) {
          const { data: existing } = await supabase
            .from('user_briefing_directives')
            .select('body')
            .eq('user_id', userId)
            .maybeSingle();
          const nextBody = existing?.body ? `${existing.body.trim()}\n${text}` : text;
          const { error } = await supabase
            .from('user_briefing_directives')
            .upsert({ user_id: userId, body: nextBody, updated_at: new Date().toISOString() });
          applied = !error;
          payload.directive_text = text;
          message = `New rule saved: ${text}`;
        }
        break;
      }
      case 'request_custom': {
        customPrompt = cls.custom_prompt || transcript;
        payload.custom_prompt = customPrompt;
        applied = true;
        message = `Pulling a deep dive on that.`;
        break;
      }
      case 'noop':
      default:
        message = "Didn't catch that.";
        break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: cls.action,
        applied,
        message,
        custom_prompt: customPrompt,
        payload,
        briefing_id: briefingId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('nudge-briefing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
