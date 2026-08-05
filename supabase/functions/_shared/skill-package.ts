/**
 * skill-package: the router-plus-leaves package (spec 4.4), and the flat form
 * MCP can actually serve (CH-02).
 *
 * Pure module. No Deno imports, no I/O, no clock, no randomness, so vitest runs
 * it directly and the same inputs always produce the same bytes.
 *
 * ---------------------------------------------------------------------------
 * Why the router is thin, and why it carries no rules at all
 * ---------------------------------------------------------------------------
 *
 * Loading works in three levels and it is a file mechanism, not a metaphor. The
 * name and description are always in context. The body loads when the
 * description matches. Bundled files load when something points at them. So the
 * heaviest package has the thinnest instructions: SKILL.md is a routing table
 * capped at ROUTER_MAX_LINES, and every standard lives in a leaf ONE hop away.
 *
 * The router here is generated deterministically and is written to contain zero
 * imperative sentences. That is not a style choice. The provenance gate runs
 * over the router too, so a rule that ever gets smuggled into the routing table
 * shows up as an unpointed imperative and blocks. A router that carried rules
 * would be a standard nobody could trace.
 *
 * ---------------------------------------------------------------------------
 * CH-02: get_skill returns ONE string
 * ---------------------------------------------------------------------------
 *
 * mcp-context.get_skill returns a single text column. An 80-line router whose
 * leaves cannot be fetched resolves to NOTHING on the far side, which would make
 * the live-pull channel strictly worse than today's flat SKILL.md.
 * flattenPackageForPull is the answer: it inlines every leaf beneath the router
 * under an explicit "## file: <path>" delimiter, so one string carries the whole
 * package. Phase 6 calls it. It is exported and tested now so the package can
 * never be published in a shape MCP cannot serve.
 *
 * ---------------------------------------------------------------------------
 * CH-16: what the gate is allowed to read
 * ---------------------------------------------------------------------------
 *
 * GATED_PATH names the rule-bearing files: the router, the rubric leaves and the
 * reference files. exemplars/ and evals/ are exempt ENTIRELY, because they are
 * the person's own graded work verbatim and a check derived from their rejected
 * wording would otherwise block on that same wording every time. The three
 * operator .txt files are exempt too, and for a different reason worth stating:
 * they are installation and maintenance instructions about the package, not
 * rules about the person, so they have nothing to point at.
 *
 * ---------------------------------------------------------------------------
 * The surface leaf declares its scope, once
 * ---------------------------------------------------------------------------
 *
 * A surface leaf exists to hold the rules for ONE surface. So it says so at the
 * top, in the two machine-readable lines provenance-checks.ts writes and reads:
 *
 *   **Applies to:** client updates on the pilot engagement
 *   **Scope source:** [E12], [Ef66a]
 *
 * The line is derived from the situations of the evidence the leaf's own rules
 * cite. Nothing is invented: when no cited evidence carries a situation the
 * header is omitted entirely and those rules go back to needing their own
 * qualifier. rubric/core.md and rubric/general.md never carry one, because
 * always-on and fallback are not situations.
 */

import {
  findAllPointers,
  formatScopeHeader,
  resolvePointerId,
  type FileScope,
} from "./provenance-checks.ts";

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

export interface PackageFile {
  path: string;
  content: string;
}

export interface SkillPackage {
  /** The single root folder name inside the ZIP. Must equal the YAML name. */
  name: string;
  /** Ordered, SKILL.md first. */
  files: PackageFile[];
}

export type PackageStatus = "draft" | "provisional" | "verified";

export type PackageWeight = "essential" | "important" | "optional" | "pitfall";

/** A compiled criterion, already carrying the short id the body cites. */
export interface PackageCriterion {
  /** "C1", "C2". Stable within one generation; maps back to a uuid caller-side. */
  shortId: string;
  name: string;
  check_text: string;
  observable?: string | null;
  weight: PackageWeight;
  surface?: string | null;
  holds_example?: string | null;
  breaks_example?: string | null;
  disc_verdict?: string | null;
  n_rejected?: number | null;
  n_rejected_failing?: number | null;
  n_accepted?: number | null;
  n_accepted_failing?: number | null;
  gap?: number | null;
}

/**
 * An evidence row the body was allowed to cite, with the situation it was said
 * in. Only the fields the scope header needs: the package never re-renders the
 * quote, which lives in the evidence table and in the leader's own transcript.
 */
export interface PackageEvidence {
  /** "E7f2a", exactly as the body cites it, letter prefix included. */
  shortId: string;
  /** What was going on when it was said. Empty means it scopes nothing. */
  situation?: string | null;
}

/** One of the person's own graded pieces. Verbatim, never cleaned up. */
export interface PackageExemplar {
  position?: number | null;
  verdict: "send" | "would_not_send";
  body: string;
  why?: string | null;
}

export interface PackageHoldoutItem {
  position?: number | null;
  verdict: string;
  body: string;
  why?: string | null;
}

export interface BuildPackageInput {
  name: string;
  description: string;
  /** The generated operational body. Becomes the surface leaf, not the router. */
  body: string;
  /** What this standard covers. Names the surface leaf. */
  surface?: string | null;
  references?: Array<{ filename: string; content: string }>;
  criteria?: PackageCriterion[];
  /** The evidence the body could cite. Only the surface leaf's scope reads it. */
  evidence?: PackageEvidence[];
  exemplars?: PackageExemplar[];
  holdout?: PackageHoldoutItem[];
  archetype?: string | null;
  client?: string | null;
  ownerLabel?: string | null;
  status?: PackageStatus;
  /** Provenance at the package level: which sort session this came from. */
  builtFrom?: string | null;
  /** "precision 0.80 recall 0.80 n=10", when a hold-out has been scored. */
  baseline?: string | null;
  version?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard cap on SKILL.md. Spec 4.4. A router past this is not a router. */
export const ROUTER_MAX_LINES = 80;

/** Always-on criteria in rubric/core.md. Spec 4.4 says 3 to 5. */
export const CORE_CRITERIA_MAX = 5;

/** The files the provenance gate reads. Everything else is exempt, on purpose. */
export const GATED_PATH = /^(SKILL\.md|rubric\/[^/]+\.md|references\/[^/]+\.md)$/;

/** The delimiter flattenPackageForPull writes and parseFlattenedPackage reads. */
const FILE_DELIMITER = /^## file: ([A-Za-z0-9._/-]+)$/;

export const CORE_LEAF = "rubric/core.md";
export const GENERAL_LEAF = "rubric/general.md";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Lowercase, hyphenated, safe as a filename stem. Never empty. */
export function slugify(value: string, fallback = "standard"): string {
  const slug = clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || fallback;
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

/**
 * Drop a leading YAML frontmatter block.
 *
 * The gate never reads frontmatter. The description is the TRIGGER contract,
 * written in the second person on purpose ("Use whenever...", "Do not draft X
 * without consulting this skill first"), and it is checked by the description.*
 * checks. Counting it as an unpointed rule would fail every package for the one
 * field the spec requires to look exactly like that.
 */
export function stripFrontmatter(content: string): string {
  const text = content ?? "";
  if (!text.startsWith("---")) return text;
  const lines = text.split("\n");
  if (clean(lines[0]) !== "---") return text;
  for (let i = 1; i < lines.length; i++) {
    if (clean(lines[i]) === "---") {
      // Blank the frontmatter rather than remove it, so line numbers reported
      // by the gate still point at the right line of the real file.
      const blanked = lines.map((line, idx) => (idx <= i ? "" : line));
      return blanked.join("\n");
    }
  }
  return text;
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

interface FrontmatterInput {
  name: string;
  description: string;
  archetype?: string | null;
  client?: string | null;
  version?: string;
  status: PackageStatus;
  builtFrom?: string | null;
  baseline?: string | null;
  ownerLabel?: string | null;
}

/**
 * built_from and status are the two fields most packages omit and should not.
 * built_from is provenance at the package level: in three months the answer to
 * "where did this come from" is in the file rather than in someone's memory.
 * status stops a thin package being mistaken for a tested one by someone who
 * was not there.
 */
function renderFrontmatter(input: FrontmatterInput, descriptionWidth: number): string[] {
  const lines: string[] = ["---", `name: ${input.name}`, "description: >"];
  for (const line of wrap(clean(input.description).replace(/\s+/g, " "), descriptionWidth)) {
    lines.push(`  ${line}`);
  }
  const owner = clean(input.ownerLabel);
  lines.push(
    owner
      ? `license: Proprietary. Built for ${owner} by Mindmaker (themindmaker.ai).`
      : "license: Proprietary. Built by Mindmaker (themindmaker.ai).",
  );
  lines.push("compatibility: Designed for Claude Code, Claude.ai, and compatible agent platforms.");
  lines.push("metadata:");
  lines.push("  author: mindmaker");
  lines.push(`  version: "${input.version || "1.0"}"`);
  if (clean(input.client)) lines.push(`  client: ${clean(input.client)}`);
  if (clean(input.archetype)) lines.push(`  archetype: ${clean(input.archetype)}`);
  if (clean(input.builtFrom)) lines.push(`  built_from: ${clean(input.builtFrom)}`);
  if (clean(input.baseline)) lines.push(`  baseline: ${clean(input.baseline)}`);
  lines.push(`  status: ${input.status}`);
  lines.push("---");
  return lines;
}

// ---------------------------------------------------------------------------
// The router
// ---------------------------------------------------------------------------

interface RouterRow {
  path: string;
  covers: string;
}

/**
 * SKILL.md.
 *
 * Every sentence below is declarative on purpose. The provenance gate reads this
 * file, an imperative here would need a pointer, and a router has nothing to
 * point at because a router states no rules. Keeping it imperative-free is what
 * makes "the router carries no rules" a checked fact rather than a claim.
 */
function renderRouter(
  input: FrontmatterInput & { surface: string; rows: RouterRow[]; keywords: string[] },
): string {
  // Blocks in priority order. If the description is long enough to push the
  // file past the cap, the lowest-priority block goes rather than the file
  // being silently truncated mid-sentence.
  const optional: string[][] = [];

  const table: string[] = ["## Where the standard lives", "", "| File | Covers |", "|---|---|"];
  for (const row of input.rows) table.push(`| \`${row.path}\` | ${row.covers} |`);

  const fallback: string[] = [
    "## If nothing matches",
    "",
    `The fallback is \`${GENERAL_LEAF}\`. Anything outside ${input.surface} has no standard here, and ` +
      "saying so is the honest answer rather than a guess.",
  ];

  const whenToUse: string[] = [
    "## When to use this",
    "",
    "The trigger lives in this file's description, which the runtime keeps in context. Everything " +
      "below it loads only once that description matches.",
  ];

  const keywords: string[] = input.keywords.length > 0
    ? ["## Keywords", "", `Keywords: ${input.keywords.join(", ")}`]
    : [];

  optional.push(keywords, whenToUse);

  const build = (descriptionWidth: number, dropped: number): string[] => {
    const out: string[] = [
      ...renderFrontmatter(input, descriptionWidth),
      "",
      `# ${input.name}`,
      "",
      "This file is a router. Everything it routes to is one hop away, and nothing below it points at " +
        "another file.",
      "",
      ...table,
      "",
      ...fallback,
    ];
    for (let i = optional.length - 1; i >= dropped; i--) {
      const block = optional[i];
      if (block.length === 0) continue;
      out.push("", ...block);
    }
    return out;
  };

  // Widen the fold and then shed optional blocks until the cap holds. The cap is
  // hard; a router that needs more than 80 lines is carrying something a leaf
  // should be carrying.
  for (const width of [80, 100, 120]) {
    for (let dropped = 0; dropped <= optional.length; dropped++) {
      const lines = build(width, dropped);
      if (lines.length <= ROUTER_MAX_LINES) return `${lines.join("\n")}\n`;
    }
  }
  // Last resort: the frontmatter alone plus the routing table. Still a router.
  const minimal = [...renderFrontmatter(input, 120), "", `# ${input.name}`, "", ...table];
  return `${minimal.slice(0, ROUTER_MAX_LINES).join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Rubric leaves
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * The discrimination line, in the shape the standard prints it. Never a rate
 * from a zero denominator, never a number that was not measured.
 */
export function discriminationSummary(criterion: PackageCriterion): string {
  const { n_rejected: nr, n_accepted: na } = criterion;
  const rf = criterion.n_rejected_failing;
  const af = criterion.n_accepted_failing;
  const complete = typeof nr === "number" && nr > 0 && typeof na === "number" && na > 0 &&
    typeof rf === "number" && typeof af === "number";
  if (!complete) {
    return "not tested. No graded items carried a checkable test for this.";
  }
  const rejectRate = (rf as number) / (nr as number);
  const acceptRate = (af as number) / (na as number);
  const gap = typeof criterion.gap === "number" ? criterion.gap : rejectRate - acceptRate;
  return `${rf} of ${nr} rejected fail this (${fmt(rejectRate)}). ` +
    `${af} of ${na} accepted fail it (${fmt(acceptRate)}). ` +
    `Gap ${fmt(gap)}, verdict ${clean(criterion.disc_verdict) || "untested"}.`;
}

/**
 * One criterion, with its pointer on every line that could read as a rule.
 *
 * The holds and breaks examples are the person's own graded work, so they go
 * inside a fence labelled evidence: maskQuotedSpans blanks a labelled fence
 * before any check reads it, which is CH-16 applied at the point the verbatim
 * text enters the package rather than bolted on afterwards.
 */
function criterionBlock(criterion: PackageCriterion): string[] {
  const id = criterion.shortId;
  const out: string[] = [`### ${id}. ${clean(criterion.name) || "Unnamed"}`, ""];
  out.push(`- Check: ${clean(criterion.check_text) || "AWAITING"} [${id}]`);
  const observable = clean(criterion.observable);
  out.push(
    observable
      ? `- Observable, machine-checkable: ${observable} [${id}]`
      : "- Observable: AWAITING. Nothing here is machine-checkable yet.",
  );
  out.push(`- Weight: ${criterion.weight}`);
  out.push(`- Discrimination: ${discriminationSummary(criterion)} [${id}]`);
  const holds = clean(criterion.holds_example);
  if (holds) {
    out.push("", "Holds, from their own graded work:", "", "```evidence", ...holds.split("\n"), "```");
  }
  const breaks = clean(criterion.breaks_example);
  if (breaks) {
    out.push("", "Breaks, from their own graded work:", "", "```evidence", ...breaks.split("\n"), "```");
  }
  return out;
}

/**
 * The scope a leaf's own rules earn, or null.
 *
 * Read off the evidence those rules ACTUALLY cite, never off the evidence that
 * happened to be available: a leaf may not declare a scope its cited evidence
 * does not support. Cited rows with no situation contribute nothing, and a leaf
 * whose cited rows all lack one gets no header at all rather than a scope
 * someone would have to take on trust.
 */
export function deriveScope(content: string, evidence: PackageEvidence[]): FileScope | null {
  const byShortId = new Map<string, PackageEvidence>();
  for (const row of evidence ?? []) {
    const short = clean(row.shortId).replace(/^E/i, "");
    if (short) byShortId.set(short, row);
  }
  if (byShortId.size === 0) return null;

  const known = Array.from(byShortId.keys());
  const situations: string[] = [];
  const scopeIds: string[] = [];
  for (const pointer of findAllPointers(content)) {
    if (pointer.kind !== "evidence") continue;
    // The same prefix rule the gate resolves pointers with, so a header written
    // here and a claim read there can never disagree about which row was meant.
    const resolved = resolvePointerId(pointer, known);
    if (!resolved) continue;
    const situation = clean(byShortId.get(resolved)?.situation);
    if (!situation) continue;
    if (!scopeIds.includes(resolved)) scopeIds.push(resolved);
    if (!situations.includes(situation)) situations.push(situation);
  }
  if (scopeIds.length === 0 || situations.length === 0) return null;
  return { appliesTo: situations.join("; "), scopeIds };
}

/** rubric/core.md. Always-on, so it never declares a scope. */
function renderCoreLeaf(criteria: PackageCriterion[], surface: string): string {
  if (criteria.length === 0) {
    return [
      "# Core: the always-on checks",
      "",
      `NOT ESTABLISHED: which checks apply to every piece of ${surface}.`,
      "",
      "Nothing has been graded yet, so no check here has been shown to separate accepted work from " +
        "rejected work. A sort of thirty pieces is what fills this file, and until then the rules in " +
        "the surface leaf come from what was said rather than from what was graded.",
      "",
    ].join("\n");
  }
  const lines: string[] = [
    "# Core: the always-on checks",
    "",
    "Each criterion below separated accepted work from rejected work in a graded sort. The order is " +
      "load order, most important first.",
    "",
  ];
  for (const criterion of criteria) {
    lines.push(...criterionBlock(criterion), "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * The surface leaf: the one file that exists to hold the rules for this surface,
 * and therefore the one file that may say so at the top.
 *
 * The scope is derived from the rules BEFORE the header is written, so the
 * header can only ever describe evidence the leaf already cites.
 */
function renderSurfaceLeaf(
  body: string,
  criteria: PackageCriterion[],
  surface: string,
  evidence: PackageEvidence[],
): string {
  const rules: string[] = [clean(body), ""];
  if (criteria.length > 0) {
    rules.push("## Checks specific to this surface", "");
    for (const criterion of criteria) rules.push(...criterionBlock(criterion), "");
  }

  const scope = deriveScope(rules.join("\n"), evidence);
  const header = scope ? [...formatScopeHeader(scope), ""] : [];

  return `${[`# ${surface}`, "", ...header, ...rules].join("\n").trimEnd()}\n`;
}

/**
 * The fallback leaf is not optional. Without it an unmatched piece either gets
 * judged against the wrong leaf or gets nothing, and the second one fails
 * silently, which is the worse of the two.
 *
 * It never declares a scope either: "anything that matched nothing else" is the
 * absence of a situation, not a situation.
 */
function renderGeneralLeaf(surface: string): string {
  return [
    "# Fallback",
    "",
    `NOT ESTABLISHED: how this person judges work outside ${surface}.`,
    "",
    "Nothing in this package was elicited for anything else. The honest answer for an unfamiliar piece " +
      "is that the standard has not been set there. A guess dressed as a standard is the failure this " +
      "package exists to prevent, and the person it is about is the one who finds out.",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Exemplars and evals
// ---------------------------------------------------------------------------

function verdictLabel(verdict: string): string {
  return verdict === "send" ? "sent" : "would not send";
}

function renderExemplar(exemplar: PackageExemplar, index: number): string {
  const lines: string[] = [
    `# Exemplar ${index}: ${verdictLabel(exemplar.verdict)}`,
    "",
  ];
  const why = clean(exemplar.why);
  lines.push(why ? `In their words: "${why}"` : "No reason was written for this one.");
  lines.push("", "```evidence", ...clean(exemplar.body).split("\n"), "```", "");
  return lines.join("\n");
}

function renderExemplarIndex(exemplars: PackageExemplar[]): string {
  const lines: string[] = [
    "# Exemplars",
    "",
    "Their own graded work, verbatim, with what they said about each piece. A rubric describes the " +
      "standard; an exemplar demonstrates it, and the demonstration carries information the description " +
      "cannot.",
    "",
  ];
  exemplars.forEach((exemplar, i) => {
    const why = clean(exemplar.why);
    lines.push(
      `- \`exemplars/${i + 1}.md\`: ${verdictLabel(exemplar.verdict)}${why ? ` - "${why}"` : ""}`,
    );
  });
  lines.push("");
  return lines.join("\n");
}

function renderHoldout(items: PackageHoldoutItem[]): string {
  return `${items
    .map((item) =>
      JSON.stringify({
        position: item.position ?? null,
        verdict: item.verdict,
        why: clean(item.why) || null,
        body: item.body,
      })
    )
    .join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// buildSkillPackage
// ---------------------------------------------------------------------------

function sanitizeReferenceName(filename: string): string | null {
  if (!filename || typeof filename !== "string") return null;
  const base = filename.replace(/^.*[\\/]/, "").trim();
  if (!base || base.startsWith(".")) return null;
  if (/^[a-zA-Z0-9._-]+\.md$/.test(base)) return base;
  const stem = base.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "-");
  return stem ? `${stem}.md` : null;
}

const WEIGHT_LOAD_ORDER: PackageWeight[] = ["essential", "pitfall", "important", "optional"];

function byLoadOrder(a: PackageCriterion, b: PackageCriterion): number {
  return WEIGHT_LOAD_ORDER.indexOf(a.weight) - WEIGHT_LOAD_ORDER.indexOf(b.weight);
}

/**
 * The package, assembled. Deterministic: the same inputs give the same bytes,
 * which is what makes the gate's finding reproducible from the row it was
 * recorded against.
 */
export function buildSkillPackage(input: BuildPackageInput): SkillPackage {
  const surface = clean(input.surface) || clean(input.name).replace(/-/g, " ") || "this work";
  const surfaceLeaf = `rubric/${slugify(surface, "surface")}.md`;
  const criteria = [...(input.criteria ?? [])].sort(byLoadOrder);
  const core = criteria.slice(0, CORE_CRITERIA_MAX);
  const rest = criteria.slice(CORE_CRITERIA_MAX);
  const exemplars = input.exemplars ?? [];
  const holdout = input.holdout ?? [];

  const files: PackageFile[] = [];

  // Leaves first, so the routing table only ever names files that exist.
  files.push({ path: CORE_LEAF, content: renderCoreLeaf(core, surface) });
  files.push({
    path: surfaceLeaf,
    content: renderSurfaceLeaf(input.body, rest, surface, input.evidence ?? []),
  });
  files.push({ path: GENERAL_LEAF, content: renderGeneralLeaf(surface) });

  const references: PackageFile[] = [];
  for (const ref of input.references ?? []) {
    const name = sanitizeReferenceName(ref.filename);
    if (!name) continue;
    references.push({ path: `references/${name}`, content: ref.content ?? "" });
  }
  files.push(...references);

  const exemplarFiles: PackageFile[] = exemplars.map((exemplar, i) => ({
    path: `exemplars/${i + 1}.md`,
    content: renderExemplar(exemplar, i + 1),
  }));
  // The spec requires INDEX.md once the exemplar set runs past 100 lines. It is
  // written whenever there are exemplars at all, so the router has one stable
  // row to point at instead of a row that appears and disappears with the line
  // count of somebody's graded work.
  if (exemplarFiles.length > 0) {
    files.push({ path: "exemplars/INDEX.md", content: renderExemplarIndex(exemplars) });
    files.push(...exemplarFiles);
  }

  if (holdout.length > 0) {
    files.push({ path: "evals/holdout.jsonl", content: renderHoldout(holdout) });
  }

  const rows: RouterRow[] = [
    { path: CORE_LEAF, covers: "every piece of this work, no exceptions" },
    { path: surfaceLeaf, covers: "the procedure, the gotchas and the output shape" },
    { path: GENERAL_LEAF, covers: "anything that matches nothing above" },
  ];
  if (exemplarFiles.length > 0) {
    rows.push({
      path: "exemplars/INDEX.md",
      covers: "their own graded work, verbatim, with what they said about it",
    });
  }
  for (const ref of references) {
    rows.push({ path: ref.path, covers: referenceCovers(ref.path) });
  }
  if (holdout.length > 0) {
    rows.push({ path: "evals/holdout.jsonl", covers: "the graded pieces held back from this build" });
  }

  const keywords = Array.from(
    new Set(
      [...clean(input.name).split("-"), ...surface.split(/\s+/)]
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 2),
    ),
  ).slice(0, 8);

  const router = renderRouter({
    name: input.name,
    description: input.description,
    archetype: input.archetype,
    client: input.client,
    ownerLabel: input.ownerLabel,
    version: input.version,
    status: input.status ?? (criteria.length > 0 ? "provisional" : "draft"),
    builtFrom: input.builtFrom,
    baseline: input.baseline,
    surface,
    rows,
    keywords,
  });

  return { name: input.name, files: [{ path: "SKILL.md", content: router }, ...files] };
}

function referenceCovers(path: string): string {
  if (path.endsWith("voice-profile.md")) return "the register the output has to land in";
  if (path.endsWith("company-context.md")) return "the company facts this work depends on";
  if (path.endsWith("format-rules.md")) return "the formatting rules for this output";
  return "background this work depends on";
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/** The rule-bearing files, frontmatter blanked. Everything else is exempt. */
export function gatedFiles(pkg: SkillPackage): PackageFile[] {
  return pkg.files
    .filter((file) => GATED_PATH.test(file.path))
    .map((file) => ({ path: file.path, content: stripFrontmatter(file.content) }));
}

/** Verbatim spans the gate must never read inside (CH-16). */
export function verbatimSpans(pkg: SkillPackage): string[] {
  const out: string[] = [];
  for (const file of pkg.files) {
    if (!file.path.startsWith("exemplars/")) continue;
    const blocks = file.content.split("```evidence");
    // Index 0 is the text before the first fence, which is not verbatim
    // material and must not be masked; a stray backtick run there would
    // otherwise blank a real line.
    for (let i = 1; i < blocks.length; i++) {
      const end = blocks[i].indexOf("```");
      if (end > 0) out.push(blocks[i].slice(0, end).trim());
    }
  }
  return out.filter((span) => span.length >= 4);
}

export function fileAt(pkg: SkillPackage, path: string): PackageFile | undefined {
  return pkg.files.find((file) => file.path === path);
}

/**
 * The surface leaf's path. It is the one rubric leaf whose content the generator
 * wrote, which is what a caller needs to know when it has to tell the generator
 * WHERE a finding lives in terms the generator can act on.
 */
export function surfaceLeafPath(pkg: SkillPackage): string | null {
  const leaf = pkg.files.find(
    (file) =>
      file.path.startsWith("rubric/") && file.path !== CORE_LEAF && file.path !== GENERAL_LEAF,
  );
  return leaf?.path ?? null;
}

export function routerLineCount(pkg: SkillPackage): number {
  const router = fileAt(pkg, "SKILL.md");
  if (!router) return 0;
  return router.content.replace(/\n$/, "").split("\n").length;
}

// ---------------------------------------------------------------------------
// The flat form (CH-02)
// ---------------------------------------------------------------------------

/**
 * The whole package as one string, router first, every leaf inlined beneath it
 * under an explicit delimiter.
 *
 * get_skill returns a single text column, so this is the only shape in which a
 * router-plus-leaves package survives an MCP pull. Without it the far side
 * receives a routing table pointing at files it cannot fetch, which resolves to
 * nothing and is strictly worse than the flat SKILL.md it replaced.
 */
export function flattenPackageForPull(pkg: SkillPackage): string {
  const chunks: string[] = [];
  for (const file of pkg.files) {
    chunks.push(`## file: ${file.path}\n\n${file.content.replace(/\s+$/, "")}`);
  }
  return `${chunks.join("\n\n")}\n`;
}

/** The inverse. Exists so the round trip is a test rather than an assumption. */
export function parseFlattenedPackage(text: string): PackageFile[] {
  const files: PackageFile[] = [];
  let current: { path: string; lines: string[] } | null = null;
  for (const line of (text ?? "").split("\n")) {
    const match = FILE_DELIMITER.exec(line);
    if (match) {
      if (current) files.push({ path: current.path, content: current.lines.join("\n").trim() });
      current = { path: match[1], lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) files.push({ path: current.path, content: current.lines.join("\n").trim() });
  return files;
}
