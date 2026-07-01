/**
 * DecisionSpider - the Decisions tab's radial "force spider".
 *
 * The decision sits at the optical centre (a confidence gauge); the SAME six AI-native forces
 * spider out at FIXED positions, each captioned with this decision's specific concern and coloured
 * by health (green holds up / amber shaky / grey only-you-can-call). You read where the decision is
 * strong or weak in one glance, then tap a force to interrogate it.
 *
 * Ports the proven structure of the Brain canvas (BrainGraph.tsx): a ResizeObserver-driven,
 * aspect-corrected viewBox recomputed every render (computeSpiderViewBox) so the star stays
 * optically centred at any size; Bezier hub->force spokes; framer-motion node entry + selection
 * halo; the two-step `peekFirst` tap on mobile; and full reduced-motion support. Simplified to a
 * fixed six-node star (no zoom, no cross-edges, no legend). Everything is SVG so it scales cleanly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DecisionClaim, Dimension } from '@/hooks/useDecisionEngine';
import { buildSpider, computeSpiderViewBox, FORCE_HEALTH_STYLE, type Force } from './decisionSpiderModel';

interface DecisionSpiderProps {
  claims: DecisionClaim[];
  forceLabels?: Partial<Record<Dimension, string>> | null;
  /** confidence 0-100, or null while running / unknown */
  pct: number | null;
  selectedKey: Dimension | null;
  onSelect: (key: Dimension | null) => void;
  /** tapping the centre gauge (parent wires this to unfold the full answer) */
  onCenterTap?: () => void;
  /** two-step tap on mobile: first tap peeks the caption, second opens the drawer */
  peekFirst?: boolean;
  className?: string;
}

export function DecisionSpider({
  claims,
  forceLabels,
  pct,
  selectedKey,
  onSelect,
  onCenterTap,
  peekFirst = false,
  className,
}: DecisionSpiderProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1, h: 1 });
  const reduceMotion = useReducedMotion();

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

  const spider = useMemo(() => buildSpider(claims, forceLabels), [claims, forceLabels]);
  const vb = useMemo(() => computeSpiderViewBox(spider, box.w, box.h), [spider, box.w, box.h]);
  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  // Local mobile "peek": first tap reveals the caption prompt, second commits selection.
  const [peekKey, setPeekKey] = useState<Dimension | null>(null);
  const activeKey = selectedKey ?? peekKey;

  const handleNodeClick = useCallback(
    (key: Dimension) => {
      if (peekFirst) {
        if (peekKey === key) {
          setPeekKey(null);
          onSelect(key);
        } else {
          setPeekKey(key);
        }
        return;
      }
      onSelect(selectedKey === key ? null : key);
    },
    [peekFirst, peekKey, selectedKey, onSelect],
  );

  const hub = spider.center;
  // Confidence ring geometry for the centre (drawn in SVG so it scales with the graph).
  const ringR = hub.r - 4;
  const ringC = 2 * Math.PI * ringR;
  const ringOff = pct != null ? ringC * (1 - pct / 100) : ringC;

  return (
    <div
      ref={wrapRef}
      className={cn('absolute inset-0', className)}
      style={{ touchAction: 'none' }}
      onClick={() => { if (peekFirst) setPeekKey(null); }}
    >
      <svg
        className="absolute inset-0 block h-full w-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Your decision and the forces it rests on"
      >
        <defs>
          <filter id="spider-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ===== spokes: decision -> each force, coloured by that force's health ===== */}
        <g>
          {spider.forces.map((f) => {
            const style = FORCE_HEALTH_STYLE[f.health];
            const strong = f.health === 'green';
            const mx = (hub.x + f.x) / 2;
            const my = (hub.y + f.y) / 2 - 12;
            return (
              <motion.path
                key={`spoke-${f.key}`}
                d={`M ${hub.x} ${hub.y} Q ${mx} ${my} ${f.x} ${f.y}`}
                fill="none"
                stroke={style.hsl}
                strokeWidth={strong ? 1.8 : 1.2}
                strokeOpacity={f.health === 'grey' ? 0.28 : strong ? 0.5 : 0.42}
                strokeDasharray={strong ? undefined : '4 5'}
                strokeLinecap="round"
                initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            );
          })}
        </g>

        {/* ===== force nodes ===== */}
        <g>
          {spider.forces.map((f, i) => {
            const style = FORCE_HEALTH_STYLE[f.health];
            const isSelected = activeKey === f.key;
            const dimmed = activeKey !== null && !isSelected;
            const isPeek = peekFirst && peekKey === f.key && selectedKey !== f.key;
            const solid = f.health !== 'grey';
            return (
              <motion.g
                key={f.key}
                style={{ cursor: 'pointer' }}
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: dimmed ? 0.32 : 1 }}
                transition={{ duration: 0.4, delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.4), type: 'spring', stiffness: 190 }}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(f.key); }}
              >
                {isSelected && (
                  <motion.circle
                    cx={f.x} cy={f.y} r={f.r * 2.1} fill="none" stroke={style.hsl} strokeWidth={1.3} strokeDasharray="3 4"
                    animate={reduceMotion ? undefined : { rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                    style={{ transformOrigin: `${f.x}px ${f.y}px` }}
                  />
                )}
                <circle cx={f.x} cy={f.y} r={f.r + 6} fill={style.hsl} fillOpacity={0.12} />
                <circle
                  cx={f.x} cy={f.y} r={f.r} fill={style.hsl} fillOpacity={solid ? 0.92 : 0.4}
                  filter="url(#spider-glow)"
                  stroke={solid ? 'hsl(0 0% 100% / 0.25)' : 'hsl(217 12% 59% / 0.6)'}
                  strokeWidth={1} strokeDasharray={solid ? undefined : '2.5 2.5'}
                />
                {/* generous transparent tap target */}
                <circle cx={f.x} cy={f.y} r={Math.max(f.r * 2.2, 20)} fill="transparent" />
                {/* the caption (this decision's specific concern), always shown so the shape reads at a glance */}
                <text
                  x={f.x} y={f.y + f.r + 13} textAnchor="middle" dominantBaseline="middle"
                  fill={isSelected ? '#eef1f5' : 'hsl(215 14% 72%)'}
                  fontSize={11} fontWeight={isSelected ? 700 : 600}
                  style={{ pointerEvents: 'none' }}
                >
                  {f.caption.length > 18 ? f.caption.slice(0, 16) + '...' : f.caption}
                </text>
                {isPeek && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect x={f.x - 52} y={f.y + f.r + 20} width={104} height={17} rx={8.5} fill="hsl(171 100% 50% / 0.14)" stroke="hsl(171 100% 55% / 0.5)" strokeWidth={1} />
                    <text x={f.x} y={f.y + f.r + 28.5} textAnchor="middle" dominantBaseline="central" fill="hsl(171 100% 72%)" fontSize={9} fontWeight={700}>
                      Tap again to open
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}
        </g>

        {/* ===== centre: the decision, as a confidence gauge (tap to read the full answer) ===== */}
        <g style={{ cursor: onCenterTap ? 'pointer' : 'default' }} onClick={(e) => { e.stopPropagation(); onCenterTap?.(); }}>
          <circle cx={hub.x} cy={hub.y} r={hub.r + 5} fill="hsl(var(--accent) / 0.08)" />
          <circle cx={hub.x} cy={hub.y} r={hub.r} fill="hsl(220 30% 8%)" stroke="hsl(var(--accent) / 0.4)" strokeWidth={1} />
          {/* faint track + confidence arc */}
          <circle cx={hub.x} cy={hub.y} r={ringR} fill="none" stroke="hsl(var(--foreground) / 0.09)" strokeWidth={3.5} />
          <motion.circle
            cx={hub.x} cy={hub.y} r={ringR} fill="none" stroke="hsl(var(--accent))" strokeWidth={3.5} strokeLinecap="round"
            transform={`rotate(-90 ${hub.x} ${hub.y})`}
            strokeDasharray={ringC}
            initial={reduceMotion ? false : { strokeDashoffset: ringC }}
            animate={{ strokeDashoffset: ringOff }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ filter: 'drop-shadow(0 0 4px hsl(var(--accent) / 0.6))' }}
          />
          <text x={hub.x} y={hub.y - 3} textAnchor="middle" dominantBaseline="central" fill="hsl(var(--accent))" fontSize={17} fontWeight={800} style={{ pointerEvents: 'none' }}>
            {pct != null ? pct : '?'}
          </text>
          <text x={hub.x} y={hub.y + 11} textAnchor="middle" dominantBaseline="central" fill="hsl(215 14% 60%)" fontSize={7.5} fontWeight={600} letterSpacing={0.4} style={{ pointerEvents: 'none' }}>
            HOW SURE
          </text>
        </g>
      </svg>
    </div>
  );
}
