/**
 * news-trends - the cross-DAY structural-shift ("trend") detector, as pure,
 * unit-testable helpers (no I/O, no cross-imports, mirrors news-cluster.ts).
 *
 * The Home feed answers "what happened today". A structural SHIFT is different:
 * a pattern that recurs across many DISTINCT stories over WEEKS and tells a
 * leader how their org may need to change (e.g. "the rise of the forward-deployed
 * engineer"). CTRL already accumulates a daily clustered pool in
 * live_headlines_cache; this module reads ACROSS those days and turns recurrence
 * into a trust signal, the same way news-cluster turns cross-SOURCE breadth into
 * corroboration.
 *
 * Honesty model (the confabulation gate): an LLM NAMES + frames candidate shifts,
 * but every named shift must clear a deterministic VERIFY pass here - its cited
 * evidence must exist in the real corpus and span enough distinct days + sources.
 * Recurrence grounds it; the LLM only articulates it; verifyShift rejects the
 * rest. The LLM call itself lives in the edge function (I/O); this file is pure.
 */

// The nine AI-native category ids. Mirrors src/types/newsCategory.ts +
// _shared/news-ai-native.ts; kept local so this module is self-contained and its
// vitest test needs no Deno-path resolution.
export const CATEGORY_IDS = [
  "model", "economics", "tools", "orchestration", "product", "governance", "security", "org", "proof",
] as const;
export type TrendCategory = (typeof CATEGORY_IDS)[number];
export const DEFAULT_TREND_CATEGORY: TrendCategory = "model";

export function isTrendCategory(v: unknown): v is TrendCategory {
  return typeof v === "string" && (CATEGORY_IDS as readonly string[]).includes(v);
}

// One card as stored in a live_headlines_cache day payload (a SharedCard). Read
// defensively - old rows may lack some fields.
export interface DailyPoolCard {
  id: string;
  headline: string;
  category?: string | null;
  source?: string | null;
  url?: string | null;
  snippet?: string | null;
  say?: string | null;
  sourceCount?: number | null;
}

// One day's cached pool: the gather date + that day's cards.
export interface DailyPool {
  day: string; // "YYYY-MM-DD" (the live_headlines_cache briefing_date)
  cards: DailyPoolCard[];
}

// A flattened, dated corpus item the LLM sees and cites by id.
export interface CorpusItem {
  id: string;
  day: string;
  category: TrendCategory;
  headline: string;
  source: string | null;
  url: string | null;
  snippet: string;
  sourceCount: number;
}

// What the LLM proposes (before verification).
export interface ProposedShift {
  title: string;
  summary: string; // what's changing (card body + read sheet)
  implication: string; // what it means for how a leader organises
  category: string; // one of the nine (validated in verify)
  evidenceIds: string[]; // corpus ids that evidence the shift
}

// A single dated story that evidences a shift (shown in the read sheet).
export interface TrendEvidence {
  headline: string;
  source: string | null;
  url: string | null;
  date: string | null; // the day CTRL saw the story ("YYYY-MM-DD")
}

// A shift that cleared the verify gate (or a curated seed).
export interface VerifiedShift {
  title: string;
  summary: string;
  implication: string;
  category: TrendCategory;
  evidence: TrendEvidence[];
  daySpan: number; // distinct days the theme recurred across
  sourceCount: number; // distinct corroborating sources
  momentum: number; // durability + recency score (ranking)
  seed?: boolean; // true => evergreen curated shift, not freshly detected
}

// ---- tunables ------------------------------------------------------------

/** How far back to read the daily pools. */
export const WINDOW_DAYS = 21;
/** Below this many populated days of history, detection is skipped for seeds. */
export const MIN_HISTORY_DAYS = 6;
/** A shift must recur across at least this many DISTINCT days (not a one-day spike). */
export const MIN_DAY_SPAN = 3;
/** A shift must be carried by at least this many DISTINCT sources. */
export const MIN_SOURCES = 3;
/** A shift must cite at least this many corpus items that actually exist. */
export const MIN_EVIDENCE = 3;
/** Cap the corpus sent to the LLM (bounds tokens; newest days kept). */
export const MAX_CORPUS = 140;
/** How many verified shifts to keep. */
export const TARGET_SHIFTS = 5;
/** Evidence within this many days of the newest cited item counts as "recent". */
const RECENT_DAYS = 7;

// ---- helpers -------------------------------------------------------------

function dayMs(day: string): number {
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Flatten the daily pools into one dated corpus, newest day first, capped at
 * MAX_CORPUS. Crucially it does NOT dedupe across days - recurrence across days
 * IS the signal we are trying to measure, so collapsing it would erase trends.
 */
export function buildCorpus(pools: DailyPool[], max = MAX_CORPUS): CorpusItem[] {
  const sorted = [...pools].sort((a, b) => (dayMs(b.day) || 0) - (dayMs(a.day) || 0));
  const out: CorpusItem[] = [];
  const seenIds = new Set<string>();
  for (const pool of sorted) {
    for (const c of pool.cards ?? []) {
      if (out.length >= max) return out;
      const id = (c.id || "").trim();
      const headline = (c.headline || "").trim();
      if (!id || !headline || seenIds.has(id)) continue;
      seenIds.add(id);
      out.push({
        id,
        day: pool.day,
        category: isTrendCategory(c.category) ? c.category : DEFAULT_TREND_CATEGORY,
        headline,
        source: c.source ?? null,
        url: c.url ?? null,
        snippet: (c.snippet ?? c.say ?? "").trim(),
        sourceCount: Number.isFinite(c.sourceCount as number) ? (c.sourceCount as number) : 1,
      });
    }
  }
  return out;
}

/** How many populated days the corpus spans (drives the seed fallback). */
export function populatedDayCount(pools: DailyPool[]): number {
  const days = new Set<string>();
  for (const p of pools) if ((p.cards?.length ?? 0) > 0) days.add(p.day);
  return days.size;
}

/**
 * Momentum: durable AND still moving. Day-spread dominates (a shift is defined
 * by recurring over time), source breadth corroborates, recent activity keeps a
 * fading theme from outranking a live one.
 */
export function computeMomentum(daySpan: number, sourceCount: number, recentCount: number): number {
  return daySpan * 2 + sourceCount + recentCount;
}

function mostCommonCategory(items: CorpusItem[]): TrendCategory {
  const tally = new Map<TrendCategory, number>();
  for (const i of items) tally.set(i.category, (tally.get(i.category) ?? 0) + 1);
  let best: TrendCategory = DEFAULT_TREND_CATEGORY;
  let bestN = -1;
  for (const [cat, n] of tally) if (n > bestN) { best = cat; bestN = n; }
  return best;
}

/**
 * The confabulation gate. Turns an LLM-proposed shift into a VerifiedShift ONLY
 * when its cited evidence really exists in the corpus and clears the recurrence
 * floor (>= MIN_DAY_SPAN distinct days, >= MIN_SOURCES distinct sources,
 * >= MIN_EVIDENCE real citations). Returns null otherwise - the shift is dropped.
 */
export function verifyShift(
  proposed: ProposedShift,
  byId: Map<string, CorpusItem>,
  opts: { minDaySpan?: number; minSources?: number; minEvidence?: number } = {},
): VerifiedShift | null {
  const minDaySpan = opts.minDaySpan ?? MIN_DAY_SPAN;
  const minSources = opts.minSources ?? MIN_SOURCES;
  const minEvidence = opts.minEvidence ?? MIN_EVIDENCE;

  const title = (proposed.title || "").trim();
  const summary = (proposed.summary || "").trim();
  const implication = (proposed.implication || "").trim();
  if (!title || !summary) return null;

  // Resolve cited ids to real corpus items (dedupe, drop hallucinated ids).
  const seen = new Set<string>();
  const items: CorpusItem[] = [];
  for (const rawId of proposed.evidenceIds ?? []) {
    const id = (rawId || "").trim();
    if (!id || seen.has(id)) continue;
    const item = byId.get(id);
    if (!item) continue; // cited id not in the real corpus -> ignored
    seen.add(id);
    items.push(item);
  }
  if (items.length < minEvidence) return null;

  const days = new Set(items.map((i) => i.day));
  const sources = new Set(items.map((i) => (i.source || "").trim()).filter(Boolean));
  if (days.size < minDaySpan) return null;
  if (sources.size < minSources) return null;

  const newest = Math.max(...items.map((i) => dayMs(i.day)).filter(Number.isFinite));
  const recentCount = items.filter((i) => {
    const t = dayMs(i.day);
    return Number.isFinite(t) && newest - t <= RECENT_DAYS * 86_400_000;
  }).length;

  const category = isTrendCategory(proposed.category) ? proposed.category : mostCommonCategory(items);

  const evidence: TrendEvidence[] = [...items]
    .sort((a, b) => (dayMs(b.day) || 0) - (dayMs(a.day) || 0))
    .slice(0, 6)
    .map((i) => ({ headline: i.headline, source: i.source, url: i.url, date: i.day }));

  return {
    title,
    summary,
    implication,
    category,
    evidence,
    daySpan: days.size,
    sourceCount: sources.size,
    momentum: computeMomentum(days.size, sources.size, recentCount),
  };
}

/** Verify a batch of proposals, drop the unverifiable, rank by momentum, cap. */
export function verifyAndRank(
  proposed: ProposedShift[],
  corpus: CorpusItem[],
  target = TARGET_SHIFTS,
): VerifiedShift[] {
  const byId = new Map(corpus.map((c) => [c.id, c]));
  const verified: VerifiedShift[] = [];
  for (const p of proposed) {
    const v = verifyShift(p, byId);
    if (v) verified.push(v);
  }
  verified.sort((a, b) => b.momentum - a.momentum);
  return verified.slice(0, target);
}

// ---- the detection prompt (pure; the fetch lives in the edge function) ---

export interface DetectionMessages {
  system: string;
  user: string;
}

/**
 * Build the messages for the one batched detection call. The optional editorial
 * thesis calibrates the register (reused from editorial-lens.ts) without ever
 * being asserted as fact.
 */
export function buildDetectionMessages(
  corpus: CorpusItem[],
  lens?: { thesis?: string; facets?: string[] } | null,
): DetectionMessages {
  const categories = CATEGORY_IDS.join(", ");
  const lensLine = lens?.thesis
    ? `\nCalibration thesis (register only, never assert it as fact): ${lens.thesis}\n`
    : "";
  const system =
    "You are a strategy analyst for CTRL, an AI-native chief of staff for a busy " +
    "business leader. You are given DATED AI-native news headlines from the last " +
    "few weeks. Identify 3-5 STRUCTURAL SHIFTS - patterns that recur across many " +
    "DISTINCT stories over MULTIPLE DAYS and tell a leader how the AI-native world, " +
    "and therefore how their org, is changing. A shift is NOT a single event " +
    "(one launch, one funding round); it is a movement you can see building across " +
    "several dated stories.\n" +
    "For each shift produce:\n" +
    '- "title": a short, memorable name for the shift (MAX 9 words), e.g. "The rise of the forward-deployed engineer". No trailing punctuation, no em dashes.\n' +
    '- "summary": what is changing, grounded in the stories (MAX 40 words), plain words, no hype, no em dashes.\n' +
    '- "implication": what a leader should consider changing about how their org, team or roles are set up for AI (MAX 28 words). Advisory, concrete, no em dashes.\n' +
    `- "category": the single best-fit lane, one of: ${categories}.\n` +
    '- "evidenceIds": the ids (from the input) of the 3-6 stories that evidence this shift. They MUST span at least 3 different "day" values and at least 3 different sources, or do not name the shift.\n' +
    "HONESTY: ground every field strictly in the supplied stories. NEVER invent a " +
    "fact, number, company or quote. If the stories do not support a durable shift, " +
    "return fewer shifts (an empty list is acceptable) rather than forcing one.\n" +
    lensLine +
    'Reply ONLY with JSON: {"shifts":[{"title":"...","summary":"...","implication":"...","category":"...","evidenceIds":["..."]}]}.';

  const stories = corpus.map((c) => ({
    id: c.id,
    day: c.day,
    category: c.category,
    headline: c.headline,
    snippet: c.snippet.slice(0, 160),
  }));
  const user = JSON.stringify({ window_days: WINDOW_DAYS, stories });
  return { system, user };
}

/** Parse the LLM JSON reply into proposals (defensive; empty on any problem). */
export function parseProposedShifts(content: unknown): ProposedShift[] {
  if (typeof content !== "string") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const shifts = (parsed as { shifts?: unknown })?.shifts;
  if (!Array.isArray(shifts)) return [];
  const out: ProposedShift[] = [];
  for (const s of shifts) {
    const o = s as Record<string, unknown>;
    const title = typeof o?.title === "string" ? o.title : "";
    const summary = typeof o?.summary === "string" ? o.summary : "";
    const implication = typeof o?.implication === "string" ? o.implication : "";
    const category = typeof o?.category === "string" ? o.category : "";
    const evidenceIds = Array.isArray(o?.evidenceIds)
      ? (o.evidenceIds as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    if (title && summary) out.push({ title, summary, implication, category, evidenceIds });
  }
  return out;
}

// ---- the honest floor: curated, evergreen shifts ------------------------
//
// When history is too short or nothing verifies, we surface a small curated set
// of durable, real, well-documented AI-native shifts (same principle as
// laneReserve.ts / coldDeck.ts). They are labelled as ongoing shifts (seed:true)
// so they never masquerade as a freshly detected, dated pattern, and detected
// shifts replace them as the daily history accumulates. No fabricated numbers.

export const SEED_SHIFTS: readonly VerifiedShift[] = [
  {
    title: "The rise of the forward-deployed engineer",
    summary:
      "The most valuable AI hires now embed with the customer and own deployment into messy real systems, not prototypes behind tickets. Every major AI lab is hiring for it.",
    implication:
      "Consider a role that sits between product, customer and execution, and owns getting AI working in production, not just building it.",
    category: "org",
    evidence: [],
    daySpan: 0,
    sourceCount: 0,
    momentum: 100,
    seed: true,
  },
  {
    title: "Inference cost keeps collapsing",
    summary:
      "The price of a capable AI answer falls sharply every few months as models get cheaper and routing improves. The build-versus-rent maths keeps moving.",
    implication:
      "Re-test the ideas you shelved on cost, and treat model routing, not raw capability, as a live lever for your unit economics.",
    category: "economics",
    evidence: [],
    daySpan: 0,
    sourceCount: 0,
    momentum: 95,
    seed: true,
  },
  {
    title: "Agents move from demo to production",
    summary:
      "Reliable multi-agent systems are coming from process (evals, guardrails, clean hand-offs) rather than a cleverer prompt, and are starting to own real workflows.",
    implication:
      "Invest in the orchestration and evaluation layer, and pick one real workflow to hand to agents with a human approving the hand-off.",
    category: "orchestration",
    evidence: [],
    daySpan: 0,
    sourceCount: 0,
    momentum: 90,
    seed: true,
  },
  {
    title: "Execution is cheap, judgment is the moat",
    summary:
      "As anything cloneable in a weekend loses its edge, the scarce assets become judgment, taste, distribution and the context around the work, not the code itself.",
    implication:
      "Point AI at the repeatable middle and spend your team's judgment on the calls no model can make. Protect your data and context, not your features.",
    category: "proof",
    evidence: [],
    daySpan: 0,
    sourceCount: 0,
    momentum: 85,
    seed: true,
  },
  {
    title: "Smaller open models rival last year's frontier",
    summary:
      "Open and smaller models now match capabilities that were frontier-only a year ago, so you can run capable AI more cheaply and on your own terms.",
    implication:
      "Revisit what you run in-house versus rent, and where owning the model changes your cost, privacy or control story.",
    category: "model",
    evidence: [],
    daySpan: 0,
    sourceCount: 0,
    momentum: 80,
    seed: true,
  },
];
