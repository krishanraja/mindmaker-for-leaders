/**
 * Hero PDF data model (spec decision 1: a print-styled web route to PDF).
 *
 * This derives a deterministic, deeply-personalized document model from the
 * real kit data: the redemption, the build's typed intake, and the current
 * artifacts. Each of the four kits has its OWN tuned hero, built from that
 * kit's real composed data and intake (the same way the vibe hero reads vibe
 * data), and a final generic fallback covers any kit/slug not explicitly
 * handled. Every branch degrades safely on a missing field: it never throws and
 * never shows an empty placeholder, it simply hides the section.
 *
 * No heavy PDF library: the route renders branded HTML/CSS sized for A4 and the
 * browser's "Save as PDF" (or window.print) produces the file.
 *
 *   vibe-coding         -> "Your Vibe Coding Operating Kit"  (unchanged)
 *   autonomous-business -> "Your First Automation"
 *   orgchart            -> "Your Agentic Org Chart"
 *   memory-identity     -> "Your AI Identity Pack"
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
import {
  areaLabelsOf,
  externalLeaves,
  firstBuildName,
  HOURS_LABELS,
  involvesOf,
  nameOf as abNameOf,
  REVENUE_LABELS,
  scoreLeverage,
  timeSinkOf,
  whatItDoesOf,
  workflowOf,
} from "../../supabase/functions/_shared/kit-presets/autonomous-business/scoring.ts";
import {
  scoreChief,
  roleFromIntake as chiefRoleFromIntake,
} from "../../supabase/functions/_shared/kit-presets/chief-of-staff/scoring.ts";
import {
  RUNG_DETAIL,
  ROLE_LABEL as CHIEF_ROLE_LABEL,
  fitReasons,
} from "../../supabase/functions/_shared/kit-presets/chief-of-staff/templates.ts";
import { KIT_TOOL_LABELS, toolFromIntake } from "@/content/kits";
import type { KitPreset, IntakeAnswers } from "@/content/kits";
import {
  parseKitPlan,
  parseOrgChart,
  type KitArtifactRow,
  type KitPlanDay,
} from "@/lib/kit";
import type { OrgChart } from "@/components/kit/OrgChartView";

/* ------------------------------------------------------------------ */
/* The discriminated hero model: a shared shell + one body per kit      */
/* ------------------------------------------------------------------ */

/** The branded shell every kit shares (head, hero panel, footer). */
export interface KitPdfShell {
  /** The kit's class title, e.g. "Vibe Coding Field Kit". */
  classTitle: string;
  /** The eyebrow over the hero, e.g. "Vibe Coding Operating Kit". */
  kitName: string;
  /** The big hero title, named to the person when known. */
  heroTitle: string;
  /** One-line subtitle under the hero. */
  heroSubtitle: string;
  /** "Made for how {name} works . any AI platform" footer line. */
  footer: string;
}

/** Vibe Coding hero body (unchanged behaviour from the original model). */
export interface VibeHero {
  kind: "vibe";
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
}

/** One decomposed step of the chosen workflow, tagged by autonomy. */
export interface AutomationStep {
  label: string;
  /** green = AI owns it, amber = AI assists you, red = you only. */
  band: "owns" | "assists" | "you";
  /** The one-line plain reason for the band. */
  note: string;
}

/** Autonomous Business hero body: "Your First Automation". */
export interface AutonomousHero {
  kind: "autonomous";
  /** Who/what it is for (business sector or solo role), may be empty. */
  whoYouAre: string;
  /** The chosen workflow, named (e.g. "Following up after calls"). */
  workflow: string;
  /** The area it sits in (the time-sink), may be empty. */
  area: string;
  /** The verdict + one-line rationale from the leverage score, may be empty. */
  verdict: string;
  /** The decomposed steps, each tagged AI-owns / AI-assists / you-only. */
  steps: AutomationStep[];
  /** The guardrails: what never leaves the building without you (may be empty). */
  guardrails: string[];
  /** The tool they chose, named (or "your AI" when none). */
  toolName: string;
  /** The day-7 build path (the 7-day plan), may be empty. */
  plan: KitPlanDay[];
}

/** A single box on the org chart hero, color-coded by autonomy. */
export interface OrgChartHeroBox {
  label: string;
  band: "green" | "amber" | "red";
  /** The agent that runs/assists it, or the human-only note. */
  role: string;
  /** One-line description of the agent's job, may be empty. */
  desc: string;
  /** The human role beside it, may be empty. */
  humanRole: string;
  isStart: boolean;
}

/** One ranked "first agent to stand up" entry. */
export interface FirstAgent {
  box: string;
  why: string;
}

/** Agentic Org Chart hero body: "Your Agentic Org Chart". */
export interface OrgChartHero {
  kind: "orgchart";
  /** The leadership node label, e.g. "You" or "Owns the outcomes". */
  leadershipLabel: string;
  /** The business/operating-model name on the chart, may be empty. */
  businessName: string;
  /** Every box, color-coded green/amber/red. */
  boxes: OrgChartHeroBox[];
  /** The handoffs: amber boxes where the agent hands a draft to you. */
  handoffs: string[];
  /** The ranked first 1 to 3 agents to stand up, with the why. */
  firstAgents: FirstAgent[];
  /** The 90-day expansion path (the first-90-days plan), may be empty. */
  plan: KitPlanDay[];
}

/** Memory & Identity hero body: "Your AI Identity Pack". */
export interface MemoryHero {
  kind: "memory";
  /** Who the AI is: the one job (the narrowed role), may be empty. */
  job: string;
  /** The role headline of the person, may be empty. */
  role: string;
  /** The scope = the field-of-view boundary (the tasks it covers). */
  scope: string[];
  /** How you sound, in your own words (the voice), may be empty. */
  voice: string;
  /** What it must never store (the privacy line), may be empty. */
  neverStore: string[];
  /** The self-correction loop, as the three plain steps. */
  selfCorrect: string[];
  /** The tool they chose, named (or "your AI" when none). */
  toolName: string;
  /** The job file's name, e.g. "content-marketer.md". */
  jobFile: string;
}

/** A runner-up rung on the chief-of-staff recommendation. */
export interface ChiefRunnerUp {
  rung: number;
  name: string;
  oneLiner: string;
}

/** Build Your AI Chief of Staff hero body: "Your AI Chief of Staff, mapped". */
export interface ChiefHero {
  kind: "chief";
  /** The recommended rung number (1 to 7). */
  rung: number;
  /** The recommended rung's name, e.g. "Native, switched on". */
  rungName: string;
  /** One line on what that rung is. */
  oneLiner: string;
  /** The person's role, when given (may be empty). */
  whoYouAre: string;
  /** Why this rung fits them, traced to their answers. */
  fit: string[];
  /** The one wall to expect on this rung. */
  wall: string;
  /** The design call that heads that wall off. */
  designCall: string;
  /** The first concrete move. */
  firstStep: string;
  /** The tools for this rung. */
  tools: string[];
  /** The close-second rungs (may be empty). */
  runnersUp: ChiefRunnerUp[];
  /** Guardrail notes we held the line on (may be empty). */
  guardrails: string[];
  /** Standing warnings (autonomy) plus the pillars line. */
  warnings: string[];
  /** The first-week plan, day by day (may be empty). */
  plan: KitPlanDay[];
  /** The tool they chose, named (or "your AI" when none). */
  toolName: string;
}

/** Generic fallback body for any kit/slug not explicitly handled. */
export interface GenericHero {
  kind: "generic";
  whoYouAre: string;
  worksWithYou: string[];
  guardrails: string[];
  building: string | null;
  toolName: string;
  plan: KitPlanDay[];
}

export type KitPdfModel = KitPdfShell &
  (VibeHero | AutonomousHero | OrgChartHero | MemoryHero | ChiefHero | GenericHero);

const VIBE_SLUG = "vibe-coding";
const AUTONOMOUS_SLUG = "autonomous-business";
const ORGCHART_SLUG = "orgchart";
const MEMORY_SLUG = "memory-identity";
const CHIEF_SLUG = "chief-of-staff";

/* ------------------------------------------------------------------ */
/* The model builder: dispatch to the right per-kit hero                */
/* ------------------------------------------------------------------ */

/**
 * Build the PDF model. Each kit reads its own real data; every branch is
 * guarded so a missing field hides a section rather than throwing. A final
 * generic fallback covers any unrecognised slug.
 */
export function buildKitPdfModel(
  preset: KitPreset,
  intake: IntakeAnswers,
  artifacts: KitArtifactRow[],
): KitPdfModel {
  const tool = toolFromIntake(preset, intake);
  const toolName = tool === "none" ? "your AI" : KIT_TOOL_LABELS[tool];

  switch (preset.slug) {
    case VIBE_SLUG:
      return buildVibeHero(preset, intake, artifacts, toolName);
    case AUTONOMOUS_SLUG:
      return buildAutonomousHero(preset, intake, artifacts, toolName);
    case ORGCHART_SLUG:
      return buildOrgChartHero(preset, intake, artifacts);
    case MEMORY_SLUG:
      return buildMemoryHero(preset, intake, artifacts, toolName);
    case CHIEF_SLUG:
      return buildChiefHero(preset, intake, artifacts, toolName);
    default:
      return buildGenericHero(preset, intake, artifacts, toolName);
  }
}

/* ------------------------------------------------------------------ */
/* Plan + map helpers (shared, defensive)                              */
/* ------------------------------------------------------------------ */

/** Find a day-by-day plan artifact (7-day or 90-day) and parse it safely. */
function planFromArtifacts(artifacts: KitArtifactRow[]): KitPlanDay[] {
  const planArtifact = artifacts.find(
    (a) => a.artifact_id === "seven-day-plan" || a.artifact_id === "ninety-day-plan" || a.artifact_id === "first-90-days",
  );
  return planArtifact ? parseKitPlan(planArtifact.body) ?? [] : [];
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

/** Read a markdown artifact's body by id, trimmed; empty when absent. */
function markdownBody(artifacts: KitArtifactRow[], id: string): string {
  const a = artifacts.find((x) => x.artifact_id === id);
  return (a?.body ?? "").trim();
}

/* ------------------------------------------------------------------ */
/* Vibe Coding hero (unchanged content + behaviour)                    */
/* ------------------------------------------------------------------ */

function buildVibeHero(
  preset: KitPreset,
  intake: IntakeAnswers,
  artifacts: KitArtifactRow[],
  toolName: string,
): KitPdfModel {
  const plan = planFromArtifacts(artifacts);
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
    footer: `Made for how ${name || "you"} ${name ? "works" : "work"} . any AI platform`,
    kind: "vibe",
    whoYouAre: [name, role].filter(Boolean).join(", ") || role,
    worksWithYou,
    guardrails: guardrails.length > 0 ? guardrails : painLabels,
    building: build || (buildName !== "Your first build" ? buildName : null),
    toolName,
    plan,
  };
}

/* ------------------------------------------------------------------ */
/* Autonomous Business hero: "Your First Automation"                   */
/* ------------------------------------------------------------------ */

/**
 * The autonomy band for a decomposed step. The kit's intake collects what the
 * workflow involves (pull / write / update / wait / decide / send) and what
 * leaves the building (the guardrails). We map each involved step to a band:
 *   - "send it to a person" is AI-assists (you approve the handoff) by default,
 *     and forced to you-only when it touches a flagged guardrail.
 *   - "check or decide something" is AI-assists (the call stays human-checked).
 *   - everything internal (pull / write a draft / update a system) is AI-owns.
 * Deterministic; no LLM. Mirrors the founder's three-way model on the chart.
 */
const STEP_BANDS: Record<string, { band: AutomationStep["band"]; note: string }> = {
  "Pulling info from a tool": {
    band: "owns",
    note: "Internal lookup, no one outside sees it. The AI runs this end to end.",
  },
  "Writing a message or doc": {
    band: "owns",
    note: "Drafting is the AI's job; you review the draft, not write it.",
  },
  "Updating a system": {
    band: "owns",
    note: "A routine internal update the AI can make on its own.",
  },
  "Waiting on someone": {
    band: "assists",
    note: "The AI chases and tracks it; the person it waits on is still a person.",
  },
  "Checking or deciding something": {
    band: "assists",
    note: "The AI lays out the options; the call stays yours to confirm.",
  },
  "Sending it to a person": {
    band: "assists",
    note: "The AI prepares it and hands it to you to approve before it goes out.",
  },
};

function buildAutonomousHero(
  preset: KitPreset,
  intake: IntakeAnswers,
  artifacts: KitArtifactRow[],
  toolName: string,
): KitPdfModel {
  const name = abNameOf(intake);
  const whatItDoes = whatItDoesOf(intake);
  const workflow = workflowOf(intake);
  const area = timeSinkOf(intake);
  const involved = involvesOf(intake);

  // The guardrails: anything the person said never leaves without them.
  const guardLabels = externalLeaves(intake)
    .map((id) => AB_LEAVES_LABELS[id])
    .filter((l): l is string => Boolean(l));
  const hasExternalGuardrail = guardLabels.length > 0;

  // Decompose the workflow into its steps, each banded by autonomy. When a
  // step would expose work outside the building and the person fenced that off,
  // it is forced to you-only (the honesty floor, mirroring the chart kit).
  const steps: AutomationStep[] = involved.map((label) => {
    const base = STEP_BANDS[label] ?? { band: "assists" as const, note: "The AI does the legwork; you confirm before it counts as done." };
    if (label === "Sending it to a person" && hasExternalGuardrail) {
      return {
        label,
        band: "you",
        note: `This touches ${guardLabels.join(", ")}, which you said never leaves without you. You send it.`,
      };
    }
    return { label, band: base.band, note: base.note };
  });

  // The leverage verdict + one-line rationale (defensive: the readers never throw).
  let verdict = "";
  try {
    const score = scoreLeverage(intake);
    const hoursId = intake["hours"]?.optionId ?? "";
    const revenueId = intake["revenue"]?.optionId ?? "";
    const hoursLabel = HOURS_LABELS[hoursId];
    const revenueLabel = REVENUE_LABELS[revenueId];
    if (score.verdict && hoursLabel && revenueLabel) {
      verdict = `${capitalize(score.verdict)}. It eats ${hoursLabel} and it ${revenueLabel}.`;
    } else if (score.verdict) {
      verdict = capitalize(score.verdict) + ".";
    }
  } catch {
    verdict = "";
  }

  const workflowName = workflow || firstBuildName(intake);
  const plan = planFromArtifacts(artifacts);

  return {
    classTitle: preset.title,
    kitName: "Your First Automation",
    heroTitle: workflowName && workflowName !== "your first workflow"
      ? `${capitalize(workflowName)}, off your plate.`
      : "Your first workflow, off your plate.",
    heroSubtitle:
      "One recurring job decomposed step by step, the autonomy line drawn on each, and a build path to get it running by day 7.",
    footer: `Built for ${name || "your business"} . any AI platform`,
    kind: "autonomous",
    whoYouAre: [name, whatItDoes].filter(Boolean).join(", ") || whatItDoes,
    workflow: workflowName,
    area,
    verdict,
    steps,
    guardrails: guardLabels,
    toolName,
    plan,
  };
}

/** Human labels for the leaves (guardrail) option ids (kit-local copy). */
const AB_LEAVES_LABELS: Record<string, string> = {
  email: "email to real people",
  posting: "posting publicly",
  payments: "payments or invoices",
  "client-comms": "client communications",
};

/* ------------------------------------------------------------------ */
/* Agentic Org Chart hero: "Your Agentic Org Chart"                    */
/* ------------------------------------------------------------------ */

const TAG_TO_BAND: Record<string, OrgChartHeroBox["band"]> = {
  led: "green",
  assisted: "amber",
  excluded: "red",
};

function buildOrgChartHero(
  preset: KitPreset,
  intake: IntakeAnswers,
  artifacts: KitArtifactRow[],
): KitPdfModel {
  // The hero chart artifact (the composed OrgChart, or the deterministic
  // honest fallback the compose step always stores). Parse defensively.
  const chartArtifact = artifacts.find((a) => a.artifact_id === "agentic-org-chart");
  const chart: OrgChart | null = chartArtifact ? parseOrgChart(chartArtifact.body) : null;

  const boxes: OrgChartHeroBox[] = (chart?.boxes ?? []).map((b) => {
    const band = b.tag ? TAG_TO_BAND[b.tag] ?? "amber" : "amber";
    return {
      label: b.label,
      band,
      role:
        band === "red"
          ? b.humanRole || "You only"
          : b.agentRole || `${b.label} agent`,
      desc: b.agentDesc ?? "",
      humanRole: b.humanRole ?? "",
      isStart: Boolean(b.isStart),
    };
  });

  // The handoffs: every amber box is a seam where the agent hands you a draft.
  const handoffs = boxes.filter((b) => b.band === "amber").map((b) => b.label);

  // The ranked first agents to stand up. The start box ranks first (from the
  // where-you-start brief / the chart's isStart flag); the next non-red boxes
  // follow. Reasons are pulled from the where-you-start artifact when present,
  // else a plain deterministic line.
  const firstAgents = buildFirstAgents(boxes, artifacts);

  const plan = planFromArtifacts(artifacts);

  const businessName = chart?.businessName ?? "";
  const leadershipLabel = chart?.leadershipLabel || "Leadership";

  return {
    classTitle: preset.title,
    kitName: "Your Agentic Org Chart",
    heroTitle: businessName ? `${businessName}, mapped for agents.` : "Your work, mapped for agents.",
    heroSubtitle:
      "Every box marked green (AI runs it), amber (AI assists, you approve the handoff), or red (you only), with the handoffs drawn and a ranked place to start.",
    footer: `Built around ${businessName || "your work"} . any AI platform`,
    kind: "orgchart",
    leadershipLabel,
    businessName,
    boxes,
    handoffs,
    firstAgents,
    plan,
  };
}

/**
 * The ranked first 1 to 3 agents to stand up. The start box first, then the
 * other agent-runnable (green/amber) boxes. The "why" for the start box is
 * lifted from the first sentence of the where-you-start brief when it exists,
 * else a deterministic plain reason; the rest get a short ranked reason.
 */
function buildFirstAgents(boxes: OrgChartHeroBox[], artifacts: KitArtifactRow[]): FirstAgent[] {
  const candidates = boxes.filter((b) => b.band !== "red");
  if (candidates.length === 0) return [];

  const start = candidates.find((b) => b.isStart) ?? candidates[0];
  const ordered = [start, ...candidates.filter((b) => b !== start)].slice(0, 3);

  const startWhy = firstSentence(markdownBody(artifacts, "where-you-start"));

  return ordered.map((b, i) => {
    if (i === 0) {
      return {
        box: b.label,
        why:
          startWhy ||
          "It is painful, repeatable, and low-risk, the safest place to learn to ship one agent.",
      };
    }
    return {
      box: b.label,
      why:
        b.band === "amber"
          ? "Strong next agent, with a clear handoff where you approve what leaves."
          : "Ready to run end to end once the first agent is proving itself.",
    };
  });
}

/** The first sentence of a markdown body, stripped of markdown emphasis. */
function firstSentence(md: string): string {
  if (!md) return "";
  // Drop the leading heading and any bold-only "stand up" headline line, then
  // take the first prose sentence.
  const lines = md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  for (const line of lines) {
    const plain = line.replace(/\*\*/g, "").replace(/^[-*]\s*/, "").trim();
    // Skip a short bold headline; take the first real sentence.
    if (plain.length > 40) {
      const sentence = plain.split(/(?<=[.!?])\s/)[0] ?? plain;
      return sentence.length > 0 ? sentence : "";
    }
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* Memory & Identity hero: "Your AI Identity Pack"                     */
/* ------------------------------------------------------------------ */

/** The self-correction loop, in three plain steps (mirrors selfCorrectFooter). */
const SELF_CORRECT_STEPS: string[] = [
  "Log what broke and the root cause, not just the symptom.",
  "Propose one rule that prevents the whole class of that mistake, not the single instance.",
  "Fold the rule into the file so the same mistake cannot happen twice.",
];

function buildMemoryHero(
  preset: KitPreset,
  intake: IntakeAnswers,
  artifacts: KitArtifactRow[],
  toolName: string,
): KitPdfModel {
  // The pack-map artifact carries the structured projection of this kit:
  // firstJob, role, domains, tasks, voice, jobFile, neverStore. Read it first;
  // fall back to nothing (sections hide) when absent.
  const map = parseMemoryMap(markdownBody(artifacts, "pack-map"));

  const job = map?.firstJob ?? "";
  const role = map?.role ?? "";
  const scope = Array.isArray(map?.tasks) ? map!.tasks.filter(Boolean) : [];
  const voice = (map?.voice ?? "").trim();
  const neverStore = Array.isArray(map?.neverStore) ? map!.neverStore.filter(Boolean) : [];
  const jobFile = map?.jobFile ?? "";
  // The name lives on the profile step's free-text field (nameField), not the
  // pack-map; read it from intake directly, degrading to "" when skipped.
  const name = (intake["profile"]?.text ?? "").trim() || (map?.name ?? "");

  return {
    classTitle: preset.title,
    kitName: "Your AI Identity Pack",
    heroTitle: name ? `${name}'s AI, in your voice.` : "Your AI, in your voice.",
    heroSubtitle:
      "Who the AI is when it works with you, how you sound, what it must never store, and the loop that kills its own mistakes.",
    footer: `Built to sound like ${name || "you"} . any AI platform`,
    kind: "memory",
    job,
    role,
    scope,
    voice,
    neverStore,
    selfCorrect: SELF_CORRECT_STEPS,
    toolName,
    jobFile,
  };
}

interface MemoryMap {
  firstJob?: string;
  role?: string;
  name?: string;
  domains?: string[];
  tasks?: string[];
  voice?: string;
  jobFile?: string;
  tool?: string;
  neverStore?: string[];
}

function parseMemoryMap(body: string): MemoryMap | null {
  try {
    const parsed = JSON.parse(body) as MemoryMap;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Build Your AI Chief of Staff hero: the recommendation               */
/* ------------------------------------------------------------------ */

function buildChiefHero(
  preset: KitPreset,
  intake: IntakeAnswers,
  artifacts: KitArtifactRow[],
  toolName: string,
): KitPdfModel {
  // The recommendation is computed deterministically from the quiz answers, the
  // same engine the kit composes from. Never invented here.
  const scores = scoreChief(intake);
  const rec = scores.recommended;
  const d = RUNG_DETAIL[rec.rung];
  const roleLabel = CHIEF_ROLE_LABEL[chiefRoleFromIntake(intake)] ?? "";
  const plan = planFromArtifacts(artifacts);

  const runnersUp: ChiefRunnerUp[] = scores.ranked
    .filter((r) => r.rung !== rec.rung)
    .slice(0, 2)
    .map((r) => ({ rung: r.rung, name: RUNG_DETAIL[r.rung].name, oneLiner: RUNG_DETAIL[r.rung].oneLiner }));

  return {
    classTitle: preset.title,
    kitName: "Your AI Chief of Staff",
    heroTitle: "Your path, decided.",
    heroSubtitle:
      "Of seven ways to build an AI chief of staff, here is the one that fits how you work, with the first move and the starter files.",
    footer: `Built around how you work . any AI platform`,
    kind: "chief",
    rung: rec.rung,
    rungName: d.name,
    oneLiner: d.oneLiner,
    whoYouAre: roleLabel,
    fit: fitReasons(scores),
    wall: d.wall,
    designCall: d.designCall,
    firstStep: d.firstStep,
    tools: d.tools,
    runnersUp,
    guardrails: scores.guardrailsApplied,
    warnings: scores.warnings,
    plan,
    toolName,
  };
}

/* ------------------------------------------------------------------ */
/* Generic fallback (any unrecognised slug)                            */
/* ------------------------------------------------------------------ */

function buildGenericHero(
  preset: KitPreset,
  intake: IntakeAnswers,
  artifacts: KitArtifactRow[],
  toolName: string,
): KitPdfModel {
  const plan = planFromArtifacts(artifacts);
  const mapArtifact = artifacts.find(
    (a) => a.artifact_id === "personal-map" || a.artifact_id === "pack-map",
  );
  const map = mapArtifact ? parseMap(mapArtifact.body) : null;

  return {
    classTitle: preset.title,
    kitName: preset.title,
    heroTitle: map?.firstBuild ? `${map.firstBuild}, mapped.` : preset.title,
    heroSubtitle: preset.tagline,
    footer: `Built around you . any AI platform`,
    kind: "generic",
    whoYouAre: "",
    worksWithYou: map?.worksWithYou ?? [],
    guardrails: map?.guardrails ?? [],
    building: map?.firstBuild ?? null,
    toolName: map?.tool || toolName,
    plan,
  };
}

/* ------------------------------------------------------------------ */
/* Small utils                                                         */
/* ------------------------------------------------------------------ */

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
