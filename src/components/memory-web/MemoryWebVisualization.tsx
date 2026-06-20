/**
 * MemoryWebVisualization - the four-world "walked" brain canvas.
 *
 * Renders the Memory Web as four TERRITORIES (worlds), not a flat dot cloud:
 *   - YOU / PRIORITY (gold)   = your goals + who you are              (top)
 *   - YOUR DECISIONS (violet)  = the open calls you are weighing      (centre)
 *   - AI WORLD (blue)          = what the outside world fed in        (right)
 *   - YOUR COMPANY (coral)     = your costs, constraints, the business (bottom-left)
 *
 * Nodes are coloured by their world. Ropes between nodes encode STRENGTH by
 * thickness: a load-bearing fact (high importance / high-stakes) draws a
 * thicker, brighter rope; an inferred / thin-evidence link draws a thin,
 * dashed brushed-metal rope. Honesty is physics: rope brightness is hard
 * capped by the weakest evidence badge, so a fat bright cable can never be
 * drawn from thin evidence, and the renderer cannot "light" an only-you
 * (un-verified, leader-attested) seam.
 *
 * Selecting a node opens the bond reader (right rail on desktop, sheet on
 * mobile) where you Confirm / Strengthen / Fix the connection.
 *
 * NOTE on edges: we never fabricate cross-world relationships. The only ropes
 * drawn are (a) each node to the centre of its own world (the anchor it sits
 * in) and (b) a single load-bearing spine from the strongest priority through
 * the strongest cost to the strongest world-signal to the live decision - all
 * of which are derivable from the real facts/decisions the hook returns.
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, Plus, Minus, Maximize2 } from 'lucide-react';
import type { MemoryWebFact, Temperature } from '@/types/memory';
import { useZoomPan } from '@/hooks/useZoomPan';
import {
  WORLD_META,
  CONFIRMED_RGB,
  SLACK_STROKE,
  factWorld,
  factStrength,
  isConfirmed,
  factProvenance,
  edgeStyle,
  type World,
  type MemoryBond,
} from './worldModel';
import type { MemoryEdge } from '@/hooks/useMemoryEdges';

// Re-export the world-model TYPES so embedders that import them from this
// module keep compiling. Type-only re-exports don't break fast-refresh; the
// VALUE tokens/helpers live in ./worldModel and are imported directly there.
export type { World, MemoryBond } from './worldModel';

// ── Stable seeded random (avoids layout thrash on re-renders) ────────────────
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getTemp(fact: MemoryWebFact): Temperature {
  if (fact.temperature === 'hot' || fact.temperature === 'warm' || fact.temperature === 'cold') {
    return fact.temperature;
  }
  return 'warm';
}

// ── Layout: each world is a well; nodes orbit their own world centre ──────────
interface NodePosition {
  x: number;
  y: number;
  fact: MemoryWebFact;
  world: World;
  radius: number;
  strength: number;
  confirmed: boolean;
}

interface WorldCentre {
  world: World;
  x: number;
  y: number;
  /** label anchor */
  lx: number;
  ly: number;
  anchor: 'start' | 'middle' | 'end';
}

/**
 * Aspect-aware compass placement. The four worlds are positioned as FRACTIONS
 * of the live container box (w x h) so the brain always spreads to FILL whatever
 * shape it is given - a tall portrait column on mobile, a wide letterbox on
 * desktop - instead of being marooned in a fixed 760x520 landscape island.
 *
 * The fractions preserve the original brain-2.html compass *relationships*
 * (YOU up top, COMPANY lower-left, AI to the right, DECISIONS at the convergence
 * centre) while keeping a small inset so the rim worlds + their labels never
 * clip the canvas edge.
 */
function worldCentres(w: number, h: number): Record<World, WorldCentre> {
  // insets so the rim worlds + their labels stay on-canvas at any aspect
  const padX = Math.max(38, w * 0.1);
  const padY = Math.max(40, h * 0.1);
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const fx = (f: number) => padX + innerW * f;
  const fy = (f: number) => padY + innerH * f;
  const labelGap = Math.min(54, innerH * 0.11);
  return {
    you: {
      world: 'you',
      x: fx(0.42), y: fy(0.1),
      lx: fx(0.42), ly: Math.max(14, fy(0.1) - labelGap),
      anchor: 'middle',
    },
    company: {
      world: 'company',
      x: fx(0.28), y: fy(0.84),
      lx: Math.max(8, padX * 0.35), ly: Math.min(h - 8, fy(1) + labelGap * 0.5),
      anchor: 'start',
    },
    ai: {
      world: 'ai',
      x: fx(0.84), y: fy(0.42),
      lx: Math.min(w - 8, fx(1) + padX * 0.35), ly: fy(0.18),
      anchor: 'end',
    },
    decisions: {
      world: 'decisions',
      x: fx(0.56), y: fy(0.5),
      lx: fx(0.56), ly: fy(0.5) - labelGap,
      anchor: 'middle',
    },
  };
}

function layoutNodes(
  facts: MemoryWebFact[],
  centres: Record<World, WorldCentre>,
  /**
   * Layout scale, derived from the live box, so the orbit rings + node sizes
   * grow/shrink with the container instead of staying pinned to the old
   * 760x520 numbers. 1 == the original brain-2.html sizing.
   */
  s = 1,
): NodePosition[] {
  if (facts.length === 0) return [];

  // group by world so each territory packs around its own centre
  const byWorld: Record<World, MemoryWebFact[]> = { you: [], company: [], ai: [], decisions: [] };
  for (const f of facts) byWorld[factWorld(f)].push(f);

  const out: NodePosition[] = [];
  (Object.keys(byWorld) as World[]).forEach((world) => {
    const group = byWorld[world];
    // strongest first so the world's anchor node sits closest to its centre
    group.sort((a, b) => factStrength(b) - factStrength(a));
    const c = centres[world];
    group.forEach((fact, i) => {
      const rng = seededRandom(hashString(fact.id));
      const strength = factStrength(fact);
      // strong facts hug the world centre; weak ones drift to the rim (scaled)
      const ring = (i === 0 ? 0 : 26 + (1 - strength) * 64 + i * 9) * s;
      const angle = (i * 137.508 * Math.PI) / 180 + rng() * 0.6;
      const radius = (strength > 0.7 ? 12 : strength > 0.45 ? 9 : 7) * s;
      out.push({
        x: c.x + Math.cos(angle) * ring,
        y: c.y + Math.sin(angle) * ring,
        fact,
        world,
        radius,
        strength,
        confirmed: isConfirmed(fact),
      });
    });
  });
  return out;
}

/**
 * Build the bright cross-world spine: strongest YOU -> strongest COMPANY ->
 * strongest AI -> the live DECISION. Only links worlds that actually have a
 * node, so a thin web shows a short honest spine, never a faked full one.
 */
function buildSpine(nodes: NodePosition[], decisionCentre: { x: number; y: number } | null) {
  const order: World[] = ['you', 'company', 'ai'];
  const anchors = order
    .map((w) => nodes.filter((n) => n.world === w).sort((a, b) => b.strength - a.strength)[0])
    .filter(Boolean) as NodePosition[];
  return { anchors, decisionCentre };
}

// ── Ambient particles ────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  color: string;
}

function generateParticles(seed: number, count: number, w: number, h: number): Particle[] {
  const rng = seededRandom(seed);
  const colors = ['219,169,74', '139,92,246', '90,169,255', '224,121,91'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rng() * w,
    y: rng() * h,
    size: 1 + rng() * 2.5,
    opacity: 0.12 + rng() * 0.28,
    duration: 4 + rng() * 6,
    delay: rng() * 4,
    color: colors[i % colors.length],
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

interface MemoryWebVisualizationProps {
  facts: MemoryWebFact[];
  className?: string;
  /** fired on every node tap (existing contract - keeps embedders working) */
  onNodeTap?: (fact: MemoryWebFact) => void;
  showEmptyState?: boolean;
  clearSelection?: boolean;
  /**
   * NEW (optional). When the parent renders its own bond reader (desktop right
   * rail / mobile sheet), pass this to receive the selected bond. The internal
   * tooltip is suppressed when this is set so the two readers do not collide.
   */
  onBondSelect?: (bond: MemoryBond | null) => void;
  /** NEW (optional). Controlled selection by fact id (for parent-driven rails). */
  selectedFactId?: string | null;
  /** NEW (optional). Hide the floating tooltip even without onBondSelect. */
  suppressTooltip?: boolean;
  /**
   * NEW (optional). The REAL cross-fact ropes from the `memory_edges` table.
   * Each is drawn between the two fact nodes it connects (only when BOTH ends
   * are on the canvas), thickness ~ strength, lit emerald for source='user'
   * and dashed/neutral for source='inferred'. We never fabricate an edge - if
   * this prop is empty, no cross-fact ropes are drawn. Backward compatible:
   * callers that omit it keep their existing fact-to-world ropes + spine.
   */
  edges?: MemoryEdge[];
}

export function MemoryWebVisualization({
  facts,
  className,
  onNodeTap,
  showEmptyState = false,
  clearSelection = false,
  onBondSelect,
  selectedFactId = null,
  suppressTooltip = false,
  edges = [],
}: MemoryWebVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 360, h: 400 });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The viewBox now tracks the live container box (1 viewBox unit == 1 px), so
  // the drawing FILLS its frame at any aspect instead of being letterboxed
  // inside a fixed 760x520 landscape island. The four worlds are placed as
  // fractions of this box, so they always spread to fill whatever shape the
  // container is (tall portrait on mobile, wide on desktop, with or without
  // the right rail). Guard against a zero box before the ResizeObserver fires.
  const VB_W = Math.max(1, dims.w);
  const VB_H = Math.max(1, dims.h);
  const centres = useMemo(() => worldCentres(VB_W, VB_H), [VB_W, VB_H]);

  // layout scale: grow rings + node sizes with the box. The reference box is
  // the old 760x520; we clamp so a phone stays legible and a wide desktop does
  // not balloon the nodes. Uses the smaller axis so portrait + landscape match.
  const layoutScale = useMemo(() => {
    const ref = Math.hypot(760, 520);
    const live = Math.hypot(VB_W, VB_H);
    return Math.max(0.7, Math.min(1.6, live / ref));
  }, [VB_W, VB_H]);

  const factIds = useMemo(() => facts.map((f) => f.id).join(','), [facts]);

  const nodes = useMemo(
    () => layoutNodes(facts, centres, layoutScale),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [factIds, centres, layoutScale],
  );

  // which worlds are actually populated (for labels + legend honesty)
  const activeWorlds = useMemo(() => {
    const s = new Set<World>();
    nodes.forEach((n) => s.add(n.world));
    return s;
  }, [nodes]);

  const spine = useMemo(
    () => buildSpine(nodes, activeWorlds.has('decisions') ? null : centres.decisions),
    [nodes, activeWorlds, centres],
  );
  // index lookup so a spine rope can mark its nodes as load-bearing
  const spineIds = useMemo(() => new Set(spine.anchors.map((n) => n.fact.id)), [spine]);

  // fact id -> its laid-out node position, so a real cross-fact edge can be
  // drawn between the two nodes it connects.
  const nodeById = useMemo(() => {
    const m = new Map<string, NodePosition>();
    for (const n of nodes) m.set(n.fact.id, n);
    return m;
  }, [nodes]);

  // Resolve the REAL edges to drawable ropes. Honesty: we only draw an edge when
  // BOTH of its fact nodes are on the canvas (an edge to a fact that is not
  // is_current / not shown is silently skipped, never faked to a centre). We
  // never invent an edge; this is a pure projection of the `edges` prop.
  const edgeRopes = useMemo(() => {
    const out: {
      key: string;
      x1: number; y1: number; x2: number; y2: number;
      mx: number; my: number;
      stroke: string; width: number; dash?: string; glow: boolean;
    }[] = [];
    for (const e of edges) {
      if (e.from_fact_id === e.to_fact_id) continue;
      const a = nodeById.get(e.from_fact_id);
      const b = nodeById.get(e.to_fact_id);
      if (!a || !b) continue;
      const style = edgeStyle(e.strength, e.source);
      // gentle perpendicular bow so overlapping ropes stay readable
      const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.1;
      const my = (a.y + b.y) / 2 - (a.x - b.x) * 0.1;
      out.push({
        key: e.id,
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        mx, my,
        stroke: style.stroke, width: style.width, dash: style.dash, glow: style.glow,
      });
    }
    return out;
  }, [edges, nodeById]);

  const particles = useMemo(
    () => generateParticles(42, facts.length > 0 ? 16 : 9, dims.w, dims.h),
    [facts.length, dims.w, dims.h],
  );

  // initialScale 1 == fit-the-frame (the viewBox already equals the box), and
  // minScale 0.5 lets the leader zoom OUT to recover from any state and see the
  // whole brain. pinch / wheel / drag-when-zoomed all stay wired in the hook.
  const { svgTransform, isZoomed, resetZoom, wasGesture, zoomIn, zoomOut, canFit } = useZoomPan({
    containerRef,
    dims,
    initialScale: 1,
    minScale: 0.5,
    maxScale: 3,
  });

  // One-time "pinch or scroll to explore" hint, auto-dismissed on first gesture
  // or after a few seconds. Respects prefers-reduced-motion (no pulsing).
  const [showHint, setShowHint] = useState(false);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  useEffect(() => {
    if (facts.length === 0) return;
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 5200);
    return () => clearTimeout(t);
  }, [facts.length]);
  useEffect(() => {
    if (canFit) setShowHint(false);
  }, [canFit]);

  // Build the bond object for a node (what the reader shows)
  const bondForIndex = useCallback((index: number): MemoryBond | null => {
    const n = nodes[index];
    if (!n) return null;
    return {
      id: n.fact.id,
      fact: n.fact,
      world: n.world,
      strength: n.strength,
      confirmed: n.confirmed,
      spine: spineIds.has(n.fact.id),
      provenance: factProvenance(n.fact),
    };
  }, [nodes, spineIds]);

  // Sync controlled selection (parent-driven) -> internal index
  useEffect(() => {
    if (selectedFactId === undefined) return;
    if (selectedFactId === null) {
      setSelectedIndex(null);
      return;
    }
    const idx = nodes.findIndex((n) => n.fact.id === selectedFactId);
    setSelectedIndex(idx >= 0 ? idx : null);
  }, [selectedFactId, nodes]);

  const handleNodeClick = useCallback((index: number) => {
    if (wasGesture()) return;
    setSelectedIndex((prev) => {
      const next = prev === index ? null : index;
      if (onBondSelect) onBondSelect(next === null ? null : bondForIndex(index));
      return next;
    });
    if (onNodeTap && nodes[index]) onNodeTap(nodes[index].fact);
  }, [onNodeTap, onBondSelect, nodes, wasGesture, bondForIndex]);

  const handleBackdropClick = useCallback(() => {
    if (wasGesture()) return;
    setSelectedIndex(null);
    if (onBondSelect) onBondSelect(null);
  }, [wasGesture, onBondSelect]);

  useEffect(() => { setSelectedIndex(null); }, [factIds]);
  useEffect(() => { if (clearSelection) setSelectedIndex(null); }, [clearSelection]);

  const selectedNode = selectedIndex !== null ? nodes[selectedIndex] : null;
  const useInternalTooltip = !onBondSelect && !suppressTooltip;

  // viewBox now equals the px box (1 unit == 1 px), so a viewBox coord IS its
  // unzoomed screen coord. Kept as a helper so the tooltip math reads clearly.
  const toScreen = useCallback((x: number, y: number) => ({ x, y }), []);

  const tooltipPos = useMemo(() => {
    if (!selectedNode) return { x: 0, y: 0 };
    const screen = toScreen(selectedNode.x, selectedNode.y);
    const cardW = 210;
    const cardH = 92;
    let tx = screen.x - cardW / 2;
    let ty = screen.y - cardH - 24;
    tx = Math.max(8, Math.min(dims.w - cardW - 8, tx));
    if (ty < 8) ty = screen.y + 28;
    return { x: tx, y: ty };
  }, [selectedNode, dims.w, toScreen]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden', className)}
      style={{ touchAction: 'none' }}
    >
      {/* Background well glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(900px 600px at 55% 35%, rgba(139,92,246,0.05) 0%, transparent 72%)',
        }}
      />

      <svg
        width={dims.w}
        height={dims.h}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0"
        onClick={handleBackdropClick}
      >
        <defs>
          <filter id="web-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="web-soft" x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur stdDeviation="20" />
          </filter>
          <radialGradient id="web-twell" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="web-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.38" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={svgTransform} style={isZoomed ? { cursor: 'grab' } : undefined}>
          {/* territory wells (only for populated worlds + always the decision centre) */}
          {(['you', 'company', 'ai'] as World[]).map((w) =>
            activeWorlds.has(w) ? (
              <circle
                key={`well-${w}`}
                cx={centres[w].x}
                cy={centres[w].y}
                r={(w === 'company' ? 150 : 120) * layoutScale}
                fill="url(#web-twell)"
              />
            ) : null,
          )}

          {/* convergence halo under the decision centre */}
          <circle
            cx={centres.decisions.x}
            cy={centres.decisions.y}
            r={92 * layoutScale}
            fill="url(#web-halo)"
            filter="url(#web-soft)"
          />

          {/* world labels (honest: only for worlds that actually hold something) */}
          {(Object.keys(centres) as World[]).map((w) => {
            const populated = w === 'decisions' || activeWorlds.has(w);
            if (!populated) return null;
            return (
              <text
                key={`lbl-${w}`}
                x={centres[w].lx}
                y={centres[w].ly}
                fill={WORLD_META[w].ink}
                fontSize={10}
                letterSpacing={2}
                opacity={0.85}
                textAnchor={centres[w].anchor}
                style={{ pointerEvents: 'none' }}
              >
                {WORLD_META[w].label}
              </text>
            );
          })}

          {/* ===== ROPES ===== */}
          {/* each node -> its own world centre (the anchor it sits in) */}
          {nodes.map((n) => {
            if (n.strength <= 0) return null;
            const c = centres[n.world];
            // strength -> thickness; evidence caps brightness (honesty is physics)
            const w = 1.4 + n.strength * 3.4;
            const isSpine = spineIds.has(n.fact.id);
            // confirmed + load-bearing ropes glow emerald; everything else is
            // the un-lightable brushed-metal slack, dashed if inferred + weak.
            const confirmedBright = n.confirmed && n.strength > 0.45;
            const stroke = confirmedBright
              ? `rgba(${CONFIRMED_RGB},${0.55 + n.strength * 0.35})`
              : isSpine
                ? `rgba(${WORLD_META[n.world].rgb},${0.4 + n.strength * 0.4})`
                : SLACK_STROKE;
            const dashed = !n.confirmed && n.strength < 0.4;
            // gentle curve toward the centre
            const mx = (n.x + c.x) / 2 + (n.y - c.y) * 0.08;
            const my = (n.y + c.y) / 2 - (n.x - c.x) * 0.08;
            return (
              <motion.path
                key={`rope-${n.fact.id}`}
                d={`M ${n.x} ${n.y} Q ${mx} ${my} ${c.x} ${c.y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={confirmedBright || isSpine ? w : Math.min(2, w)}
                strokeDasharray={dashed ? '4 5' : undefined}
                filter={confirmedBright ? 'url(#web-glow)' : undefined}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            );
          })}

          {/* ===== REAL CROSS-FACT ROPES (from the memory_edges table) ===== */}
          {/* Drawn only between two on-canvas fact nodes. Thickness ~ strength;
              user-drawn edges glow emerald, inferred edges are neutral + dashed.
              Never fabricated - this maps 1:1 to rows the table returned. */}
          {edgeRopes.map((r) => (
            <motion.path
              key={`edge-${r.key}`}
              d={`M ${r.x1} ${r.y1} Q ${r.mx} ${r.my} ${r.x2} ${r.y2}`}
              fill="none"
              stroke={r.stroke}
              strokeWidth={r.width}
              strokeLinecap="round"
              strokeDasharray={r.dash}
              filter={r.glow ? 'url(#web-glow)' : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          ))}

          {/* the bright load-bearing spine across the worlds */}
          {spine.anchors.map((n, i) => {
            const next = spine.anchors[i + 1];
            const target = next
              ? { x: next.x, y: next.y }
              : { x: centres.decisions.x, y: centres.decisions.y };
            const mx = (n.x + target.x) / 2 + (n.y - target.y) * 0.12;
            const my = (n.y + target.y) / 2 - (n.x - target.x) * 0.12;
            const both = n.confirmed && (!next || next.confirmed);
            return (
              <motion.path
                key={`spine-${n.fact.id}`}
                d={`M ${n.x} ${n.y} Q ${mx} ${my} ${target.x} ${target.y}`}
                fill="none"
                stroke={both ? `rgba(${CONFIRMED_RGB},0.9)` : `rgba(${WORLD_META[n.world].rgb},0.7)`}
                strokeWidth={4.2}
                filter="url(#web-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.92 }}
                transition={{ duration: 1.3, ease: 'easeInOut' }}
              />
            );
          })}

          {/* the live DECISION node at the convergence centre */}
          {activeWorlds.has('decisions') ? null : facts.length > 0 ? (
            <g filter="url(#web-glow)" style={{ pointerEvents: 'none' }}>
              <circle
                cx={centres.decisions.x}
                cy={centres.decisions.y}
                r={20 * layoutScale}
                fill="none"
                stroke="#f0a13c"
                strokeWidth={2}
                opacity={0.85}
              />
            </g>
          ) : null}

          {/* ===== NODES ===== */}
          {nodes.map((node, i) => {
            const meta = WORLD_META[node.world];
            const isSelected = selectedIndex === i;
            const isSpine = spineIds.has(node.fact.id);
            const temp = getTemp(node.fact);
            const pulse = temp === 'hot' ? 1.8 : temp === 'warm' ? 2.8 : 4.4;
            const dimmed = selectedIndex !== null && !isSelected;
            const isDecisionWorld = node.world === 'decisions';

            return (
              <motion.g
                key={node.fact.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: dimmed ? 0.22 : 1 }}
                transition={{ duration: 0.45, delay: Math.min(i * 0.025, 0.6), type: 'spring', stiffness: 190 }}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(i); }}
              >
                {/* selection ring */}
                {isSelected && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius * 2.6}
                    fill="none"
                    stroke={meta.fill}
                    strokeWidth={1.4}
                    strokeDasharray="3 4"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  />
                )}
                {/* outer pulse. The explicit numeric `initial.r` stops Framer
                    from committing an `r=undefined` on the first animation frame
                    (the console-spam bug); under prefers-reduced-motion we hold
                    a static radius and skip the pulse entirely. */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  fill={`rgba(${meta.rgb},0.10)`}
                  initial={{ r: node.radius * 1.7, opacity: 0.1 }}
                  animate={
                    prefersReducedMotion
                      ? { r: node.radius * 1.9, opacity: 0.14 }
                      : { r: [node.radius * 1.7, node.radius * 2.3, node.radius * 1.7], opacity: [0.1, 0.2, 0.1] }
                  }
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { repeat: Infinity, duration: pulse, ease: 'easeInOut' }
                  }
                />

                {/* core - decisions render as a violet hexagon; facts as discs/tiles */}
                {isDecisionWorld ? (
                  <path
                    d={`M ${node.x},${node.y - node.radius} l ${node.radius * 0.82},${node.radius * 0.5} v ${node.radius} l ${-node.radius * 0.82},${node.radius * 0.5} l ${-node.radius * 0.82},${-node.radius * 0.5} v ${-node.radius} z`}
                    fill="#1c1430"
                    stroke={meta.fill}
                    strokeWidth={2.2}
                    filter="url(#web-glow)"
                  />
                ) : node.world === 'you' ? (
                  // priority = gold tile
                  <rect
                    x={node.x - node.radius}
                    y={node.y - node.radius * 0.78}
                    width={node.radius * 2}
                    height={node.radius * 1.56}
                    rx={node.radius * 0.5}
                    fill="#2a2110"
                    stroke={meta.fill}
                    strokeWidth={2}
                    filter="url(#web-glow)"
                  />
                ) : (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius}
                    fill={node.world === 'ai' ? '#0e1f33' : '#1d1310'}
                    stroke={meta.fill}
                    strokeWidth={node.confirmed && node.strength > 0.45 ? 2.6 : 2}
                    filter="url(#web-glow)"
                  />
                )}

                {/* a confirmed load-bearing node wears an emerald inner dot */}
                {node.confirmed && node.strength > 0.45 && (
                  <circle cx={node.x} cy={node.y} r={node.radius * 0.3} fill={`rgba(${CONFIRMED_RGB},0.9)`} />
                )}

                {/* tap target */}
                <circle cx={node.x} cy={node.y} r={Math.max(node.radius * 2.4, 16)} fill="transparent" />

                {/* label on the strongest node per world + on selection */}
                {(isSelected || isSpine) && (
                  <text
                    x={node.x}
                    y={node.y + node.radius + 14}
                    textAnchor="middle"
                    fill={isSelected ? '#eef1f5' : meta.ink}
                    fontSize={isSelected ? 11 : 10}
                    fontWeight={isSelected ? 600 : 500}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.fact.fact_label.length > 22
                      ? node.fact.fact_label.slice(0, 20) + '...'
                      : node.fact.fact_label}
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>
      </svg>

      {/* ambient particles (DOM overlay, decorative) */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={`particle-${p.id}`}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: p.x,
              top: p.y,
              background: `rgba(${p.color},${p.opacity})`,
              boxShadow: `0 0 ${p.size * 3}px rgba(${p.color},${p.opacity * 0.5})`,
            }}
            animate={{
              y: [0, -28 - p.id * 2, 0],
              opacity: [p.opacity, p.opacity * 0.3, p.opacity],
            }}
            transition={{ repeat: Infinity, duration: p.duration, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* legend (territory colours + rope grammar) */}
      {facts.length > 0 && activeWorlds.size > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute left-3 bottom-3 flex flex-col gap-1.5 pointer-events-none"
        >
          <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-[220px]">
            {(['you', 'decisions', 'ai', 'company'] as World[])
              .filter((w) => w === 'decisions' ? true : activeWorlds.has(w))
              .map((w) => (
                <span key={w} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: WORLD_META[w].fill }} />
                  {WORLD_META[w].label.replace('YOUR ', '').replace('YOU - ', '').toLowerCase()}
                </span>
              ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-3 h-[4px] rounded-[2px]" style={{ background: `rgb(${CONFIRMED_RGB})` }} />
              strong / confirmed
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-3 h-[3px] rounded-[2px]" style={{ background: SLACK_STROKE }} />
              weak / only-you
            </span>
          </div>
        </motion.div>
      )}

      {/* internal tooltip (only when no external bond reader is wired) */}
      {useInternalTooltip && (
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 4 }}
              transition={{ duration: 0.18 }}
              className="absolute pointer-events-auto z-20"
              style={{ left: tooltipPos.x, top: tooltipPos.y, maxWidth: 230 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{
                      color: WORLD_META[selectedNode.world].fill,
                      backgroundColor: `rgba(${WORLD_META[selectedNode.world].rgb},0.15)`,
                    }}
                  >
                    {WORLD_META[selectedNode.world].label}
                  </span>
                  <button
                    onClick={() => { setSelectedIndex(null); }}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {selectedNode.fact.fact_label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {selectedNode.fact.fact_value}
                </p>
                <p className="text-[9px] text-muted-foreground/60 mt-1.5">
                  {selectedNode.confirmed ? 'You confirmed this' : 'Inferred - tap to read the bond'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* empty state */}
      {showEmptyState && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            className="rounded-full border"
            animate={{
              width: [80, 100, 80],
              height: [80, 100, 80],
              borderColor: ['rgba(219,169,74,0.18)', 'rgba(139,92,246,0.3)', 'rgba(219,169,74,0.18)'],
            }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          />
          <motion.p
            className="text-xs text-muted-foreground/60 mt-4"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            Your four worlds will take shape here
          </motion.p>
        </div>
      )}

      {/* Zoom controls: a small +/- / fit-to-screen cluster so zoom is
          discoverable (the gestures were always wired but invisible). Fit
          recovers the default fill at any time; zoom-out goes below 1. */}
      {facts.length > 0 && (
        <div className="absolute bottom-3 right-3 z-20 flex flex-col items-center gap-1 pointer-events-auto">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={zoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-card/85 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={zoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-card/85 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <AnimatePresence>
            {canFit && (
              <motion.button
                type="button"
                aria-label="Fit to screen"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18 }}
                onClick={resetZoom}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-card/85 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* One-time, subtle "pinch or scroll to explore" hint. */}
      <AnimatePresence>
        {showHint && !isZoomed && (
          <motion.div
            key="zoom-hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-card/80 backdrop-blur-sm border border-border px-3 py-1 text-[10px] text-muted-foreground pointer-events-none"
          >
            Pinch or scroll to explore
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
