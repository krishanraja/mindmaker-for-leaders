/**
 * Vibe Coding Field Kit: deterministic intake derivations.
 *
 * Pure functions only: no LLM calls, no IO, no runtime globals. Every
 * derivation that reads intake answers lives here so templates, prompts and the
 * preset all derive from one place.
 *
 * The kit is re-centered on a SOLUTION. The intake is a short forked cascade:
 * fork self/biz, name + role, preferences (multi, how they like the AI to work
 * with them), past pains (multi, turned into guardrails), the one build (free
 * text), tool, level. Every derivation below reads those structured fields, so
 * the prompts and templates compose deterministically. The one free-text field
 * is the build; it is quoted, never parsed for hidden structure.
 */

import type { IntakeAnswers } from "../types.ts";
import { PAIN_GUARD, PAIN_OPTIONS, PREF_LABEL, PREFERENCE_OPTIONS } from "./templates.ts";

export type ExperienceLevel = "never" | "few-prompts" | "shipped";
export type MapStage = "prompting" | "first-builds" | "agents";
export type VibePathway = "self" | "biz";

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  never: "never built with AI before; this is the first build",
  "few-prompts": "a few prompts in, nothing shipped yet",
  shipped: "has shipped something before",
};

/* ------------------------------------------------------------------ */
/* Pathway / identity                                                   */
/* ------------------------------------------------------------------ */

export function pathwayFromIntake(intake: IntakeAnswers): VibePathway {
  return intake["pathway"]?.optionId === "biz" ? "biz" : "self";
}

const ROLE_LABELS_BIZ: Record<string, string> = {
  founder: "Founder",
  "run-a-team": "Team lead",
  "solo-operator": "Solo operator",
  consultant: "Consultant",
  "side-builder": "Side builder",
  student: "Student or early-career",
};

const ROLE_LABELS_SELF: Record<string, string> = {
  student: "Student or early-career",
  "side-builder": "Building on the side",
  "solo-operator": "Solo operator",
  freelancer: "Freelancer",
  "career-switcher": "Switching into a new field",
  curious: "Just curious",
};

export function roleFromIntake(intake: IntakeAnswers): string {
  const id = intake["profile"]?.optionId ?? "";
  const map = pathwayFromIntake(intake) === "biz" ? ROLE_LABELS_BIZ : ROLE_LABELS_SELF;
  return map[id] ?? (pathwayFromIntake(intake) === "biz" ? "Operator" : "Builder");
}

/** The person's name, typed into the profile nameField. Empty when skipped. */
export function nameFromIntake(intake: IntakeAnswers): string {
  return intake["profile"]?.text?.trim() ?? "";
}

/* ------------------------------------------------------------------ */
/* Preferences (how they like the AI to work with them)                 */
/* ------------------------------------------------------------------ */

/** The preference ids the person picked (multi), in option order. */
export function preferenceIdsFromIntake(intake: IntakeAnswers): string[] {
  const picked = intake["preferences"]?.optionIds ?? [];
  return PREFERENCE_OPTIONS.filter((o) => picked.includes(o.id)).map((o) => o.id);
}

/** The chosen preferences as their short behaviour labels (the working contract). */
export function preferenceLabelsFromIntake(intake: IntakeAnswers): string[] {
  return preferenceIdsFromIntake(intake)
    .map((id) => PREF_LABEL[id])
    .filter((l): l is string => Boolean(l));
}

/* ------------------------------------------------------------------ */
/* Past pains (turned into guardrails)                                  */
/* ------------------------------------------------------------------ */

/** The past-pain ids the person picked (multi), in option order. */
export function painIdsFromIntake(intake: IntakeAnswers): string[] {
  const picked = intake["pains"]?.optionIds ?? [];
  return PAIN_OPTIONS.filter((o) => picked.includes(o.id)).map((o) => o.id);
}

/** The chosen pains as their human labels (for reflect-back and context). */
export function painLabelsFromIntake(intake: IntakeAnswers): string[] {
  return painIdsFromIntake(intake)
    .map((id) => PAIN_OPTIONS.find((o) => o.id === id)?.label)
    .filter((l): l is string => Boolean(l));
}

/** The chosen pains mapped to the guardrails the kit installs (via PAIN_GUARD). */
export function guardrailsFromIntake(intake: IntakeAnswers): string[] {
  return painIdsFromIntake(intake)
    .map((id) => PAIN_GUARD[id])
    .filter((g): g is string => Boolean(g));
}

/* ------------------------------------------------------------------ */
/* The one build                                                        */
/* ------------------------------------------------------------------ */

/** The one thing the person wants to build, in their own words (the free text). */
export function buildFromIntake(intake: IntakeAnswers): string {
  return intake["build"]?.text?.trim() ?? "";
}

/**
 * A short, human build name derived from the build description. Used as the
 * skill nameHint, the hero header and the personal map. Deterministic; the
 * person can rename. Strips a leading article and a leading "a little app
 * that" style preamble so the name reads as a thing, not a sentence.
 */
export function shortBuildName(build: string): string {
  let cleaned = build.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Your first build";

  // Drop a common conversational preamble ("a little app that ...").
  cleaned = cleaned.replace(
    /^(a|an|the|some|my)?\s*(little|small|simple|quick|tiny)?\s*(app|tool|thing|script|bot|helper|system)\s+(that|which|to|for)\s+/i,
    "",
  );

  const stripped = cleaned.replace(/^(the|a|an)\s+/i, "").trim();
  let name = (stripped.split(/[.;,(\n]/)[0] ?? stripped).trim() || cleaned;

  if (name.length > 48) {
    const cut = name.slice(0, 48);
    const lastSpace = cut.lastIndexOf(" ");
    name = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
  }
  const filler =
    /\s(a|an|and|at|by|for|from|in|into|my|of|on|one|or|our|the|then|to|with)$/i;
  while (filler.test(name)) {
    name = name.replace(filler, "").trim();
  }
  if (!name) return "Your first build";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/* ------------------------------------------------------------------ */
/* Level (the old experience question)                                  */
/* ------------------------------------------------------------------ */

export function experienceFromIntake(intake: IntakeAnswers): ExperienceLevel {
  switch (intake["level"]?.optionId) {
    case "shipped":
      return "shipped";
    case "few-prompts":
      return "few-prompts";
    default:
      return "never";
  }
}

export function stageFromExperience(level: ExperienceLevel): MapStage {
  if (level === "shipped") return "agents";
  if (level === "few-prompts") return "first-builds";
  return "prompting";
}
