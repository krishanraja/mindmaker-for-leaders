/**
 * demote-claims: stage 7a, the deterministic half.
 *
 * Pure module. No Deno imports, no I/O, no clock, no randomness, so vitest runs
 * it directly and the same package always demotes to the same bytes.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * prov.everyRuleCited asks the generator to put a [C#]/[E#] pointer on every
 * imperative, or to restate it as "NOT ESTABLISHED:". Across three real runs the
 * unpointed count came back 6, then 1, then 4. That variance is not the check
 * being wrong; it is the difference between an invariant held BY CONSTRUCTION
 * and one held BY ASKING. prov.noSituatedGeneralisation is structurally 0
 * because the packager derives the scope header from rows it already holds.
 * This module gives everyRuleCited the same footing.
 *
 * Spec 4.7a rule 3: "Unresolved claims are deleted or rewritten as
 * NOT ESTABLISHED, never shipped." We take the second branch every time. The
 * spec permits deletion; a flagged gap is information a leader can act on and a
 * deleted line is not, so nothing here removes content. Demotion only.
 *
 * ---------------------------------------------------------------------------
 * CH-16, which is the reason this is allowed to exist at all
 * ---------------------------------------------------------------------------
 *
 * NO GATE MUTATES A QUOTED SPAN. This pass mutates the GENERATOR'S prose and
 * nothing else. It is safe because it reads through gatedBodyFor, the same
 * masked view the gate reads: evidence quotes and fenced evidence blocks are
 * blanked to spaces there, so no imperative is ever FOUND inside one, and the
 * caller passes the gated file set, which excludes exemplars/ and evals/
 * entirely. A leader's verbatim words are not a rule and are never rewritten.
 *
 * Masking is length-preserving, so an offset located in the masked view is the
 * same offset in the real file. That is the whole mechanism: locate in the view
 * the gate is allowed to read, splice into the file the generator wrote.
 */

import {
  extractImperativeClaimsWithOffsets,
  findPointer,
  gatedBodyFor,
  type LocatedClaim,
  type ProvenanceFile,
} from "./provenance-checks.ts";

/**
 * The honest form. Matches the marker extractImperativeClaims already skips, so
 * a demoted sentence stops being a claim the moment it is rewritten.
 */
export const DEMOTION_PREFIX = "NOT ESTABLISHED: ";

export interface DemotionResult {
  /**
   * The same files, in the same order, with only the flagged sentences changed.
   * A file with nothing to demote is returned by reference, unchanged.
   */
  files: ProvenanceFile[];
  /** The claims that were actually rewritten, as the gate located them. */
  demoted: LocatedClaim[];
}

/**
 * Rewrite every claim still failing prov.everyRuleCited into its NOT ESTABLISHED
 * form, in place, on the line the gate located it.
 *
 * Rules, all of them load-bearing:
 *
 *   - Only a claim carrying NO pointer is touched. A claim that already points
 *     at something is left exactly as written, including one whose pointer fails
 *     to resolve: that is prov.pointerResolves' finding, not this pass's, and
 *     rewriting it would hide a different fault behind this one.
 *   - The list marker and the indentation are preserved, because the offset is
 *     measured PAST them.
 *   - Only the offending sentence moves. Every other byte on the line, and every
 *     other line in the file, is identical.
 *   - A line the gate did not flag is never visited. The claim's own line number
 *     selects the line; nothing rescans the file for things to fix.
 *   - Idempotent. A second run finds the demoted sentence no longer matches the
 *     claim text it was asked to demote, so it changes nothing, whether it is
 *     handed fresh claims or the stale ones from the first run.
 *
 * @param files   The gated package files, as the gate read them.
 * @param claims  The claims the gate collected over those files.
 * @param quotes  The verbatim spans the gate masked. Same list, same masking.
 */
export function demoteUnpointedClaims(
  files: ProvenanceFile[],
  claims: LocatedClaim[],
  quotes: string[] = [],
): DemotionResult {
  const wantedByPath = new Map<string, LocatedClaim[]>();
  for (const claim of claims ?? []) {
    // An unpointed claim is the only kind stage 7a owns.
    if (findPointer(claim.text ?? "")) continue;
    const path = claim.path ?? "";
    const list = wantedByPath.get(path);
    if (list) list.push(claim);
    else wantedByPath.set(path, [claim]);
  }

  const source = files ?? [];
  if (wantedByPath.size === 0) return { files: source, demoted: [] };

  const demoted: LocatedClaim[] = [];
  const out = source.map((file) => {
    const wanted = wantedByPath.get(file.path ?? "");
    if (!wanted || wanted.length === 0) return file;

    // The gate's view, for locating. The real file, for editing. Same offsets.
    const located = gatedBodyFor(file, quotes).split("\n");
    const lines = (file.content ?? "").split("\n");

    // Cached per line so a line holding several offenders is parsed once.
    const candidatesByLine = new Map<number, ReturnType<typeof extractImperativeClaimsWithOffsets>>();
    const claimedOffsets = new Map<number, Set<number>>();
    const insertAt = new Map<number, number[]>();

    for (const claim of wanted) {
      const index = claim.line - 1;
      if (index < 0 || index >= located.length || index >= lines.length) continue;

      let candidates = candidatesByLine.get(index);
      if (!candidates) {
        candidates = extractImperativeClaimsWithOffsets(located[index]);
        candidatesByLine.set(index, candidates);
      }

      const taken = claimedOffsets.get(index) ?? new Set<number>();
      // Text equality against the gate's own view, so a rewrite can only land on
      // the sentence the gate reported. Two identical sentences on one line are
      // matched left to right and each is demoted once.
      const hit = candidates.find(
        (candidate) =>
          candidate.text === claim.text &&
          !taken.has(candidate.start) &&
          !findPointer(candidate.text),
      );
      // No match means the line no longer reads the way the gate found it. That
      // is a demoter fault, and the honest response is to leave the line alone
      // and let the caller report the claim as still standing.
      if (!hit) continue;

      taken.add(hit.start);
      claimedOffsets.set(index, taken);
      const offsets = insertAt.get(index);
      if (offsets) offsets.push(hit.start);
      else insertAt.set(index, [hit.start]);
      demoted.push(claim);
    }

    if (insertAt.size === 0) return file;

    for (const [index, offsets] of insertAt) {
      let line = lines[index];
      // Right to left, so an earlier splice never moves a later offset.
      for (const start of [...new Set(offsets)].sort((a, b) => b - a)) {
        line = `${line.slice(0, start)}${DEMOTION_PREFIX}${line.slice(start)}`;
      }
      lines[index] = line;
    }

    return { path: file.path, content: lines.join("\n") };
  });

  return { files: out, demoted };
}
