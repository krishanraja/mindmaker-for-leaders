/**
 * extract-voice-profile
 *
 * The voice "power path" (Appendix A copy-paste extraction). The leader pastes
 * a few things they have actually written; we derive the 8-dimension voice
 * profile in one LLM pass - richer than self-identification because it is read
 * from real behaviour, with zero manual markdown editing.
 *
 * Returns the structured profile JSON (NOT saved server-side). The client saves
 * it via useVoiceProfile, so this works for anonymous kit sessions on the same
 * auth.uid() as well as full accounts. The pasted text is never stored here; we
 * extract the pattern and hand back only the derived dimensions plus a trimmed
 * sample the leader can choose to keep.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { selectModel } from "../_shared/openai-utils.ts";
import { callLLMWithFallback, providerFromModel } from "../_shared/llm-fallback.ts";
import { recordAiUsage } from "../_shared/ai-usage.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("extract-voice-profile");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Allowed enum values per the VoiceProfile contract (src/types/voiceProfile.ts).
const ENUMS = {
  signoff: ["cheers", "thanks", "sincerely", "none"],
  disagreement: ["direct", "context-first", "question-led"],
  contentArchetype: ["argument", "story-lesson", "data-take", "how-to"],
  sentenceLength: ["short-punchy", "medium", "long-flowing"],
  firstPerson: ["heavy-I", "balanced", "minimal-I"],
  punctuationStyle: ["em-dash", "ellipsis", "minimal", "formal"],
} as const;

const DEFAULTS = {
  signoff: "none",
  disagreement: "direct",
  contentArchetype: "argument",
  sentenceLength: "medium",
  firstPerson: "balanced",
  punctuationStyle: "minimal",
} as const;

function coerce<K extends keyof typeof ENUMS>(key: K, value: unknown): string {
  const allowed = ENUMS[key] as readonly string[];
  return typeof value === "string" && allowed.includes(value)
    ? value
    : DEFAULTS[key];
}

const SYSTEM_PROMPT = `You analyse a person's real writing samples and extract a structured "voice profile" so an AI can later write in their voice. Read the SAMPLES and infer how this person actually writes. Do not invent traits the samples do not support; when a dimension is unclear, pick the closest plausible value.

Return ONLY a JSON object with exactly these keys:
{
  "signoff": one of ["cheers","thanks","sincerely","none"],
  "disagreement": one of ["direct","context-first","question-led"],
  "contentArchetype": one of ["argument","story-lesson","data-take","how-to"],
  "sentenceLength": one of ["short-punchy","medium","long-flowing"],
  "firstPerson": one of ["heavy-I","balanced","minimal-I"],
  "punctuationStyle": one of ["em-dash","ellipsis","minimal","formal"],
  "hardRules": array of 1-2 short imperative rules this writer clearly follows, phrased as "Always ..." or "Never ..." (e.g. "Never pad it out. Say the point and stop.")
}

Definitions:
- signoff: how they tend to close a message. "none" if they just stop on the last point.
- disagreement: "direct" = leads with the counter; "context-first" = acknowledges then pivots; "question-led" = asks a sharp question.
- contentArchetype: the macro-shape - claim-then-evidence (argument), situation-to-takeaway (story-lesson), metric-led (data-take), or step-by-step (how-to).
- firstPerson: how heavily they use I/we.
- punctuationStyle: their signature - frequent em-dashes, ellipses, minimal/clean, or formal/measured.

Output the JSON object and nothing else.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (text.length < 40) {
      return jsonResponse(
        { error: "Paste a little more writing (a sentence or two) so we can read your voice." },
        400,
      );
    }

    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `SAMPLES:\n"""\n${text.slice(0, 6000)}\n"""` },
        ],
        model: selectModel("complex"),
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );

    // Record the spend signal (best-effort; service role for the audit insert).
    try {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await recordAiUsage(serviceClient, {
        userId: user.id,
        functionName: "extract-voice-profile",
        provider: providerFromModel(aiResponse.model),
        model: aiResponse.model,
        purpose: "voice-extract",
        promptTokens: aiResponse.usage?.prompt_tokens,
        completionTokens: aiResponse.usage?.completion_tokens,
        totalTokens: aiResponse.usage?.total_tokens,
        status: "ok",
      });
    } catch (_e) {
      // never block the extraction on usage logging
    }

    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(aiResponse.content) as Record<string, unknown>;
    } catch {
      return jsonResponse(
        { error: "Could not read a clear voice from that. Try a different sample, or pick instead." },
        502,
      );
    }

    const rules = Array.isArray(raw.hardRules)
      ? (raw.hardRules as unknown[])
          .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
          .slice(0, 2)
      : [];

    const profile = {
      signoff: coerce("signoff", raw.signoff),
      disagreement: coerce("disagreement", raw.disagreement),
      contentArchetype: coerce("contentArchetype", raw.contentArchetype),
      sentenceLength: coerce("sentenceLength", raw.sentenceLength),
      firstPerson: coerce("firstPerson", raw.firstPerson),
      punctuationStyle: coerce("punctuationStyle", raw.punctuationStyle),
      hardRules: rules.length > 0 ? rules : ["Always sound like me, never a generic AI tone."],
      // Hand back a trimmed sample so the leader can choose to keep it as the
      // ground-truth voice reference (overrides all inferred signal).
      sampleVoice: text.slice(0, 600),
      source: "context" as const,
    };

    return jsonResponse({ success: true, profile });
  } catch (error) {
    log.error("voice profile extraction failed", { error });
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Voice extraction failed." },
      500,
    );
  }
});
