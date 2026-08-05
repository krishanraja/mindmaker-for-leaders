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
 *
 * Scope, added after the first Phase 3b acceptance run: the package is
 * router-plus-leaves, so a rule's situation can be declared ONCE at the top of
 * the leaf that exists to hold it rather than repeated on every line inside it.
 * See "Declared scope" below for the rule and the boundary that keeps it honest.
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
  /**
   * The scope the file this claim lives in declares, or null when the file
   * declares none. A claim carries it so every downstream check reads the same
   * answer the collector read, rather than re-deriving it from a file it may no
   * longer have.
   */
  scope: FileScope | null;
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
/**
 * One short label and a colon, e.g. "Hard rules: ". A generator writing an
 * honest gap under a labelled field produces "Hard rules: NOT ESTABLISHED: x",
 * and anchoring the marker to the line start alone counted that as an unpointed
 * rule, which penalises the fix instead of the failure. At most ONE label is
 * stripped, so the marker still has to INTRODUCE the assertion: "Do X because
 * NOT ESTABLISHED" is not an escape and must keep failing.
 */
const LABEL_PREFIX = /^(?:\*\*)?[A-Za-z][A-Za-z0-9 ]{0,28}(?:\*\*)?\s*:\s*/;

/** True when the text is the honest NOT ESTABLISHED form, with or without a label. */
function isNotEstablished(text: string): boolean {
  if (NOT_ESTABLISHED.test(text)) return true;
  const delabelled = text.replace(LABEL_PREFIX, "");
  return delabelled !== text && NOT_ESTABLISHED.test(delabelled);
}
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
    if (isNotEstablished(stripDecoration(withoutMarker))) continue;
    for (const sentence of splitSentences(withoutMarker)) {
      if (isNotEstablished(stripDecoration(sentence))) continue;
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
    if (isNotEstablished(cleaned)) out.push({ text: cleaned, line: i + 1 });
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
 * One file, masked (CH-16) and with any scope header it is allowed to declare
 * read off and then blanked, so nothing downstream reads the header as a rule.
 */
function readFile(file: ProvenanceFile, quotes: string[]): {
  body: string;
  scope: FileScope | null;
} {
  // Masked first, then the header is read. The header is generated metadata and
  // never a leader's verbatim words, so reading it from the masked copy costs
  // nothing; in the impossible case where a quote blanked it, the scope is lost
  // and its rules are judged unscoped, which fails in the safe direction.
  const masked = maskQuotedSpans(file.content ?? "", quotes);
  const scope = pathMayDeclareScope(file.path ?? "") ? parseScopeHeader(masked) : null;
  return { body: scope ? blankScopeHeader(masked) : masked, scope };
}

/**
 * Every imperative in a set of files, with its file, its nearest heading, its
 * pointer and the scope its file declares. Quotes are masked before anything is
 * read (CH-16).
 */
export function collectClaims(
  files: ProvenanceFile[],
  quotes: string[] = [],
): LocatedClaim[] {
  const out: LocatedClaim[] = [];
  for (const file of files ?? []) {
    const { body, scope } = readFile(file, quotes);
    const headingByLine = new Map<number, string>();
    let heading = "";
    const lines = body.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const match = HEADING_TEXT.exec(lines[i]);
      if (match) heading = match[1].trim();
      headingByLine.set(i + 1, heading);
    }
    for (const claim of extractImperativeClaims(body)) {
      const section = headingByLine.get(claim.line) ?? "";
      out.push({
        ...claim,
        path: file.path ?? "",
        section: section ? `${file.path}#${section}` : (file.path ?? ""),
        pointer: findPointer(claim.text),
        scope,
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
    const { body, scope } = readFile(file, quotes);
    for (const line of extractNotEstablished(body)) {
      out.push({ ...line, path: file.path ?? "", section: file.path ?? "", pointer: null, scope });
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
// Declared scope
// ---------------------------------------------------------------------------

/**
 * THE RULE, written into the code because it is the whole of this section:
 *
 *   A SCOPE DECLARED ONCE AT THE TOP OF A LEAF IS THE SITUATED FORM EXPRESSED AT
 *   THE RIGHT ALTITUDE. A LEAF MAY NOT DECLARE A SCOPE ITS CITED EVIDENCE DOES
 *   NOT SUPPORT.
 *
 * The package is router-plus-leaves. A surface leaf like rubric/client-updates.md
 * exists precisely to scope its contents to one surface, so demanding that every
 * line inside it repeat "For client updates on this engagement, ..." produces
 * unreadable output and pushes a generator toward a boilerplate prefix, which
 * games the check instead of satisfying it. The header states the situation once,
 * where it is true of everything below it, and names the evidence that says so.
 *
 * The boundary is what keeps the check honest, and it is not a detail:
 * rubric/core.md is always-on and rubric/general.md is the explicit fallback, so
 * NEITHER may ever declare a scope. That is what still catches "Never produce a
 * deck" landing in core.md off one situated remark about one client, which is the
 * failure this whole file exists to prevent.
 */

/** What a leaf says it covers, and the evidence rows that say so. */
export interface FileScope {
  /** The situations, deduped and joined. Prose, for the reader. */
  appliesTo: string;
  /** The evidence ids behind those situations, without the E prefix. */
  scopeIds: string[];
}

const SCOPE_APPLIES_TO_LABEL = "**Applies to:**";
const SCOPE_SOURCE_LABEL = "**Scope source:**";

/**
 * Lines from the top of a file the header may occupy. It is written directly
 * under the leaf's H1, so a small window is enough; a wide one would let a
 * declaration buried halfway down a file silence the rules above it.
 */
const SCOPE_HEADER_WINDOW = 8;

/**
 * Which files may declare a scope at all.
 *
 * Only a SURFACE rubric leaf. core.md and general.md are unscoped by definition.
 * SKILL.md is a router and carries no rules. references/*.md are written by the
 * generator, and honouring a header there would let the generator hand itself a
 * scope, which is the one thing this mechanism must not become.
 */
const SCOPE_ELIGIBLE_PATH = /^rubric\/(?!core\.md$)(?!general\.md$)[^/]+\.md$/;

export function pathMayDeclareScope(path: string): boolean {
  return SCOPE_ELIGIBLE_PATH.test(String(path ?? ""));
}

/**
 * The header, in the exact two lines parseScopeHeader reads back. Lives beside
 * its parser so the format and the thing that reads it cannot drift apart;
 * skill-package.ts writes these lines rather than its own copy of them.
 */
export function formatScopeHeader(scope: FileScope): string[] {
  return [
    `${SCOPE_APPLIES_TO_LABEL} ${scope.appliesTo}`,
    `${SCOPE_SOURCE_LABEL} ${scope.scopeIds.map((id) => `[E${id}]`).join(", ")}`,
  ];
}

/**
 * The scope a file declares, or null.
 *
 * Both lines are required and the source line must carry at least one evidence
 * pointer: an "Applies to" with nothing behind it is a claim about coverage with
 * no evidence, which is the shape this module refuses everywhere else. Anything
 * malformed returns null, which leaves the file unscoped and its rules judged
 * exactly as they are today.
 */
export function parseScopeHeader(fileContent: string): FileScope | null {
  const lines = String(fileContent ?? "").split("\n").slice(0, SCOPE_HEADER_WINDOW);
  let appliesTo = "";
  let scopeIds: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!appliesTo && trimmed.startsWith(SCOPE_APPLIES_TO_LABEL)) {
      appliesTo = trimmed.slice(SCOPE_APPLIES_TO_LABEL.length).trim();
      continue;
    }
    if (scopeIds.length === 0 && trimmed.startsWith(SCOPE_SOURCE_LABEL)) {
      scopeIds = findAllPointers(trimmed)
        .filter((pointer) => pointer.kind === "evidence")
        .map((pointer) => pointer.id);
    }
  }
  if (!appliesTo || scopeIds.length === 0) return null;
  return { appliesTo, scopeIds };
}

/**
 * Blank the two header lines, same length, newlines kept.
 *
 * Same idiom and same reason as stripFrontmatter: the header is package metadata,
 * not a rule about the person, so no check may read it as one. Without this a
 * situation string that happened to contain the word "never" would arrive as an
 * unpointed imperative on the one line the package writes itself.
 */
function blankScopeHeader(content: string): string {
  const lines = content.split("\n");
  const limit = Math.min(lines.length, SCOPE_HEADER_WINDOW);
  for (let i = 0; i < limit; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(SCOPE_APPLIES_TO_LABEL) || trimmed.startsWith(SCOPE_SOURCE_LABEL)) {
      lines[i] = lines[i].replace(/[^\n]/g, " ");
    }
  }
  return lines.join("\n");
}

/**
 * Is this claim's situation already declared by the file it lives in?
 *
 * True when the file declares a scope and EVERY situated pointer the claim
 * carries is one the scope names. A claim citing a situation the leaf does not
 * cover is not covered by it: that is a rule smuggling a different situation
 * into this surface, and it stays an offender.
 *
 * Matching uses the same prefix rule as every other pointer resolution here, so
 * a claim and a header written from the same id set always agree.
 */
export function isScopeSatisfied(
  claim: LocatedClaim,
  fileScope: FileScope | null | undefined,
  situatedIds: string[],
): boolean {
  if (!fileScope) return false;
  const situated = findAllPointers(claim.text ?? "").filter(
    (pointer) => pointer.kind === "evidence" && idResolves(pointer.id, situatedIds ?? []),
  );
  // Vacuously true for a claim with no situated pointer. The offender predicate
  // never reaches it in that state, and a "no" here would be an answer to a
  // question nobody asked.
  return situated.every((pointer) => idResolves(pointer.id, fileScope.scopeIds));
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

// ---------------------------------------------------------------------------
// The offender sets
// ---------------------------------------------------------------------------
//
// Each check below reports a count and a sample. The regeneration prompt needs
// the full set, with the file and line on each one, so that a second pass edits
// named lines instead of re-rolling the package. Both read the SAME predicate
// from here: a retry told about a different set of offenders than the gate found
// is a retry aimed at the wrong lines.

/** Imperatives carrying no pointer at all. prov.everyRuleCited's finding. */
export function unpointedClaims(claims: LocatedClaim[]): LocatedClaim[] {
  return (claims ?? []).filter((claim) => !findPointer(claim.text));
}

/** The pointers on a passage that were checkable this pass and resolved to nothing. */
function unresolvedPointersFor(text: string, opts: ProvenanceOptions): Pointer[] {
  return findAllPointers(text).filter((pointer) => {
    const known = pointer.kind === "criterion" ? opts.knownCriterionIds : opts.knownEvidenceIds;
    // No id set for that kind means it was not checkable, which is a skip and
    // never a finding.
    if (!Array.isArray(known)) return false;
    return !idResolves(pointer.id, known);
  });
}

export interface UnresolvedPointerClaim {
  claim: LocatedClaim;
  unresolved: Pointer[];
}

/** Claims carrying at least one pointer that resolves to nothing. */
export function unresolvedPointerClaims(
  claims: LocatedClaim[],
  opts: ProvenanceOptions = {},
): UnresolvedPointerClaim[] {
  const out: UnresolvedPointerClaim[] = [];
  for (const claim of claims ?? []) {
    const unresolved = unresolvedPointersFor(claim.text, opts);
    if (unresolved.length > 0) out.push({ claim, unresolved });
  }
  return out;
}

/**
 * Standing rules resting on situated evidence only, AFTER the file's declared
 * scope has been taken into account.
 *
 * A claim is an offender when all four hold:
 *   1. it does not name its situation in its own sentence, and
 *   2. it carries at least one pointer (an unpointed rule belongs to
 *      prov.everyRuleCited, and counting it twice would double-report one fault), and
 *   3. every pointer it carries is situated evidence, and
 *   4. the file it lives in declares no scope covering those pointers.
 */
export function situatedGeneralisationOffenders(
  claims: LocatedClaim[],
  situatedIds: string[],
): LocatedClaim[] {
  const situated = situatedIds ?? [];
  return (claims ?? []).filter((claim) => {
    if (hasSituationalQualifier(claim.text)) return false;
    const pointers = findAllPointers(claim.text);
    if (pointers.length === 0) return false;
    if (!pointers.every((p) => p.kind === "evidence" && idResolves(p.id, situated))) return false;
    return !isScopeSatisfied(claim, claim.scope, situated);
  });
}

function everyRuleCited(claims: LocatedClaim[]): ProvenanceCheck {
  const unpointed = unpointedClaims(claims);
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
  const unresolved = claims.flatMap((claim) => unresolvedPointersFor(claim.text, opts));

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

  const offenders = situatedGeneralisationOffenders(claims, situated);
  const scoped = claims.filter((claim) => claim.scope).length;
  const scopeNote = scoped > 0 ? `; ${scoped} in a leaf that declares its scope` : "";

  return {
    id: "prov.noSituatedGeneralisation",
    label: "No standing rule rests only on situated evidence",
    passed: offenders.length === 0,
    detail: offenders.length === 0
      ? `${claims.length} imperative(s) checked, none generalise situated evidence${scopeNote}`
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
