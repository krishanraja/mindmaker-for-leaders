/**
 * Transcription edge function.
 * Env: OPENAI_API_KEY, GEMINI_API_KEY (fallback), optional OPENAI_TRANSCRIPTION_MODEL
 * (default whisper-1; try gpt-4o-transcribe or gpt-4o-mini-transcribe - falls back to whisper-1 on failure).
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const FormFieldsSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  moduleType: z.string().nullable().optional(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Rough bytes/sec for compressed voice (webm/opus); used to scale API timeouts with recording length. */
const BYTES_PER_SECOND_ESTIMATE = 12_000;
const OPENAI_TIMEOUT_MIN_MS = 20_000;
const OPENAI_TIMEOUT_MAX_MS = 120_000;
const GEMINI_TIMEOUT_MIN_MS = 15_000;
const GEMINI_TIMEOUT_MAX_MS = 45_000;

const ENRICHMENT_TIMEOUT = 5_000;
const REFINEMENT_TIMEOUT = 3_000;

function estimateDurationSecondsFromBlob(blob: Blob): number {
  return Math.max(1, blob.size / BYTES_PER_SECOND_ESTIMATE);
}

/** Scale OpenAI transcription timeout with estimated audio length (plan: align with up to ~120s recordings). */
function computeOpenAiTranscriptionTimeoutMs(blob: Blob): number {
  const estSec = estimateDurationSecondsFromBlob(blob);
  const scaled = OPENAI_TIMEOUT_MIN_MS + Math.ceil(estSec * 500);
  return Math.min(OPENAI_TIMEOUT_MAX_MS, Math.max(OPENAI_TIMEOUT_MIN_MS, scaled));
}

function computeGeminiTimeoutMs(blob: Blob): number {
  const estSec = estimateDurationSecondsFromBlob(blob);
  const scaled = GEMINI_TIMEOUT_MIN_MS + Math.ceil(estSec * 250);
  return Math.min(GEMINI_TIMEOUT_MAX_MS, Math.max(GEMINI_TIMEOUT_MIN_MS, scaled));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const FILLER_PATTERN = /\b(um|uh|erm|ah|like|you know|I mean|basically|literally|so yeah|uh huh|sort of|kind of)\b/i;
const DUPLICATE_WORD_PATTERN = /\b(\w+)\s+\1\b/i;

/** Determine whether a transcript would benefit from LLM refinement. */
function shouldRefineTranscript(text: string, confidence: number): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount <= 5) return false;

  // High confidence + no obvious issues → skip
  if (confidence >= 0.92 && !FILLER_PATTERN.test(trimmed) && !DUPLICATE_WORD_PATTERN.test(trimmed)) {
    return false;
  }

  return true;
}

/** Use GPT-4o-mini to clean up a raw voice transcript (filler words, stutters, grammar). */
async function refineTranscript(rawText: string, userContext: string | null): Promise<string | null> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) return null;

  const systemPrompt = `You clean up voice transcriptions. Fix ONLY:
- Filler words (um, uh, erm, ah, like, you know, I mean, basically, so, sort of, kind of)
- Duplicate/stuttered words
- False starts and self-corrections (keep the corrected version)
- Broken grammar from speech patterns
- Obviously misheard words based on context

Do NOT: change meaning, add information, remove intentional emphasis, summarize, or over-formalize.
If the transcript is already clean, return it unchanged.
${userContext ? `\nSpeaker context: ${userContext}` : ''}
Return ONLY the cleaned text. No explanations, no quotes.`;

  try {
    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: rawText },
          ],
          temperature: 0,
          max_tokens: Math.max(500, Math.ceil(rawText.length / 2)),
        }),
      },
      REFINEMENT_TIMEOUT,
    );

    if (!response.ok) {
      console.warn(`[REFINE] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const refined = data.choices?.[0]?.message?.content?.trim();
    if (!refined || refined.length === 0) return null;

    return refined;
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout' : err.message;
    console.warn(`[REFINE] Failed (${reason})`);
    return null;
  }
}

/** Enrich the Whisper prompt with user context from memory (non-blocking). */
async function enrichWhisperPrompt(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData } = await supabaseAuth.auth.getUser();
  if (!userData?.user?.id) return null;

  const supabaseService = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const { data: facts } = await supabaseService
    .from('user_memory')
    .select('fact_key, fact_value')
    .eq('user_id', userData.user.id)
    .eq('is_current', true)
    .in('fact_category', ['identity', 'business'])
    .order('confidence_score', { ascending: false })
    .limit(5);

  if (!facts || facts.length === 0) return null;

  const contextParts: string[] = [];
  for (const f of facts) {
    if (f.fact_key === 'role' || f.fact_key === 'title' || f.fact_key === 'job_title') {
      contextParts.push(`Their role is ${f.fact_value}`);
    } else if (f.fact_key === 'company_name' || f.fact_key === 'company') {
      contextParts.push(`They work at ${f.fact_value}`);
    } else if (f.fact_key === 'industry' || f.fact_key === 'vertical') {
      contextParts.push(`in the ${f.fact_value} industry`);
    } else if (f.fact_key === 'team_size') {
      contextParts.push(`managing a team of ${f.fact_value}`);
    }
  }

  if (contextParts.length === 0) return null;
  console.log('Enriched Whisper prompt with user context');
  return contextParts.join('. ') + '.';
}

/** Compute confidence from Whisper / compatible segment-level scores. */
function computeWhisperConfidence(segments: Array<{ avg_logprob: number; no_speech_prob?: number }>): number {
  if (!segments || segments.length === 0) return 0.95;
  const segmentProbs = segments.map((seg) => {
    const prob = Math.exp(seg.avg_logprob);
    const noSpeechPenalty = seg.no_speech_prob ? (1 - seg.no_speech_prob * 0.5) : 1;
    return prob * noSpeechPenalty;
  });
  let confidence = segmentProbs.reduce((a, b) => a + b, 0) / segmentProbs.length;
  confidence = Math.max(0, Math.min(1, confidence));
  return Math.round(confidence * 100) / 100;
}

/** When verbose_json has no segments (some ASR models), use a neutral prior for refinement gating. */
function confidenceFromTranscriptionJson(whisperResult: {
  text?: string;
  segments?: Array<{ avg_logprob: number; no_speech_prob?: number }>;
}): number {
  if (whisperResult.segments && whisperResult.segments.length > 0) {
    return computeWhisperConfidence(whisperResult.segments);
  }
  return 0.88;
}

/**
 * Try OpenAI audio/transcriptions with OPENAI_TRANSCRIPTION_MODEL (default whisper-1), then whisper-1 if primary differs and failed.
 */
async function transcribeWithOpenAI(
  audioBlob: Blob,
  whisperPrompt: string,
  openAiKey: string,
  timeoutMs: number,
): Promise<{ text: string; confidence: number; provider: string; asrModel: string } | null> {
  const configured = Deno.env.get("OPENAI_TRANSCRIPTION_MODEL")?.trim() || "whisper-1";
  const fallback = "whisper-1";
  const modelsToTry = configured === fallback ? [fallback] : [configured, fallback];
  const tried = new Set<string>();

  for (const model of modelsToTry) {
    if (tried.has(model)) continue;
    tried.add(model);

    const whisperFormData = new FormData();
    const audioFileName = audioBlob.type?.includes("mp4") ? "audio.mp4" : "audio.webm";
    whisperFormData.append("file", audioBlob, audioFileName);
    whisperFormData.append("model", model);
    whisperFormData.append("language", "en");
    whisperFormData.append("response_format", "verbose_json");
    whisperFormData.append("temperature", "0");
    whisperFormData.append("prompt", whisperPrompt);

    try {
      const response = await fetchWithTimeout(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${openAiKey}` },
          body: whisperFormData,
        },
        timeoutMs,
      );

      if (response.ok) {
        const whisperResult = await response.json();
        const text = whisperResult.text as string;
        if (!text?.trim()) {
          console.warn(`[AI-PROVIDER] OpenAI model ${model} returned empty text`);
          continue;
        }
        const confidence = confidenceFromTranscriptionJson(whisperResult);
        const provider = model.startsWith("gpt-4o") ? "openai-gpt4o-asr" : "whisper";
        console.log(`[AI-PROVIDER] OpenAI SUCCESS model=${model}`);
        return { text, confidence, provider, asrModel: model };
      }
      const errorText = await response.text();
      console.warn(`[AI-PROVIDER] OpenAI model ${model} HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    } catch (err: unknown) {
      const reason =
        err instanceof Error ? (err.name === "AbortError" ? "timeout" : err.message) : String(err);
      console.warn(`[AI-PROVIDER] OpenAI model ${model} failed (${reason})`);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio');

    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: { fieldErrors: { audio: ["Audio file is required"] } } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldsParsed = FormFieldsSchema.safeParse({
      sessionId: formData.get('sessionId'),
      moduleType: formData.get('moduleType'),
    });
    if (!fieldsParsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: fieldsParsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const sessionId = fieldsParsed.data.sessionId;
    const moduleType = fieldsParsed.data.moduleType ?? null;

    // Rate limiting: 10 requests per minute (expensive Whisper API calls)
    const rateLimitId = sessionId || req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(rateLimitId, { maxRequests: 10, windowMs: 60_000 });
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    console.log(`Transcribing audio for session ${sessionId}, module ${moduleType}`);
    const startTime = Date.now();

    // Validate that at least one transcription provider is available
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      console.error('CRITICAL: No transcription API keys configured');
      return new Response(
        JSON.stringify({ error: 'Transcription service unavailable', provider: 'none', fallback_available: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build contextual Whisper prompt - race enrichment against a timeout so it never blocks the pipeline
    const basePrompt = 'The speaker is an executive or leader discussing leadership, team management, strategy, decisions, delegation, priorities, KPIs, OKRs, quarterly goals, direct reports, stakeholders, cross-functional collaboration, performance reviews, and business operations.';

    const enrichedSuffix = await Promise.race([
      enrichWhisperPrompt(req).catch((e) => {
        console.warn('Context enrichment failed (non-blocking):', e);
        return null;
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ENRICHMENT_TIMEOUT)),
    ]);

    const whisperPrompt = enrichedSuffix ? `${basePrompt} ${enrichedSuffix}` : basePrompt;

    const openAiTimeoutMs = computeOpenAiTranscriptionTimeoutMs(audioBlob as Blob);
    const geminiTimeoutMs = computeGeminiTimeoutMs(audioBlob as Blob);

    // ========================================
    // TIER 1: OpenAI (OPENAI_TRANSCRIPTION_MODEL → whisper-1 fallback)
    // ========================================
    let result: { text: string; confidence: number; provider: string; asrModel: string } | null = null;

    if (OPENAI_API_KEY) {
      result = await transcribeWithOpenAI(
        audioBlob as Blob,
        whisperPrompt,
        OPENAI_API_KEY,
        openAiTimeoutMs,
      );
    } else {
      console.log('[AI-PROVIDER] OpenAI transcription skipped (no OPENAI_API_KEY)');
    }

    // ========================================
    // TIER 2: Gemini Flash (multimodal audio)
    // ========================================
    if (!result && GEMINI_API_KEY) {
      console.log('[AI-PROVIDER] Trying Gemini Flash audio fallback...');
      try {
        // Convert audio blob to base64 for Gemini inlineData
        const audioArrayBuffer = await (audioBlob as Blob).arrayBuffer();
        const audioBytes = new Uint8Array(audioArrayBuffer);
        const b64Audio = base64Encode(audioBytes);
        const mimeType = (audioBlob as Blob).type || 'audio/webm';

        const geminiResp = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType, data: b64Audio } },
                  { text: 'Transcribe this audio recording exactly as spoken. Return ONLY the transcribed text, nothing else. Do not add commentary, timestamps, or labels.' },
                ],
              }],
              generationConfig: { temperature: 0, maxOutputTokens: 2000 },
            }),
          },
          geminiTimeoutMs
        );

        if (geminiResp.ok) {
          const data = await geminiResp.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 0) {
            result = { text: text.trim(), confidence: 0.75, provider: 'gemini', asrModel: 'gemini-2.0-flash' };
            console.log(`[AI-PROVIDER] Gemini Flash SUCCESS (fallback)`);
          } else {
            console.warn('[AI-PROVIDER] Gemini returned empty transcript');
          }
        } else {
          const errorText = await geminiResp.text();
          console.warn(`[AI-PROVIDER] Gemini HTTP ${geminiResp.status}: ${errorText.slice(0, 200)}`);
        }
      } catch (err) {
        const reason = err.name === 'AbortError' ? 'timeout' : err.message;
        console.warn(`[AI-PROVIDER] Gemini failed (${reason})`);
      }
    }

    // ========================================
    // ALL PROVIDERS FAILED
    // ========================================
    if (!result) {
      console.error('[AI-PROVIDER] ALL transcription providers failed');
      return new Response(
        JSON.stringify({
          error: 'All transcription providers failed. Please try again.',
          provider: 'none',
          fallback_available: true,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Transcription complete in ${duration}s via ${result.provider}: "${result.text.substring(0, 100)}..."`);

    // ========================================
    // TRANSCRIPT REFINEMENT (GPT-4o-mini)
    // ========================================
    let refinedText: string | null = null;
    let refinementApplied = false;
    let refinementSkipReason: string | null = null;
    let refinementLatencyMs = 0;

    if (!shouldRefineTranscript(result.text, result.confidence)) {
      const wordCount = result.text.trim().split(/\s+/).length;
      refinementSkipReason = wordCount <= 5 ? 'short_transcript' : 'high_confidence_clean';
      console.log(`[REFINE] Skipped (${refinementSkipReason})`);
    } else {
      const refineStart = Date.now();
      refinedText = await Promise.race([
        refineTranscript(result.text, enrichedSuffix).catch((e) => {
          console.warn('[REFINE] Refinement failed (non-blocking):', e);
          return null;
        }),
        new Promise<null>((resolve) => setTimeout(() => {
          console.warn('[REFINE] Timed out');
          resolve(null);
        }, REFINEMENT_TIMEOUT)),
      ]);
      refinementLatencyMs = Date.now() - refineStart;

      if (refinedText) {
        refinementApplied = true;
        console.log(`[REFINE] GPT-4o-mini SUCCESS (${refinementLatencyMs}ms, ${result.text.length}→${refinedText.length} chars)`);
      } else {
        refinementSkipReason = 'refinement_failed';
      }
    }

    const finalTranscript = refinedText || result.text;

    // Log instrumentation (non-blocking)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const EXPECTED_PROJECT_ID = 'bkyuxvschuwngtcdhsyg';
    let skipInstrumentation = false;
    if (!supabaseUrl || !supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      console.warn(`Database validation: SUPABASE_URL does not match expected project ID (${EXPECTED_PROJECT_ID}). Skipping instrumentation.`);
      skipInstrumentation = true;
    }

    if (!skipInstrumentation) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const sessionIdStr = String(sessionId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionIdStr);
      const moduleName = moduleType ? String(moduleType) : null;

      try {
        const { error: instrumentationError } = await supabase.from('voice_instrumentation').insert({
          session_id: isUuid ? sessionIdStr : null,
          event_type: 'transcription_complete',
          module_name: moduleName,
            metadata: {
            duration_seconds: duration,
            transcript_length: result.text.length,
            confidence: result.confidence,
            provider: result.provider,
            asr_model: result.asrModel,
            session_id_raw: isUuid ? null : sessionIdStr,
            refined: refinementApplied,
            refinement_latency_ms: refinementLatencyMs,
            refinement_skipped_reason: refinementSkipReason,
          }
        });
        if (instrumentationError) {
          console.warn('Instrumentation insert failed (non-blocking):', instrumentationError.message);
        }
      } catch (e) {
        console.warn('Instrumentation insert threw (non-blocking):', e);
      }
    }

    return new Response(
      JSON.stringify({
        transcript: finalTranscript,
        raw_transcript: result.text,
        refined: refinementApplied,
        confidence: result.confidence,
        duration_seconds: duration,
        needs_clarification: result.confidence < 0.5,
        provider: result.provider,
        asr_model: result.asrModel,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in voice-transcribe:', error);
    return new Response(
      JSON.stringify({ error: 'Transcription failed. Please try again.', fallback_available: true }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
