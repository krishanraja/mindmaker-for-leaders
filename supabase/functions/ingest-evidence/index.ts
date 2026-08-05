/**
 * ingest-evidence - stage 1 of the harness chain.
 *
 * POST { source_kind, label, body, surface? }
 *   -> { source_id, candidates, rejected, counts }
 *
 * Turns one piece of raw material (a call transcript, pasted writing, an
 * artefact) into candidate constructs, each carrying evidence rows that point
 * at exact offsets in the persisted source.
 *
 * Two rules govern everything below.
 *
 * A transcript is a rich source of candidates and a poor source of truth
 * (skills/ctrl-intake/leaves/transcripts.md). So this stage writes constructs
 * with status 'candidate' and NEVER a contrast_pole. The sort produces that.
 *
 * A quote verifies by exact offset slice, never by a fuzzy ratio (CH-13). The
 * body is stored exactly as received and every accepted quote is the literal
 * source.slice(quote_start, quote_end), so every later check is O(1) equality.
 *
 * The LLM is the only non-deterministic step. Everything it emits passes the
 * deterministic gate in ./post-check.ts before a row is written, and every
 * rejection is returned to the caller rather than swallowed.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { selectModel } from "../_shared/openai-utils.ts";
import { callLLMWithFallback, providerFromModel } from "../_shared/llm-fallback.ts";
import { checkDailySoftCap, recordAiUsage } from "../_shared/ai-usage.ts";
import { buildIngestSystemPrompt, buildIngestUserPrompt } from "./prompt.ts";
import { type IngestCandidateInput, type IngestReject, runPostCheck } from "./post-check.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

const SOURCE_KINDS = ["transcript", "paste", "artefact"] as const;
type SourceKind = typeof SOURCE_KINDS[number];

const MIN_BODY_CHARS = 100;
const MAX_BODY_CHARS = 60000;
const MAX_LABEL_CHARS = 200;
const MAX_SURFACE_CHARS = 120;

interface ResponseCandidate {
  construct_id: string;
  emergent_pole: string;
  evidence: Array<{ id: string; quote: string; situation: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("ingest-evidence");
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      throw new Error("Database configuration error (unexpected project).");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // User client: every row this function writes goes through RLS as the
    // caller, so a bug here cannot write into someone else's standard.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    // Service client for the privileged spend rows only (ai_usage_audit has no
    // INSERT policy). It never writes evidence, constructs or sources.
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Generous soft cap: logs an overage signal, never blocks.
    const softCap = await checkDailySoftCap(serviceClient, userId, "ingest-evidence");

    const payload = await req.json().catch(() => ({}));

    const sourceKind: SourceKind = SOURCE_KINDS.includes(payload?.source_kind)
      ? payload.source_kind
      : "paste";
    const label = typeof payload?.label === "string" ? payload.label.trim().slice(0, MAX_LABEL_CHARS) : "";
    const surface = typeof payload?.surface === "string"
      ? payload.surface.trim().slice(0, MAX_SURFACE_CHARS)
      : "";
    const body = typeof payload?.body === "string" ? payload.body : "";

    if (!label) {
      return json({ error: "Give this material a label, for example 'Scope call' or 'Board update, March'." }, 400);
    }
    if (body.trim().length < MIN_BODY_CHARS) {
      return json({
        error: `Paste at least ${MIN_BODY_CHARS} characters. Below that there is nothing to quote.`,
      }, 400);
    }
    if (body.length > MAX_BODY_CHARS) {
      // Not truncated on purpose: the stored body is what quote offsets index
      // into, and silently dropping the tail would drop evidence with it.
      return json({
        error: `This source is ${body.length} characters. Split it into pieces under ${MAX_BODY_CHARS} and ingest them separately.`,
      }, 400);
    }

    // Persist the raw material FIRST and exactly as received. Offsets index
    // into this stored string, so any normalisation here would break every
    // quote pointer written below.
    const { data: sourceRow, error: sourceErr } = await userClient
      .from("evidence_sources")
      .insert({ user_id: userId, kind: sourceKind, label, body })
      .select("id")
      .single();
    if (sourceErr || !sourceRow) {
      throw new Error(`evidence_sources insert failed: ${sourceErr?.message ?? "unknown"}`);
    }
    const sourceId = sourceRow.id as string;

    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          { role: "system", content: buildIngestSystemPrompt() },
          { role: "user", content: buildIngestUserPrompt({ sourceKind, label, body, surface }) },
        ],
        model: selectModel("complex"),
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );

    await recordAiUsage(serviceClient, {
      userId,
      functionName: "ingest-evidence",
      provider: providerFromModel(aiResponse.model),
      model: aiResponse.model,
      purpose: "ingest-evidence",
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      status: "ok",
    });

    let parsed: { candidates?: unknown };
    try {
      parsed = JSON.parse(aiResponse.content || "{}");
    } catch (err) {
      log.error("ingest JSON parse failed", { userId, error: err });
      return json({
        error: "We could not read that source. Try again, or paste a shorter piece of it.",
      }, 502);
    }

    const rawCandidates: IngestCandidateInput[] = Array.isArray(parsed?.candidates)
      ? (parsed.candidates as IngestCandidateInput[])
      : [];

    // The deterministic gate. Nothing past this line is the model's judgement.
    const checked = runPostCheck(body, rawCandidates);
    const rejected: IngestReject[] = [...checked.rejected];
    const responseCandidates: ResponseCandidate[] = [];
    let evidenceCount = 0;

    for (const candidate of checked.candidates) {
      const evidenceRows = candidate.items.map((item) => ({
        user_id: userId,
        kind: item.kind,
        body: item.body,
        quote: item.quote,
        source_id: sourceId,
        quote_start: item.quote_start,
        quote_end: item.quote_end,
        source_label: label,
        occurred_at: null,
        situated: true,
        situation: item.situation,
        speaker_is_owner: item.speaker_is_owner,
      }));

      const { data: written, error: evidenceErr } = await userClient
        .from("evidence")
        .insert(evidenceRows)
        .select("id, quote, situation");
      if (evidenceErr || !written || written.length === 0) {
        log.warn("evidence insert failed", { userId, error: evidenceErr });
        rejected.push({ reason: "evidence_write_failed", quote: candidate.emergent_pole });
        continue;
      }

      const evidenceIds = written.map((r: { id: string }) => r.id);

      // status 'candidate', no contrast_pole, ever. The sort produces the
      // second pole; a pole invented here is the guess that makes the whole
      // profile confidently wrong.
      const { data: construct, error: constructErr } = await userClient
        .from("constructs")
        .insert({
          user_id: userId,
          scope: "person",
          status: "candidate",
          emergent_pole: candidate.emergent_pole,
          evidence_ids: evidenceIds,
        })
        .select("id")
        .single();
      if (constructErr || !construct) {
        // Roll the evidence back so the source does not accumulate rows no
        // construct points at and the response never under-reports what exists.
        await userClient.from("evidence").delete().in("id", evidenceIds);
        log.warn("construct insert failed", { userId, error: constructErr });
        rejected.push({ reason: "construct_write_failed", quote: candidate.emergent_pole });
        continue;
      }

      evidenceCount += written.length;
      responseCandidates.push({
        construct_id: construct.id as string,
        emergent_pole: candidate.emergent_pole,
        evidence: written.map((r: { id: string; quote: string | null; situation: string | null }) => ({
          id: r.id,
          quote: r.quote ?? "",
          situation: r.situation ?? "",
        })),
      });
    }

    log.info("ingest complete", {
      userId,
      source_id: sourceId,
      candidates: responseCandidates.length,
      evidence: evidenceCount,
      rejected: rejected.length,
    });

    return json({
      source_id: sourceId,
      candidates: responseCandidates,
      rejected,
      counts: {
        evidence: evidenceCount,
        candidates: responseCandidates.length,
        rejected: rejected.length,
      },
      soft_cap: softCap,
    }, 200);
  } catch (e) {
    log.error("ingest-evidence handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
