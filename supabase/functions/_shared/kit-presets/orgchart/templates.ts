/**
 * Agentic Org Chart preset - deterministic templates and the honest chart
 * fallback. No Deno or Node globals; plain TypeScript only.
 *
 * The fallback chart is what ships if the compose LLM call fails or returns
 * malformed JSON: a tagged-but-conservative chart built straight from the
 * student's answers (their boxes, their start box, their guardrails), so the
 * hero artifact is never empty and never fabricated. The deterministic tag
 * logic mirrors the live-preview stub; the LLM upgrade adds the named roles
 * and the sharper led/assisted/excluded calls.
 */

import type { IntakeOption } from "../types.ts";

/* ------------------------------------------------------------------ */
/* The honest chart shape (matches OrgChartView props exactly)         */
/* ------------------------------------------------------------------ */

export interface ChartBoxJson {
  id: string;
  label: string;
  tag: "led" | "assisted" | "excluded" | null;
  agentRole?: string;
  agentDesc?: string;
  humanRole?: string;
  isStart?: boolean;
}

export interface ChartJson {
  businessName: string;
  pathway: "self" | "biz";
  leadershipLabel: string;
  boxes: ChartBoxJson[];
}

export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "box"
  );
}

/* ------------------------------------------------------------------ */
/* Guardrail -> box matching (deterministic assisted detection)        */
/* ------------------------------------------------------------------ */

/**
 * Which guardrail option ids, when flagged, pull a box from led down to
 * assisted (a human must review before anything leaves the building). Keyed by
 * box-label keyword; case-insensitive substring match against the box label.
 * Conservative and honest: if in doubt the deterministic path keeps a human in
 * the loop. The LLM upgrade refines this off the full answers.
 */
const GUARDRAIL_TOUCH: Array<{ boxKeyword: RegExp; guardrailIds: string[] }> = [
  { boxKeyword: /sales|client|outreach|finding/i, guardrailIds: ["email", "final-call"] },
  { boxKeyword: /market|content|social|brand/i, guardrailIds: ["post"] },
  { boxKeyword: /support|success|customer/i, guardrailIds: ["email", "data"] },
  { boxKeyword: /financ|ops|invoic|billing|account/i, guardrailIds: ["spend", "data"] },
  { boxKeyword: /hir|recruit|people/i, guardrailIds: ["email"] },
  { boxKeyword: /data|report|analytic/i, guardrailIds: ["data"] },
];

/** Box-label keywords that, absent any agent fit, stay fully human. */
const STAYS_HUMAN = /product|strategy|the work|doing the work|design|craft|vision/i;

/** Oversight strictness order: led (most agent) < assisted < excluded (most human). */
const TAG_RANK: Record<string, number> = { led: 0, assisted: 1, excluded: 2 };

/**
 * The deterministic MINIMUM oversight a box must carry, read straight from the
 * student's guardrails. Core human work is excluded; a box whose work touches a
 * flagged guardrail is at least assisted; everything else is free to be led.
 * This is the honesty floor: the chart can never claim an agent leads a box the
 * student said an agent must never run alone.
 */
function floorTagFor(label: string, flagged: Set<string>): "led" | "assisted" | "excluded" {
  if (STAYS_HUMAN.test(label)) return "excluded";
  if (flagged.size > 0 && !flagged.has("none")) {
    const rule = GUARDRAIL_TOUCH.find((r) => r.boxKeyword.test(label));
    if (rule && rule.guardrailIds.some((g) => flagged.has(g))) return "assisted";
  }
  return "led";
}

/** Pick the stricter (more human-oversight) of two tags. */
function stricterTag(
  a: "led" | "assisted" | "excluded",
  b: "led" | "assisted" | "excluded",
): "led" | "assisted" | "excluded" {
  return TAG_RANK[a] >= TAG_RANK[b] ? a : b;
}

/**
 * Build the honest fallback chart deterministically from the intake.
 * The roles here are intentionally generic ("agent" / "you grow into the
 * owner role") and clearly conservative; the LLM artifact replaces them with
 * named, specific roles. This never invents boxes or claims.
 */
export function buildFallbackChart(input: {
  pathway: "self" | "biz";
  businessName: string;
  boxLabels: string[];
  startLabel: string;
  guardrailIds: string[];
}): ChartJson {
  const { pathway, businessName, boxLabels, startLabel, guardrailIds } = input;
  const flagged = new Set(guardrailIds);

  const boxes: ChartBoxJson[] = boxLabels.map((label) => {
    const isStart = label === startLabel;
    const tag: ChartBoxJson["tag"] = floorTagFor(label, flagged);

    const box: ChartBoxJson = {
      id: slugify(label),
      label,
      tag,
      isStart,
    };
    if (tag === "led") {
      box.agentRole = `${label} agent`;
      box.agentDesc = "runs the repeatable parts, you approve";
      box.humanRole = pathway === "self" ? "you, running it" : "owner of the outcome";
    } else if (tag === "assisted") {
      box.agentRole = `${label} agent`;
      box.agentDesc = "drafts it, you sign off before it leaves";
      box.humanRole = pathway === "self" ? "you, reviewing" : "reviewer and approver";
    } else {
      box.humanRole = pathway === "self" ? "you, fully" : "stays with the team";
    }
    return box;
  });

  return {
    businessName:
      businessName || (pathway === "self" ? "Your operating model" : "Your business"),
    pathway,
    leadershipLabel: pathway === "self" ? "You" : "Owns the outcomes",
    boxes,
  };
}

/**
 * Validate + normalise an LLM chart payload against the contract. Returns null
 * when the payload is unusable so the caller can fall back. Enforces honesty:
 * the boxes must match the labels the student actually picked (no invented or
 * dropped boxes), and exactly one start box is set.
 */
export function normaliseChart(
  raw: unknown,
  expected: {
    pathway: "self" | "biz";
    boxLabels: string[];
    startLabel: string;
    businessName: string;
    guardrailIds?: string[];
  },
): ChartJson | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rawBoxes = Array.isArray(r.boxes) ? r.boxes : null;
  if (!rawBoxes || rawBoxes.length === 0) return null;

  const byLabel = new Map<string, Record<string, unknown>>();
  for (const b of rawBoxes) {
    if (b && typeof b === "object" && typeof (b as { label?: unknown }).label === "string") {
      byLabel.set(((b as { label: string }).label).trim().toLowerCase(), b as Record<string, unknown>);
    }
  }

  const flagged = new Set(expected.guardrailIds ?? []);
  const validTags = new Set(["led", "assisted", "excluded"]);
  const boxes: ChartBoxJson[] = expected.boxLabels.map((label) => {
    const src = byLabel.get(label.trim().toLowerCase()) ?? {};
    const tagRaw = typeof src.tag === "string" ? src.tag : "";
    const llmTag = (validTags.has(tagRaw) ? tagRaw : "led") as
      | "led"
      | "assisted"
      | "excluded";
    // Honesty floor: the chart can never claim less human oversight than the
    // student's guardrails demand. Take the stricter of the model's tag and the
    // deterministic floor, so a guardrail box is at least assisted and core
    // human work stays you-only, even when the model lazily defaults to led.
    const tag = stricterTag(llmTag, floorTagFor(label, flagged));
    const box: ChartBoxJson = {
      id: slugify(label),
      label, // keep the student's exact label, never the model's rename
      tag,
      isStart: label === expected.startLabel,
    };
    const agentRole = typeof src.agentRole === "string" ? src.agentRole.trim() : "";
    const agentDesc = typeof src.agentDesc === "string" ? src.agentDesc.trim() : "";
    const humanRole = typeof src.humanRole === "string" ? src.humanRole.trim() : "";
    if (tag !== "excluded") {
      if (agentRole) box.agentRole = agentRole;
      // If the floor pulled a led box down to assisted, the model's "owns it"
      // description would now overclaim; make the description honest to the tag.
      box.agentDesc =
        tag === "assisted" && llmTag === "led"
          ? "drafts it, you sign off before it leaves"
          : agentDesc || box.agentDesc;
    }
    if (humanRole) box.humanRole = humanRole;
    return box;
  });

  // Guarantee exactly one start box.
  if (!boxes.some((b) => b.isStart) && boxes.length > 0) boxes[0].isStart = true;

  return {
    businessName:
      (typeof r.businessName === "string" && r.businessName.trim()) ||
      expected.businessName ||
      (expected.pathway === "self" ? "Your operating model" : "Your business"),
    pathway: expected.pathway,
    leadershipLabel:
      typeof r.leadershipLabel === "string" && r.leadershipLabel.trim()
        ? r.leadershipLabel.trim()
        : expected.pathway === "self"
          ? "You"
          : "Owns the outcomes",
    boxes,
  };
}

/* ------------------------------------------------------------------ */
/* Pack map (deterministic json artifact)                              */
/* ------------------------------------------------------------------ */

export interface PackMapJson {
  pathway: "self" | "biz";
  businessName: string;
  boxes: number;
  startBox: string;
  agentLed: number;
  assisted: number;
  youOnly: number;
  guardrails: string[];
}

export function buildPackMap(chart: ChartJson, guardrailLabels: string[]): string {
  const counts = chart.boxes.reduce(
    (acc, b) => {
      if (b.tag === "led") acc.led += 1;
      else if (b.tag === "assisted") acc.assisted += 1;
      else if (b.tag === "excluded") acc.excluded += 1;
      return acc;
    },
    { led: 0, assisted: 0, excluded: 0 },
  );
  const start = chart.boxes.find((b) => b.isStart);
  const map: PackMapJson = {
    pathway: chart.pathway,
    businessName: chart.businessName,
    boxes: chart.boxes.length,
    startBox: start?.label ?? (chart.boxes[0]?.label ?? ""),
    agentLed: counts.led,
    assisted: counts.assisted,
    youOnly: counts.excluded,
    guardrails: guardrailLabels,
  };
  return JSON.stringify(map, null, 2);
}

/* ------------------------------------------------------------------ */
/* Curated sector x function grind matrix (AdaptiveOptions.matrixKey)  */
/* Keyed by the chosen function/hat label; each row is the grind opts. */
/* ------------------------------------------------------------------ */

const opt = (label: string): IntakeOption => ({ id: slugify(label), label });

export const GRIND_MATRIX: Record<string, IntakeOption[]> = {
  // biz functions
  Sales: [
    opt("Following up after calls"),
    opt("Chasing the pipeline for updates"),
    opt("Writing proposals or quotes"),
    opt("Qualifying inbound leads"),
    opt("Researching prospects"),
  ],
  Marketing: [
    opt("Turning one idea into a week of posts"),
    opt("Building the campaign report"),
    opt("Briefing and chasing creative"),
    opt("Writing email sequences"),
  ],
  "Customer support": [
    opt("Answering the same questions"),
    opt("Triaging and routing tickets"),
    opt("Writing help articles"),
    opt("Chasing resolutions"),
  ],
  "Finance / ops": [
    opt("Reconciling numbers across tools"),
    opt("Building the weekly update"),
    opt("Chasing approvals"),
    opt("Onboarding a vendor or client"),
  ],
  Hiring: [
    opt("Screening inbound applicants"),
    opt("Sourcing and first outreach"),
    opt("Scheduling interviews"),
    opt("Writing the job post"),
  ],
  Content: [
    opt("Turning a call into a post"),
    opt("Editing to your voice"),
    opt("Repurposing across channels"),
    opt("Planning the calendar"),
  ],
  "Data / reporting": [
    opt("Pulling numbers into one update"),
    opt("Rebuilding the same dashboard"),
    opt("Answering what-happened asks"),
  ],
  Product: [
    opt("Synthesising user feedback"),
    opt("Writing specs from notes"),
    opt("Triaging the backlog"),
  ],
  // self hats
  "Finding clients": [
    opt("Following up with leads"),
    opt("Writing cold outreach"),
    opt("Researching who to contact"),
  ],
  "Doing the work": [
    opt("The same setup every project"),
    opt("Turning notes into deliverables"),
    opt("Writing the recap"),
  ],
  "Marketing myself": [
    opt("Turning work into content"),
    opt("Posting consistently"),
    opt("Writing the newsletter"),
  ],
  "Admin / scheduling": [
    opt("Scheduling and rescheduling"),
    opt("Chasing people for things"),
    opt("Inbox triage"),
  ],
  Invoicing: [opt("Raising and chasing invoices"), opt("Reconciling what came in")],
  Research: [opt("Pulling sources into a brief"), opt("The same lookup each time")],
};

export const GRIND_FALLBACK: IntakeOption[] = [
  opt("The repetitive one"),
  opt("The fiddly one"),
  opt("The one I keep forgetting"),
];

/* ------------------------------------------------------------------ */
/* Live-preview agent role stub (KitPreset.agentRoles)                 */
/* The honest roles come from compose; this only powers the in-intake  */
/* "building" preview so the chart feels alive as the student answers. */
/* ------------------------------------------------------------------ */

export const AGENT_ROLE_STUB: Record<string, { agentRole: string; agentDesc: string }> = {
  Sales: { agentRole: "SDR agent", agentDesc: "drafts and sequences your outreach" },
  Marketing: { agentRole: "Content agent", agentDesc: "spins one idea into the week" },
  "Customer support": {
    agentRole: "Tier-1 agent",
    agentDesc: "handles the known questions, escalates the rest",
  },
  "Finance / ops": {
    agentRole: "Reconciliation agent",
    agentDesc: "matches the numbers, flags the odd ones",
  },
  Hiring: { agentRole: "Sourcing agent", agentDesc: "screens and drafts first outreach" },
  Content: { agentRole: "Ghostwriter agent", agentDesc: "drafts in your voice from your work" },
  "Data / reporting": { agentRole: "Reporting agent", agentDesc: "builds the update, every time" },
  Product: { agentRole: "Synthesis agent", agentDesc: "turns feedback into themes" },
  "Finding clients": { agentRole: "Outreach agent", agentDesc: "drafts and chases, you approve" },
  "Doing the work": { agentRole: "Setup agent", agentDesc: "does the repeatable scaffolding" },
  "Marketing myself": {
    agentRole: "Ghostwriter agent",
    agentDesc: "turns your work into posts",
  },
  "Admin / scheduling": {
    agentRole: "Scheduler agent",
    agentDesc: "books and reschedules around you",
  },
  Invoicing: { agentRole: "Billing agent", agentDesc: "raises and chases, you sign off" },
  Research: { agentRole: "Research agent", agentDesc: "pulls the brief, you judge it" },
};
