/**
 * Hero PDF data model (spec decision 1: a print-styled web route to PDF).
 *
 * This derives a deterministic, deeply-personalized document model from the
 * real kit data: the redemption, the build's typed intake, and the current
 * artifacts. It is generic across all four kits so the print route never
 * crashes a non-vibe kit; the vibe-coding fields are richest (preferences,
 * pains-as-guardrails, the one build), but every kit gets who-you-are, what you
 * are building, how you like to work, and the day-by-day path where present.
 *
 * No heavy PDF library: the route renders branded HTML/CSS sized for A4 and the
 * browser's "Save as PDF" (or window.print) produces the file.
 */

import {
  nameFromIntake,
  roleFromIntake,
  preferenceLabelsFromIntake,
  painLabelsFromIntake,
  guardrailsFromIntake,
  buildFromIntake,
  shortBuildName,
} from "../../supabase/functions/_shared/kit-presets/vibe-coding/scoring.ts";
import { KIT_TOOL_LABELS, toolFromIntake } from "@/content/kits";
import type { KitPreset, IntakeAnswers } from "@/content/kits";
import { parseKitPlan, type KitArtifactRow, type KitPlanDay } from "@/lib/kit";

export interface KitPdfModel {
  /** The kit's class title, e.g. "Vibe Coding Field Kit". */
  classTitle: string;
  /** The eyebrow over the hero, e.g. "Vibe Coding Operating Kit". */
  kitName: string;
  /** The big hero title, named to the person when known. */
  heroTitle: string;
  /** One-line subtitle under the hero. */
  heroSubtitle: string;
  /** Who they are: name + role line (may be just the role). */
  whoYouAre: string;
  /** How they like to work, as short behaviour lines (may be empty). */
  worksWithYou: string[];
  /** Their guardrails, phrased "we add ..." friendly (may be empty). */
  guardrails: string[];
  /** What they are building, in their words / a short name. */
  building: string | null;
  /** The tool they chose, named (or "your AI" when none). */
  toolName: string;
  /** The day-by-day path (may be empty for kits without a plan artifact). */
  plan: KitPlanDay[];
  /** "Made for how {name} works . any AI platform" footer line. */
  footer: string;
}

const VIBE_SLUG = "vibe-coding";

/**
 * Build the PDF model. Guarded for every kit: only the vibe-coding preset reads
 * the rich preference / pain fields; other kits fall back to their personal-map
 * artifact and the plan. Never throws on a missing field.
 */
export function buildKitPdfModel(
  preset: KitPreset,
  intake: IntakeAnswers,
  artifacts: KitArtifactRow[],
): KitPdfModel {
  const tool = toolFromIntake(preset, intake);
  const toolName = tool === "none" ? "your AI" : KIT_TOOL_LABELS[tool];

  // The plan artifact (vibe: "seven-day-plan"; org/process kits: same id or a
  // 90-day plan). Parse defensively; absent => empty plan, the section hides.
  const planArtifact = artifacts.find(
    (a) => a.artifact_id === "seven-day-plan" || a.artifact_id === "ninety-day-plan",
  );
  const plan = planArtifact ? parseKitPlan(planArtifact.body) ?? [] : [];

  // The personal-map / pack-map artifact carries a generic projection used as a
  // fallback for non-vibe kits (firstBuild, tool, worksWithYou, guardrails).
  const mapArtifact = artifacts.find(
    (a) => a.artifact_id === "personal-map" || a.artifact_id === "pack-map",
  );
  const map = mapArtifact ? parseMap(mapArtifact.body) : null;

  if (preset.slug === VIBE_SLUG) {
    const name = nameFromIntake(intake);
    const role = roleFromIntake(intake);
    const worksWithYou = preferenceLabelsFromIntake(intake);
    const guardrails = guardrailsFromIntake(intake);
    const build = buildFromIntake(intake);
    const buildName = shortBuildName(build);
    const painLabels = painLabelsFromIntake(intake);

    return {
      classTitle: preset.title,
      kitName: "Vibe Coding Operating Kit",
      heroTitle: name ? `${name}'s build, briefed.` : "Your build, briefed.",
      heroSubtitle:
        "Who you are, how you like to work, and your one build briefed so any AI can ship it with you.",
      whoYouAre: [name, role].filter(Boolean).join(", ") || role,
      worksWithYou,
      guardrails: guardrails.length > 0 ? guardrails : painLabels,
      building: build || (buildName !== "Your first build" ? buildName : null),
      toolName,
      plan,
      footer: `Made for how ${name || "you"} ${name ? "works" : "work"} . any AI platform`,
    };
  }

  // Generic fallback for the other three kits: read the map projection where it
  // exists, otherwise lean on the preset's own copy. Never crashes.
  return {
    classTitle: preset.title,
    kitName: preset.title,
    heroTitle: map?.firstBuild ? `${map.firstBuild}, mapped.` : preset.title,
    heroSubtitle: preset.tagline,
    whoYouAre: "",
    worksWithYou: map?.worksWithYou ?? [],
    guardrails: map?.guardrails ?? [],
    building: map?.firstBuild ?? null,
    toolName: map?.tool || toolName,
    plan,
    footer: `Built around you . any AI platform`,
  };
}

interface GenericMap {
  firstBuild?: string;
  tool?: string;
  worksWithYou?: string[];
  guardrails?: string[];
  path?: string;
}

function parseMap(body: string | null): GenericMap | null {
  try {
    const parsed = JSON.parse(body ?? "") as GenericMap;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
