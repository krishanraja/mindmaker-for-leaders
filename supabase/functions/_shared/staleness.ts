/**
 * staleness: does the artefact in someone's agent still match the standard it
 * was compiled from (CH-02)?
 *
 * Pure module. No Deno imports, no I/O, no clock, so vitest runs it directly
 * and the same inputs always produce the same sentence.
 *
 * ---------------------------------------------------------------------------
 * What is live is the fetch, not the content
 * ---------------------------------------------------------------------------
 *
 * The live-pull claim was "when stage 9 sharpens a criterion the update lands
 * without a reinstall". It does not. `get_skill` returns
 * `generated_artifacts.body`, a text column written once at generation time.
 * Stage 9 appends deltas to `criteria` rows and nothing regenerates that body,
 * so the standard moves, the installed skill does not, and both sides believe
 * they are current. That is a gate drifting silently from its own artefact.
 *
 * The fix here is deliberately the cheap half of CH-02's option (a): record
 * which criteria version the body was rendered from, compare it at pull time,
 * and when the two differ SAY SO in the response. No background regeneration,
 * no promise of auto-update: a skill that quietly changes between two runs of
 * the same task is its own trust failure, and the honest line costs a
 * comparison.
 *
 * ---------------------------------------------------------------------------
 * The unrecorded case is stale too
 * ---------------------------------------------------------------------------
 *
 * Artefacts built before `criteria_version` existed carry no version at all.
 * They cannot be shown to be current, and "cannot be shown current" is not the
 * same as "is current". So when the leader HAS a standard and the artefact does
 * not say what it was built against, the pull says that in words rather than
 * passing silently. Where there is no standard at all (version 0) there is
 * nothing to diverge from and nothing is claimed either way.
 */

export interface StalenessInput {
  /** The criteria version recorded in the artefact's metadata at build time. */
  artifactCriteriaVersion?: number | null;
  /** The leader's current max criteria version for the same surface. */
  currentCriteriaVersion?: number | null;
}

/** A version field, normalised. Anything that is not a real count is absent. */
function version(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const floored = Math.floor(value);
  return floored >= 0 ? floored : null;
}

/**
 * The max `criteria.version` across a set of rows, or 0 when the leader has no
 * criteria at all. 0 is a real answer: it means there is no standard behind
 * this artefact, which is a different statement from "the standard is unknown".
 */
export function maxCriteriaVersion(rows: Array<{ version?: unknown }> | null | undefined): number {
  let max = 0;
  for (const row of rows ?? []) {
    const v = version(row?.version);
    if (v !== null && v > max) max = v;
  }
  return max;
}

/**
 * Whether what is about to be served can still be described as current.
 *
 * True when the versions are known and differ, and true when the leader has a
 * standard but the artefact never recorded which version it came from. False
 * when they match, and false when there is no standard to diverge from.
 */
export function isStale(input: StalenessInput): boolean {
  const current = version(input.currentCriteriaVersion) ?? 0;
  if (current <= 0) return false;
  const artifact = version(input.artifactCriteriaVersion);
  if (artifact === null) return true;
  return artifact !== current;
}

/**
 * The one line appended to a stale pull, or null when nothing is owed.
 *
 * It states two facts and draws no conclusion beyond them: what this was
 * compiled against, and where the standard is now. It never claims the artefact
 * updated itself, and it never guesses which rules moved.
 */
export function stalenessNote(input: StalenessInput): string | null {
  if (!isStale(input)) return null;
  const current = version(input.currentCriteriaVersion) ?? 0;
  const artifact = version(input.artifactCriteriaVersion);
  if (artifact === null) {
    return `This was built before CTRL recorded which version of your standard it used, and your ` +
      `standard is now at version ${current}, so some rules here may be out of date.`;
  }
  return `This was compiled against version ${artifact} of your standard. Your standard is now at ` +
    `version ${current}, so some rules here may be out of date.`;
}

/**
 * The pull payload with the note appended, or the payload untouched.
 *
 * One function so the note can never be computed in one place and forgotten in
 * another: every caller that serves a body goes through here.
 */
export function withStalenessNote(body: string, input: StalenessInput): string {
  const note = stalenessNote(input);
  if (!note) return body;
  return `${(body ?? "").replace(/\s+$/, "")}\n\n---\n\n${note}\n`;
}
