/**
 * critique-core: the deterministic half of the CRITIQUE stage.
 *
 * Pure module. No Deno imports, no I/O, no clock and no randomness, so vitest
 * runs it directly and the same critique always resolves to the same verdicts.
 *
 * ---------------------------------------------------------------------------
 * Why the enforcement lives here and not in the prompt
 * ---------------------------------------------------------------------------
 *
 * `skills/ctrl-check` is the managed reference implementation of this stage and
 * every rule below is lifted from it. The reason they are code rather than
 * prompt lines is the same reason stage 7a exists: asking twice is not an
 * invariant. Across the Phase 3b acceptance runs the unpointed-claim count came
 * back 6, then 1, then 4 from the same instruction. A rule that has to hold
 * every time holds by construction or it does not hold.
 *
 * Four rules are enforced here, after the model has answered:
 *
 *   1. QUOTE OR DO NOT SCORE. A verdict whose quote is not a substring of the
 *      artefact is dropped to `insufficient evidence` and the drop is reported.
 *      Evaluation attends to the source three to five times less than
 *      generation does; the quote is the only forcing function that works, and
 *      it is worthless if nothing checks it.
 *   2. BORDERLINE NEEDS A NAMED CHANGE. `borderline` with no single named change
 *      that moves it to `holds` is `breaks`. Otherwise borderline is where a
 *      critic parks everything it does not want to defend.
 *   3. NEVER INVENT A CRITERION, NEVER MORE THAN SEVEN. Only loaded criteria
 *      plus the two declared house lenses are scoreable. A rule system that
 *      fires outside its elicited envelope fails silently.
 *   4. NEVER A BARE REJECTION. Every `breaks` carries a revision. Where the
 *      terminal pass produces none, the finding ships flagged as unrepaired and
 *      says so in words, which is the AWAITING discipline used everywhere else
 *      in this chain. A hidden gap is the failure; a named one is information.
 *
 * ---------------------------------------------------------------------------
 * CH-16, which constrains everything in this file
 * ---------------------------------------------------------------------------
 *
 * NO GATE MUTATES A QUOTED SPAN. Nothing here rewrites the submission. The
 * mechanical checks report; the caller masks verbatim spans before handing text
 * in; demotion (demote-claims.ts) is applied only to text CTRL itself authored.
 */

// ---------------------------------------------------------------------------
// Provider routing (CH-14)
// ---------------------------------------------------------------------------

/**
 * The two providers callLLMWithFallback can reach. Lives here rather than in
 * llm-fallback.ts because llm-fallback.ts imports the Supabase SDK over https,
 * which vitest cannot resolve, and CH-14's rule is one that has to be tested.
 * llm-fallback.ts imports these and re-exports pickJudgeProvider, so callers
 * still find the routing where the contract says it is.
 */
export type LlmProvider = "openai" | "gemini";

/** Today's behaviour: OpenAI first, Gemini on failure. The default, unchanged. */
export const DEFAULT_PROVIDER_ORDER: readonly LlmProvider[] = ["openai", "gemini"];

function isProvider(value: unknown): value is LlmProvider {
  return value === "openai" || value === "gemini";
}

/**
 * The order a call should try providers in.
 *
 * `preferred` is the caller's wish, `available` is what is actually configured.
 * Anything preferred but unavailable is dropped rather than attempted, because
 * a call to a provider with no key is a guaranteed failure dressed as a
 * fallback. Anything available but not preferred is NOT appended: a caller that
 * named an order asked for that order, and quietly extending it is exactly the
 * silent same-family fallback CH-14 exists to stop.
 *
 * With no preference the default order applies, filtered to what is available,
 * which is today's behaviour for every existing caller.
 */
export function resolveProviderOrder(
  preferred: readonly LlmProvider[] | undefined | null,
  available: readonly LlmProvider[],
): LlmProvider[] {
  const have = new Set(available.filter(isProvider));
  const wanted = Array.isArray(preferred) && preferred.length > 0
    ? preferred.filter(isProvider)
    : [...DEFAULT_PROVIDER_ORDER];
  const out: LlmProvider[] = [];
  for (const provider of wanted) {
    if (have.has(provider) && !out.includes(provider)) out.push(provider);
  }
  return out;
}

/**
 * The provider the Signature lens may run on: any configured provider that is
 * NOT the one recorded as having generated the artefact.
 *
 * Returns null when there is no such provider, and null means the lens does not
 * run and the output says so. Never fall back to the generator's own family and
 * present it as an independent judge: a model preferring its own output is the
 * failure the different-provider rule exists to prevent, and a lens that
 * silently becomes self-review is worse than a lens that is honestly absent.
 *
 * A generator provider of null or 'unknown' means nothing was recorded (a pasted
 * piece of the person's own work has no generator at all). There is then no
 * family to avoid, so the first available provider is used and the caller says
 * plainly that no generator was recorded.
 */
export function pickJudgeProvider(
  generatorProvider: string | null | undefined,
  available: readonly LlmProvider[],
): LlmProvider | null {
  const order = resolveProviderOrder(null, available);
  if (order.length === 0) return null;
  if (!isProvider(generatorProvider)) return order[0];
  const independent = order.filter((p) => p !== generatorProvider);
  return independent.length > 0 ? independent[0] : null;
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** The three lenses, run independently and never allowed to see each other. */
export type LensName = "standard" | "evidence" | "signature";

/** What a criterion is labelled as in the output. Never mislabel a house check. */
export type VerdictLabel = "your rule" | "CTRL's check";

/**
 * Three verdicts, plus the one a critic must write when it cannot quote.
 * No numeric score, no percentage, no five-point scale: an aggregate hides which
 * criterion failed, and which criterion failed is the entire value of a review.
 */
export type CritiqueVerdict = "holds" | "borderline" | "breaks" | "insufficient evidence";

export const INSUFFICIENT: CritiqueVerdict = "insufficient evidence";

export type CriterionWeight = "essential" | "important" | "optional" | "pitfall";

/** A compiled criterion, as the Standard lens is handed it. */
export interface LoadedCriterion {
  /** criteria.id, or a house id for the two declared lenses. */
  id: string;
  /** The short id the prompt cites, e.g. "C1". */
  shortId: string;
  name: string;
  checkText: string;
  weight: CriterionWeight;
  holdsExample?: string | null;
  breaksExample?: string | null;
}

/**
 * The two house lenses, declared here so "never invent a criterion" has an
 * explicit allow-list to check against. They are written rather than elicited,
 * so they are labelled CTRL's check and are advisory permanently. Somebody will
 * eventually read a house check attributed to them as their own rule, disagree,
 * and lose confidence in the rest of the review. Labelling is what stops that.
 */
export const HOUSE_LENS_IDS = {
  evidence: "house.evidence",
  signature: "house.signature",
} as const;

export const HOUSE_CRITERIA: Record<"evidence" | "signature", LoadedCriterion> = {
  evidence: {
    id: HOUSE_LENS_IDS.evidence,
    shortId: "H1",
    name: "Every claim earned",
    checkText:
      "Every claim earned, every number sourced, every quote real. True and unsourced is " +
      "still a finding in a document going to somebody else.",
    weight: "pitfall",
  },
  signature: {
    id: HOUSE_LENS_IDS.signature,
    shortId: "H2",
    name: "Only they could have written it",
    checkText:
      "Could this have been written by anyone with the name swapped. What in it could not " +
      "have been written by somebody who had never met them.",
    weight: "pitfall",
  },
};

/** Spec 4.6 / judgement.md: seven criteria maximum, never more. */
export const MAX_SCORED_CRITERIA = 7;

/** CH-15: a hard bound on the revision loop, with a defined terminal state. */
export const MAX_CRITIQUE_PASSES = 2;

/** Rule 3: three to five of their own graded items, never zero-shot. */
export const EXEMPLARS_MIN = 3;
export const EXEMPLARS_MAX = 5;

/**
 * A quote shorter than this does not locate a passage, so it cannot be what the
 * critic scored. Dropped under the same rule as a quote that is simply absent.
 */
export const MIN_QUOTE_CHARS = 12;

// ---------------------------------------------------------------------------
// The seven-criterion cap
// ---------------------------------------------------------------------------

/**
 * judgement.md's load order: essential first, then pitfall, then important.
 * A pitfall outranks an important because a pitfall is a thing they have
 * actually rejected work over.
 */
const WEIGHT_ORDER: Record<CriterionWeight, number> = {
  essential: 0,
  pitfall: 1,
  important: 2,
  optional: 3,
};

export interface CappedCriteria {
  scored: LoadedCriterion[];
  /** The ones that did not make the cut, so the output can say so out loud. */
  dropped: LoadedCriterion[];
  /**
   * True when the rubric carried more than the cap for this surface, which
   * judgement.md says should have been split into two passes and reported.
   */
  overCap: boolean;
}

/**
 * Cap the criteria the Standard lens scores at seven, in load order.
 *
 * The two house lenses are NOT counted here and are never dropped: they are
 * declared, not loaded, they are advisory permanently, and they are the only
 * two checks in the system that do not come out of this person's own grading.
 * Counting them against the cap would silently evict a criterion the person
 * actually demonstrated in favour of one we wrote.
 *
 * Ties inside a weight keep the input order, so a recompiled rubric that did not
 * change does not shuffle which criteria get scored.
 */
export function capCriteria(
  criteria: readonly LoadedCriterion[],
  max: number = MAX_SCORED_CRITERIA,
): CappedCriteria {
  const indexed = (criteria ?? []).map((criterion, index) => ({ criterion, index }));
  indexed.sort((a, b) => {
    const byWeight = WEIGHT_ORDER[a.criterion.weight] - WEIGHT_ORDER[b.criterion.weight];
    return byWeight !== 0 ? byWeight : a.index - b.index;
  });
  const ordered = indexed.map((entry) => entry.criterion);
  return {
    scored: ordered.slice(0, Math.max(0, max)),
    dropped: ordered.slice(Math.max(0, max)),
    overCap: ordered.length > max,
  };
}

// ---------------------------------------------------------------------------
// Quote verification: the attention-forcing rule, enforced
// ---------------------------------------------------------------------------

const SMART_SINGLE = /[‘’‛ʼ]/g;
const SMART_DOUBLE = /[“”„‟]/g;
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`, "g");

/**
 * The one canonical form both sides of a quote check are read in.
 *
 * This is NOT fuzzy matching and there is no ratio anywhere in this file
 * (CH-13). It removes exactly three classes of difference that are the same
 * characters typed differently: whitespace runs, curly versus straight quotes,
 * and long dashes. Everything else, including a single changed word, still
 * fails the check, which is the point: a paraphrase is a critic that did not
 * look at the work.
 */
export function canonicaliseForQuote(text: string): string {
  return String(text ?? "")
    .replace(SMART_SINGLE, "'")
    .replace(SMART_DOUBLE, '"')
    .replace(DASHES, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type QuoteFailure = "missing" | "too_short" | "not_found";

export interface QuoteCheck {
  ok: boolean;
  reason: QuoteFailure | null;
}

/**
 * Is this quote actually in the artefact.
 *
 * The predicate the whole "quote or do not score" rule rests on. Exact substring
 * after canonicalisation, nothing else.
 */
export function quoteVerifies(artefact: string, quote: string | null | undefined): QuoteCheck {
  const needle = canonicaliseForQuote(quote ?? "");
  if (needle.length === 0) return { ok: false, reason: "missing" };
  if (needle.length < MIN_QUOTE_CHARS) return { ok: false, reason: "too_short" };
  const hay = canonicaliseForQuote(artefact ?? "");
  if (hay.length === 0) return { ok: false, reason: "not_found" };
  return hay.includes(needle) ? { ok: true, reason: null } : { ok: false, reason: "not_found" };
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

/** What a lens returns per criterion, before anything is enforced. */
export interface RawVerdict {
  criterion_id?: unknown;
  criterion_name?: unknown;
  verdict?: unknown;
  quote?: unknown;
  sentence?: unknown;
  change_to_holds?: unknown;
  revision?: unknown;
}

/** Why a verdict is not what the model said it was. Always reported, never silent. */
export type Adjustment =
  | { rule: "quote"; from: CritiqueVerdict; reason: QuoteFailure }
  | { rule: "borderline"; from: "borderline" }
  | { rule: "unrepaired" };

export interface ScoredVerdict {
  criterionId: string | null;
  criterionName: string;
  lens: LensName;
  label: VerdictLabel;
  verdict: CritiqueVerdict;
  /** The exact passage, as the critic quoted it. Empty when it could not quote. */
  quote: string;
  /** One sentence: what is happening and why it lands there. */
  sentence: string;
  /** The single change that moves a borderline to holds. Null otherwise. */
  changeToHolds: string | null;
  /** The rewritten passage. Required on every breaks that ships repaired. */
  revision: string | null;
  adjustments: Adjustment[];
}

const VERDICT_WORDS = new Set(["holds", "borderline", "breaks"]);

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableStr(value: unknown): string | null {
  const s = str(value);
  return s.length > 0 ? s : null;
}

export interface AdmitOptions {
  lens: LensName;
  /** The criteria this lens is allowed to score. Anything else is invented. */
  allowed: readonly LoadedCriterion[];
}

export interface AdmitResult {
  verdicts: ScoredVerdict[];
  /** Criteria the lens scored that it was never handed. Reported, never scored. */
  invented: string[];
}

/**
 * Match a raw verdict back to a criterion it was actually handed.
 *
 * Matched on id, short id, or exact name (case-insensitively), in that order.
 * A model that renames a criterion in its answer is still pointing at a real
 * one; a model that adds a criterion nobody loaded is not, and that is the case
 * this exists to catch.
 */
function matchCriterion(
  raw: RawVerdict,
  allowed: readonly LoadedCriterion[],
): LoadedCriterion | null {
  const id = str(raw.criterion_id).toLowerCase();
  const name = str(raw.criterion_name).toLowerCase();
  if (id) {
    const byId = allowed.find(
      (c) => c.id.toLowerCase() === id || c.shortId.toLowerCase() === id,
    );
    if (byId) return byId;
  }
  if (name) {
    const byName = allowed.find((c) => c.name.trim().toLowerCase() === name);
    if (byName) return byName;
  }
  return null;
}

/** The label a lens's findings carry. Only the Standard lens speaks for them. */
export function labelFor(lens: LensName): VerdictLabel {
  return lens === "standard" ? "your rule" : "CTRL's check";
}

/**
 * Admit only what this lens was allowed to score, and normalise the shape.
 *
 * Rule 3 of the hard rules: score only loaded criteria plus the two declared
 * house lenses, never invent one. An invented criterion is dropped and named in
 * `invented`, because a reviewer that fires outside its envelope fails silently
 * and this is the one place that silence can be broken.
 */
export function admitVerdicts(
  raw: readonly RawVerdict[] | null | undefined,
  options: AdmitOptions,
): AdmitResult {
  const invented: string[] = [];
  const verdicts: ScoredVerdict[] = [];
  const seen = new Set<string>();

  for (const entry of raw ?? []) {
    const criterion = matchCriterion(entry, options.allowed);
    if (!criterion) {
      const named = str(entry.criterion_name) || str(entry.criterion_id);
      if (named) invented.push(named);
      continue;
    }
    // One verdict per criterion per lens. A lens that scores the same criterion
    // twice has produced two answers to one question, and the first is the one
    // it was asked for.
    if (seen.has(criterion.id)) continue;
    seen.add(criterion.id);

    const word = str(entry.verdict).toLowerCase();
    verdicts.push({
      criterionId: criterion.id.startsWith("house.") ? null : criterion.id,
      criterionName: criterion.name,
      lens: options.lens,
      label: labelFor(options.lens),
      verdict: (VERDICT_WORDS.has(word) ? word : INSUFFICIENT) as CritiqueVerdict,
      quote: str(entry.quote),
      sentence: str(entry.sentence),
      changeToHolds: nullableStr(entry.change_to_holds),
      revision: nullableStr(entry.revision),
      adjustments: [],
    });
  }

  return { verdicts, invented };
}

/**
 * Quote or do not score, enforced after the call.
 *
 * A verdict whose quote is not a substring of the artefact is dropped to
 * `insufficient evidence`, its quote is cleared so nothing downstream can print
 * a passage that is not in the work, and the drop is recorded on the verdict so
 * the output can report it rather than quietly showing one fewer finding.
 */
export function enforceQuoteRule(
  verdicts: readonly ScoredVerdict[],
  artefact: string,
): ScoredVerdict[] {
  return (verdicts ?? []).map((verdict) => {
    if (verdict.verdict === INSUFFICIENT) return verdict;
    const check = quoteVerifies(artefact, verdict.quote);
    if (check.ok) return verdict;
    return {
      ...verdict,
      verdict: INSUFFICIENT,
      quote: "",
      revision: null,
      adjustments: [
        ...verdict.adjustments,
        { rule: "quote", from: verdict.verdict, reason: check.reason ?? "not_found" },
      ],
    };
  });
}

/**
 * A borderline is usable only if the critic names the single change that moves
 * it to holds. Without that it is a breaks.
 *
 * Not a stylistic preference: borderline with no named change is where a critic
 * parks a finding it does not want to defend, and it reads to the person as
 * "probably fine", which is the opposite of what was meant.
 */
export function enforceBorderlineRule(verdicts: readonly ScoredVerdict[]): ScoredVerdict[] {
  return (verdicts ?? []).map((verdict) => {
    if (verdict.verdict !== "borderline") return verdict;
    if (verdict.changeToHolds) return verdict;
    return {
      ...verdict,
      verdict: "breaks",
      adjustments: [...verdict.adjustments, { rule: "borderline", from: "borderline" }],
    };
  });
}

/** Every breaks that still has no revision. What the revision pass is handed. */
export function breaksNeedingRevision(verdicts: readonly ScoredVerdict[]): ScoredVerdict[] {
  return (verdicts ?? []).filter((v) => v.verdict === "breaks" && !v.revision);
}

/**
 * The terminal state (CH-15): at the pass cap, a breaks with no revision ships
 * flagged rather than looping or being dropped.
 *
 * Never a bare rejection means never a rejection with nothing attached. Where
 * the second pass could not write the fix, the honest attachment is the
 * admission, printed with the finding. Dropping the finding instead would hide
 * a real problem to protect a rule about presentation.
 */
export function markUnrepaired(verdicts: readonly ScoredVerdict[]): ScoredVerdict[] {
  return (verdicts ?? []).map((verdict) => {
    if (verdict.verdict !== "breaks" || verdict.revision) return verdict;
    if (verdict.adjustments.some((a) => a.rule === "unrepaired")) return verdict;
    return { ...verdict, adjustments: [...verdict.adjustments, { rule: "unrepaired" }] };
  });
}

/** True when this verdict shipped without the fix the hard rule asks for. */
export function isUnrepaired(verdict: ScoredVerdict): boolean {
  return verdict.adjustments.some((a) => a.rule === "unrepaired");
}

/**
 * The full deterministic pass over one lens's answer, in the order the rules
 * depend on each other: admit, then quote, then borderline. Quote runs before
 * borderline so a borderline that cannot be quoted becomes insufficient
 * evidence rather than being promoted to breaks on a passage nobody can find.
 */
export function enforceLens(
  raw: readonly RawVerdict[] | null | undefined,
  artefact: string,
  options: AdmitOptions,
): AdmitResult {
  const admitted = admitVerdicts(raw, options);
  return {
    verdicts: enforceBorderlineRule(enforceQuoteRule(admitted.verdicts, artefact)),
    invented: admitted.invented,
  };
}

/** How many verdicts each rule changed. The line the output prints out loud. */
export interface EnforcementReport {
  droppedForQuote: number;
  borderlineToBreaks: number;
  invented: string[];
  unrepaired: number;
}

export function enforcementReport(
  verdicts: readonly ScoredVerdict[],
  invented: readonly string[] = [],
): EnforcementReport {
  let droppedForQuote = 0;
  let borderlineToBreaks = 0;
  let unrepaired = 0;
  for (const verdict of verdicts ?? []) {
    for (const adjustment of verdict.adjustments) {
      if (adjustment.rule === "quote") droppedForQuote += 1;
      if (adjustment.rule === "borderline") borderlineToBreaks += 1;
      if (adjustment.rule === "unrepaired") unrepaired += 1;
    }
  }
  return {
    droppedForQuote,
    borderlineToBreaks,
    invented: Array.from(new Set(invented ?? [])),
    unrepaired,
  };
}

// ---------------------------------------------------------------------------
// Exemplar retrieval (Rule 3)
// ---------------------------------------------------------------------------

/** One of their own graded pieces, from the TRAINING set only. */
export interface GradedItem {
  id: string;
  body: string;
  /** Their verdict on it, in the sort's vocabulary. */
  verdict: "send" | "would_not_send";
  /** The line they wrote about it, verbatim. Often empty, and that is fine. */
  why: string | null;
  /** Never true for anything this function may return. */
  heldOut?: boolean;
}

export interface RetrievedExemplar extends GradedItem {
  /** Token overlap with the artefact, 0 to 1. Kept for the run record. */
  overlap: number;
}

export interface ExemplarSelection {
  exemplars: RetrievedExemplar[];
  /** True when both an accepted and a rejected piece made the set. */
  bothPoles: boolean;
  /** True when there were not enough graded items to reach the floor of three. */
  short: boolean;
  /** True when the person has graded nothing at all. Zero-shot is not a gate. */
  none: boolean;
}

const TOKEN = /[a-z0-9']+/g;
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "do",
  "for", "from", "had", "has", "have", "he", "her", "his", "i", "if", "in",
  "into", "is", "it", "its", "of", "on", "or", "our", "she", "so", "than",
  "that", "the", "their", "them", "then", "there", "they", "this", "to", "up",
  "was", "we", "were", "what", "when", "which", "who", "will", "with", "you",
  "your",
]);

/** Content tokens, lowercased, stopwords removed. Deterministic and cheap. */
export function tokenSet(text: string): Set<string> {
  const out = new Set<string>();
  const matches = String(text ?? "").toLowerCase().match(TOKEN) ?? [];
  for (const token of matches) {
    if (token.length < 3) continue;
    if (STOPWORDS.has(token)) continue;
    out.add(token);
  }
  return out;
}

/**
 * Jaccard overlap between two token sets. No embeddings: the schema provisions
 * none, and a similarity model nobody can inspect is a worse neighbour function
 * than one anybody can read in four lines.
 */
export function tokenOverlap(a: string, b: string): number {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * Three to five of their own graded items, nearest to the artefact.
 *
 * Retrieved exemplars moved one judging benchmark from 54.9 to 81.7 percent, a
 * larger effect than anything achieved by rewording a rubric. A criterion
 * describes the standard; an exemplar demonstrates it, and there is information
 * in the demonstration the description does not carry.
 *
 * TRAINING ONLY. A hold-out item retrieved into the gate is the measurement
 * being scored against its own answer key, and every number downstream of that
 * is inflated by an amount nobody can calculate afterwards.
 *
 * When there are none, the caller says so in the output. Zero-shot is
 * explicitly not a valid gate strategy, so it is never run silently.
 */
export function selectExemplars(
  artefact: string,
  items: readonly GradedItem[],
  options: { min?: number; max?: number } = {},
): ExemplarSelection {
  const min = options.min ?? EXEMPLARS_MIN;
  const max = options.max ?? EXEMPLARS_MAX;

  const usable = (items ?? []).filter(
    (item) => !item.heldOut && String(item.body ?? "").trim().length > 0,
  );
  if (usable.length === 0) {
    return { exemplars: [], bothPoles: false, short: true, none: true };
  }

  const scored = usable.map((item, index) => ({
    item,
    index,
    overlap: tokenOverlap(artefact, item.body),
  }));
  // Overlap descending; ties broken by input order so the same corpus always
  // retrieves the same neighbours.
  scored.sort((a, b) => (b.overlap - a.overlap) || (a.index - b.index));

  const exemplars = scored.slice(0, max).map(({ item, overlap }) => ({ ...item, overlap }));
  const poles = new Set(exemplars.map((e) => e.verdict));
  return {
    exemplars,
    bothPoles: poles.size > 1,
    short: exemplars.length < min,
    none: false,
  };
}

// ---------------------------------------------------------------------------
// The mechanical pass (leaves/mechanical.md)
// ---------------------------------------------------------------------------

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

export interface MechanicalFinding {
  id: string;
  label: string;
  /** The offending text, quoted. Never a paraphrase of it. */
  quote: string;
  line: number;
}

interface BannedConstruction {
  id: string;
  label: string;
  pattern: RegExp;
}

/**
 * The banned constructions, verbatim from leaves/mechanical.md. Pass or fail, no
 * judgement anywhere: the value of this pass is that it is right every time and
 * costs nothing, and the moment it starts making calls it inherits the failure
 * modes of the layer above.
 */
const BANNED: BannedConstruction[] = [
  {
    id: "mech.longDash",
    label: "Long dash",
    pattern: new RegExp(`[^\\s]*[${EM_DASH}${EN_DASH}][^\\s]*`, "g"),
  },
  {
    id: "mech.windupOpener",
    label: "Opens on nothing",
    pattern: /in today's [a-z-]+ world[^.!?]*/gi,
  },
  {
    id: "mech.notJust",
    label: "A shape, not a thought",
    pattern: /it's not just [^.!?]*?,? it's [^.!?]*/gi,
  },
  {
    id: "mech.whetherYoure",
    label: "Addresses everyone, lands on nobody",
    pattern: /whether you're [^.!?]*? or [^.!?]*/gi,
  },
  {
    id: "mech.announcesItself",
    label: "Announces the content instead of being it",
    pattern: /\b(let's dive in|let's explore|buckle up|dive deep)\b/gi,
  },
  {
    id: "mech.emptyVerb",
    label: "A verb doing nothing a plain one would not do better",
    pattern: /\b(unlock|unlocks|unlocking|unleash|unleashes|supercharge|supercharges|elevate|elevates|harness|harnesses)\b/gi,
  },
  {
    id: "mech.contentlessClaim",
    label: "A claim with no content",
    pattern: /\b(game changer|game-changer|seamless|seamlessly|robust|leverage|leverages|leveraging|synergy|synergies)\b/gi,
  },
  {
    id: "mech.nobodySaysThis",
    label: "Nobody says this out loud",
    pattern: /\b(delve|delves|delving|tapestry|testament to|underscores|pivotal)\b/gi,
  },
  {
    id: "mech.manufacturedSuspense",
    label: "Manufactured suspense about a fact",
    pattern: /^\s*(the result\?|the best part\?)\s*$/gim,
  },
  {
    id: "mech.unearnedSummary",
    label: "Signals a summary the piece did not earn",
    pattern: /^\s*(remember|ultimately),/gim,
  },
];

const SENTENCE_SPLIT = /[^.!?]+[.!?]*/g;
/** Five or more consecutive sentences within 15 percent of one length. */
const RHYTHM_RUN = 5;
const RHYTHM_TOLERANCE = 0.15;
/** Three or more paragraphs opening the same structural way. */
const OPENER_RUN = 3;

/**
 * Every mechanical violation in the text, each with the offending words quoted.
 *
 * `quotes` are verbatim spans that must not be read inside (CH-16). They are
 * masked to spaces first, length-preservingly, so a person's own rejected
 * wording can never trip a rule derived from that same wording, and so the line
 * numbers reported are the real ones. This pass only ever REPORTS. It does not
 * mutate the submission, including the house dash rule: running the house
 * sanitizer over somebody's writing would rewrite the one string the provenance
 * gate treats as immutable.
 */
export function mechanicalFindings(text: string, quotes: readonly string[] = []): MechanicalFinding[] {
  const body = maskSpans(String(text ?? ""), quotes);
  // Curly apostrophes are the same character typed differently, and every
  // replacement here is one character for one character, so an offset found in
  // the match view is the same offset in `body` and the quote reported is the
  // author's own punctuation rather than ours.
  const matchBody = body.replace(SMART_SINGLE, "'").replace(SMART_DOUBLE, '"');
  const findings: MechanicalFinding[] = [];
  const lineStarts = lineStartOffsets(body);

  for (const check of BANNED) {
    const pattern = new RegExp(check.pattern.source, check.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(matchBody)) !== null) {
      const raw = body.slice(match.index, match.index + match[0].length);
      const hit = raw.trim();
      if (hit.length === 0) {
        pattern.lastIndex += 1;
        continue;
      }
      findings.push({
        id: check.id,
        label: check.label,
        quote: hit.slice(0, 160),
        line: lineOf(lineStarts, match.index),
      });
      if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
    }
  }

  const rhythm = machineRhythm(body);
  if (rhythm) findings.push(rhythm);
  const opener = repeatedOpeners(body);
  if (opener) findings.push(opener);

  return findings;
}

/** Length-preserving mask, so every offset reported is the real one. */
function maskSpans(body: string, quotes: readonly string[]): string {
  let out = body;
  for (const quote of quotes ?? []) {
    const needle = String(quote ?? "").trim();
    if (needle.length < MIN_QUOTE_CHARS) continue;
    let from = 0;
    for (;;) {
      const at = out.indexOf(needle, from);
      if (at < 0) break;
      out = out.slice(0, at) + " ".repeat(needle.length) + out.slice(at + needle.length);
      from = at + needle.length;
    }
  }
  return out;
}

function lineStartOffsets(body: string): number[] {
  const starts = [0];
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function lineOf(starts: readonly number[], offset: number): number {
  let line = 1;
  for (let i = 0; i < starts.length; i += 1) {
    if (starts[i] <= offset) line = i + 1;
    else break;
  }
  return line;
}

function machineRhythm(body: string): MechanicalFinding | null {
  const sentences = (body.match(SENTENCE_SPLIT) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length < RHYTHM_RUN) return null;

  let runStart = 0;
  for (let i = 1; i <= sentences.length; i += 1) {
    const base = sentences[runStart].length;
    const withinRun = i < sentences.length &&
      Math.abs(sentences[i].length - base) <= base * RHYTHM_TOLERANCE;
    if (withinRun) continue;
    if (i - runStart >= RHYTHM_RUN) {
      return {
        id: "mech.machineRhythm",
        label: `${i - runStart} consecutive sentences of near-identical length`,
        quote: sentences.slice(runStart, runStart + 2).join(" ").slice(0, 160),
        line: 0,
      };
    }
    runStart = i;
  }
  return null;
}

function repeatedOpeners(body: string): MechanicalFinding | null {
  const paragraphs = String(body).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length < OPENER_RUN) return null;
  const counts = new Map<string, number>();
  for (const paragraph of paragraphs) {
    const first = (paragraph.toLowerCase().match(/[a-z']+/) ?? [""])[0];
    if (!first) continue;
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  for (const [word, count] of counts) {
    if (count >= OPENER_RUN) {
      return {
        id: "mech.repeatedOpener",
        label: `${count} paragraphs open with "${word}"`,
        quote: word,
        line: 0,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The ledger row (reference/ledger.md, four fields plus the two the table adds)
// ---------------------------------------------------------------------------

/**
 * ISO year-week, e.g. "2026-W32". The week-numbering YEAR, not the calendar
 * year: 2027-01-01 belongs to 2026-W53 and writing it as 2027-W53 would put one
 * review in a week that does not exist.
 */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  // Step to the Thursday of this week: the ISO year is the year that Thursday
  // falls in, which is the whole trick.
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** ledger.md: the quote, truncated to about fifteen words. */
export function truncateQuote(quote: string | null | undefined, words = 15): string | null {
  const text = String(quote ?? "").replace(/\s+/g, " ").trim();
  if (text.length === 0) return null;
  const parts = text.split(" ");
  if (parts.length <= words) return text;
  return `${parts.slice(0, words).join(" ")}...`;
}

/** The verdicts the ledger's CHECK constraint accepts for an output signal. */
export type LedgerVerdict = "holds" | "borderline" | "breaks" | "uncovered";

/** What the person did with the note. There is no third act of feedback-giving. */
export type ReviewResponse = "agree" | "push_back";

export type LedgerDisposition = "accepted" | "rejected" | "unknown";

export interface LedgerRow {
  user_id: string;
  week: string;
  surface: string;
  signal: "output";
  criterion_id: string | null;
  criterion_name: string;
  verdict: LedgerVerdict;
  quote: string | null;
  disposition: LedgerDisposition;
}

export interface LedgerRowInput {
  userId: string;
  surface: string;
  criterionId?: string | null;
  criterionName: string;
  verdict: LedgerVerdict;
  quote?: string | null;
  response?: ReviewResponse | null;
  at?: Date;
}

/**
 * One ledger row, from one accept-or-push-back on one verdict.
 *
 * This is the row the whole review surface exists to produce (CH-01). The
 * review is the work and the row is the by-product; there is no separate
 * feedback form, because every loop that requires a separate act of
 * feedback-giving dies.
 *
 * `disposition` is the load-bearing column. `rejected` means the gate said
 * something and the person disagreed, and two of those on the same criterion is
 * what the weekly pass promotes to a false positive. False positives are what
 * get a gate ignored, and a gate that gets ignored cannot be fixed later because
 * the credibility is already spent.
 *
 * No response is `unknown` and is written as `unknown`, never guessed.
 */
export function buildLedgerRow(input: LedgerRowInput): LedgerRow {
  const disposition: LedgerDisposition = input.response === "agree"
    ? "accepted"
    : input.response === "push_back"
    ? "rejected"
    : "unknown";
  return {
    user_id: input.userId,
    week: isoWeek(input.at ?? new Date()),
    surface: String(input.surface ?? "").trim() || "unknown",
    signal: "output",
    criterion_id: input.criterionId ?? null,
    criterion_name: String(input.criterionName ?? "").trim() || "uncovered",
    verdict: input.verdict,
    quote: truncateQuote(input.quote),
    disposition,
  };
}

/**
 * Which verdicts can carry a ledger row at all.
 *
 * `insufficient evidence` is not one of the ledger's verdicts and must not be
 * forced into one: the gate did not score that criterion, so there is nothing
 * for the person to agree or disagree with, and a row claiming otherwise would
 * be a finding nobody made.
 */
export function ledgerVerdictFor(verdict: CritiqueVerdict): LedgerVerdict | null {
  return verdict === INSUFFICIENT ? null : verdict;
}
