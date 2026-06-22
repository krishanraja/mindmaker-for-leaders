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

import type { MemoryWebFact } from '@/types/memory';
import { factWorld, factStrength, isConfirmed, factProvenance } from './worldModel';

/** The mock's worlds: emerald hub + three orbit territories. */
export type GraphWorld = 'you' | 'priority' | 'decisions' | 'company';

/** Token + label per world (drawn via hsl(var(--node-*))). */
export const GRAPH_WORLD_META: Record<GraphWorld, { token: string; label: string }> = {
  you: { token: 'var(--node-you)', label: 'You' },
  priority: { token: 'var(--node-priority)', label: 'Priorities' },
  decisions: { token: 'var(--node-decisions)', label: 'Decisions' },
  company: { token: 'var(--node-company)', label: 'Company' },
};

/**
 * Map a real fact onto one of the three ORBIT worlds (the hub is synthesized, not
 * a fact). Honest re-grouping of the existing four-territory model onto the mock's
 * three orbit colours:
 *   you-world facts (objective / identity / preference) -> PRIORITY (amber)
 *   company-world facts (business / blocker)            -> COMPANY  (orange)
 *   ai-world facts (externally sourced context)         -> DECISIONS (purple,
 *     the "open calls / signals weighing on you" cluster the mock paints purple)
 */
export function factGraphWorld(fact: MemoryWebFact): Exclude<GraphWorld, 'you'> {
  const w = factWorld(fact);
  if (w === 'company') return 'company';
  if (w === 'ai' || w === 'decisions') return 'decisions';
  return 'priority';
}

export interface GraphNode {
  id: string;
  world: GraphWorld;
  /** model-space coords (origin = the YOU hub) */
  x: number;
  y: number;
  r: number;
  label: string;
  /** the underlying fact (null for the synthesized hub) */
  fact: MemoryWebFact | null;
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
export function buildGraph(facts: MemoryWebFact[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const hub: GraphNode = {
    id: HUB_ID,
    world: 'you',
    x: 0,
    y: 0,
    r: 15,
    label: 'You',
    fact: null,
    confirmed: true,
    strength: 1,
    hub: true,
  };

  if (facts.length === 0) {
    return { nodes: [hub], edges: [] };
  }

  // group by orbit world so each territory packs into its own angular sector
  const orbits: Exclude<GraphWorld, 'you'>[] = ['priority', 'decisions', 'company'];
  const byWorld: Record<Exclude<GraphWorld, 'you'>, MemoryWebFact[]> = {
    priority: [],
    decisions: [],
    company: [],
  };
  for (const f of facts) byWorld[factGraphWorld(f)].push(f);
  // strongest first so the anchor of each world sits closest to the hub
  for (const w of orbits) byWorld[w].sort((a, b) => factStrength(b) - factStrength(a));

  // base sector angle per populated world (only populated worlds claim a sector,
  // so a thin web still spreads evenly instead of leaving a colour's wedge empty)
  const populated = orbits.filter((w) => byWorld[w].length > 0);
  const sector = (Math.PI * 2) / Math.max(1, populated.length);

  const nodes: GraphNode[] = [hub];
  const edges: GraphEdge[] = [];

  populated.forEach((world, wi) => {
    const group = byWorld[world];
    const base = wi * sector - Math.PI / 2; // start from "up" so it reads upright
    group.forEach((fact, i) => {
      const strength = factStrength(fact);
      const confirmed = isConfirmed(fact);
      // ring radius: strong facts close in, weak ones farther; +index spread so
      // same-world nodes never stack. Tuned to the mock's ~95..255 model spread.
      const ring = 84 + (1 - strength) * 96 + i * 26;
      // spread within the world's sector, biased so the field reads as an even
      // fan rather than a hard spoke; a gentle deterministic jitter keeps it
      // organic without thrashing between renders (seeded by the index).
      const spread = group.length > 1 ? (i / (group.length - 1) - 0.5) : 0;
      const jitter = (((i * 53) % 17) / 17 - 0.5) * 0.28;
      const ang = base + spread * sector * 0.74 + jitter;
      const r = strength > 0.7 ? 10 : strength > 0.45 ? 9 : 7;
      const x = Math.cos(ang) * ring;
      // flatten y a touch so a dense graph reads as a field, like the mock
      const y = Math.sin(ang) * ring * 0.9;
      const id = fact.id;
      nodes.push({ id, world, x, y, r, label: fact.fact_label, fact, confirmed, strength });
      // hub -> node spoke; lit when the fact is confirmed + load-bearing
      edges.push({ key: `hub-${id}`, from: HUB_ID, to: id, strong: confirmed && strength > 0.4 });
    });
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
