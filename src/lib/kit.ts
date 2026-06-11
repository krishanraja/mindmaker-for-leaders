/**
 * Kit Engine client plumbing: row shapes for the kit tables, the shared edge
 * invoke wrapper, and the small storage helpers the portal pages share.
 *
 * The kit tables are newer than the committed generated Supabase types, so
 * the hooks access them through an untyped client and these interfaces
 * enforce the row shape (same pattern as useGoals / useDecisionEngine).
 */

import { supabase } from "@/integrations/supabase/client";
import type { IntakeAnswers, KitTool } from "@/content/kits";

/* ------------------------------------------------------------------ */
/* Row shapes                                                           */
/* ------------------------------------------------------------------ */

export type KitBuildStatus = "queued" | "running" | "partial" | "complete" | "failed";
export type KitArtifactBuildStatus = "queued" | "running" | "done" | "failed" | "skipped";

export interface KitRedemptionRow {
  id: string;
  class_slug: string;
  preset_version: string;
  redeemed_at: string;
  expires_at: string | null;
  status: string;
  skill_quota: number;
  skills_used: number;
  delivery_email: string | null;
}

export interface KitArtifactStatusEntry {
  status: KitArtifactBuildStatus;
  error?: string;
  kit_artifact_id?: string;
}

export interface KitBuildRow {
  id: string;
  redemption_id: string;
  kind: "initial" | "regenerate" | "new_skill";
  status: KitBuildStatus;
  intake: IntakeAnswers;
  artifact_statuses: Record<string, KitArtifactStatusEntry>;
  created_at: string;
}

export interface KitArtifactRow {
  id: string;
  redemption_id: string;
  artifact_id: string;
  version: number;
  is_current: boolean;
  title: string;
  content_type: "markdown" | "json" | "zip";
  body: string | null;
  storage_path: string | null;
  /** Small ZIP artifacts are stored inline as base64 (same pattern as free-skill-export). */
  zip_base64: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface KitJourneyEventRow {
  event_type: "day_checked" | "day_unchecked" | "shipped";
  day_index: number | null;
  note: string | null;
  created_at: string;
}

export const TERMINAL_BUILD_STATUSES: ReadonlyArray<KitBuildStatus> = [
  "complete",
  "partial",
  "failed",
];

export function isTerminalBuildStatus(status: KitBuildStatus): boolean {
  return TERMINAL_BUILD_STATUSES.includes(status);
}

/* ------------------------------------------------------------------ */
/* Edge invoke wrapper                                                  */
/* ------------------------------------------------------------------ */

/**
 * Invoke a kit edge function and normalise the result. supabase-js surfaces
 * non-2xx responses via error.context (a Response); the kit functions put
 * structured fields (result, maven_url, quota_exhausted, pass_expired) in
 * those bodies, so we parse the body either way and hand both the payload
 * and a human-readable message back to the caller.
 */
export async function invokeKit<T extends object>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ payload: (T & { error?: string }) | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    let payload = (data ?? null) as (T & { error?: string }) | null;
    if (error) {
      const ctx = (error as { context?: Response } | null)?.context;
      if (!payload && ctx && typeof ctx.text === "function") {
        try {
          const text = await ctx.clone().text();
          payload = text ? (JSON.parse(text) as T & { error?: string }) : null;
        } catch {
          payload = null;
        }
      }
      const message =
        (payload?.error ? String(payload.error) : null) ||
        (error as Error | null)?.message ||
        "Something went wrong. Try again.";
      return { payload, errorMessage: message };
    }
    if (payload && typeof payload === "object" && payload.error) {
      return { payload, errorMessage: String(payload.error) };
    }
    return { payload, errorMessage: null };
  } catch {
    return {
      payload: null,
      errorMessage: "Could not reach the server. Check your connection and try again.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Local storage                                                        */
/* ------------------------------------------------------------------ */

export const KIT_HINT_KEY = "ctrl_kit_hint";
export const KIT_INTAKE_KEY = "ctrl_kit_intake";
export const KIT_BUILD_KEY = "ctrl_kit_build";
export const KIT_PACK_SENT_KEY = "ctrl_kit_pack_sent";

export interface KitHint {
  code: string;
  redemption_id: string;
  class_slug: string;
}

export function readKitHint(): KitHint | null {
  try {
    const raw = localStorage.getItem(KIT_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KitHint;
    return parsed && typeof parsed.code === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeKitHint(hint: KitHint): void {
  try {
    localStorage.setItem(KIT_HINT_KEY, JSON.stringify(hint));
  } catch {
    // Storage full or blocked; the hint is best-effort only.
  }
}

export function readIntakeDraft(): IntakeAnswers {
  try {
    const raw = sessionStorage.getItem(KIT_INTAKE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as IntakeAnswers;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeIntakeDraft(answers: IntakeAnswers): void {
  try {
    sessionStorage.setItem(KIT_INTAKE_KEY, JSON.stringify(answers));
  } catch {
    // Best-effort persistence.
  }
}

export function isPackSent(): boolean {
  try {
    return localStorage.getItem(KIT_PACK_SENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPackSent(): void {
  try {
    localStorage.setItem(KIT_PACK_SENT_KEY, "1");
  } catch {
    // Best-effort flag.
  }
}

/* ------------------------------------------------------------------ */
/* Artifact payload parsers                                             */
/* ------------------------------------------------------------------ */

export interface KitSkillMeta {
  name: string;
  description: string;
  test_prompts?: string[];
  gotchas?: string[];
  archetype?: string | null;
}

export function skillMetaFromArtifact(artifact: KitArtifactRow | undefined): KitSkillMeta | null {
  const meta = artifact?.metadata as { skill?: KitSkillMeta } | null | undefined;
  if (meta?.skill && typeof meta.skill.name === "string") return meta.skill;
  return null;
}

export function zipFilenameFromArtifact(artifact: KitArtifactRow): string {
  const meta = artifact.metadata as { zip_filename?: string } | null;
  return meta?.zip_filename ?? `${artifact.artifact_id}.zip`;
}

export interface KitMap {
  stage: string;
  firstBuild: string;
  tool: string;
  tier: string;
  path: string;
}

export function parseKitMap(body: string | null): KitMap | null {
  try {
    const parsed = JSON.parse(body ?? "") as KitMap;
    return parsed && typeof parsed.firstBuild === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export interface KitPlanDay {
  day: number;
  title: string;
  action: string;
  minutes: number;
}

export function parseKitPlan(body: string | null): KitPlanDay[] | null {
  try {
    const parsed = JSON.parse(body ?? "") as { days?: KitPlanDay[] };
    if (!Array.isArray(parsed?.days) || parsed.days.length === 0) return null;
    return parsed.days.filter((d) => typeof d.day === "number" && typeof d.title === "string");
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                         */
/* ------------------------------------------------------------------ */

/** Where "Open {tool}" can actually deep-link. Desktop tools are omitted. */
export const KIT_TOOL_URLS: Partial<Record<KitTool, string>> = {
  claude: "https://claude.ai",
  chatgpt: "https://chatgpt.com",
  gemini: "https://gemini.google.com",
};

/** "10 July" style label for pass copy. */
export function formatPassDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long" });
  } catch {
    return "";
  }
}

/** Whole days from `fromIso` to `toIso` (defaults to now), minimum 1. */
export function daysBetween(fromIso: string, toIso?: string | null): number {
  try {
    const from = new Date(fromIso).getTime();
    const to = toIso ? new Date(toIso).getTime() : Date.now();
    return Math.max(1, Math.ceil((to - from) / 86_400_000));
  } catch {
    return 1;
  }
}
