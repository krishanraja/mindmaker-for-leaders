/**
 * MemoryWebVisualization
 *
 * An interactive, animated "neural web" that renders memory nodes as glowing orbs
 * connected by luminous strands.  Each node's colour maps to its fact category
 * and pulses according to its temperature (hot = fast pulse, cold = slow).
 *
 * Tap a node to reveal its label, value and connections.
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, Minimize2 } from 'lucide-react';
import type { MemoryWebFact, FactCategory, Temperature } from '@/types/memory';
import { useZoomPan } from '@/hooks/useZoomPan';

// ── Colour palette per category ──────────────────────────────────────────────
const CATEGORY_COLORS: Record<FactCategory, { fill: string; rgb: string; label: string }> = {
  identity:   { fill: '#8b5cf6', rgb: '139,92,246', label: 'About You' },
  business:   { fill: '#3b82f6', rgb: '59,130,246', label: 'Business' },
  objective:  { fill: '#10b981', rgb: '16,185,129', label: 'Goals' },
  blocker:    { fill: '#ef4444', rgb: '239,68,68',  label: 'Challenges' },
  preference: { fill: '#f59e0b', rgb: '245,158,11', label: 'Preferences' },
};

const TEMP_PULSE: Record<Temperature, number> = { hot: 1.6, warm: 2.8, cold: 5 };

// ── Stable seeded random (avoids layout thrash on re-renders) ────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
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

// ── Types ────────────────────────────────────────────────────────────────────
interface NodePosition {
  x: number;
  y: number;
  fact: MemoryWebFact;
  radius: number;
  orbitAngle: number;
  orbitRadius: number;
  driftSpeed: number;
  driftAmplitude: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTemp(fact: MemoryWebFact): Temperature {
  if (fact.temperature === 'hot' || fact.temperature === 'warm' || fact.temperature === 'cold') {
    return fact.temperature;
  }
  return 'warm'; // default for facts without temperature
}

function layoutNodes(
  facts: MemoryWebFact[],
  cx: number,
  cy: number,
  maxRadius: number,
): NodePosition[] {
  if (facts.length === 0 || maxRadius <= 0) return [];

  const tempOrder: Record<Temperature, number> = { hot: 0, warm: 1, cold: 2 };
  const sorted = [...facts].sort(
    (a, b) => tempOrder[getTemp(a)] - tempOrder[getTemp(b)],
  );

  return sorted.map((fact, i) => {
    const rng = seededRandom(hashString(fact.id));
    const temp = getTemp(fact);
    const ring = temp === 'hot' ? 0.25 : temp === 'warm' ? 0.55 : 0.82;
    const orbitRadius = ring * maxRadius + (rng() * 0.12 - 0.06) * maxRadius;
    const angleOffset = (i * 137.508 * Math.PI) / 180; // golden-angle spiral
    const nodeSize = temp === 'hot' ? 8 : temp === 'warm' ? 6 : 4;

    return {
      x: cx + Math.cos(angleOffset) * orbitRadius,
      y: cy + Math.sin(angleOffset) * orbitRadius,
      fact,
      radius: nodeSize,
      orbitAngle: angleOffset,
      orbitRadius,
      driftSpeed: 0.3 + rng() * 0.4,
      driftAmplitude: 2 + rng() * 4,
    };
  });
}

/**
 * Build edges with semantic meaning:
 * 1. Same-category connections (memories in same domain are related)
 * 2. Plus nearest-neighbor cross-category links for visual cohesion
 */
function buildEdges(nodes: NodePosition[]): [number, number][] {
  if (nodes.length < 2) return [];
  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();
  const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

  // Group nodes by category
  const categoryGroups: Record<string, number[]> = {};
  nodes.forEach((n, i) => {
    const cat = n.fact.fact_category;
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(i);
  });

  // Connect nodes within the same category (semantic connections)
  for (const indices of Object.values(categoryGroups)) {
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const k = key(indices[a], indices[b]);
        if (!edgeSet.has(k)) {
          edgeSet.add(k);
          edges.push([indices[a], indices[b]]);
        }
      }
    }
  }

  // Add 1 nearest cross-category neighbor per node for visual cohesion
  for (let i = 0; i < nodes.length; i++) {
    const nearest = nodes
      .map((n, j) => ({
        j,
        d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y),
      }))
      .filter(({ j }) => j !== i && nodes[j].fact.fact_category !== nodes[i].fact.fact_category)
      .sort((a, b) => a.d - b.d);

    if (nearest.length > 0) {
      const k = key(i, nearest[0].j);
      if (!edgeSet.has(k)) {
        edgeSet.add(k);
        edges.push([i, nearest[0].j]);
      }
    }
  }

  return edges;
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
  const colors = ['139,92,246', '59,130,246', '16,185,129', '245,158,11'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rng() * w,
    y: rng() * h,
    size: 1 + rng() * 2.5,
    opacity: 0.15 + rng() * 0.35,
    duration: 4 + rng() * 6,
    delay: rng() * 4,
    color: colors[i % colors.length],
  }));
}

// Stable midpoint offset for edge curves
function edgeMidpoint(a: NodePosition, b: NodePosition): { mx: number; my: number } {
  const seed = hashString(a.fact.id + b.fact.id);
  const rng = seededRandom(seed);
  return {
    mx: (a.x + b.x) / 2 + (rng() - 0.5) * 20,
    my: (a.y + b.y) / 2 + (rng() - 0.5) * 20,
  };
}

/** Get connected node indices for a given node index */
function getConnectedIndices(nodeIndex: number, edges: [number, number][]): Set<number> {
  const connected = new Set<number>();
  for (const [a, b] of edges) {
    if (a === nodeIndex) connected.add(b);
    if (b === nodeIndex) connected.add(a);
  }
  return connected;
}

// ── Component ────────────────────────────────────────────────────────────────

interface MemoryWebVisualizationProps {
  facts: MemoryWebFact[];
  className?: string;
  onNodeTap?: (fact: MemoryWebFact) => void;
  showEmptyState?: boolean;
  clearSelection?: boolean;
}

export function MemoryWebVisualization({
  facts,
  className,
  onNodeTap,
  showEmptyState = false,
  clearSelection = false,
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

  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const maxR = Math.min(cx, cy) - 20;

  // Stable fact IDs string to avoid re-layout unless facts actually change
  const factIds = useMemo(() => facts.map((f) => f.id).join(','), [facts]);

  const nodes = useMemo(
    () => layoutNodes(facts, cx, cy, maxR),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [factIds, cx, cy, maxR],
  );
  const edges = useMemo(() => buildEdges(nodes), [nodes]);
  const particles = useMemo(
    () => generateParticles(42, facts.length > 0 ? 18 : 10, dims.w, dims.h),
    [facts.length, dims.w, dims.h],
  );

  // Zoom & pan
  const {
    scale, translateX, translateY,
    svgTransform, domTransformStyle,
    svgToScreen, isZoomed, resetZoom, wasGesture,
  } = useZoomPan({ containerRef, dims, initialScale: 1.5 });

  // Connected nodes for the selected node
  const connectedIndices = useMemo(() => {
    if (selectedIndex === null) return new Set<number>();
    return getConnectedIndices(selectedIndex, edges);
  }, [selectedIndex, edges]);

  const handleNodeClick = useCallback((index: number) => {
    if (wasGesture()) return;
    setSelectedIndex((prev) => (prev === index ? null : index));
    if (onNodeTap) onNodeTap(nodes[index]?.fact);
  }, [onNodeTap, nodes, wasGesture]);

  const handleBackdropClick = useCallback(() => {
    if (wasGesture()) return;
    setSelectedIndex(null);
  }, [wasGesture]);

  // Clear selection when facts change
  useEffect(() => { setSelectedIndex(null); }, [factIds]);

  // Clear selection when parent signals (e.g., briefing card expanded)
  useEffect(() => {
    if (clearSelection) setSelectedIndex(null);
  }, [clearSelection]);

  const isNodeHighlighted = (index: number) =>
    selectedIndex === null || index === selectedIndex || connectedIndices.has(index);

  const isEdgeHighlighted = (i: number, j: number) =>
    selectedIndex === null ||
    i === selectedIndex || j === selectedIndex;

  // Active categories for legend
  const activeCategories = useMemo(() => {
    const cats = new Set<FactCategory>();
    facts.forEach((f) => cats.add(f.fact_category));
    return Array.from(cats);
  }, [facts]);

  // Tooltip position (keep card inside viewport, accounting for zoom)
  const selectedNode = selectedIndex !== null ? nodes[selectedIndex] : null;
  const tooltipPos = useMemo(() => {
    if (!selectedNode) return { x: 0, y: 0 };
    const screen = svgToScreen(selectedNode.x, selectedNode.y);
    const scaledRadius = selectedNode.radius * scale;
    const cardW = 200;
    const cardH = 80;
    let tx = screen.x - cardW / 2;
    let ty = screen.y - cardH - scaledRadius * 3 - 8;
    // Clamp horizontal
    tx = Math.max(8, Math.min(dims.w - cardW - 8, tx));
    // If above would go off top, place below
    if (ty < 8) ty = screen.y + scaledRadius * 3 + 8;
    return { x: tx, y: ty };
  }, [selectedNode, dims.w, svgToScreen, scale]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden', className)}
      style={{ touchAction: 'none' }}
    >
      {/* Radial gradient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 70%)`,
        }}
      />

      <svg
        width={dims.w}
        height={dims.h}
        className="absolute inset-0"
        style={{ filter: 'url(#web-glow)' }}
        onClick={handleBackdropClick}
      >
        <defs>
          <filter id="web-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={svgTransform} style={isZoomed ? { cursor: 'grab' } : undefined}>
        {/* Concentric orbit rings */}
        {[0.25, 0.55, 0.82].map((ring) => (
          <circle
            key={ring}
            cx={cx}
            cy={cy}
            r={ring * maxR}
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth={0.5}
            strokeDasharray="4 8"
          />
        ))}

        {/* Edges */}
        {edges.map(([i, j], idx) => {
          const a = nodes[i];
          const b = nodes[j];
          const { mx, my } = edgeMidpoint(a, b);
          const highlighted = isEdgeHighlighted(i, j);
          const sameCategory = a.fact.fact_category === b.fact.fact_category;
          const col = CATEGORY_COLORS[a.fact.fact_category] || CATEGORY_COLORS.identity;
          const baseOpacity = sameCategory ? 0.25 : 0.1;

          return (
            <motion.path
              key={`edge-${a.fact.id}-${b.fact.id}`}
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
              fill="none"
              stroke={`rgba(${col.rgb},${highlighted ? (selectedIndex !== null ? (sameCategory ? 0.5 : 0.2) : baseOpacity) : 0.03})`}
              strokeWidth={highlighted && selectedIndex !== null ? (sameCategory ? 1.5 : 0.8) : 1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: idx * 0.05 }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const col = CATEGORY_COLORS[node.fact.fact_category] || CATEGORY_COLORS.identity;
          const temp = getTemp(node.fact);
          const pulseDur = TEMP_PULSE[temp];
          const highlighted = isNodeHighlighted(i);
          const isSelected = selectedIndex === i;
          const isConnected = connectedIndices.has(i);
          const dimmed = selectedIndex !== null && !highlighted;

          return (
            <motion.g
              key={node.fact.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: dimmed ? 0.15 : 1 }}
              transition={{ duration: 0.5, delay: i * 0.04, type: 'spring', stiffness: 200 }}
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(i); }}
            >
              {/* Selection ring */}
              {isSelected && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius * 4}
                  fill="none"
                  stroke={col.fill}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  initial={{ r: node.radius * 2, opacity: 0 }}
                  animate={{
                    r: [node.radius * 3.5, node.radius * 4.5, node.radius * 3.5],
                    opacity: [0.4, 0.6, 0.4],
                    rotate: [0, 360],
                  }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                />
              )}
              {/* Outer glow ring */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.radius * 2.5}
                fill={`rgba(${col.rgb},0.08)`}
                initial={{ r: node.radius * 2.2 }}
                animate={{
                  r: [node.radius * 2.2, node.radius * (isSelected ? 3.5 : 3), node.radius * 2.2],
                  opacity: [0.08, isSelected ? 0.25 : 0.15, 0.08],
                }}
                transition={{ repeat: Infinity, duration: pulseDur, ease: 'easeInOut' }}
              />
              {/* Core orb */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={col.fill}
                filter="url(#node-glow)"
                initial={{ r: node.radius }}
                animate={{
                  r: [node.radius, node.radius * (isSelected ? 1.3 : 1.15), node.radius],
                }}
                transition={{ repeat: Infinity, duration: pulseDur, ease: 'easeInOut' }}
              />
              {/* Bright inner dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius * 0.35}
                fill="rgba(255,255,255,0.7)"
              />

              {/* Tap target (larger invisible circle for easier tapping) */}
              <circle
                cx={node.x}
                cy={node.y}
                r={Math.max(node.radius * 3, 18)}
                fill="transparent"
              />

              {/* Label on selected + connected nodes */}
              {(isSelected || (selectedIndex !== null && isConnected)) && (
                <motion.text
                  x={node.x}
                  y={node.y + node.radius + 14}
                  textAnchor="middle"
                  fill={isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)'}
                  fontSize={isSelected ? 10 : 9}
                  fontWeight={isSelected ? 600 : 400}
                  initial={{ opacity: 0, y: node.y + node.radius + 8 }}
                  animate={{ opacity: 1, y: node.y + node.radius + 14 }}
                  transition={{ duration: 0.2 }}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.fact.fact_label.length > 18
                    ? node.fact.fact_label.slice(0, 16) + '…'
                    : node.fact.fact_label}
                </motion.text>
              )}
            </motion.g>
          );
        })}
        </g>
      </svg>

      {/* Zoomable overlay (particles + centre core) */}
      <div className="absolute inset-0 pointer-events-none" style={domTransformStyle}>
      {/* Floating ambient particles */}
      {particles.map((p) => (
        <motion.div
          key={`particle-${p.id}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: p.x,
            top: p.y,
            background: `rgba(${p.color},${p.opacity})`,
            boxShadow: `0 0 ${p.size * 3}px rgba(${p.color},${p.opacity * 0.5})`,
          }}
          animate={{
            y: [0, -30 - p.id * 2, 0],
            x: [0, (p.id % 2 === 0 ? 1 : -1) * 15, 0],
            opacity: [p.opacity, p.opacity * 0.3, p.opacity],
          }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Centre core */}
      {facts.length > 0 && (
        <div className="absolute pointer-events-none" style={{ left: cx - 12, top: cy - 12 }}>
          <motion.div
            className="w-6 h-6 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(16,185,129,0.3) 60%, transparent 100%)',
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          />
        </div>
      )}
      </div>{/* end zoomable overlay */}

      {/* Tooltip card for selected node */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute pointer-events-auto z-20"
            style={{ left: tooltipPos.x, top: tooltipPos.y, maxWidth: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-xl border border-white/10 bg-background/90 backdrop-blur-xl shadow-2xl px-3 py-2.5">
              {/* Category badge + close */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{
                    color: CATEGORY_COLORS[selectedNode.fact.fact_category].fill,
                    backgroundColor: `rgba(${CATEGORY_COLORS[selectedNode.fact.fact_category].rgb},0.15)`,
                  }}
                >
                  {CATEGORY_COLORS[selectedNode.fact.fact_category].label}
                </span>
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {/* Fact label */}
              <p className="text-xs font-semibold text-foreground leading-tight">
                {selectedNode.fact.fact_label}
              </p>
              {/* Fact value */}
              <p className="text-[11px] text-foreground/60 mt-0.5 leading-snug line-clamp-2">
                {selectedNode.fact.fact_value}
              </p>
              {/* Connection count */}
              {connectedIndices.size > 0 && (
                <p className="text-[9px] text-foreground/30 mt-1.5">
                  {connectedIndices.size} connected memor{connectedIndices.size === 1 ? 'y' : 'ies'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category legend */}
      {facts.length > 0 && activeCategories.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none"
        >
          {activeCategories.map((cat) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat].fill }}
              />
              <span className="text-[9px] text-foreground/40">
                {CATEGORY_COLORS[cat].label}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Empty state */}
      {showEmptyState && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="rounded-full border border-accent/20"
            animate={{
              width: [80, 100, 80],
              height: [80, 100, 80],
              borderColor: [
                'rgba(16,185,129,0.15)',
                'rgba(139,92,246,0.3)',
                'rgba(16,185,129,0.15)',
              ],
              boxShadow: [
                '0 0 20px rgba(16,185,129,0.05)',
                '0 0 40px rgba(139,92,246,0.15)',
                '0 0 20px rgba(16,185,129,0.05)',
              ],
            }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          />
          <motion.p
            className="text-xs text-muted-foreground/60 mt-4"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            Your memories will appear here
          </motion.p>
        </div>
      )}

      {/* Reset zoom button */}
      <AnimatePresence>
        {isZoomed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={resetZoom}
            className="absolute bottom-2 left-2 z-20 flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm border border-white/10 px-2 py-1 text-[10px] text-foreground/60 hover:text-foreground/90 transition-colors pointer-events-auto"
          >
            <Minimize2 className="w-3 h-3" />
            Reset
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
