/**
 * seedFacts
 *
 * Turns industry seed beats/entities (from the get-industry-seeds function, via
 * useIndustrySeeds) into display-only "ghost" nodes for the Memory Web visual,
 * so the canvas is never empty at cold start. These are SUGGESTIONS, not claims
 * about the user: they are never persisted to user_memory and never fed to the
 * briefing/decision grounding (getUserContext) - they exist purely to make the
 * web feel alive while the leader's real facts are being captured.
 *
 * Real captured facts (UserMemoryFact) are mapped to MemoryWebFact via
 * toWebFact so the same visual can render them with full prominence.
 */

import type { IndustrySeedsResponse } from '@/hooks/useIndustrySeeds';
import type { MemoryWebFact, UserMemoryFact } from '@/types/memory';

const SEED_TAG = 'seed';

/** A node is a display-only industry suggestion (not a real user fact). */
export function isSeedFact(fact: MemoryWebFact): boolean {
  return fact.tags?.includes(SEED_TAG) ?? false;
}

function makeSeed(
  idx: number,
  kind: 'beat' | 'entity',
  label: string,
): MemoryWebFact {
  const now = new Date().toISOString();
  return {
    id: `seed-${kind}-${idx}`,
    user_id: '',
    fact_key: `seed_${kind}_${idx}`,
    // Beats (themes moving in their space) read as objectives/watch-items;
    // entities (names to track) read as business context.
    fact_category: kind === 'beat' ? 'objective' : 'business',
    fact_label: label,
    fact_value:
      kind === 'beat'
        ? 'A theme moving in your industry'
        : 'A name to keep on your radar',
    confidence_score: 0.3,
    is_high_stakes: false,
    verification_status: 'inferred',
    source_type: 'enrichment',
    is_current: true,
    // Cold = outer ring, small, slow pulse: ambient, clearly secondary to the
    // leader's own hot facts which land at the centre.
    temperature: 'cold',
    reference_count: 0,
    tags: [SEED_TAG],
    created_at: now,
    updated_at: now,
  };
}

/**
 * Build display-only seed nodes from an industry seeds response. Caps the count
 * so the canvas reads as "alive," not "cluttered."
 */
export function buildSeedFacts(
  seeds: IndustrySeedsResponse | null | undefined,
  max = 9,
): MemoryWebFact[] {
  if (!seeds) return [];
  const beats = (seeds.beats ?? []).map((b, i) => makeSeed(i, 'beat', b.label));
  const entities = (seeds.entities ?? []).map((e, i) => makeSeed(i, 'entity', e.label));
  // Interleave beats and entities so categories mix in the web, then cap.
  const mixed: MemoryWebFact[] = [];
  const len = Math.max(beats.length, entities.length);
  for (let i = 0; i < len; i++) {
    if (beats[i]) mixed.push(beats[i]);
    if (entities[i]) mixed.push(entities[i]);
  }
  return mixed.slice(0, max);
}

/**
 * Map a freshly captured UserMemoryFact onto the MemoryWebFact shape the visual
 * expects. New facts run hot (centre ring, prominent pulse) so the leader sees
 * their own words land at the heart of the web.
 */
export function toWebFact(fact: UserMemoryFact): MemoryWebFact {
  return {
    ...fact,
    // Display-only: this 'hot' is ephemeral visualization state for a brand-new
    // capture and is NEVER persisted to user_memory.temperature (never write it back,
    // or it re-fakes the aggregate thermometer that reads from the DB).
    temperature: 'hot',
    reference_count: 0,
  };
}
