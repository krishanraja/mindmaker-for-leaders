/**
 * brainGraphModel - the pure layout + CENTERING logic for the 2028 Brain graph
 * (prototypes/brain-2028.html). No React, so the renderer + any harness share it
 * without tripping fast-refresh.
 *
 * THE CENTERING GUARANTEE (the whole point of this rebuild; the live bug was the
 * old four-world compass clustering top-left/top-centre with dead quadrants):
 *
 *   Nodes are authored in an abstract MODEL space whose origin (0,0) is the YOU
 *   hub. At render time `computeViewBox` builds a viewBox that is
 *     - ANCHORED on the YOU hub (the optical focal point of a radial "you at the
 *       centre" graph; never the geometric midpoint, which drifts when the node
 *       spread is asymmetric),
 *     - sized from the hub's MAX REACH per axis (half-extents = furthest node
 *       distance from the hub on each axis, including the node radius), so the
 *       whole cluster is always framed AND balanced around the hub,
 *     - PADDED for breathing room (divided by the zoom factor), and
 *     - ASPECT-CORRECTED to the LIVE canvas pixel ratio: the smaller box
 *       dimension is grown until the box aspect equals the canvas aspect.
 *   With `preserveAspectRatio="xMidYMid meet"` on the <svg>, that hub-centred box
 *   is then kept optically centred in whatever pixel size the canvas happens to
 *   be (tall mobile portrait or wide desktop landscape). Because the viewBox is
 *   recomputed from the live aspect EVERY render (resize / zoom / device change),
 *   there are NEVER dead quadrants: the cluster sits balanced in the optical
 *   middle at every device + state.
 *
 * Honesty: node worlds + confirmed/strength come from the real fact fields (via
 * worldModel). We never fabricate a relationship; ropes are hub->node spokes plus
 * the REAL cross-fact edges the memory_edges table returned (drawn only when both
 * ends are on the canvas).
 */

import type { MemoryWebFact, UserPattern } from '@/types/memory';
import { factStrength, isConfirmed, factProvenance } from './worldModel';

/**
 * The Brain worlds: the emerald YOU hub + a set of well-separated orbit
 * territories. The old set (priority/decisions/company) was almost all
 * amber/orange and hid everything personal under "priority"; this set splits the
 * person out (who you are, how you work, your strengths/edge) AND your company,
 * goals, challenges and outside signals, each in its own hue.
 */
export type GraphWorld =
  | 'you'
  | 'identity'
  | 'style'
  | 'goal'
  | 'company'
  | 'challenge'
  | 'signal'
  | 'strength';

/** Token + label per world (drawn via hsl(var(--node-*))). */
export const GRAPH_WORLD_META: Record<GraphWorld, { token: string; label: string }> = {
  you: { token: 'var(--node-you)', label: 'You' },
  identity: { token: 'var(--node-identity)', label: 'About you' },
  style: { token: 'var(--node-style)', label: 'Working style' },
  goal: { token: 'var(--node-goal)', label: 'Goals' },
  company: { token: 'var(--node-company)', label: 'Company' },
  challenge: { token: 'var(--node-challenge)', label: 'Challenges' },
  signal: { token: 'var(--node-signal)', label: 'Signals' },
  strength: { token: 'var(--node-strength)', label: 'Strengths' },
};

/** The orbit worlds (everything that is not the synthesized YOU hub). */
export const ORBIT_WORLDS: Exclude<GraphWorld, 'you'>[] = [
  'identity', 'style', 'goal', 'company', 'challenge', 'signal', 'strength',
];

/**
 * Map a real fact onto an orbit world from its real category + source (no
 * fabrication). Externally-sourced facts read as outside SIGNALS; the rest split
 * by category so the person (identity / style) reads distinctly from the company.
 */
export function factGraphWorld(fact: MemoryWebFact): Exclude<GraphWorld, 'you'> {
  const external = fact.source_type === 'enrichment'
    || fact.source_type === 'linkedin'
    || fact.source_type === 'calendar';
  if (external) return 'signal';
  switch (fact.fact_category) {
    case 'identity': return 'identity';
    case 'preference': return 'style';
    case 'objective': return 'goal';
    case 'business': return 'company';
    case 'blocker': return 'challenge';
    default: return 'company';
  }
}

/**
 * Map a real observed pattern onto an orbit world. A strength is the leader's
 * edge; a blindspot reads as a challenge; everything else describes how they
 * work (style). Patterns are CLAIMS the brain noticed, never verified facts.
 */
export function patternGraphWorld(pattern: UserPattern): Exclude<GraphWorld, 'you'> {
  switch (pattern.pattern_type) {
    case 'strength': return 'strength';
    case 'blindspot': return 'challenge';
    default: return 'style';
  }
}

export interface GraphNode {
  id: string;
  world: GraphWorld;
  /** model-space coords (origin = the YOU hub) */
  x: number;
  y: number;
  r: number;
  label: string;
  /** what this node is: a memory fact, an observed pattern, or the hub. */
  kind: 'fact' | 'pattern' | 'hub';
  /** the underlying fact (null for patterns + the synthesized hub) */
  fact: MemoryWebFact | null;
  /** the underlying pattern (only for kind === 'pattern') */
  pattern: UserPattern | null;
  confirmed: boolean;
  strength: number;
  hub?: boolean;
}

export interface GraphEdge {
  /** stable key */
  key: string;
  from: string;
  to: string;
  /** strong = confirmed / load-bearing (lit, solid); weak = worth a check (dashed) */
  strong: boolean;
}

const HUB_ID = '__you__';

/**
 * Lay facts out in MODEL space as a balanced radial field around the YOU hub at
 * the origin. Strong facts hug the hub; weaker ones drift outward. Each world
 * gets its own angular sector so the three colours read as territories, while the
 * whole thing stays centred on the hub (the centering math lives in
 * computeViewBox, not here).
 */
export function buildGraph(
  facts: MemoryWebFact[],
  patterns: UserPattern[] = [],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const hub: GraphNode = {
    id: HUB_ID,
    world: 'you',
    x: 0,
    y: 0,
    r: 15,
    label: 'You',
    kind: 'hub',
    fact: null,
    pattern: null,
    confirmed: true,
    strength: 1,
    hub: true,
  };

  // one unified item list: every fact + every observed pattern, each carrying its
  // orbit world + a layout-ready label / strength / confirmed.
  type Item = {
    id: string;
    world: Exclude<GraphWorld, 'you'>;
    label: string;
    strength: number;
    confirmed: boolean;
    fact: MemoryWebFact | null;
    pattern: UserPattern | null;
    kind: 'fact' | 'pattern';
  };
  const items: Item[] = [];
  for (const f of facts) {
    items.push({
      id: f.id,
      world: factGraphWorld(f),
      label: f.fact_label,
      strength: factStrength(f),
      confirmed: isConfirmed(f),
      fact: f,
      pattern: null,
      kind: 'fact',
    });
  }
  for (const p of patterns) {
    items.push({
      id: `pattern-${p.id}`,
      world: patternGraphWorld(p),
      label: p.pattern_text,
      // a pattern's "strength" is how confident the brain is it is real.
      strength: Math.max(0.2, Math.min(1, p.confidence ?? 0.5)),
      confirmed: p.status === 'confirmed',
      fact: null,
      pattern: p,
      kind: 'pattern',
    });
  }

  if (items.length === 0) {
    return { nodes: [hub], edges: [] };
  }

  // group by orbit world (colour) but lay every item out on ONE balanced ring of
  // evenly-spaced angles around the hub. Even angular spacing keeps the cluster's
  // centroid on the hub and its half-extents symmetric on BOTH axes, so the
  // hub-anchored, aspect-corrected viewBox (computeViewBox) lands the cluster in
  // the optical centre with no dead quadrant. Items are interleaved by world so
  // colours read as a balanced field, not hard spokes.
  const byWorld = new Map<Exclude<GraphWorld, 'you'>, Item[]>();
  for (const w of ORBIT_WORLDS) byWorld.set(w, []);
  for (const it of items) byWorld.get(it.world)!.push(it);
  // strongest first within each world so the anchor of each colour sits closest
  for (const w of ORBIT_WORLDS) byWorld.get(w)!.sort((a, b) => b.strength - a.strength);

  // round-robin interleave so adjacent ring slots alternate colour where possible
  const ordered: Item[] = [];
  const cursors = new Map<Exclude<GraphWorld, 'you'>, number>(ORBIT_WORLDS.map((w) => [w, 0]));
  let remaining = items.length;
  while (remaining > 0) {
    for (const w of ORBIT_WORLDS) {
      const list = byWorld.get(w)!;
      const c = cursors.get(w)!;
      if (c < list.length) {
        ordered.push(list[c]);
        cursors.set(w, c + 1);
        remaining -= 1;
      }
    }
  }

  const nodes: GraphNode[] = [hub];
  const edges: GraphEdge[] = [];

  const n = ordered.length;
  // a half-step phase so an even count never leaves a node dead-top + dead-bottom
  // mirrored (keeps the silhouette balanced rather than barbell-shaped).
  const phase = -Math.PI / 2 + Math.PI / Math.max(2, n) * (n % 2 === 0 ? 1 : 0);
  ordered.forEach((it, i) => {
    const { strength, confirmed } = it;
    // even angle around the full circle + a tiny deterministic jitter so it reads
    // organic without thrashing between renders.
    const jitter = (((i * 53) % 17) / 17 - 0.5) * 0.14;
    const ang = phase + (i / n) * Math.PI * 2 + jitter;
    // ring radius: strong items hug the hub, weak ones drift out; a gentle
    // alternation so concentric same-angle stacking never happens.
    const ring = 96 + (1 - strength) * 70 + (i % 2) * 18;
    const r = strength > 0.7 ? 10 : strength > 0.45 ? 9 : 7;
    const x = Math.cos(ang) * ring;
    const y = Math.sin(ang) * ring;
    nodes.push({
      id: it.id, world: it.world, x, y, r, label: it.label,
      kind: it.kind, fact: it.fact, pattern: it.pattern, confirmed, strength,
    });
    edges.push({ key: `hub-${it.id}`, from: HUB_ID, to: it.id, strong: confirmed && strength > 0.4 });
  });

  return { nodes, edges };
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * THE CENTERING FUNCTION. Build a hub-anchored, aspect-corrected, padded viewBox
 * so the cluster is optically centred and fills the canvas with no dead quadrants,
 * at any device + zoom. See the file header for the full guarantee.
 *
 * @param nodes   laid-out model-space nodes (must contain the hub)
 * @param canvasW live canvas pixel width
 * @param canvasH live canvas pixel height
 * @param zoom    >1 zooms in (smaller box), <1 zooms out (bigger box); default 1
 */
export function computeViewBox(
  nodes: GraphNode[],
  canvasW: number,
  canvasH: number,
  zoom = 1,
): ViewBox {
  // 1. anchor = the YOU hub (focal point of a radial graph), falling back to the
  //    centroid only if for some reason there is no hub.
  const hub = nodes.find((n) => n.hub);
  const cx = hub ? hub.x : nodes.reduce((s, n) => s + n.x, 0) / Math.max(1, nodes.length);
  const cy = hub ? hub.y : nodes.reduce((s, n) => s + n.y, 0) / Math.max(1, nodes.length);

  // 2. half-extents = furthest node reach from the anchor on each axis (the
  //    cluster's max reach up/down/left/right, including the node radius). A lone
  //    hub gets a sensible minimum so the seed still reads centred, not zoomed in.
  let halfX = 0;
  let halfY = 0;
  for (const n of nodes) {
    halfX = Math.max(halfX, Math.abs(n.x - cx) + n.r);
    halfY = Math.max(halfY, Math.abs(n.y - cy) + n.r);
  }
  halfX = Math.max(halfX, 60);
  halfY = Math.max(halfY, 60);

  let bw = halfX * 2;
  let bh = halfY * 2;

  // 3. pad for breathing room, then divide by zoom (zoom in => tighter box)
  const pad = 1.34 / Math.max(0.0001, zoom);
  bw *= pad;
  bh *= pad;

  // 4. aspect-correct to the LIVE canvas ratio: grow the smaller dimension so the
  //    box aspect == canvas aspect. With preserveAspectRatio meet this keeps the
  //    hub-centred box optically centred at any device shape.
  const aspect = canvasW > 0 && canvasH > 0 ? canvasW / canvasH : 1;
  if (bw / bh < aspect) bw = bh * aspect;
  else bh = bw / aspect;

  // 5. box CENTRED on the anchor
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
}

/** A bond the reader shows when a node is selected. */
export interface GraphBond {
  id: string;
  fact: MemoryWebFact;
  world: GraphWorld;
  strength: number;
  confirmed: boolean;
  provenance: string;
}

export function bondForNode(node: GraphNode): GraphBond | null {
  if (!node.fact) return null;
  return {
    id: node.fact.id,
    fact: node.fact,
    world: node.world,
    strength: node.strength,
    confirmed: node.confirmed,
    provenance: factProvenance(node.fact),
  };
}

export { HUB_ID };
