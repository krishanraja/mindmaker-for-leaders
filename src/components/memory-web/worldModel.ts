/**
 * worldModel - the honest projection of the Memory Web onto the four-world
 * brain compass used by the canvas (MemoryWebVisualization) and the bond
 * reader (BondReader). Pure logic + tokens, no React, so both components can
 * share it without tripping fast-refresh.
 *
 * The four worlds (territories) and their colours map 1:1 to brain-2.html:
 *   YOU / PRIORITY (gold), YOUR DECISIONS (violet, centre), AI WORLD (blue),
 *   YOUR COMPANY (coral). The emerald accent (#00D9B6) is reserved for the
 *   CONFIRMED / load-bearing rope only - never a territory.
 *
 * Nothing here fabricates data: a fact's world comes from its real category +
 * source, and its strength comes from real signals (importance, high-stakes,
 * reference count). Strength is a CLAIM about how load-bearing a fact is, not
 * a verdict that it is true.
 */

import type { MemoryWebFact } from '@/types/memory';

export type World = 'you' | 'company' | 'ai' | 'decisions';

export const WORLD_META: Record<World, { label: string; fill: string; ink: string; rgb: string }> = {
  you:       { label: 'YOU - PRIORITY',  fill: '#dba94a', ink: '#e6c98a', rgb: '219,169,74' },
  decisions: { label: 'YOUR DECISIONS',  fill: '#8b5cf6', ink: '#b9a6e6', rgb: '139,92,246' },
  ai:        { label: 'AI WORLD',        fill: '#5aa9ff', ink: '#8fc0f5', rgb: '90,169,255' },
  company:   { label: 'YOUR COMPANY',    fill: '#e0795b', ink: '#f0a98f', rgb: '224,121,91' },
};

/** Emerald, reserved for confirmed / load-bearing ropes only. */
export const CONFIRMED_RGB = '0,217,182';
/** Brushed-metal seam for weak / only-you ropes (un-lightable). */
export const SLACK_STROKE = '#3a414c';

/**
 * Map a fact's real category + source to one of the four worlds. Honest
 * re-grouping of the existing 5-category model onto the four-territory compass:
 *   objective / identity / preference -> YOU (your priorities + who you are)
 *   business / blocker                -> COMPANY (costs + constraints)
 * Externally-sourced facts (enrichment / linkedin / calendar) read as the AI
 * WORLD feeding context in, whatever their category.
 */
export function factWorld(fact: MemoryWebFact): World {
  const external = fact.source_type === 'enrichment'
    || fact.source_type === 'linkedin'
    || fact.source_type === 'calendar';
  if (external) return 'ai';
  switch (fact.fact_category) {
    case 'objective':
    case 'identity':
    case 'preference':
      return 'you';
    case 'business':
    case 'blocker':
      return 'company';
    default:
      return 'company';
  }
}

/**
 * Read the optional brain-importance score (1-10) off a fact. It is defined on
 * UserMemoryFact but not on the MemoryWebFact projection, so we read it
 * defensively rather than fabricate one.
 */
export function factImportance(fact: MemoryWebFact): number | undefined {
  const v = (fact as { importance?: number }).importance;
  return typeof v === 'number' ? v : undefined;
}

/**
 * Strength of a fact, 0..1 - what its rope rests on. Built ONLY from real
 * signals the hook returns: brain importance (the load-bearing score),
 * high-stakes flag, reference count. A CLAIM about load-bearing-ness, not a
 * verdict on truth.
 */
export function factStrength(fact: MemoryWebFact): number {
  const importance = factImportance(fact);
  const imp = typeof importance === 'number' ? importance / 10 : 0.45;
  const stakes = fact.is_high_stakes ? 0.2 : 0;
  const refs = Math.min(0.15, (fact.reference_count ?? 0) * 0.03);
  return Math.max(0.12, Math.min(1, imp + stakes + refs));
}

/** A fact is CONFIRMED only if the leader explicitly verified / corrected it. */
export function isConfirmed(fact: MemoryWebFact): boolean {
  return fact.verification_status === 'verified' || fact.verification_status === 'corrected';
}

/** Short, honest provenance line for a fact's source. */
export function factProvenance(fact: MemoryWebFact): string {
  switch (fact.source_type) {
    case 'voice': return 'You narrated this';
    case 'form': return 'You entered this';
    case 'markdown': return 'Imported from your notes';
    case 'enrichment': return 'CTRL inferred this from public signals';
    case 'linkedin': return 'Pulled from your LinkedIn';
    case 'calendar': return 'Read from your calendar';
    default: return 'CTRL inferred this';
  }
}

/**
 * The honest rope grammar for a cross-fact edge from the `memory_edges` table.
 * Thickness tracks the edge's real strength; an edge the leader drew by hand
 * (source='user') is LIT in emerald, while an inferred edge stays neutral and
 * dashed - the same honesty grammar the fact-to-world ropes already use. We
 * never invent an edge here; this only styles a row the table actually returned.
 */
export interface EdgeStyle {
  /** SVG stroke (rgba string). Emerald for user-drawn, neutral for inferred. */
  stroke: string;
  /** stroke width in viewBox units, scaled by strength. */
  width: number;
  /** dash pattern for inferred edges; undefined (solid) for user-drawn. */
  dash?: string;
  /** whether the rope glows (only the lit, user-drawn edges). */
  glow: boolean;
}

/**
 * Map an edge's real strength + source to its rope style. Pure: no fabrication,
 * just presentation of a row that exists.
 */
export function edgeStyle(strength: number, source: 'inferred' | 'user'): EdgeStyle {
  const s = Math.max(0, Math.min(1, strength));
  const width = 1.1 + s * 2.6;
  if (source === 'user') {
    return {
      stroke: `rgba(${CONFIRMED_RGB},${0.5 + s * 0.4})`,
      width,
      dash: undefined,
      glow: true,
    };
  }
  return {
    stroke: `rgba(165,176,191,${0.28 + s * 0.32})`,
    width: Math.min(2.2, width),
    dash: '5 6',
    glow: false,
  };
}

/** A "bond" = a rope the user can read + act on. */
export interface MemoryBond {
  /** stable id (the fact id this rope reads from) */
  id: string;
  /** the primary fact this rope reads from (the actionable end) */
  fact: MemoryWebFact;
  /** the world the fact lives in */
  world: World;
  /** 0..1 load-bearing strength (claim, not truth) */
  strength: number;
  /** confirmed = the leader stood behind it; caps brightness when false */
  confirmed: boolean;
  /** part of the bright cross-world spine */
  spine: boolean;
  /** short honest provenance line */
  provenance: string;
}
