/**
 * generate-skill-export
 *
 * Voice-to-Agent-Skill pipeline. The leader describes a repetitive workflow,
 * we run a Three Honest Tests triage gate, generate an agentskills.io-
 * compliant skill via the LLM, validate it through the quality gate, and
 * package it as a ZIP the client can drop into ~/.claude/skills/.
 *
 * Triage failures (Memory Web facts, Custom Instructions, saved styles) are
 * still recorded in skill_exports with triage_result set accordingly, so the
 * UI can route the leader to the right surface without losing the input.
 *
 * Edge Pro gated: same paywall as generate-custom-export. The cost driver is
 * the LLM call (~6-10k tokens in, ~3k out) plus the ZIP assembly.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildMemoryContext } from "../_shared/memory-context-builder.ts";
import { selectModel } from "../_shared/openai-utils.ts";
import { callLLMWithFallback, providerFromModel } from "../_shared/llm-fallback.ts";
import { buildSkillSystemPrompt, buildSkillUserPrompt } from "./prompt.ts";
import { runQualityGate, type SkillData } from "./quality-gate.ts";
import { buildSkillZip } from "./zip.ts";
import { recordAiUsage, checkDailySoftCap } from "../_shared/ai-usage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Edge Pro gate (active or past_due grace period - same as generate-custom-export).
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subscription } = await serviceClient
      .from("edge_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (
      !subscription ||
      (subscription.status !== "active" && subscription.status !== "past_due")
    ) {
      return jsonResponse({ error: "Edge Pro subscription required" }, 403);
    }

    // Generous soft cap: logs an overage signal, never blocks. Reported back so
    // the client may show a gentle notice.
    const softCap = await checkDailySoftCap(serviceClient, user.id, "generate-skill-export");

    const body = await req.json().catch(() => ({}));
    const transcript = typeof body?.transcript === "string" ? body.transcript : "";
    const skillNameHint = typeof body?.skill_name_hint === "string"
      ? body.skill_name_hint.trim()
      : undefined;

    // Optional seed: when an entry point (Edge view chip, Memory blocker
    // button, Briefing decision_trigger button) hands the user a pre-anchored
    // pain, we forward it so the LLM grounds extraction in the leader's actual
    // language instead of inventing a more abstract trigger.
    const SEED_KINDS = ["blocker", "decision", "mission", "briefing_segment", "example"] as const;
    type SeedKind = typeof SEED_KINDS[number];
    let seed: { kind: SeedKind; text: string } | undefined;
    if (body?.seed && typeof body.seed === "object") {
      const rawKind = body.seed.kind;
      const rawText = body.seed.text;
      if (
        typeof rawText === "string" &&
        rawText.trim().length > 0 &&
        SEED_KINDS.includes(rawKind as SeedKind)
      ) {
        seed = { kind: rawKind as SeedKind, text: rawText.trim().slice(0, 1000) };
      }
    }

    if (!transcript || transcript.trim().length < 20) {
      return jsonResponse(
        { error: "Transcript must be at least 20 characters. Describe the workflow in more detail." },
        400,
      );
    }

    // Pull Memory Web context + edge profile so the LLM has the leader's
    // background. Identical pattern to generate-custom-export.
    const memoryResult = await buildMemoryContext(supabase, user.id, {
      includeWarm: true,
      format: "markdown",
      useCase: "general",
      maxTokens: 3000,
    });

    // Fire-and-forget reliance signal on the facts that shipped into the
    // context. Never awaited; user-JWT client is fenced by auth.uid().
    {
      const touchIds = memoryResult.touchedFactIds ?? [];
      if (touchIds.length) {
        void supabase.rpc("touch_memory_facts", { p_fact_ids: touchIds })
          .then(({ error }) => { if (error) console.warn("touch failed:", error.message); });
      }
    }

    const { data: edgeProfile } = await serviceClient
      .from("edge_profiles")
      .select("strengths, weaknesses")
      .eq("user_id", user.id)
      .single();

    let profileContext = "";
    if (edgeProfile) {
      const strengths = (edgeProfile.strengths || [])
        .map((s: { label: string; summary: string }) => `- ${s.label}: ${s.summary}`)
        .join("\n");
      const weaknesses = (edgeProfile.weaknesses || [])
        .map((w: { label: string; summary: string }) => `- ${w.label}: ${w.summary}`)
        .join("\n");
      if (strengths) profileContext += `LEADER'S STRENGTHS:\n${strengths}\n`;
      if (weaknesses) profileContext += `LEADER'S GAPS TO COVER:\n${weaknesses}\n`;
    }

    // Generate via the LLM. JSON mode keeps the model on-format. The
    // system prompt encodes the triage gate + extraction rules.
    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          { role: "system", content: buildSkillSystemPrompt() },
          {
            role: "user",
            content: buildSkillUserPrompt({
              transcript,
              memoryContext: memoryResult.context,
              profileContext,
              seed,
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

    // Record the spend signal (service role: ai_usage_audit has no INSERT policy).
    await recordAiUsage(serviceClient, {
      userId: user.id,
      functionName: "generate-skill-export",
      provider: providerFromModel(aiResponse.model),
      model: aiResponse.model,
      purpose: "skill-export",
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      status: "ok",
    });

    let parsed: SkillJson;
    try {
      parsed = JSON.parse(aiResponse.content || "{}") as SkillJson;
    } catch (err) {
      console.error("generate-skill-export: failed to parse LLM JSON", err, aiResponse.content?.slice(0, 200));
      return jsonResponse(
        { error: "We couldn't generate a skill from this. Try being more specific about the steps you follow." },
        502,
      );
    }

    if (!parsed?.triage) {
      return jsonResponse(
        { error: "We couldn't generate a skill from this. Try being more specific about the steps you follow." },
        502,
      );
    }

    // Triage failure - record the routing decision so the UI can show what to do next.
    if (!parsed.triage.passed) {
      const triageResult = parsed.triage.result || "memory_fact";
      await serviceClient.from("skill_exports").insert({
        user_id: user.id,
        skill_name: skillNameHint || "(triage routed)",
        description: parsed.triage.reasoning || "",
        transcript,
        triage_result: triageResult,
      });

      return jsonResponse({
        triage: {
          passed: false,
          result: triageResult,
          reasoning: parsed.triage.reasoning || "",
        },
      }, 200);
    }

    // Triage passed - validate, package, persist.
    const skill = parsed.skill;
    if (!skill || !skill.name || !skill.description || !skill.body) {
      return jsonResponse(
        { error: "The generated skill was incomplete. Please try again." },
        502,
      );
    }

    const skillData: SkillData = {
      name: skill.name,
      description: skill.description,
      body: skill.body,
      references: skill.references || [],
      test_prompts: skill.test_prompts || [],
    };

    const qualityGate = runQualityGate(skillData);

    // Hard-fail only on the name format check - everything else is advisory
    // and shown to the user so they can decide whether to regenerate.
    const nameCheck = qualityGate.checks.find((c) => c.id === "package.nameFormat");
    if (nameCheck && !nameCheck.passed) {
      return jsonResponse(
        { error: `Generated skill name "${skill.name}" is invalid. Please regenerate.` },
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
      client: user.email || undefined,
    });

    // Persist the export record. zip_path is left null for now - we return
    // the ZIP inline as base64 and let the client trigger the download. We
    // can wire Storage uploads later if we want shareable links.
    const { data: insertRow } = await serviceClient
      .from("skill_exports")
      .insert({
        user_id: user.id,
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
      })
      .select("id, created_at")
      .single();

    // Also persist in the unified generated_artifacts table so the Library
    // tab on /memory can surface it alongside drafts, frameworks, exports,
    // and custom briefings. Quiet on failure - if the table doesn't exist
    // yet (migration not yet applied), the user still gets their skill.
    const { error: artifactInsertError } = await serviceClient
      .from("generated_artifacts")
      .insert({
        user_id: user.id,
        kind: "skill",
        name: skill.name,
        body: skill.body,
        metadata: {
          archetype: skill.archetype || null,
          zip_filename: `${skill.name}.zip`,
          skill_export_id: insertRow?.id || null,
          test_prompts: skill.test_prompts || [],
        },
      });
    if (artifactInsertError) {
      console.warn(
        "generate-skill-export: generated_artifacts insert failed",
        artifactInsertError,
      );
    }

    return jsonResponse({
      soft_cap: softCap,
      triage: parsed.triage,
      skill: {
        id: insertRow?.id || null,
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
      created_at: insertRow?.created_at || new Date().toISOString(),
    }, 200);
  } catch (err) {
    console.error("generate-skill-export error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
