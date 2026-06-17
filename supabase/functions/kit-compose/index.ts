/**
 * kit-compose
 *
 * The Kit Engine orchestrator. Takes a redemption + intake answers and
 * composes every artifact in the class preset's manifest: deterministic
 * templates (zero LLM), one batched polish call, the skill pipeline (reusing
 * generate-skill-export's prompt / quality-gate / zip modules exactly like
 * free-skill-export does), scaffold ZIPs, and one plan call.
 *
 * Modes:
 *   initial    - first compose after intake. Also seeds Memory Web facts.
 *   regenerate - re-compose (optionally only some artifacts) with feedback.
 *                Unlimited on an active pass.
 *   new_skill  - a net-new skill beyond the kit. Consumes the pass quota.
 *
 * Responds 202 with { build_id } immediately and continues in the background
 * via EdgeRuntime.waitUntil (same pattern as decision-engine); the frontend
 * polls kit_builds.artifact_statuses. Partial failure ships the pack with
 * whatever succeeded; failed artifacts stay retryable via only_artifact_ids.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { buildSkillSystemPrompt, buildSkillUserPrompt } from "../generate-skill-export/prompt.ts";
import { runQualityGate, type SkillData } from "../generate-skill-export/quality-gate.ts";
import { buildSkillZip } from "../generate-skill-export/zip.ts";
import { selectModel } from "../_shared/openai-utils.ts";
import { callLLMWithFallback, providerFromModel } from "../_shared/llm-fallback.ts";
import { recordAiUsage, checkDailySoftCap } from "../_shared/ai-usage.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";
import { buildMemoryContext } from "../_shared/memory-context-builder.ts";
import {
  getPreset,
  toolFromIntake,
  type ArtifactBuildContext,
  type ArtifactSpec,
  type IntakeAnswers,
  type KitPreset,
} from "../_shared/kit-presets/index.ts";

// EdgeRuntime is a Supabase runtime global; declared for the type checker.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("kit-compose");

type BuildKind = "initial" | "regenerate" | "new_skill";

interface ArtifactStatus {
  status: "queued" | "running" | "done" | "failed" | "skipped";
  error?: string;
  kit_artifact_id?: string;
}

interface SkillJson {
  triage: { passed: boolean; result: string; reasoning?: string };
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
    if (!authHeader) return jsonResponse({ error: "Session required." }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return jsonResponse({ error: "Session required." }, 401);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Per-user rate limit; never per IP (a venue full of students shares one).
    const rl = await checkRateLimit(
      { maxRequests: 8, windowMs: 60 * 60 * 1000, identifier: "kit-compose" },
      user.id,
      serviceClient,
    );
    if (!rl.allowed) {
      return jsonResponse({ error: "You have composed several times in a row. Give it a few minutes.", rate_limited: true }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const redemptionId = typeof body?.redemption_id === "string" ? body.redemption_id : "";
    const kind: BuildKind = ["initial", "regenerate", "new_skill"].includes(body?.kind)
      ? body.kind
      : "initial";

    if (!redemptionId) return jsonResponse({ error: "redemption_id is required." }, 400);

    const { data: redemption } = await serviceClient
      .from("kit_redemptions")
      .select("*")
      .eq("id", redemptionId)
      .maybeSingle();

    if (!redemption || redemption.user_id !== user.id) {
      return jsonResponse({ error: "Redemption not found." }, 404);
    }
    if (redemption.status !== "active" || new Date(redemption.expires_at) < new Date()) {
      return jsonResponse({ error: "Your pass has ended. Your kit stays downloadable; new generation needs Edge Pro.", pass_expired: true }, 403);
    }

    const preset = getPreset(redemption.class_slug);
    if (!preset) {
      log.error("unknown preset for redemption", { classSlug: redemption.class_slug });
      return jsonResponse({ error: "This class kit is not available right now." }, 500);
    }

    // Resolve intake: initial requires it; regenerate reuses the latest build's.
    let intake: IntakeAnswers = {};
    if (kind === "initial") {
      if (!body?.intake || typeof body.intake !== "object") {
        return jsonResponse({ error: "intake is required." }, 400);
      }
      intake = body.intake as IntakeAnswers;
    } else if (kind === "regenerate") {
      const { data: lastBuild } = await serviceClient
        .from("kit_builds")
        .select("intake")
        .eq("redemption_id", redemptionId)
        .neq("kind", "new_skill")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      intake = (lastBuild?.intake as IntakeAnswers) ?? {};
      if (body?.intake && typeof body.intake === "object") {
        intake = { ...intake, ...(body.intake as IntakeAnswers) };
      }
    }

    const feedback = typeof body?.feedback === "string" ? body.feedback.slice(0, 2000) : undefined;
    const onlyArtifactIds: string[] | null = Array.isArray(body?.only_artifact_ids)
      ? (body.only_artifact_ids as string[]).filter((x) => typeof x === "string")
      : null;

    // new_skill: soft quota check up front (atomic consume happens on success).
    const newSkillText = typeof body?.transcript === "string" ? body.transcript.trim() : "";
    if (kind === "new_skill") {
      if (redemption.skills_used >= redemption.skill_quota) {
        return jsonResponse({ error: "You have used the builds on your pass.", quota_exhausted: true }, 403);
      }
      if (newSkillText.length < 20) {
        return jsonResponse({ error: "Describe the workflow in a bit more detail (a sentence or two)." }, 400);
      }
    }

    // Target artifacts for this run.
    const targets: ArtifactSpec[] = kind === "new_skill"
      ? []
      : preset.artifacts
        .filter((a) => a.strategy !== "static")
        .filter((a) => !onlyArtifactIds || onlyArtifactIds.includes(a.id))
        .sort((a, b) => a.order - b.order);

    if (kind !== "new_skill" && targets.length === 0) {
      return jsonResponse({ error: "Nothing to compose." }, 400);
    }

    const statuses: Record<string, ArtifactStatus> = {};
    for (const t of targets) statuses[t.id] = { status: "queued" };
    if (kind === "new_skill") statuses["new-skill"] = { status: "queued" };

    const { data: build, error: buildErr } = await serviceClient
      .from("kit_builds")
      .insert({
        user_id: user.id,
        redemption_id: redemptionId,
        class_slug: redemption.class_slug,
        preset_version: preset.version,
        kind,
        status: "running",
        intake,
        feedback: feedback ?? null,
        only_artifact_ids: onlyArtifactIds,
        artifact_statuses: statuses,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (buildErr || !build) {
      log.error("kit_builds insert failed", { error: buildErr?.message });
      return jsonResponse({ error: "Could not start the build. Try again." }, 500);
    }

    await checkDailySoftCap(serviceClient, user.id, "kit-compose");

    const pipeline = processBuild({
      serviceClient,
      authHeader,
      userId: user.id,
      buildId: build.id,
      redemption,
      preset,
      kind,
      intake,
      feedback,
      targets,
      statuses,
      newSkillText,
    }).catch(async (err) => {
      log.error("processBuild crashed", { buildId: build.id, error: (err as Error).message });
      await serviceClient
        .from("kit_builds")
        .update({ status: "failed", error: (err as Error).message, finished_at: new Date().toISOString() })
        .eq("id", build.id);
    });

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(pipeline);
    } else {
      await pipeline;
    }

    return jsonResponse({ build_id: build.id }, 202);
  } catch (err) {
    log.error("kit-compose error", { error: (err as Error).message });
    return jsonResponse({ error: "Something went wrong. Try again." }, 500);
  }
});

interface ProcessArgs {
  serviceClient: SupabaseClient;
  authHeader: string;
  userId: string;
  buildId: string;
  redemption: Record<string, unknown> & { id: string; class_slug: string };
  preset: KitPreset;
  kind: BuildKind;
  intake: IntakeAnswers;
  feedback?: string;
  targets: ArtifactSpec[];
  statuses: Record<string, ArtifactStatus>;
  newSkillText: string;
}

async function processBuild(args: ProcessArgs): Promise<void> {
  const { serviceClient, userId, buildId, redemption, preset, kind, intake, feedback, targets, statuses } = args;

  const flushStatuses = async () => {
    await serviceClient
      .from("kit_builds")
      .update({ artifact_statuses: statuses })
      .eq("id", buildId);
  };

  // 1. Memory Web seeding (initial builds only). Deterministic chip answers
  //    land verified; free text goes through the full extract-user-context
  //    machinery (guardrails, validation, dedup) fire-and-forget.
  if (kind === "initial") {
    try {
      await writeIntakeFacts(args);
    } catch (err) {
      log.warn("intake fact seeding failed (non-fatal)", { buildId, error: (err as Error).message });
    }
  }

  // 2. Context assembly (best effort; cold start is an empty string).
  let memoryContext = "";
  try {
    const result = await buildMemoryContext(serviceClient, userId, {
      format: "markdown",
      useCase: "general",
      maxTokens: 3000,
    });
    memoryContext = result.context || "";
    // Fire-and-forget reliance signal on the facts that shipped into the
    // context. We are already inside the EdgeRuntime.waitUntil pipeline, so this
    // is off the response path. serviceClient is service-role, fenced by
    // auth.uid() IS NULL inside touch_memory_facts.
    const touchIds = result.touchedFactIds ?? [];
    if (touchIds.length) {
      void serviceClient.rpc("touch_memory_facts", { p_fact_ids: touchIds })
        .then(({ error }) => { if (error) log.warn("touch failed", { buildId, error: error.message }); });
    }
  } catch (err) {
    log.warn("buildMemoryContext failed (cold start)", { buildId, error: (err as Error).message });
  }

  const ctx: ArtifactBuildContext = {
    intake,
    tool: toolFromIntake(preset, intake),
    memoryContext,
    feedback,
    scores: safeScore(preset, intake),
    redeemedAt: String(redemption.redeemed_at ?? ""),
  };

  // 3. new_skill is a single-artifact run.
  if (kind === "new_skill") {
    const ok = await runSkillArtifact(args, ctx, null, args.newSkillText, "new-skill");
    if (ok) {
      await serviceClient.rpc("consume_kit_skill", { p_redemption_id: redemption.id });
    }
    await finishBuild(args);
    return;
  }

  // 4. Compose in order: skill first (later artifacts can reference its name),
  //    then deterministic and scaffolds, then the batched polish call, then
  //    the plan.
  const skillSpec = targets.find((t) => t.strategy === "skill_pipeline");
  if (skillSpec) {
    statuses[skillSpec.id] = { status: "running" };
    await flushStatuses();
    const seed = skillSpec.buildSeed?.(ctx);
    if (seed?.transcript) {
      const skillName = await runSkillArtifact(args, ctx, skillSpec, seed.transcript, skillSpec.id);
      if (skillName) ctx.firstSkillName = skillName;
    } else {
      statuses[skillSpec.id] = { status: "failed", error: "No seed produced from intake." };
    }
    await flushStatuses();
  }

  for (const spec of targets) {
    if (spec.strategy !== "deterministic" && spec.strategy !== "scaffold_zip") continue;
    statuses[spec.id] = { status: "running" };
    await flushStatuses();
    try {
      if (spec.strategy === "deterministic") {
        const body = spec.render ? spec.render(ctx) : "";
        if (!body) throw new Error("render() returned empty content");
        const id = await persistArtifact(args, spec, { body });
        statuses[spec.id] = { status: "done", kit_artifact_id: id };
      } else {
        const files = spec.renderFiles ? spec.renderFiles(ctx) : [];
        if (!files.length) throw new Error("renderFiles() returned no files");
        const zip = new JSZip();
        for (const f of files) zip.file(f.path, f.content);
        const base64 = await zip.generateAsync({ type: "base64" });
        const id = await persistArtifact(args, spec, {
          zipBase64: base64,
          metadata: { files: files.map((f) => f.path), zip_filename: `${spec.id}.zip` },
        });
        statuses[spec.id] = { status: "done", kit_artifact_id: id };
      }
    } catch (err) {
      log.warn("artifact failed", { buildId, artifact: spec.id, error: (err as Error).message });
      statuses[spec.id] = { status: "failed", error: friendlyError(err) };
    }
    await flushStatuses();
  }

  // 4b. The org chart (one structured-JSON call). Stored as a json artifact
  //     flagged metadata.render = "orgchart" so KitHome renders OrgChartView.
  //     Deterministic honest fallback (spec.render) when the call fails or the
  //     payload is unusable, so the hero artifact is never empty.
  const chartSpec = targets.find((t) => t.strategy === "llm_chart");
  if (chartSpec) {
    statuses[chartSpec.id] = { status: "running" };
    await flushStatuses();
    try {
      const chartJson = await runChart(args, ctx, chartSpec);
      const id = await persistArtifact(args, chartSpec, {
        body: chartJson,
        metadata: { render: "orgchart" },
      });
      statuses[chartSpec.id] = { status: "done", kit_artifact_id: id };
    } catch (err) {
      statuses[chartSpec.id] = { status: "failed", error: friendlyError(err) };
    }
    await flushStatuses();
  }

  // 5. Batched polish call: one request covers every llm_polish artifact.
  const polishSpecs = targets.filter((t) => t.strategy === "llm_polish");
  if (polishSpecs.length > 0) {
    for (const s of polishSpecs) statuses[s.id] = { status: "running" };
    await flushStatuses();
    let polished: Record<string, string> = {};
    try {
      polished = await runPolishBatch(args, ctx, polishSpecs);
    } catch (err) {
      log.warn("polish batch failed; using fallbacks", { buildId, error: (err as Error).message });
    }
    for (const spec of polishSpecs) {
      try {
        const body = polished[spec.id] || (spec.render ? spec.render(ctx) : "");
        if (!body) throw new Error("No polished content and no fallback");
        const id = await persistArtifact(args, spec, {
          body,
          metadata: { polished: Boolean(polished[spec.id]) },
        });
        statuses[spec.id] = { status: "done", kit_artifact_id: id };
      } catch (err) {
        statuses[spec.id] = { status: "failed", error: friendlyError(err) };
      }
    }
    await flushStatuses();
  }

  // 6. The plan (one mid-tier call, deterministic fallback).
  const planSpec = targets.find((t) => t.strategy === "llm_plan");
  if (planSpec) {
    statuses[planSpec.id] = { status: "running" };
    await flushStatuses();
    try {
      const planJson = await runPlan(args, ctx, planSpec);
      const id = await persistArtifact(args, planSpec, { body: planJson });
      statuses[planSpec.id] = { status: "done", kit_artifact_id: id };
    } catch (err) {
      statuses[planSpec.id] = { status: "failed", error: friendlyError(err) };
    }
    await flushStatuses();
  }

  await finishBuild(args);
}

async function finishBuild(args: ProcessArgs): Promise<void> {
  const { serviceClient, buildId, statuses } = args;
  const values = Object.values(statuses);
  const done = values.filter((v) => v.status === "done").length;
  const failed = values.filter((v) => v.status === "failed").length;
  const status = failed === 0 ? "complete" : done > 0 ? "partial" : "failed";
  await serviceClient
    .from("kit_builds")
    .update({
      status,
      artifact_statuses: statuses,
      finished_at: new Date().toISOString(),
    })
    .eq("id", buildId);
  log.info("build finished", { buildId, outcome: status, done, failed });
}

/** Insert a kit_artifacts row as the new current version. */
async function persistArtifact(
  args: ProcessArgs,
  spec: ArtifactSpec,
  data: { body?: string; zipBase64?: string; metadata?: Record<string, unknown> },
): Promise<string> {
  const { serviceClient, userId, buildId, redemption } = args;

  const { data: prev } = await serviceClient
    .from("kit_artifacts")
    .select("version")
    .eq("redemption_id", redemption.id)
    .eq("artifact_id", spec.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (prev?.version ?? 0) + 1;

  if (prev) {
    await serviceClient
      .from("kit_artifacts")
      .update({ is_current: false })
      .eq("redemption_id", redemption.id)
      .eq("artifact_id", spec.id)
      .eq("is_current", true);
  }

  const { data: row, error } = await serviceClient
    .from("kit_artifacts")
    .insert({
      user_id: userId,
      redemption_id: redemption.id,
      build_id: buildId,
      artifact_id: spec.id,
      version,
      is_current: true,
      title: spec.title,
      content_type: spec.contentType,
      body: data.body ?? null,
      zip_base64: data.zipBase64 ?? null,
      metadata: { part: spec.part ?? null, description: spec.description, ...(data.metadata ?? {}) },
    })
    .select("id")
    .single();

  if (error || !row) throw new Error(error?.message || "artifact insert failed");
  return row.id as string;
}

/**
 * Run the skill pipeline for one artifact. Returns the skill name on success,
 * null on failure (status recorded by the caller via statuses map updates here).
 */
async function runSkillArtifact(
  args: ProcessArgs,
  ctx: ArtifactBuildContext,
  spec: ArtifactSpec | null,
  transcript: string,
  statusKey: string,
): Promise<string | null> {
  const { serviceClient, userId, buildId, statuses } = args;
  statuses[statusKey] = { status: "running" };

  const attempt = async (extraFraming: boolean): Promise<SkillJson> => {
    const framed = extraFraming
      ? `${transcript}\n\nThis is a repeatable workflow I do every week. It is specialised to how I work and bounded to one job.`
      : transcript;
    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          { role: "system", content: buildSkillSystemPrompt() },
          {
            role: "user",
            content: buildSkillUserPrompt({
              transcript: framed,
              memoryContext: ctx.memoryContext,
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
      functionName: "kit-compose",
      provider: providerFromModel(aiResponse.model),
      model: aiResponse.model,
      purpose: "kit-skill",
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      status: "ok",
    });
    return JSON.parse(aiResponse.content || "{}") as SkillJson;
  };

  try {
    let parsed = await attempt(false);
    if (!parsed?.triage?.passed || !parsed.skill?.name) {
      // One retry with stronger repeatable-workflow framing: a kit student
      // must walk away with an installable artifact.
      parsed = await attempt(true);
    }
    const skill = parsed.skill;
    if (!parsed?.triage?.passed || !skill?.name || !skill.description || !skill.body) {
      statuses[statusKey] = {
        status: "failed",
        error: "We could not shape that into a skill. Tune it from your kit page and regenerate.",
      };
      return null;
    }

    const skillData: SkillData = {
      name: skill.name,
      description: skill.description,
      body: skill.body,
      references: skill.references || [],
      test_prompts: skill.test_prompts || [],
    };
    let qualityGate = runQualityGate(skillData);
    const nameCheck = qualityGate.checks.find((c) => c.id === "package.nameFormat");
    if (nameCheck && !nameCheck.passed) {
      // Silent single regenerate on the one hard-fail check.
      const retried = await attempt(true);
      if (retried.skill?.name && retried.triage?.passed) {
        skillData.name = retried.skill.name;
        skillData.description = retried.skill.description;
        skillData.body = retried.skill.body;
        skillData.references = retried.skill.references || [];
        skillData.test_prompts = retried.skill.test_prompts || [];
        qualityGate = runQualityGate(skillData);
      }
      const recheck = qualityGate.checks.find((c) => c.id === "package.nameFormat");
      if (recheck && !recheck.passed) {
        statuses[statusKey] = { status: "failed", error: "The generated skill came out malformed. Regenerate from your kit page." };
        return null;
      }
    }

    const zipResult = await buildSkillZip({
      name: skillData.name,
      description: skillData.description,
      body: skillData.body,
      references: skillData.references || [],
      testPrompts: skillData.test_prompts || [],
      archetype: skill.archetype,
    });

    // Mirror into skill_exports + generated_artifacts so the skill shows up in
    // the Library after an account upgrade (same as the existing pipelines).
    const { error: exportErr } = await serviceClient.from("skill_exports").insert({
      user_id: userId,
      skill_name: skillData.name,
      description: skillData.description,
      transcript,
      triage_result: "skill",
      body_content: skillData.body,
      references_json: skillData.references,
      test_prompts: skillData.test_prompts,
      quality_gate: qualityGate as unknown as Record<string, unknown>,
      archetype: skill.archetype || null,
      version: 1,
    });
    if (exportErr) log.warn("skill_exports mirror failed (non-fatal)", { buildId, error: exportErr.message });

    const { error: libErr } = await serviceClient.from("generated_artifacts").insert({
      user_id: userId,
      kind: "skill",
      name: skillData.name,
      body: skillData.body,
      metadata: {
        source: "kit",
        redemption_id: args.redemption.id,
        archetype: skill.archetype || null,
        zip_filename: `${skillData.name}.zip`,
        test_prompts: skillData.test_prompts,
      },
    });
    if (libErr) log.warn("generated_artifacts mirror failed (non-fatal)", { buildId, error: libErr.message });

    const persistSpec: ArtifactSpec = spec ?? {
      id: statusKey,
      title: skillData.name,
      order: 99,
      contentType: "zip",
      strategy: "skill_pipeline",
      description: "A net-new skill built on your pass.",
    };

    const artifactId = await persistArtifact(args, persistSpec, {
      body: skillData.body,
      zipBase64: zipResult.base64,
      metadata: {
        skill: {
          name: skillData.name,
          description: skillData.description,
          test_prompts: skillData.test_prompts,
          gotchas: skill.gotchas || [],
          archetype: skill.archetype || null,
        },
        quality_gate: qualityGate,
        zip_filename: `${skillData.name}.zip`,
      },
    });

    statuses[statusKey] = { status: "done", kit_artifact_id: artifactId };
    return skillData.name;
  } catch (err) {
    log.warn("skill artifact failed", { buildId, error: (err as Error).message });
    statuses[statusKey] = { status: "failed", error: friendlyError(err) };
    return null;
  }
}

/** One batched call producing every llm_polish artifact at once. */
async function runPolishBatch(
  args: ProcessArgs,
  ctx: ArtifactBuildContext,
  specs: ArtifactSpec[],
): Promise<Record<string, string>> {
  const { serviceClient, userId } = args;

  const tasks: Record<string, string> = {};
  for (const spec of specs) {
    if (spec.buildPrompt) tasks[spec.id] = spec.buildPrompt(ctx);
  }
  if (Object.keys(tasks).length === 0) return {};

  const system = [
    "You write crisp, personalized business artifacts in markdown for a named student.",
    "Voice: direct operator prose, sentence case, no buzzwords, no hype.",
    "Never use em dashes anywhere; use hyphens, commas, or parentheses.",
    "Where information is missing, write [FILL IN: what is needed] rather than inventing.",
    "Return a JSON object mapping each artifact id to its finished markdown string.",
    `Artifact ids: ${Object.keys(tasks).join(", ")}.`,
  ].join("\n");

  const userMsg = Object.entries(tasks)
    .map(([id, prompt]) => `### ARTIFACT ${id}\n${prompt}`)
    .join("\n\n");

  const aiResponse = await callLLMWithFallback(
    {
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      model: selectModel("complex"),
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    },
    { useCache: false },
  );

  await recordAiUsage(serviceClient, {
    userId,
    functionName: "kit-compose",
    provider: "openai",
    model: aiResponse.model,
    purpose: "kit-polish",
    promptTokens: aiResponse.usage?.prompt_tokens,
    completionTokens: aiResponse.usage?.completion_tokens,
    totalTokens: aiResponse.usage?.total_tokens,
    status: "ok",
  });

  const parsed = JSON.parse(aiResponse.content || "{}") as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const id of Object.keys(tasks)) {
    const v = parsed[id];
    if (typeof v === "string" && v.trim().length > 40) out[id] = v.trim();
  }
  return out;
}

/** The 7-day plan call. Falls back to a deterministic generic plan. */
async function runPlan(
  args: ProcessArgs,
  ctx: ArtifactBuildContext,
  spec: ArtifactSpec,
): Promise<string> {
  const { serviceClient, userId } = args;
  const fallback = JSON.stringify({
    days: [
      { day: 1, title: "Install", action: `Install ${ctx.firstSkillName || "your skill"} and run test prompt 1.`, minutes: 15 },
      { day: 2, title: "Real input", action: "Run it on one real piece of this week's work.", minutes: 15 },
      { day: 3, title: "Context pull", action: "Run the context pull prompt and keep the output.", minutes: 10 },
      { day: 4, title: "Tighten", action: "Fix the one thing that felt off and run it again.", minutes: 20 },
      { day: 5, title: "Show one human", action: "Show the output to one person who would use it.", minutes: 10 },
      { day: 6, title: "Fix their one thing", action: "Apply the single piece of feedback that matters.", minutes: 20 },
      { day: 7, title: "Ship it scrappy", action: "Use it for real and log I Shipped It on your kit page.", minutes: 15 },
    ],
  });

  if (!spec.buildPrompt) return fallback;

  try {
    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          {
            role: "system",
            content: "You design 7-day action plans. Every action takes 30 minutes or less and starts with a verb. No em dashes. Return JSON only.",
          },
          { role: "user", content: spec.buildPrompt(ctx) },
        ],
        model: selectModel("analysis"),
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );
    await recordAiUsage(serviceClient, {
      userId,
      functionName: "kit-compose",
      provider: providerFromModel(aiResponse.model),
      model: aiResponse.model,
      purpose: "kit-plan",
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      status: "ok",
    });
    const parsed = JSON.parse(aiResponse.content || "{}") as { days?: unknown[] };
    if (Array.isArray(parsed.days) && parsed.days.length === 7) {
      return JSON.stringify(parsed);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * The org-chart call. One structured-JSON request returning the OrgChartView
 * contract. Validated structurally here (preset-agnostic); on any failure or
 * malformed payload it falls back to the preset's deterministic honest chart
 * (spec.render), so the hero artifact is never empty and never fabricated.
 */
async function runChart(
  args: ProcessArgs,
  ctx: ArtifactBuildContext,
  spec: ArtifactSpec,
): Promise<string> {
  const { serviceClient, userId } = args;
  const fallback = spec.render ? spec.render(ctx) : "";
  if (!spec.buildPrompt) {
    if (!fallback) throw new Error("chart artifact has no buildPrompt and no fallback render()");
    return fallback;
  }

  try {
    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          {
            role: "system",
            content:
              "You author an honest agentic org chart as strict JSON for a named student. Use only what their answers support; never invent boxes, roles, metrics, or claims. Keep box labels exactly as given. No em dashes anywhere (use hyphens or commas). Return JSON only.",
          },
          { role: "user", content: spec.buildPrompt(ctx) },
        ],
        model: selectModel("complex"),
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );
    await recordAiUsage(serviceClient, {
      userId,
      functionName: "kit-compose",
      provider: providerFromModel(aiResponse.model),
      model: aiResponse.model,
      purpose: "kit-chart",
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      status: "ok",
    });
    const parsed = JSON.parse(aiResponse.content || "{}") as Record<string, unknown>;
    // Preset-owned validation + honesty floor (label-lock, one start box, the
    // guardrails -> minimum-oversight tag floor). Falls back when unusable.
    if (spec.refineChart) {
      const refined = spec.refineChart(parsed, ctx);
      if (isUsableChart(refined)) {
        return JSON.stringify(sanitizeChart(refined as Record<string, unknown>));
      }
      return fallback || JSON.stringify(parsed);
    }
    if (isUsableChart(parsed)) {
      return JSON.stringify(sanitizeChart(parsed));
    }
    return fallback || JSON.stringify(parsed);
  } catch {
    if (!fallback) throw new Error("chart compose failed and no fallback render()");
    return fallback;
  }
}

/** Structural gate: a chart object with a non-empty array of labelled boxes. */
function isUsableChart(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object") return false;
  const boxes = (raw as { boxes?: unknown }).boxes;
  if (!Array.isArray(boxes) || boxes.length === 0) return false;
  return boxes.every(
    (b) => b && typeof b === "object" && typeof (b as { label?: unknown }).label === "string",
  );
}

/** Drop any em dashes the model slipped in (house rule), shallow over strings. */
function sanitizeChart(raw: Record<string, unknown>): Record<string, unknown> {
  // Strip em dashes the model may slip in; the house rule is no em dashes
  // anywhere, and the source itself must not contain a literal one, so the
  // char is built from its code point (U+2014) rather than written inline.
  const emDash = new RegExp(String.fromCharCode(0x2014), "g");
  const fix = (v: unknown): unknown =>
    typeof v === "string" ? v.replace(emDash, "-") : v;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === "object"
          ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([ik, iv]) => [ik, fix(iv)]))
          : fix(item),
      );
    } else {
      out[k] = fix(v);
    }
  }
  return out;
}

/**
 * Memory Web seeding from intake. Chip answers with factMappings are written
 * directly as verified facts (the student literally tapped them). Free-text
 * answers go through extract-user-context (guardrails, validation, semantic
 * dedup) fire-and-forget with the caller's JWT.
 */
async function writeIntakeFacts(args: ProcessArgs): Promise<void> {
  const { serviceClient, authHeader, userId, preset, intake } = args;

  const { data: existing } = await serviceClient
    .from("user_memory")
    .select("fact_key")
    .eq("user_id", userId)
    .eq("is_current", true);
  const existingKeys = new Set((existing ?? []).map((r: { fact_key: string }) => r.fact_key));

  const rows: Record<string, unknown>[] = [];
  const freeText: string[] = [];

  for (const q of preset.intake) {
    const answer = intake[q.id];
    if (!answer) continue;

    if (q.type === "voice_text" && answer.text && answer.text.trim().length > 10) {
      freeText.push(`${q.prompt}\n${answer.text.trim()}`);
    }
    if (answer.text && q.optionalText && answer.text.trim().length > 2 && q.type !== "voice_text") {
      // optional one-liner on a chips question is handled via factMappings below
    }

    // Convention for questions carrying several mappings: the first mapping
    // without fromOptionId consumes the chip selection; any later unscoped
    // mapping consumes the optional text field (e.g. role chip + company
    // one-liner on the same screen).
    const unscoped = (q.factMappings ?? []).filter((m) => !m.fromOptionId);
    for (const m of q.factMappings ?? []) {
      if (existingKeys.has(m.fact_key)) continue;
      const selected = answer.optionId
        ? q.options?.find((o) => o.id === answer.optionId)
        : undefined;
      if (m.fromOptionId && answer.optionId !== m.fromOptionId) continue;
      const isSecondaryTextMapping = !m.fromOptionId && unscoped.indexOf(m) > 0;
      const text = answer.text && answer.text.trim().length > 2 ? answer.text.trim() : undefined;
      const value = m.fact_value
        ?? (isSecondaryTextMapping ? text : (selected?.label ?? text));
      if (!value) continue;
      rows.push({
        user_id: userId,
        fact_key: m.fact_key,
        fact_category: m.fact_category,
        fact_label: m.fact_label,
        fact_value: value,
        fact_context: `Kit intake (${preset.classTitle})`,
        confidence_score: 1.0,
        is_high_stakes: false,
        verification_status: "verified",
        source_type: "kit",
      });
      existingKeys.add(m.fact_key);
    }
  }

  if (rows.length > 0) {
    const { error } = await serviceClient.from("user_memory").insert(rows);
    if (error) log.warn("intake fact insert failed (non-fatal)", { error: error.message });
  }

  if (freeText.length > 0) {
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-user-context`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript: freeText.join("\n\n"), source_type: "kit" }),
    }).catch((err) => log.warn("extract-user-context trigger failed (non-fatal)", { error: (err as Error).message }));
  }
}

function safeScore(preset: KitPreset, intake: IntakeAnswers): unknown {
  try {
    return preset.score ? preset.score(intake) : undefined;
  } catch {
    return undefined;
  }
}

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message || "failed";
  return msg.length > 200 ? `${msg.slice(0, 200)}...` : msg;
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
