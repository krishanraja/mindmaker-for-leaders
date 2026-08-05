/**
 * free-skill-export
 *
 * The free, anonymous "build lap": a logged-out visitor describes a repetitive
 * workflow and gets a real agentskills.io-compliant kit (ZIP) with no account
 * and no Edge Pro. The win is delivered first; account creation is offered at
 * delivery (the frontend upgrades the anonymous session), never gated before it.
 *
 * Cost guardrails: a modest per-caller frequency rate limit (abuse protection,
 * applied before any work) plus the generous soft daily spend cap (logs an
 * overage signal, never blocks mid-build). Reuses the prompt / quality-gate /
 * zip modules from generate-skill-export so the free kit is the real thing.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSkillSystemPrompt, buildSkillUserPrompt } from "../generate-skill-export/prompt.ts";
import { runQualityGate, type SkillData } from "../generate-skill-export/quality-gate.ts";
import { buildSkillZip } from "../generate-skill-export/zip.ts";
import { selectModel } from "../_shared/openai-utils.ts";
import { callLLMWithFallback, providerFromModel } from "../_shared/llm-fallback.ts";
import { recordAiUsage, checkDailySoftCap } from "../_shared/ai-usage.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("free-skill-export");

interface TriageResult {
  passed: boolean;
  result: "skill" | "custom_instruction" | "memory_fact" | "saved_style";
  reasoning?: string;
}

interface SkillJson {
  triage: TriageResult;
  skill?: {
    name: string;
    description: string;
    body: string;
    references?: Array<{ filename: string; content: string }>;
    test_prompts?: string[];
    gotchas?: string[];
    archetype?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify the caller (anonymous users have an id too). Used for rate
    // limiting, the soft cap, and to persist the kit so it survives the
    // account upgrade. The free lap does not require auth.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await authClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Frequency rate limit (abuse protection), keyed by user when present else
    // by IP. Bounds cost without hard-blocking a single in-flight build.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await checkRateLimit(
      { maxRequests: 5, windowMs: 60 * 60 * 1000, identifier: "free-skill-export" },
      userId ?? ip,
      serviceClient,
    );
    if (!rl.allowed) {
      return jsonResponse({
        error: "You have built several kits in a short window. Create a free account to keep going.",
        rate_limited: true,
        retry_after_ms: Math.max(0, rl.resetAt - Date.now()),
      }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const transcript = typeof body?.transcript === "string" ? body.transcript : "";
    const skillNameHint = typeof body?.skill_name_hint === "string"
      ? body.skill_name_hint.trim()
      : undefined;

    if (!transcript || transcript.trim().length < 20) {
      return jsonResponse(
        { error: "Describe the workflow in a bit more detail (a sentence or two)." },
        400,
      );
    }

    // Generous soft cap: logs an overage signal, never blocks.
    const softCap = await checkDailySoftCap(serviceClient, userId, "free-skill-export");

    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          { role: "system", content: buildSkillSystemPrompt() },
          {
            role: "user",
            content: buildSkillUserPrompt({
              transcript,
              memoryContext: "",
              profileContext: "",
              seed: undefined,
            }),
          },
        ],
        model: selectModel("complex"),
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );

    await recordAiUsage(serviceClient, {
      userId,
      functionName: "free-skill-export",
      provider: providerFromModel(aiResponse.model),
      model: aiResponse.model,
      purpose: "skill-export-free",
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      status: "ok",
    });

    let parsed: SkillJson;
    try {
      parsed = JSON.parse(aiResponse.content || "{}") as SkillJson;
    } catch (err) {
      log.error("failed to parse LLM JSON", { error: err });
      return jsonResponse(
        { error: "We could not build a kit from that. Try describing the steps you repeat." },
        502,
      );
    }

    if (!parsed?.triage) {
      return jsonResponse(
        { error: "We could not build a kit from that. Try describing the steps you repeat." },
        502,
      );
    }

    // Triage routed it elsewhere (a memory fact, an instruction, a style). Still
    // a useful answer; the UI explains what to do with it.
    if (!parsed.triage.passed) {
      return jsonResponse({
        soft_cap: softCap,
        triage: {
          passed: false,
          result: parsed.triage.result || "memory_fact",
          reasoning: parsed.triage.reasoning || "",
        },
      }, 200);
    }

    const skill = parsed.skill;
    if (!skill || !skill.name || !skill.description || !skill.body) {
      return jsonResponse({ error: "The generated kit was incomplete. Please try again." }, 502);
    }

    const skillData: SkillData = {
      name: skill.name,
      description: skill.description,
      body: skill.body,
      references: skill.references || [],
      test_prompts: skill.test_prompts || [],
      archetype: skill.archetype,
      // The free lap carries no memory context, so no voice profile ever
      // rides in; the voice-lock check still fires on archetype.
      voice_profile_present: false,
    };

    // The three prov.* checks stay ADVISORY here, and this is deliberate rather
    // than an oversight. Phase 3b makes them blocking in generate-skill-export
    // because that function loads the leader's compiled criteria and their
    // evidence and hands the model ids to cite. The free lap has neither: an
    // anonymous visitor has no criteria, no evidence rows, and no chain history,
    // so there is nothing any rule could point AT. A gate that cannot be
    // satisfied must not block, because the only way to pass it would be to ship
    // an empty skill, and an empty skill passing is worse than a flagged one.
    // runQualityGate reports the findings either way, and the number is logged.
    const qualityGate = runQualityGate(skillData);
    const nameCheck = qualityGate.checks.find((c) => c.id === "package.nameFormat");
    if (nameCheck && !nameCheck.passed) {
      return jsonResponse(
        { error: `Generated kit name "${skill.name}" is invalid. Please regenerate.` },
        502,
      );
    }

    const zipResult = await buildSkillZip({
      name: skill.name,
      description: skill.description,
      body: skill.body,
      references: skill.references || [],
      testPrompts: skill.test_prompts || [],
      archetype: skill.archetype,
    });

    // Persist the kit when we have a user id (anonymous included) so it survives
    // the account upgrade. Best-effort; the user still gets their download.
    if (userId) {
      // Storage first, so the artefact outlives the response (same fix as
      // generate-skill-export; before this the ZIP was unrecoverable once
      // the response state unmounted).
      const zipPath = `${userId}/${crypto.randomUUID()}-${skill.name}.zip`;
      const { error: uploadError } = await serviceClient.storage
        .from("skill-packages")
        .upload(zipPath, zipResult.bytes, {
          contentType: "application/zip",
          upsert: true,
        });
      if (uploadError) log.warn("skill-packages upload failed (non-fatal)", { userId, error: uploadError });
      const storedZipPath = uploadError ? null : zipPath;

      const { data: insertRow, error: insErr } = await serviceClient
        .from("skill_exports")
        .insert({
          user_id: userId,
          skill_name: skill.name,
          description: skill.description,
          transcript,
          triage_result: "skill",
          body_content: skill.body,
          references_json: skill.references || [],
          test_prompts: skill.test_prompts || [],
          quality_gate: qualityGate as unknown as Record<string, unknown>,
          archetype: skill.archetype || null,
          version: 1,
          zip_path: storedZipPath,
        })
        .select("id")
        .single();
      if (insErr) log.warn("skill_exports insert failed (non-fatal)", { userId, error: insErr });

      // Also write the unified library row. Without this, /build skills were
      // invisible to the Library and to mcp-context list_skills forever
      // (spec 4.8 / Phase 0 item 13).
      const { error: artifactErr } = await serviceClient
        .from("generated_artifacts")
        .insert({
          user_id: userId,
          kind: "skill",
          name: skill.name,
          body: skill.body,
          metadata: {
            archetype: skill.archetype || null,
            zip_filename: `${skill.name}.zip`,
            zip_path: storedZipPath,
            skill_export_id: insertRow?.id || null,
            test_prompts: skill.test_prompts || [],
            provider: providerFromModel(aiResponse.model),
            model: aiResponse.model,
            source: "free-skill-export",
          },
        });
      if (artifactErr) log.warn("generated_artifacts insert failed (non-fatal)", { userId, error: artifactErr });
    }

    return jsonResponse({
      soft_cap: softCap,
      triage: parsed.triage,
      skill: {
        name: skill.name,
        description: skill.description,
        body: skill.body,
        references: skill.references || [],
        test_prompts: skill.test_prompts || [],
        gotchas: skill.gotchas || [],
        archetype: skill.archetype || null,
      },
      quality_gate: qualityGate,
      zip_base64: zipResult.base64,
      zip_filename: `${skill.name}.zip`,
      zip_byte_length: zipResult.byteLength,
      created_at: new Date().toISOString(),
      skill_name_hint: skillNameHint || null,
    }, 200);
  } catch (err) {
    log.error("free-skill-export error", { error: err });
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
