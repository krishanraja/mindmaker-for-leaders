/**
 * citable-spans: turning a transcript into things a rule can point AT.
 *
 * Pure module. No Deno imports, no clock, no randomness, so vitest runs it
 * directly and the same transcript always yields the same spans at the same
 * offsets.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * Phase 3b requires every rule in a generated skill to end with a pointer at a
 * criterion or an evidence row. For a leader who has run the sort, criteria and
 * evidence rows exist and the requirement is satisfiable. For everyone else the
 * requirement is satisfiable only in the degenerate way: every rule becomes
 * "NOT ESTABLISHED", the skill says nothing, and the number goes to zero because
 * the package went empty. That is a failure dressed as a pass.
 *
 * The material that closes the gap is already in the request. The leader has
 * just described their workflow in their own words, and every rule worth writing
 * traces to a sentence of it. So the transcript becomes a source, its sentences
 * become citable spans with real offsets, and a rule that quotes one is a rule
 * whose provenance can be checked by slicing the stored source.
 *
 * CH-13 applies exactly as it does at ingest: a span verifies by exact offset
 * slice into the persisted source, never by a fuzzy ratio. These spans ARE
 * slices by construction, so verification is O(1) equality and there is no
 * threshold to defend.
 *
 * Honest limit, stated rather than hidden: a sentence the leader said is weaker
 * evidence than a piece of work they graded. It is what they SAY they do, not
 * what they were observed to accept or reject. Every row minted from here is
 * situated (it was said while describing one workflow), so a rule resting on it
 * has to name that situation and cannot be written as a standing rule about all
 * their output. That is the whole point of the situated flag.
 */

export interface CitableSpan {
  /** Byte-identical to source.slice(start, end). */
  text: string;
  start: number;
  end: number;
}

export interface CitableSpanOptions {
  /** Below this a span is a fragment, not a statement worth citing. */
  minChars?: number;
  /** Above this the span is folded back to the last word boundary under it. */
  maxChars?: number;
  /** Hard cap on how many spans are offered. */
  limit?: number;
}

const DEFAULT_MIN_CHARS = 30;
const DEFAULT_MAX_CHARS = 320;
const DEFAULT_LIMIT = 40;

/** Sentence-ish boundaries: a terminator plus whitespace, or a line break. */
const BOUNDARY = /([.!?]+\s+|\n+)/g;

/**
 * The transcript, split into spans that can be quoted verbatim and located by
 * offset.
 *
 * Deliberately dumb about structure. A transcript from the voice capture is
 * prose; one composed by the Automator is a list of fragments. Splitting on
 * sentence terminators AND line breaks handles both without a format guess, and
 * a guess about someone's transcript format is the kind of quiet wrongness this
 * chain exists to avoid.
 */
export function splitCitableSpans(
  source: string,
  opts: CitableSpanOptions = {},
): CitableSpan[] {
  const text = typeof source === "string" ? source : "";
  const minChars = opts.minChars ?? DEFAULT_MIN_CHARS;
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const limit = opts.limit ?? DEFAULT_LIMIT;
  if (!text) return [];

  const out: CitableSpan[] = [];
  const boundary = new RegExp(BOUNDARY.source, "g");
  let cursor = 0;
  let match: RegExpExecArray | null;

  const push = (rawStart: number, rawEnd: number) => {
    if (out.length >= limit) return;
    // Trim inward, keeping offsets truthful: the recorded start and end must
    // slice back to exactly the recorded text or the quote is not verified.
    let start = rawStart;
    let end = rawEnd;
    while (start < end && /\s/.test(text[start])) start += 1;
    while (end > start && /\s/.test(text[end - 1])) end -= 1;
    if (end - start < minChars) return;
    if (end - start > maxChars) {
      const capped = text.slice(start, start + maxChars);
      const lastSpace = capped.lastIndexOf(" ");
      end = start + (lastSpace > minChars ? lastSpace : maxChars);
      while (end > start && /\s/.test(text[end - 1])) end -= 1;
    }
    const slice = text.slice(start, end);
    if (slice.length < minChars) return;
    out.push({ text: slice, start, end });
  };

  while ((match = boundary.exec(text)) !== null) {
    // Keep the terminator inside the span; a quote ending mid-punctuation reads
    // as a truncation the leader did not make.
    const end = match.index + (match[0].startsWith("\n") ? 0 : match[0].length);
    push(cursor, end);
    cursor = boundary.lastIndex;
    if (out.length >= limit) break;
  }
  if (out.length < limit) push(cursor, text.length);

  return out;
}

/** The verification every minted row has to pass before it is written. */
export function spanVerifies(source: string, span: CitableSpan): boolean {
  if (!span || typeof span.text !== "string") return false;
  if (!Number.isInteger(span.start) || !Number.isInteger(span.end)) return false;
  if (span.end <= span.start) return false;
  return (source ?? "").slice(span.start, span.end) === span.text;
}

/**
 * Short, unique ids for a set of uuids: the map the body cites through.
 *
 * Four hex characters is the spec's shape and is enough for the sizes involved,
 * but "enough" is not "guaranteed", so a collision extends EVERY id rather than
 * silently letting one pointer resolve to two rows. A pointer that resolves to
 * two rows resolves to neither.
 *
 * Hyphens are stripped, and the ids are matched EXACTLY downstream rather than
 * as uuid prefixes. Prefix matching would break the moment a collision pushed
 * an id past the eighth character, where the first hyphen sits, and it would
 * break quietly.
 *
 * Returned bare, without a letter prefix: the caller writes [C<id>] or [E<id>],
 * and findPointer strips that letter back off before resolution.
 */
export function shortIdsFor(uuids: string[], startLength = 4): Map<string, string> {
  const cleaned = uuids.map((id) => String(id ?? "").replace(/-/g, "").toLowerCase());
  let length = Math.max(1, startLength);
  for (; length < 32; length++) {
    const seen = new Set(cleaned.map((id) => id.slice(0, length)));
    if (seen.size === cleaned.length) break;
  }
  const out = new Map<string, string>();
  uuids.forEach((uuid, i) => {
    out.set(uuid, cleaned[i].slice(0, length) || cleaned[i]);
  });
  return out;
}
