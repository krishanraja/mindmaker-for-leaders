/**
 * ingest-post-check - the deterministic gate between the ingest LLM call and
 * the evidence / constructs rows it is allowed to write.
 *
 * Pure by constraint: no Deno imports, no I/O, no clock, no randomness, so
 * vitest runs it directly and every rejection is reproducible from its inputs.
 *
 * CH-13 (CHALLENGE.md, accepted): a quote verifies by exact offset slice into
 * the persisted source, never by a fuzzy similarity ratio. Where the exact
 * slice fails, the fallback is asymmetric and token level: every content token
 * of the quote must appear in the source IN ORDER after normalisation.
 * Deletions pass, because a model asked for a clean quote drops filler.
 * Insertions never pass, because an inserted token is fabrication.
 *
 * CH-16: the always/never/must/forbidden check is scoped to non-quoted spans,
 * and the mask is tied to a RESOLVED quote (one this module located in the
 * source), never to punctuation, so quotation marks cannot launder a rule.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The evidence kinds ingest is allowed to write. The table CHECK is wider. */
export const EVIDENCE_KINDS = ["utterance", "declared", "observation"] as const;
export type EvidenceKind = typeof EVIDENCE_KINDS[number];

export type QuoteRejectReason = "empty_quote" | "inserted_content";

export interface QuoteSpan {
  start: number;
  end: number;
}

export interface QuoteRejected {
  rejected: QuoteRejectReason;
}

export type QuoteLocation = QuoteSpan | QuoteRejected;

/** One item as the model emitted it. Every field is untrusted. */
export interface IngestItemInput {
  quote?: unknown;
  situation?: unknown;
  speaker_is_owner?: unknown;
  kind?: unknown;
}

/** One candidate as the model emitted it. Unknown keys are kept so a smuggled
 *  contrast_pole field is detectable rather than silently ignored. */
export interface IngestCandidateInput {
  emergent_pole?: unknown;
  items?: unknown;
  [key: string]: unknown;
}

/** An item that survived location plus the item-level checks. */
export interface LocatedItem {
  /** The model's quote text. Written to evidence.body. */
  body: string;
  /** The exact raw slice source.slice(start, end). Written to evidence.quote. */
  quote: string;
  quote_start: number;
  quote_end: number;
  situation: string;
  speaker_is_owner: boolean;
  kind: EvidenceKind;
}

export interface AcceptedCandidate {
  emergent_pole: string;
  items: LocatedItem[];
}

export interface IngestReject {
  reason: string;
  quote?: string;
}

export interface CandidateCheckResult {
  accepted: AcceptedCandidate | null;
  rejected: IngestReject[];
}

export interface PostCheckResult {
  candidates: AcceptedCandidate[];
  rejected: IngestReject[];
}

/** PROMPT 1 rule 6: no more than 12 candidates per source. */
export const MAX_CANDIDATES = 12;

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

// Every replacement below is one character for one character, which is the
// constraint that lets normalised offsets index straight back into raw text.
// Written as escapes so the repo carries no stray dash or quote glyphs of its
// own, and so the exact code points are readable next to the intent.
const CURLY_APOSTROPHES = /[\u2018\u2019\u201A\u201B\u2032\u00B4`]/g;
const CURLY_QUOTES = /[\u201C\u201D\u201E\u201F\u2033]/g;
const DASHES = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g;

/** Unify curly and straight apostrophes, quotes and dashes. Length preserving. */
export function unifyPunctuation(text: string): string {
  return text
    .replace(CURLY_APOSTROPHES, "'")
    .replace(CURLY_QUOTES, '"')
    .replace(DASHES, "-");
}

// The fixed filler list from CH-13. Multi-word entries are matched as phrases
// on the token stream, so "you know" drops as a unit and never as two words.
const FILLER = ["um", "uh", "you know", "like", "sort of", "kind of", "i mean"];
const FILLER_PHRASES: string[][] = FILLER
  .map((f) => f.split(" "))
  .sort((a, b) => b.length - a.length);

const WORD_CHAR = /[\p{L}\p{N}]/u;

interface SourceToken {
  key: string;
  start: number;
  end: number;
}

/**
 * Split text into content tokens carrying raw offsets. Whitespace collapses by
 * construction (tokens are the non-space runs); edge punctuation is trimmed off
 * the offsets so a located span points at the words, not the comma after them.
 */
function tokenise(text: string): SourceToken[] {
  const out: SourceToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const chunk = unifyPunctuation(m[0]).toLowerCase();
    // toLowerCase is length preserving for every character we care about; if a
    // locale expansion ever changes the length, fall back to the unified form
    // so the offsets stay truthful.
    const safe = chunk.length === m[0].length ? chunk : unifyPunctuation(m[0]);
    let lead = 0;
    while (lead < safe.length && !WORD_CHAR.test(safe[lead])) lead++;
    let tail = safe.length;
    while (tail > lead && !WORD_CHAR.test(safe[tail - 1])) tail--;
    if (tail <= lead) continue;
    out.push({
      key: safe.slice(lead, tail),
      start: m.index + lead,
      end: m.index + tail,
    });
  }
  return out;
}

/** Drop the fixed filler list, phrases first. Offsets on survivors are untouched. */
function stripFiller(tokens: SourceToken[]): SourceToken[] {
  const out: SourceToken[] = [];
  let i = 0;
  while (i < tokens.length) {
    let skip = 0;
    for (const phrase of FILLER_PHRASES) {
      if (phrase.length > tokens.length - i) continue;
      let hit = true;
      for (let k = 0; k < phrase.length; k++) {
        if (tokens[i + k].key !== phrase[k]) {
          hit = false;
          break;
        }
      }
      if (hit) {
        skip = phrase.length;
        break;
      }
    }
    if (skip > 0) {
      i += skip;
      continue;
    }
    out.push(tokens[i]);
    i += 1;
  }
  return out;
}

// Bound on how many start positions the in-order match will try. A quote whose
// first token is very common must not turn one ingest into a quadratic scan.
const MAX_ANCHORS = 500;

/**
 * Asymmetric in-order match. Returns the tightest span whose source tokens
 * contain every quote token in order, or null when a quote token is absent
 * (which is an insertion, which is fabrication).
 */
function matchInOrder(source: SourceToken[], quote: SourceToken[]): QuoteSpan | null {
  if (quote.length === 0 || source.length === 0) return null;
  const firstKey = quote[0].key;
  let best: QuoteSpan | null = null;
  let anchors = 0;

  for (let i = 0; i < source.length; i++) {
    if (source[i].key !== firstKey) continue;
    anchors += 1;
    if (anchors > MAX_ANCHORS) break;

    let qi = 1;
    let si = i + 1;
    while (qi < quote.length && si < source.length) {
      if (source[si].key === quote[qi].key) qi += 1;
      si += 1;
    }
    if (qi < quote.length) continue;

    const span = { start: source[i].start, end: source[si - 1].end };
    if (!best || span.end - span.start < best.end - best.start) best = span;
    // A span with no skipped tokens cannot be beaten.
    if (si - i === quote.length) break;
  }

  return best;
}

/** Narrowing helper so callers do not test for the `rejected` key by hand. */
export function isLocated(loc: QuoteLocation): loc is QuoteSpan {
  return (loc as QuoteSpan).start !== undefined;
}

/**
 * Locate a model-emitted quote inside the persisted source.
 *
 * Exact indexOf first (the normal path, and the only one that needs no
 * reasoning). On failure, the CH-13 asymmetric token match. Deletions pass,
 * insertions reject as 'inserted_content'.
 */
export function locateQuote(source: string, quote: string): QuoteLocation {
  const raw = typeof quote === "string" ? quote.trim() : "";
  if (!raw) return { rejected: "empty_quote" };
  if (typeof source !== "string" || source.length === 0) {
    return { rejected: "inserted_content" };
  }

  const exact = source.indexOf(raw);
  if (exact >= 0) return { start: exact, end: exact + raw.length };

  const quoteTokens = stripFiller(tokenise(raw));
  if (quoteTokens.length === 0) return { rejected: "empty_quote" };

  const sourceTokens = stripFiller(tokenise(source));
  const span = matchInOrder(sourceTokens, quoteTokens);
  if (!span || span.end <= span.start) return { rejected: "inserted_content" };
  return span;
}

// ---------------------------------------------------------------------------
// Candidate checks
// ---------------------------------------------------------------------------

const RULE_WORDS = /\b(always|never|must|forbidden)\b/i;

/** Shortest needle worth masking; below this a mask would swallow the pole. */
const MIN_MASK_LENGTH = 3;

function replaceAllInsensitive(haystack: string, needle: string): string {
  const unifiedHay = unifyPunctuation(haystack);
  const unifiedNeedle = unifyPunctuation(needle);
  const hay = unifiedHay.toLowerCase();
  const nee = unifiedNeedle.toLowerCase();
  // Only use the lowercased forms when they stayed the same length, so the
  // index found in the lowercased copy is valid in the original.
  const searchHay = hay.length === haystack.length ? hay : unifiedHay;
  const searchNeedle = nee.length === needle.length ? nee : unifiedNeedle;
  if (!searchNeedle) return haystack;

  let out = haystack;
  let from = 0;
  for (;;) {
    const at = searchHay.indexOf(searchNeedle, from);
    if (at < 0) break;
    out = out.slice(0, at) + " ".repeat(searchNeedle.length) + out.slice(at + searchNeedle.length);
    from = at + searchNeedle.length;
  }
  return out;
}

/**
 * Blank out every resolved quote inside `text`. The mask is tied to quotes this
 * module located in the source (CH-16), so quotation marks alone cannot exempt
 * a span from the rule-word check.
 */
export function maskQuotedSpans(text: string, resolvedQuotes: string[]): string {
  let masked = typeof text === "string" ? text : "";
  for (const q of resolvedQuotes) {
    const needle = typeof q === "string" ? q.trim() : "";
    if (needle.length < MIN_MASK_LENGTH) continue;
    masked = replaceAllInsensitive(masked, needle);
  }
  return masked;
}

/**
 * transcripts.md rule 7: nothing produced here may say always, never, must or
 * forbidden outside a quoted span. A candidate is not a rule and may not be
 * phrased like one, because the phrasing outlives the caveat.
 */
export function isRulePhrased(emergentPole: string, resolvedQuotes: string[]): boolean {
  return RULE_WORDS.test(maskQuotedSpans(emergentPole ?? "", resolvedQuotes));
}

/** Restrict the model's kind to what ingest may write. Anything else is speech. */
export function normaliseEvidenceKind(value: unknown): EvidenceKind {
  const k = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (EVIDENCE_KINDS as readonly string[]).includes(k) ? (k as EvidenceKind) : "utterance";
}

/**
 * Check one candidate against the persisted source. Locates every quote, drops
 * items that cannot be grounded or situated, then judges the pole itself.
 * Every drop is returned; nothing is discarded quietly.
 */
export function checkCandidate(
  bodyText: string,
  candidate: IngestCandidateInput,
): CandidateCheckResult {
  const rejected: IngestReject[] = [];

  const pole = typeof candidate?.emergent_pole === "string" ? candidate.emergent_pole.trim() : "";
  if (!pole) {
    rejected.push({ reason: "empty_pole" });
    return { accepted: null, rejected };
  }

  // PROMPT 1 rule 3: the sort produces the contrast pole. Ingest never does.
  // Only a literal contrast_pole field is a violation; a pole worded as a
  // comparison ("names a client fact vs could be for anyone") is one legitimate
  // line naming one dimension, and rejecting it would starve the sort.
  const smuggled = Object.prototype.hasOwnProperty.call(candidate ?? {}, "contrast_pole")
    && candidate.contrast_pole != null
    && String(candidate.contrast_pole).trim() !== "";
  if (smuggled) {
    rejected.push({ reason: "contrast_pole_emitted", quote: pole });
    return { accepted: null, rejected };
  }

  const rawItems: IngestItemInput[] = Array.isArray(candidate?.items)
    ? (candidate.items as IngestItemInput[])
    : [];
  const items: LocatedItem[] = [];

  for (const raw of rawItems) {
    const quoteText = typeof raw?.quote === "string" ? raw.quote.trim() : "";
    const situation = typeof raw?.situation === "string" ? raw.situation.trim() : "";

    const located = locateQuote(bodyText, quoteText);
    if (!isLocated(located)) {
      rejected.push({ reason: located.rejected, quote: quoteText || undefined });
      continue;
    }
    // PROMPT 1 rule 2: situated, in the speaker's framing. The evidence table
    // refuses a situated row with no situation, so catch it here with a reason.
    if (!situation) {
      rejected.push({ reason: "missing_situation", quote: quoteText });
      continue;
    }

    items.push({
      body: quoteText,
      quote: bodyText.slice(located.start, located.end),
      quote_start: located.start,
      quote_end: located.end,
      situation,
      speaker_is_owner: raw?.speaker_is_owner === true,
      kind: normaliseEvidenceKind(raw?.kind),
    });
  }

  // PROMPT 1 rule 1: quote or do not produce.
  if (items.length === 0) {
    rejected.push({ reason: "no_evidence", quote: pole });
    return { accepted: null, rejected };
  }

  if (isRulePhrased(pole, items.map((i) => i.quote))) {
    rejected.push({ reason: "rule_phrased_pole", quote: pole });
    return { accepted: null, rejected };
  }

  return { accepted: { emergent_pole: pole, items }, rejected };
}

/** Keep the first `max`; return the overflow so the caller can report it. */
export function capCandidates<T>(list: T[], max: number = MAX_CANDIDATES): {
  kept: T[];
  dropped: T[];
} {
  const safe = Array.isArray(list) ? list : [];
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : MAX_CANDIDATES;
  return { kept: safe.slice(0, limit), dropped: safe.slice(limit) };
}

/** Cap, then check every candidate. The whole deterministic gate in one call. */
export function runPostCheck(
  bodyText: string,
  candidates: IngestCandidateInput[],
  max: number = MAX_CANDIDATES,
): PostCheckResult {
  const { kept, dropped } = capCandidates(candidates, max);
  const accepted: AcceptedCandidate[] = [];
  const rejected: IngestReject[] = [];

  for (const candidate of kept) {
    const result = checkCandidate(bodyText, candidate ?? {});
    rejected.push(...result.rejected);
    if (result.accepted) accepted.push(result.accepted);
  }

  for (const over of dropped) {
    const pole = typeof over?.emergent_pole === "string" ? over.emergent_pole.trim() : "";
    rejected.push({ reason: "over_candidate_cap", quote: pole || undefined });
  }

  return { candidates: accepted, rejected };
}
