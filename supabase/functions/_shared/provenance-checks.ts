/**
 * Provenance checks over a generated skill package.
 *
 * Pure module. No Deno imports, so vitest runs it beside the frontend suite.
 *
 * Phase 1 shipped these three checks ADVISORY, to produce the one number the
 * project exists to move: how many rules a generated skill states without
 * pointing at the evidence or the criterion it came from. Phase 3b makes them
 * BLOCKING in generate-skill-export, where criteria and evidence are supplied
 * and the rule can therefore be satisfied. They stay advisory in
 * free-skill-export, which has neither: a gate that cannot be satisfied must
 * not block.
 *
 * CH-16 constraint, and it is the rule the whole file is built around:
 * NO GATE MUTATES A QUOTED SPAN. A slop check may only report. Every check here
 * runs over a MASKED copy, where verbatim evidence quotes and any fenced block
 * labelled as evidence or target voice register are blanked to spaces first, and
 * exemplars/ is excluded from the gated set entirely. A leader's own rejected
 * wording can therefore never trip a rule derived from that same wording.
 *
 * CH-13 constraint: matching is exact-substring, never fuzzy. A quote either
 * appears in the text character for character or it is not masked.
 */

export type PointerKind = "criterion" | "evidence";

export interface Pointer {
  kind: PointerKind;
  /** The id inside the brackets, without the C/E prefix. */
  id: string;
}

export interface ImperativeClaim {
  /** The sentence as it appears in the masked body, list marker stripped. */
  text: string;
  /** 1-based line number in the body the claim was found on. */
  line: number;
}

/** One file of a package, as the gate reads it. */
export interface ProvenanceFile {
  path: string;
  content: string;
}

/** An imperative, plus where in the package it lives and what it points at. */
export interface LocatedClaim extends ImperativeClaim {
  /** "" for a single-body run, otherwise the package-relative path. */
  path: string;
  /** "<path>#<nearest heading>", the section skill_provenance records. */
  section: string;
  pointer: Pointer | null;
}

/** Structurally identical to generate-skill-export/quality-gate.ts QualityCheck. */
export interface ProvenanceCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ProvenanceOptions {
  knownCriterionIds?: string[];
  knownEvidenceIds?: string[];
  situatedEvidenceIds?: string[];
  evidenceQuotes?: string[];
}

// ---------------------------------------------------------------------------
// Imperative extraction
// ---------------------------------------------------------------------------

const HEADING_LINE = /^\s{0,3}#{1,6}\s/;
const LIST_MARKER = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/;
const NOT_ESTABLISHED = /^not established\s*:/i;
const COMMAND_WORDS = /\b(?:must(?:\s+not)?|never|always|do not|don't|avoid)\b/i;

/**
 * Verbs a skill body commands with. Recognition list, not a parser: an
 * imperative sentence in this corpus either opens with one of these or carries
 * a command word, and anything subtler is out of scope for a baseline count.
 */
const IMPERATIVE_VERBS = new Set([
  "accept", "add", "allow", "answer", "apply", "ask", "assume", "attach",
  "begin", "block", "bound", "build", "call", "cap", "capture", "check",
  "choose", "cite", "clarify", "close", "collect", "compare", "confirm",
  "copy", "count", "create", "decide", "define", "delete", "deliver",
  "describe", "do", "draft", "drop", "end", "enforce", "ensure", "escalate",
  "exclude", "explain", "fetch", "filter", "finish", "flag", "focus",
  "follow", "format", "generate", "give", "grade", "guard", "hand", "hide",
  "hold", "honour", "honor", "ignore", "include", "insert", "keep", "label",
  "lead", "leave", "limit", "list", "load", "log", "make", "map", "mark",
  "mask", "match", "measure", "mention", "merge", "name", "note", "offer",
  "open", "pick", "place", "point", "prefer", "present", "propose",
  "protect", "prove", "provide", "publish", "quote", "raise", "rank",
  "read", "record", "redact", "reject", "remove", "render", "repeat",
  "replace", "reply", "report", "request", "resolve", "respect", "respond",
  "restate", "retry", "return", "review", "rewrite", "route", "run", "save",
  "say", "score", "send", "set", "show", "skip", "sort", "split", "start",
  "state", "stop", "store", "strip", "suggest", "summarise", "summarize",
  "surface", "tag", "take", "tell", "test", "trim", "use", "verify", "wait",
  "weigh", "work", "wrap", "write",
]);

/** A bracket pointer alone on a fragment ("Do X. [C3]" splits into two). */
const POINTER_ONLY = /^\[[CE][A-Za-z0-9][A-Za-z0-9-]*\]\s*[.,;:)\]]*$/;

const TRAILING_POINTER = /\[([CE])([A-Za-z0-9][A-Za-z0-9-]*)\]\s*[.!?,;:)\]"']*\s*$/;
const ANY_POINTER = /\[([CE])([A-Za-z0-9][A-Za-z0-9-]*)\]/g;

function stripDecoration(sentence: string): string {
  return sentence.replace(/^[\s>*_`"'“‘(]+/, "").trim();
}

function splitSentences(line: string): string[] {
  const parts = line.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // A trailing pointer split off its own sentence belongs to the sentence it
    // cites, never to a claim of its own.
    if (POINTER_ONLY.test(trimmed) && out.length > 0) {
      out[out.length - 1] = `${out[out.length - 1]} ${trimmed}`;
      continue;
    }
    out.push(trimmed);
  }
  return out;
}

function isImperative(sentence: string): boolean {
  const cleaned = stripDecoration(sentence);
  if (!cleaned) return false;
  if (COMMAND_WORDS.test(cleaned)) return true;
  const firstWord = cleaned.split(/[^A-Za-z']+/).filter(Boolean)[0];
  if (!firstWord) return false;
  return IMPERATIVE_VERBS.has(firstWord.toLowerCase());
}

/**
 * Imperative sentences in a skill body: a sentence that opens with a command
 * verb or carries MUST / NEVER / ALWAYS / do not / avoid. Markdown headings are
 * excluded (a heading commands nothing), and so is any line that opens with
 * "NOT ESTABLISHED:" - that is the honest form an unpointed rule is rewritten
 * into, so counting it would penalise the fix.
 */
export function extractImperativeClaims(body: string): ImperativeClaim[] {
  const claims: ImperativeClaim[] = [];
  const lines = (body ?? "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    if (HEADING_LINE.test(raw)) continue;
    const withoutMarker = raw.replace(LIST_MARKER, "").trimStart();
    if (NOT_ESTABLISHED.test(stripDecoration(withoutMarker))) continue;
    for (const sentence of splitSentences(withoutMarker)) {
      if (NOT_ESTABLISHED.test(stripDecoration(sentence))) continue;
      if (isImperative(sentence)) claims.push({ text: sentence, line: i + 1 });
    }
  }
  return claims;
}

/**
 * The "NOT ESTABLISHED:" lines, which are the honest form an unpointed rule is
 * rewritten into. They are deliberately NOT counted as claims, and they are
 * extracted here so the provenance ledger can record them as marked_awaiting
 * rather than lose them: a flagged gap is a finding, and a finding nobody wrote
 * down is a finding that did not happen.
 */
export function extractNotEstablished(body: string): ImperativeClaim[] {
  const out: ImperativeClaim[] = [];
  const lines = (body ?? "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const withoutMarker = lines[i].replace(LIST_MARKER, "").trimStart();
    const cleaned = stripDecoration(withoutMarker);
    if (NOT_ESTABLISHED.test(cleaned)) out.push({ text: cleaned, line: i + 1 });
  }
  return out;
}

/**
 * A stable id for a claim's text, so the same sentence in pass 1 and pass 2 is
 * recognisably the same claim. 64-bit FNV-1a, rendered as 16 hex characters.
 * Not a security primitive and never used as one; it is a join key.
 */
export function claimHash(text: string): string {
  const normalised = (text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  // Two 32-bit FNV-1a lanes with different offsets, concatenated. Keeps the
  // arithmetic inside the 32-bit range JS bitwise ops are exact over.
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < normalised.length; i++) {
    const code = normalised.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ (code + i), 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

const HEADING_TEXT = /^\s{0,3}#{1,6}\s+(.*)$/;

/**
 * Every imperative in a set of files, with its file, its nearest heading and
 * its pointer. Quotes are masked before anything is read (CH-16).
 */
export function collectClaims(
  files: ProvenanceFile[],
  quotes: string[] = [],
): LocatedClaim[] {
  const out: LocatedClaim[] = [];
  for (const file of files ?? []) {
    const masked = maskQuotedSpans(file.content ?? "", quotes);
    const headingByLine = new Map<number, string>();
    let heading = "";
    const lines = masked.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const match = HEADING_TEXT.exec(lines[i]);
      if (match) heading = match[1].trim();
      headingByLine.set(i + 1, heading);
    }
    for (const claim of extractImperativeClaims(masked)) {
      const section = headingByLine.get(claim.line) ?? "";
      out.push({
        ...claim,
        path: file.path ?? "",
        section: section ? `${file.path}#${section}` : (file.path ?? ""),
        pointer: findPointer(claim.text),
      });
    }
  }
  return out;
}

/** The NOT ESTABLISHED lines across a set of files, with their sections. */
export function collectNotEstablished(
  files: ProvenanceFile[],
  quotes: string[] = [],
): LocatedClaim[] {
  const out: LocatedClaim[] = [];
  for (const file of files ?? []) {
    const masked = maskQuotedSpans(file.content ?? "", quotes);
    for (const line of extractNotEstablished(masked)) {
      out.push({ ...line, path: file.path ?? "", section: file.path ?? "", pointer: null });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pointers
// ---------------------------------------------------------------------------

/**
 * The trailing [C<id>] / [E<id>] pointer on a passage. Trailing only: a pointer
 * mid-sentence cites something else, and the rule the chain enforces is that a
 * claim ENDS with the thing it came from.
 */
export function findPointer(text: string): Pointer | null {
  const match = TRAILING_POINTER.exec(text ?? "");
  if (!match) return null;
  return { kind: match[1] === "C" ? "criterion" : "evidence", id: match[2] };
}

/** Every pointer in a passage, in order. Used where "its ONLY pointers" matters. */
export function findAllPointers(text: string): Pointer[] {
  const out: Pointer[] = [];
  const re = new RegExp(ANY_POINTER.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text ?? "")) !== null) {
    out.push({ kind: match[1] === "C" ? "criterion" : "evidence", id: match[2] });
  }
  return out;
}

/**
 * Shortest pointer id accepted as a prefix of a full id. Below this a bare
 * "[C3]" would resolve against any uuid beginning with 3, which resolves
 * nothing and only launders a miss into a pass.
 */
const MIN_FRAGMENT_LENGTH = 4;

function idResolves(id: string, known: string[]): boolean {
  const needle = id.toLowerCase();
  return known.some((candidate) => {
    const hay = String(candidate ?? "").toLowerCase();
    if (!hay) return false;
    if (hay === needle) return true;
    return needle.length >= MIN_FRAGMENT_LENGTH && hay.startsWith(needle);
  });
}

// ---------------------------------------------------------------------------
// Span masking (CH-16)
// ---------------------------------------------------------------------------

/**
 * Shortest evidence quote worth masking. A one or two character "quote" would
 * blank most of the body and hide real claims.
 */
const MIN_QUOTE_LENGTH = 4;

const FENCE_OPEN = /^\s*(`{3,}|~{3,})\s*(.*)$/;
const FENCE_CLOSE = /^\s*(?:`{3,}|~{3,})\s*$/;
const EVIDENCE_LABEL = /\b(evidence|exemplar|verbatim|quote|quoted|voice|register|sample)\b/i;
const FIRST_LINE_LABEL = /^\s*[>*_`#\s]*(evidence|quote|quoted|verbatim|exemplar|target voice|voice register|voice)\b/i;

/** Same length, newlines preserved, so line numbers and offsets do not move. */
function blank(text: string): string {
  return text.replace(/[^\n]/g, " ");
}

function replaceAllExact(haystack: string, needle: string, replacement: string): string {
  let out = "";
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return out + haystack.slice(from);
    out += haystack.slice(from, at) + replacement;
    from = at + needle.length;
  }
}

function maskLabelledFences(body: string): string {
  const lines = body.split("\n");
  let inFence = false;
  let masking = false;
  for (let i = 0; i < lines.length; i++) {
    if (!inFence) {
      const open = FENCE_OPEN.exec(lines[i]);
      if (!open) continue;
      inFence = true;
      const info = open[2] ?? "";
      const firstContent = lines[i + 1] ?? "";
      masking = EVIDENCE_LABEL.test(info) || FIRST_LINE_LABEL.test(firstContent);
      continue;
    }
    if (FENCE_CLOSE.test(lines[i])) {
      inFence = false;
      masking = false;
      continue;
    }
    if (masking) lines[i] = blank(lines[i]);
  }
  return lines.join("\n");
}

/**
 * Blank every occurrence of each evidence quote, plus any fenced block labelled
 * as evidence or target voice register, so no downstream check ever fires
 * inside verbatim material (CH-16). Exact substring only (CH-13); replacement
 * is same-length spaces, so every line number and offset survives.
 */
export function maskQuotedSpans(body: string, quotes: string[]): string {
  let masked = body ?? "";
  for (const quote of quotes ?? []) {
    const needle = (quote ?? "").trim();
    if (needle.length < MIN_QUOTE_LENGTH) continue;
    masked = replaceAllExact(masked, needle, blank(needle));
  }
  return maskLabelledFences(masked);
}

// ---------------------------------------------------------------------------
// The three advisory checks
// ---------------------------------------------------------------------------

const SITUATIONAL_MARKERS = ["for ", "when ", "on this", "in this", "during"];

function hasSituationalQualifier(text: string): boolean {
  const lower = text.toLowerCase();
  return SITUATIONAL_MARKERS.some((marker) => lower.includes(marker));
}

const UNPOINTED_DETAIL = /^(\d+) of (\d+) imperatives/;

/**
 * Reads the Phase 1 baseline number back out of the prov.everyRuleCited detail.
 * Lives here so the format and its parser cannot drift apart.
 */
export function parseUnpointedImperatives(detail?: string | null): number | null {
  const match = UNPOINTED_DETAIL.exec(detail ?? "");
  return match ? Number(match[1]) : null;
}

function quoteSample(claims: LocatedClaim[], limit = 3): string {
  return claims
    .slice(0, limit)
    .map((c) => `${c.path ? `${c.path} ` : ""}line ${c.line}: "${c.text.slice(0, 70)}"`)
    .join("; ");
}

function everyRuleCited(claims: LocatedClaim[]): ProvenanceCheck {
  const unpointed = claims.filter((claim) => !findPointer(claim.text));
  const detail = `${unpointed.length} of ${claims.length} imperatives carry no [C]/[E] pointer` +
    (unpointed.length > 0 ? ` (${quoteSample(unpointed)})` : "");
  return {
    id: "prov.everyRuleCited",
    label: "Every rule points at what it came from",
    passed: unpointed.length === 0,
    detail,
  };
}

function pointerResolves(claims: LocatedClaim[], opts: ProvenanceOptions): ProvenanceCheck {
  const criterionIds = opts.knownCriterionIds;
  const evidenceIds = opts.knownEvidenceIds;
  const hasCriterionIds = Array.isArray(criterionIds);
  const hasEvidenceIds = Array.isArray(evidenceIds);

  if (!hasCriterionIds && !hasEvidenceIds) {
    return {
      id: "prov.pointerResolves",
      label: "Every pointer resolves to a live row",
      passed: true,
      detail: "pointer resolution not checked this pass (no ids supplied)",
    };
  }

  const pointers = claims.flatMap((claim) => findAllPointers(claim.text));
  const checkable = pointers.filter((p) =>
    p.kind === "criterion" ? hasCriterionIds : hasEvidenceIds
  );
  const unresolved = checkable.filter((p) =>
    !idResolves(p.id, (p.kind === "criterion" ? criterionIds : evidenceIds) as string[])
  );

  const skipped = pointers.length - checkable.length;
  const skipNote = skipped > 0
    ? `; ${skipped} pointer(s) of the other kind not checked (no ids supplied)`
    : "";
  const detail = unresolved.length === 0
    ? `${checkable.length} pointer(s) checked, all resolve${skipNote}`
    : `${unresolved.length} of ${checkable.length} pointer(s) resolve to nothing: ` +
      unresolved.slice(0, 3).map((p) => `[${p.kind === "criterion" ? "C" : "E"}${p.id}]`).join(", ") +
      skipNote;

  return {
    id: "prov.pointerResolves",
    label: "Every pointer resolves to a live row",
    passed: unresolved.length === 0,
    detail,
  };
}

function noSituatedGeneralisation(
  claims: LocatedClaim[],
  opts: ProvenanceOptions,
): ProvenanceCheck {
  const situated = opts.situatedEvidenceIds;
  if (!Array.isArray(situated)) {
    return {
      id: "prov.noSituatedGeneralisation",
      label: "No standing rule rests only on situated evidence",
      passed: true,
      detail: "situated evidence not checked this pass (no ids supplied)",
    };
  }

  const offenders = claims.filter((claim) => {
    if (hasSituationalQualifier(claim.text)) return false;
    const pointers = findAllPointers(claim.text);
    // An unpointed rule is prov.everyRuleCited's finding, not this one's.
    if (pointers.length === 0) return false;
    return pointers.every((p) => p.kind === "evidence" && idResolves(p.id, situated));
  });

  return {
    id: "prov.noSituatedGeneralisation",
    label: "No standing rule rests only on situated evidence",
    passed: offenders.length === 0,
    detail: offenders.length === 0
      ? `${claims.length} imperative(s) checked, none generalise situated evidence`
      : `${offenders.length} rule(s) stated as standing on situated evidence only (${quoteSample(offenders)})`,
  };
}

/** The check ids this module owns, in the order it returns them. */
export const PROVENANCE_CHECK_IDS = [
  "prov.everyRuleCited",
  "prov.pointerResolves",
  "prov.noSituatedGeneralisation",
] as const;

/**
 * The three provenance checks, in the QualityCheck shape the skill quality gate
 * already speaks. Quotes and labelled fences are masked first, so nothing here
 * reads a verbatim span.
 */
export function runProvenanceChecks(
  body: string,
  opts: ProvenanceOptions = {},
): ProvenanceCheck[] {
  return runProvenanceChecksOverClaims(
    collectClaims([{ path: "", content: body ?? "" }], opts.evidenceQuotes ?? []),
    opts,
  );
}

/**
 * The same three checks over a whole package.
 *
 * The caller decides which files are gated; gatedFiles() in skill-package.ts is
 * the answer for a generated package and it excludes exemplars/ and evals/
 * entirely (CH-16). Nothing here reads a file it was not handed.
 */
export function runProvenanceChecksOverFiles(
  files: ProvenanceFile[],
  opts: ProvenanceOptions = {},
): ProvenanceCheck[] {
  return runProvenanceChecksOverClaims(collectClaims(files, opts.evidenceQuotes ?? []), opts);
}

/** For a caller that already collected the claims and wants to reuse them. */
export function runProvenanceChecksOverClaims(
  claims: LocatedClaim[],
  opts: ProvenanceOptions = {},
): ProvenanceCheck[] {
  return [
    everyRuleCited(claims),
    pointerResolves(claims, opts),
    noSituatedGeneralisation(claims, opts),
  ];
}

/**
 * How a claim's pointer resolved, in the vocabulary skill_provenance.resolution
 * speaks. 'deleted' is written by stage 7a in a later phase, when an
 * unresolvable rule is removed rather than reported; nothing in Phase 3b deletes
 * a rule, so nothing here returns it.
 */
export type ClaimResolution = "cited" | "unresolved" | "marked_awaiting" | "deleted";

export function resolveClaim(claim: LocatedClaim, opts: ProvenanceOptions = {}): ClaimResolution {
  const pointer = claim.pointer;
  if (!pointer) return "unresolved";
  const known = pointer.kind === "criterion" ? opts.knownCriterionIds : opts.knownEvidenceIds;
  // No id set for that kind means resolution was not checkable this pass. The
  // honest answer is the pointer stands, the same skip prov.pointerResolves
  // reports rather than a fake pass or a fake failure.
  if (!Array.isArray(known)) return "cited";
  return idResolves(pointer.id, known) ? "cited" : "unresolved";
}

/** The full id a short pointer resolves to, or null. The map back to a uuid. */
export function resolvePointerId(pointer: Pointer, known: string[] | undefined): string | null {
  if (!Array.isArray(known)) return null;
  const needle = pointer.id.toLowerCase();
  const hit = known.find((candidate) => {
    const hay = String(candidate ?? "").toLowerCase();
    if (!hay) return false;
    if (hay === needle) return true;
    return needle.length >= MIN_FRAGMENT_LENGTH && hay.startsWith(needle);
  });
  return hit ?? null;
}
