/**
 * BrainGraph - the 2028 centred Brain canvas (prototypes/brain-2028.html).
 *
 * A hub-anchored radial graph: a single emerald YOU hub at the optical centre,
 * with the leader's facts orbiting it as amber (priorities) / purple (decisions)
 * / orange (company) nodes, joined by spokes (lit = confirmed, dashed = worth a
 * check) plus the REAL cross-fact edges from memory_edges.
 *
 * CENTERING (the core fix, replacing the old four-world compass that clustered
 * top-left with dead quadrants): the viewBox is recomputed on EVERY render via
 * computeViewBox - anchored on the YOU hub, sized from the hub's max reach per
 * axis, padded, and aspect-corrected to the LIVE canvas pixel ratio - and the
 * <svg> uses preserveAspectRatio="xMidYMid meet". So the cluster is optically
 * centred and fills the canvas with no dead quadrants on mobile AND desktop, and
 * re-centres itself on resize / zoom / device change. A ResizeObserver feeds the
 * live pixel box; zoom +/- and fit are wired to the same viewBox math.
 *
 * COLD = a breathing seed-orb invitation (handled by the parent overlay; this
 * renders only when there are facts). Loading is the parent's SkeletonCard.
 *
 * Honest: node worlds + confirmed/strength are real fact fields; the only ropes
 * are hub->node spokes + real memory_edges (never a fabricated relationship).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import type { MemoryWebFact, UserPattern } from '@/types/memory';
import type { MemoryEdge } from '@/hooks/useMemoryEdges';
import { cn } from '@/lib/utils';
import {
  buildGraph,
  computeViewBox,
  bondForNode,
  GRAPH_WORLD_META,
  ORBIT_WORLDS,
  type GraphWorld,
  type GraphBond,
} from './brainGraphModel';

const SVGNS = 'http://www.w3.org/2000/svg';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.4;

export type { GraphBond } from './brainGraphModel';

interface BrainGraphProps {
  facts: MemoryWebFact[];
  /** observed strengths / blind spots / working-style patterns about the person */
  patterns?: UserPattern[];
  edges?: MemoryEdge[];
  /** controlled selection by fact id (parent drives the rail / sheet) */
  selectedFactId?: string | null;
  onBondSelect?: (bond: GraphBond | null) => void;
  /** a pattern node (a strength / blind spot / style read) was tapped */
  onPatternSelect?: (pattern: UserPattern | null) => void;
  /**
   * Two-step tap (mobile): the first tap on a node only reveals its label so the
   * leader can browse without a drawer flying up every time; a second tap on the
   * same node opens the reader. Desktop (false) keeps the single-tap open.
   */
  peekFirst?: boolean;
  className?: string;
}

export function BrainGraph({
  facts,
  patterns = [],
  edges = [],
  selectedFactId = null,
  onBondSelect,
  onPatternSelect,
  peekFirst = false,
  className,
}: BrainGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const reduceMotion = useReducedMotion();

  // live canvas pixel box -> drives the aspect-correct viewBox every render
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setBox({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes } = useMemo(() => buildGraph(facts, patterns), [facts, patterns]);

  // THE CENTERING: recomputed every render from the live box + zoom.
  const vb = useMemo(
    () => computeViewBox(nodes, box.w, box.h, zoom),
    [nodes, box.w, box.h, zoom],
  );

  const nodeById = useMemo(() => {
    const m = new Map<string, (typeof nodes)[number]>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // hub -> node spokes (drawn from the model)
  const spokes = useMemo(() => {
    const hub = nodes.find((n) => n.hub);
    if (!hub) return [];
    return nodes
      .filter((n) => !n.hub)
      .map((n) => {
        const strong = n.confirmed && n.strength > 0.4;
        const mx = (hub.x + n.x) / 2;
        const my = (hub.y + n.y) / 2 - 14; // gentle arc, matching the mock
        return { key: `spoke-${n.id}`, x1: hub.x, y1: hub.y, x2: n.x, y2: n.y, mx, my, strong };
      });
  }, [nodes]);

  // REAL cross-fact ropes (only when both ends are on the canvas; never faked)
  const realEdges = useMemo(() => {
    const out: { key: string; x1: number; y1: number; x2: number; y2: number; mx: number; my: number; strong: boolean }[] = [];
    for (const e of edges) {
      if (e.from_fact_id === e.to_fact_id) continue;
      const a = nodeById.get(e.from_fact_id);
      const b = nodeById.get(e.to_fact_id);
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.1;
      const my = (a.y + b.y) / 2 - (a.x - b.x) * 0.1;
      out.push({ key: `edge-${e.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, mx, my, strong: e.source === 'user' });
    }
    return out;
  }, [edges, nodeById]);

  // selection sync (parent-driven)
  const selectedId = selectedFactId;
  // The locally "peeked" node on mobile: tapped once to reveal its label, not
  // yet committed to the reader. A committed parent selection always wins.
  const [peekId, setPeekId] = useState<string | null>(null);
  const activeId = selectedId ?? peekId;

  // Open the reader for a node (commit the selection to the parent).
  const commitNode = useCallback(
    (n: (typeof nodes)[number]) => {
      if (n.kind === 'pattern') {
        onBondSelect?.(null);
        onPatternSelect?.(n.pattern);
        return;
      }
      if (!n.fact) return;
      onPatternSelect?.(null);
      onBondSelect?.(bondForNode(n));
    },
    [onBondSelect, onPatternSelect],
  );

  const handleNodeClick = useCallback(
    (id: string) => {
      const n = nodeById.get(id);
      if (!n || n.hub) return;

      // Two-step (mobile): first tap (or tapping a new node) just reveals the
      // label; tapping the same peeked node again opens the reader.
      if (peekFirst) {
        if (peekId === id) {
          setPeekId(null);
          commitNode(n);
        } else {
          setPeekId(id);
        }
        return;
      }

      // Single-tap (desktop): toggle the reader open/closed.
      const next = selectedId === id ? null : id;
      if (n.kind === 'pattern') {
        onBondSelect?.(null);
        onPatternSelect?.(next === null ? null : n.pattern);
        return;
      }
      if (!n.fact) return;
      onPatternSelect?.(null);
      onBondSelect?.(next === null ? null : bondForNode(n));
    },
    [nodeById, peekFirst, peekId, selectedId, commitNode, onBondSelect, onPatternSelect],
  );

  // only legend the worlds that are actually on the canvas, in orbit order.
  const presentWorlds = useMemo(() => {
    const seen = new Set<GraphWorld>();
    for (const n of nodes) if (!n.hub) seen.add(n.world);
    return ORBIT_WORLDS.filter((w) => seen.has(w));
  }, [nodes]);

  const fit = useCallback(() => setZoom(1), []);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, +(z * 1.25).toFixed(3))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, +(z / 1.25).toFixed(3))), []);

  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  return (
    <div
      ref={wrapRef}
      className={cn('absolute inset-0', className)}
      style={{ touchAction: 'none' }}
      // tapping empty canvas dismisses a pending label peek (nodes stopPropagation)
      onClick={() => { if (peekFirst) setPeekId(null); }}
    >
      <svg
        className="absolute inset-0 block h-full w-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Your memory, centred on you"
      >
        <defs>
          <filter id="brain-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="brain-hub" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="hsl(171 100% 62%)" />
            <stop offset="100%" stopColor="hsl(171 100% 38%)" />
          </radialGradient>
        </defs>

        {/* ===== hub -> node spokes ===== */}
        <g>
          {spokes.map((s) => (
            <motion.path
              key={s.key}
              d={`M ${s.x1} ${s.y1} Q ${s.mx} ${s.my} ${s.x2} ${s.y2}`}
              fill="none"
              stroke={s.strong ? 'hsl(171 100% 50%)' : 'hsl(217 12% 59%)'}
              strokeWidth={s.strong ? 1.7 : 1.1}
              strokeOpacity={s.strong ? 0.55 : 0.3}
              strokeDasharray={s.strong ? undefined : '4 5'}
              strokeLinecap="round"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          ))}
        </g>

        {/* ===== real cross-fact ropes (memory_edges) ===== */}
        <g>
          {realEdges.map((r) => (
            <motion.path
              key={r.key}
              d={`M ${r.x1} ${r.y1} Q ${r.mx} ${r.my} ${r.x2} ${r.y2}`}
              fill="none"
              stroke={r.strong ? 'hsl(171 100% 50%)' : 'hsl(217 12% 59%)'}
              strokeWidth={r.strong ? 1.8 : 1.1}
              strokeOpacity={r.strong ? 0.5 : 0.28}
              strokeDasharray={r.strong ? undefined : '5 6'}
              strokeLinecap="round"
              filter={r.strong ? 'url(#brain-glow)' : undefined}
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          ))}
        </g>

        {/* ===== nodes ===== */}
        <g>
          {nodes.map((n, i) => {
            const meta = GRAPH_WORLD_META[n.world];
            const isSelected = activeId === n.id;
            const dimmed = activeId !== null && !isSelected && !n.hub;
            // a node tapped once on mobile - label shown, reader not yet opened
            const isPeek = peekFirst && peekId === n.id && selectedId !== n.id;

            if (n.hub) {
              return (
                <g key={n.id} style={{ pointerEvents: 'none' }}>
                  <circle cx={n.x} cy={n.y} r={n.r + 10} fill="hsl(171 100% 43% / 0.10)" />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill="url(#brain-hub)"
                    filter="url(#brain-glow)"
                    stroke="hsl(171 100% 70%)"
                    strokeWidth={1}
                  />
                  <text
                    x={n.x}
                    y={n.y + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#03130e"
                    fontSize={9}
                    fontWeight={800}
                    style={{ fontFamily: 'system-ui' }}
                  >
                    YOU
                  </text>
                </g>
              );
            }

            const fill = `hsl(${meta.token})`;
            return (
              <motion.g
                key={n.id}
                style={{ cursor: 'pointer' }}
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: dimmed ? 0.28 : 1 }}
                transition={{ duration: 0.4, delay: reduceMotion ? 0 : Math.min(i * 0.02, 0.5), type: 'spring', stiffness: 190 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(n.id);
                }}
              >
                {isSelected && (
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r * 2.4}
                    fill="none"
                    stroke={fill}
                    strokeWidth={1.3}
                    strokeDasharray="3 4"
                    animate={reduceMotion ? undefined : { rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                    style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                  />
                )}
                {/* soft halo */}
                <circle cx={n.x} cy={n.y} r={n.r + 6} fill={`hsl(${meta.token} / 0.12)`} />
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={fill}
                  fillOpacity={n.confirmed ? 0.95 : 0.55}
                  filter="url(#brain-glow)"
                  stroke={n.confirmed ? 'hsl(0 0% 100% / 0.25)' : 'hsl(217 12% 59% / 0.6)'}
                  strokeWidth={1}
                  strokeDasharray={n.confirmed ? undefined : '2.5 2.5'}
                />
                {/* a confirmed node wears an emerald inner pip */}
                {n.confirmed && n.strength > 0.45 && (
                  <circle cx={n.x} cy={n.y} r={n.r * 0.3} fill="hsl(171 100% 50%)" />
                )}
                {/* generous tap target */}
                <circle cx={n.x} cy={n.y} r={Math.max(n.r * 2.4, 16)} fill="transparent" />
                {isSelected && (
                  <text
                    x={n.x}
                    y={n.y + n.r + 14}
                    textAnchor="middle"
                    fill="#eef1f5"
                    fontSize={11}
                    fontWeight={600}
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.label.length > 22 ? n.label.slice(0, 20) + '...' : n.label}
                  </text>
                )}
                {/* the quiet "you can open this" affordance after a first tap */}
                {isPeek && (
                  <text
                    x={n.x}
                    y={n.y + n.r + 27}
                    textAnchor="middle"
                    fill="hsl(171 100% 60%)"
                    fontSize={9}
                    fontWeight={600}
                    style={{ pointerEvents: 'none' }}
                  >
                    Tap again to open
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>
      </svg>

      {/* quiet legend, pinned bottom-left (only with nodes). A compact 2-column
          grid so the wider category set still fits on mobile without crowding. */}
      {presentWorlds.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[3] grid grid-cols-2 gap-x-3 gap-y-1">
          {presentWorlds.map((w) => (
            <span key={w} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: `hsl(${GRAPH_WORLD_META[w].token})` }} />
              {GRAPH_WORLD_META[w].label}
            </span>
          ))}
          <span className="col-span-2 mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-3.5 border-t-2 border-muted-foreground/60" />
              confirmed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-3.5 border-t-2 border-dashed border-muted-foreground/40" />
              worth a check
            </span>
          </span>
        </div>
      )}

      {/* zoom cluster, pinned bottom-right (only with facts) */}
      {facts.length > 0 && (
        <div className="absolute bottom-3 right-3 z-[3] flex flex-col gap-1.5">
          <ZoomBtn label="Zoom in" onClick={zoomIn}>
            <Plus className="h-3.5 w-3.5" />
          </ZoomBtn>
          <ZoomBtn label="Zoom out" onClick={zoomOut}>
            <Minus className="h-3.5 w-3.5" />
          </ZoomBtn>
          {zoom !== 1 && (
            <ZoomBtn label="Fit to view" onClick={fit}>
              <Maximize2 className="h-3.5 w-3.5" />
            </ZoomBtn>
          )}
        </div>
      )}
    </div>
  );
}

function ZoomBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-border bg-card/85 text-muted-foreground backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-foreground"
    >
      {children}
    </button>
  );
}
