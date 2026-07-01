/**
 * decisionSpiderModel - the pure, React-free model for the Decisions "force spider".
 *
 * A decision is anchored at the centre; the SAME six AI-native forces spider out around it at
 * FIXED positions (Capability top, then evenly spaced), so the shape is identical for every
 * decision and a leader learns to read it once. Each force is:
 *   - captioned with THIS decision's specific concern (from the engine's force_labels, e.g.
 *     "Token cost"), falling back to the generic force name;
 *   - coloured by HEALTH (green holds up / amber shaky / grey only-you-can-call), rolled up here
 *     from the verdicts of the claims tagged to that force.
 *
 * Kept pure (no React) so the component and its unit test share it. The centering math is ported
 * verbatim from brainGraphModel.ts `computeViewBox` - the proven hub-anchored, aspect-corrected
 * viewBox that keeps the star optically centred at any device size.
 */

import type { DecisionClaim, Dimension } from '@/hooks/useDecisionEngine';
import { verdictBucket } from './decisionParts';

export type ForceHealth = 'green' | 'amber' | 'grey';

export interface SpiderNode {
  x: number;
  y: number;
  r: number;
}

export interface Force extends SpiderNode {
  key: Dimension;
  name: string; // generic force name (fallback caption)
  caption: string; // this decision's specific label, or the generic name
  health: ForceHealth;
  claims: DecisionClaim[];
}

export interface Spider {
  center: SpiderNode;
  forces: Force[];
}

// The fixed registry: six forces in a stable order (1:1 with AI_NATIVE_DIMENSIONS). Order sets the
// angle, so Capability is always top and the rest are always in the same clockwise positions.
export const FORCE_META: { key: Dimension; name: string }[] = [
  { key: 'capability', name: 'Capability' },
  { key: 'economics', name: 'Economics' },
  { key: 'risk', name: 'Risk' },
  { key: 'build_buy', name: 'Build vs buy' },
  { key: 'team', name: 'Team' },
  { key: 'timing', name: 'Timing' },
];

const RING = 150; // model-space radius of the force ring
const HUB_R = 34; // the centre decision node
const NODE_R = 14; // a force node

// Legacy fallback: infer a force from the claim type for old rows that predate the `dimension`
// column. Mirrors the backend's decompose inference so old + new decisions group the same way.
const DIM_FROM_TYPE: Record<DecisionClaim['type'], Dimension> = {
  market: 'economics',
  causal: 'capability',
  forecast: 'timing',
  assumption: 'risk',
  factual: 'capability',
};

export function claimDimension(c: DecisionClaim): Dimension {
  return c.dimension ?? DIM_FROM_TYPE[c.type] ?? 'capability';
}

/**
 * Roll up a force's health from its claims' verdicts (via decisionParts.verdictBucket):
 *   grey  - no claims, or every claim is a judgment only-you-can-call ('yours').
 *   amber - any claim is shaky ('unsure' = contested / unverified / still pending).
 *   green - has claims and at least one checks out, none shaky.
 */
export function rollupHealth(claims: DecisionClaim[]): ForceHealth {
  if (claims.length === 0) return 'grey';
  const buckets = claims.map((c) => verdictBucket(c.verdict));
  if (buckets.some((b) => b === 'unsure')) return 'amber';
  if (buckets.some((b) => b === 'checks')) return 'green';
  return 'grey'; // all 'yours' (unverifiable / judgment)
}

/** Build the six fixed force nodes (with claims, health, caption) around the centre decision. */
export function buildSpider(
  claims: DecisionClaim[],
  forceLabels?: Partial<Record<Dimension, string>> | null,
): Spider {
  const byForce = new Map<Dimension, DecisionClaim[]>();
  for (const c of claims) {
    const d = claimDimension(c);
    const arr = byForce.get(d);
    if (arr) arr.push(c);
    else byForce.set(d, [c]);
  }

  const n = FORCE_META.length;
  const phase = -Math.PI / 2; // Capability at top
  const forces: Force[] = FORCE_META.map((meta, i) => {
    const ang = phase + (i / n) * Math.PI * 2;
    const fclaims = byForce.get(meta.key) ?? [];
    const label = forceLabels?.[meta.key];
    return {
      key: meta.key,
      name: meta.name,
      x: Math.cos(ang) * RING,
      y: Math.sin(ang) * RING,
      r: NODE_R,
      caption: label && label.trim() ? label.trim() : meta.name,
      health: rollupHealth(fclaims),
      claims: fclaims,
    };
  });

  return { center: { x: 0, y: 0, r: HUB_R }, forces };
}

export interface SpiderViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The centering guarantee (ported from brainGraphModel.ts computeViewBox): a centre-anchored,
 * half-extent, padded, aspect-corrected viewBox so the star is optically centred and fills the
 * canvas with no dead quadrants at any device shape (paired with preserveAspectRatio meet).
 */
export function computeSpiderViewBox(
  spider: Spider,
  canvasW: number,
  canvasH: number,
  zoom = 1,
): SpiderViewBox {
  const cx = spider.center.x;
  const cy = spider.center.y;
  let halfX = 0;
  let halfY = 0;
  for (const nd of [spider.center, ...spider.forces]) {
    halfX = Math.max(halfX, Math.abs(nd.x - cx) + nd.r);
    halfY = Math.max(halfY, Math.abs(nd.y - cy) + nd.r);
  }
  halfX = Math.max(halfX, 60);
  halfY = Math.max(halfY, 60);
  let bw = halfX * 2;
  let bh = halfY * 2;
  const pad = 1.5 / Math.max(0.0001, zoom); // a touch more room than the brain, for the node labels
  bw *= pad;
  bh *= pad;
  const aspect = canvasW > 0 && canvasH > 0 ? canvasW / canvasH : 1;
  if (bw / bh < aspect) bw = bh * aspect;
  else bh = bw / aspect;
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
}

// Health -> token classes, reusing the exact emerald / amber / muted the other decision surfaces
// use (so the spider reads as the same design system). `hsl` is for SVG stroke/fill.
export const FORCE_HEALTH_STYLE: Record<ForceHealth, { dot: string; chip: string; verb: string; hsl: string }> = {
  green: { dot: 'bg-accent', chip: 'text-accent bg-accent/10 border-accent/30', verb: 'Holds up', hsl: 'hsl(var(--accent))' },
  amber: { dot: 'bg-amber-400', chip: 'text-amber-300 bg-amber-500/10 border-amber-500/30', verb: 'Shaky', hsl: 'rgb(224 161 58)' },
  grey: { dot: 'bg-muted-foreground/50', chip: 'text-muted-foreground bg-foreground/5 border-border', verb: 'Your call', hsl: 'hsl(var(--muted-foreground))' },
};

/** A one-line plain-English verdict for a force (no LLM; derived from the rolled-up health). */
export function forceVerdict(force: Force): string {
  if (force.claims.length === 0) return 'Nothing here bears on this force yet.';
  if (force.health === 'green') return 'This holds up.';
  if (force.health === 'grey') return 'Only you can call this one.';
  const shaky = force.claims.filter((c) => verdictBucket(c.verdict) === 'unsure').length;
  return `Shaky - ${shaky} point${shaky === 1 ? '' : 's'} here don't add up yet.`;
}
