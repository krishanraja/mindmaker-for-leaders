/**
 * release: the two facts a built package has to record about itself, and one
 * read to get them.
 *
 * (1) WHICH VERSION OF THE STANDARD IT CAME FROM (CH-02). Without it, the
 *     divergence between a rendered artefact and a standard that has since
 *     moved cannot even be DETECTED, so `get_skill` has no way to tell an agent
 *     that what it is loading is behind. `criteria_version` plus `rendered_at`
 *     are the whole fix on this side; `_shared/staleness.ts` is the other half.
 *
 * (2) WHAT WAS ACTUALLY MEASURED. Nothing measures a generated package. What
 *     may have been measured is the STANDARD its rules were compiled from, and
 *     those numbers travel with their provenance attached or not at all.
 *
 * Both reads are best effort. A failed read means the package records "no
 * standard, no measurement", which is the honest reading of a leader who has
 * not run the chain, and is also what a timed-out query and a genuinely empty
 * table have in common: nothing was found.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { maxCriteriaVersion } from "../_shared/staleness.ts";
import {
  numbersFromStandardMetadata,
  skillRelease,
  type SkillRelease,
} from "../_shared/skill-release.ts";

export interface ReleaseContext {
  /** Max criteria.version for this leader and surface. 0 when there is none. */
  criteriaVersion: number;
  /** ISO timestamp the package body was rendered at. */
  renderedAt: string;
  /** The verdict and its numbers, ready to store and to return. */
  release: SkillRelease;
}

/**
 * The version and the numbers, read with the same predicate `get_skill` will
 * compare against.
 *
 * The predicate matters more than it looks: the pull side reads current
 * criteria for the user and surface, so this side has to read exactly that. A
 * writer that recorded a max over a narrower slice (say, only criteria whose
 * discrimination verdict is 'keep') would produce spurious staleness warnings
 * forever, because the two numbers would be counting different things.
 */
export async function loadReleaseContext(
  admin: SupabaseClient,
  userId: string,
  surface: string | null,
  now: () => string = () => new Date().toISOString(),
): Promise<ReleaseContext> {
  let criteriaVersion = 0;
  try {
    let query = admin
      .from("criteria")
      .select("version")
      .eq("user_id", userId)
      .eq("is_current", true);
    if (surface) query = query.eq("surface", surface);
    const { data } = await query;
    criteriaVersion = maxCriteriaVersion((data as Array<{ version?: unknown }>) ?? []);
  } catch {
    criteriaVersion = 0;
  }

  // The newest compiled standard for this surface. Its metadata is where the
  // three numbers live when a measurement stage has run.
  let numbers = null as ReturnType<typeof numbersFromStandardMetadata> | null;
  try {
    const { data } = await admin
      .from("generated_artifacts")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("kind", "standard")
      .order("created_at", { ascending: false })
      .limit(1);
    const row = ((data ?? []) as Array<{ id: string; metadata: Record<string, unknown> | null }>)[0];
    if (row) {
      const meta = row.metadata ?? {};
      const metaSurface = typeof meta.surface === "string" ? meta.surface.trim() : "";
      // A standard compiled for a DIFFERENT surface says nothing about this
      // package, so its numbers are not borrowed.
      if (!surface || !metaSurface || metaSurface === surface) {
        numbers = numbersFromStandardMetadata(meta, row.id);
      }
    }
  } catch {
    numbers = null;
  }

  const renderedAt = now();
  return {
    criteriaVersion,
    renderedAt,
    release: skillRelease({ numbers, criteriaVersion, renderedAt }),
  };
}
