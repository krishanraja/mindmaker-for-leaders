// Types for the Agent Skill Builder feature.
// Mirror the JSON shape returned by the generate-skill-export edge function.

export type SkillTriageResult = "skill" | "custom_instruction" | "memory_fact" | "saved_style";

/**
 * A SkillSeed lets an entry-point pre-anchor skill generation in an existing
 * pain the user has already declared (a blocker, an active decision, a briefing
 * segment about a decision trigger, etc.). The seed flows: entry point ->
 * /context route state -> SkillCaptureSheet -> generate-skill-export body.
 * The LLM uses it to ground extraction in the leader's actual situation
 * instead of starting from a blank prompt.
 */
export type SkillSeedKind =
  | "blocker"
  | "decision"
  | "mission"
  | "briefing_segment"
  | "example";

export interface SkillSeed {
  kind: SkillSeedKind;
  text: string;
  /** Optional: original row id so we can backlink the resulting skill. */
  fact_id?: string;
  decision_id?: string;
  /** Optional: short label rendered as the chip the user tapped. */
  label?: string;
}

export type SkillArchetype =
  | "decision-framework"
  | "voice-lock"
  | "reporting-engine"
  | "tool-integration"
  | "getting-started";

export interface SkillTriage {
  passed: boolean;
  result: SkillTriageResult;
  reasoning?: string;
}

export interface SkillReference {
  filename: string;
  content: string;
}

export interface SkillData {
  id?: string | null;
  name: string;
  description: string;
  body: string;
  references: SkillReference[];
  test_prompts: string[];
  gotchas: string[];
  archetype: SkillArchetype | string | null;
}

export interface SkillQualityCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface SkillQualityGate {
  checks: SkillQualityCheck[];
  summary: { passed: number; total: number };
}

/**
 * What the delivery screen may say about the built package: the label from
 * releaseVerdict, the sentence behind it, and the numbers with the provenance
 * that says what they were measured on. Absent from older responses, and from
 * `free-skill-export`, which is the honest state for a build with no compiled
 * standard behind it. The shape is read (and re-derived) by
 * `_shared/skill-release.ts`.
 */
export interface SkillReleaseBlock {
  label: "draft" | "provisional" | "verified";
  reason: string;
  numbers: Record<string, unknown> | null;
  criteria_version?: number;
  rendered_at?: string;
}

export interface SkillExportSuccess {
  triage: SkillTriage;
  skill: SkillData;
  quality_gate: SkillQualityGate;
  release?: SkillReleaseBlock | null;
  zip_base64: string;
  zip_filename: string;
  zip_byte_length: number;
  created_at: string;
}

export interface SkillExportTriageRouted {
  triage: SkillTriage;
}

export type SkillExportResponse = SkillExportSuccess | SkillExportTriageRouted;

export function isSkillSuccess(r: SkillExportResponse): r is SkillExportSuccess {
  return r.triage.passed === true && "skill" in r;
}
