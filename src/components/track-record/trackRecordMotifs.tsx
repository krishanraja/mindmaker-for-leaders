// Track Record motifs - the shared SVG glyph family for the You tab, faithful to
// prototypes/you-2028.html (proofGlyph + sparkline). Tokenised onto ctrl-ds emerald
// (hsl(var(--accent))) with the literal #00D9B6 kept only as a self-contained gradient
// stop fallback inside the SVG (same approach as CategoryMotif). Motion respects
// prefers-reduced-motion via the scoped CSS injected once.

import { useId } from 'react';
import { cn } from '@/lib/utils';

const MOTIF_STYLE_ID = 'ctrl-trackrecord-motif-styles';
const MOTIF_CSS = `
@keyframes ctrlTrBreathe { 0%,100%{ opacity:.45 } 50%{ opacity:1 } }
@keyframes ctrlTrBreatheBig { 0%,100%{ opacity:.25; transform:scale(.96) } 50%{ opacity:.7; transform:scale(1.04) } }
@keyframes ctrlTrDraw { to{ stroke-dashoffset:0 } }
.ctrl-tr-breathe{ animation:ctrlTrBreathe 4.2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
.ctrl-tr-breatheBig{ animation:ctrlTrBreatheBig 5.5s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
.ctrl-tr-draw{ stroke-dasharray:var(--len,400); stroke-dashoffset:var(--len,400); animation:ctrlTrDraw 2.6s ease-out forwards; }
@media (prefers-reduced-motion: reduce){
  .ctrl-tr-breathe, .ctrl-tr-breatheBig, .ctrl-tr-draw{ animation:none !important; stroke-dashoffset:0 !important; }
}
`;

function ensureMotifStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MOTIF_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = MOTIF_STYLE_ID;
  el.textContent = MOTIF_CSS;
  document.head.appendChild(el);
}

/**
 * The cold-state proof glyph: bars rising + a drawn calibration line + a sealed
 * check. It visually IS "judgment proven over time" - the inviting centrepiece of
 * the cold promise, never a scoreboard of zeros.
 */
export function ProofGlyph({ className }: { className?: string }) {
  ensureMotifStyles();
  const uid = useId().replace(/:/g, '');
  const bars: [number, number][] = [
    [72, 104],
    [110, 92],
    [148, 98],
    [186, 72],
    [224, 58],
    [262, 40],
  ];
  return (
    <svg
      className={cn('block h-full w-full', className)}
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`g${uid}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#00D9B6" stopOpacity=".55" />
          <stop offset="100%" stopColor="#00D9B6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ln${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a8e7a" />
          <stop offset="100%" stopColor="#00D9B6" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="80" r="74" fill={`url(#g${uid})`} className="ctrl-tr-breatheBig" />
      <line x1="46" y1="128" x2="288" y2="128" stroke="#2b3340" strokeWidth="1" strokeLinecap="round" />
      <g className="ctrl-tr-breathe">
        {bars.map((b, i) => (
          <rect
            key={i}
            x={b[0] - 10}
            y={b[1]}
            width="20"
            height={128 - b[1]}
            rx="3"
            fill={i >= 4 ? `url(#ln${uid})` : '#16323a'}
            opacity={0.5 + i * 0.08}
          />
        ))}
      </g>
      <path
        className="ctrl-tr-draw"
        style={{ ['--len' as string]: '300' }}
        fill="none"
        stroke="#00D9B6"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M72 100 L110 90 L148 94 L186 68 L224 54 L268 34"
      />
      <circle cx="268" cy="34" r="13" fill="#0a0e13" stroke="#00D9B6" strokeWidth="2.4" className="ctrl-tr-breathe" />
      <path fill="none" stroke="#00D9B6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" d="M262 34 l5 5 l8 -9" />
      <circle cx="72" cy="100" r="3" fill="#00D9B6" />
    </svg>
  );
}

/**
 * The calibration sparkline (rich only). Renders a REAL series of read-rate points
 * passed in (0..1 each, oldest -> newest); never a fabricated curve. The page only
 * mounts this when there are enough scored calls to draw an honest line.
 */
export function CalibrationSparkline({ points, className }: { points: number[]; className?: string }) {
  ensureMotifStyles();
  const uid = useId().replace(/:/g, '');
  // Map the 0..1 rates into the 240x58 viewBox (y inverted; 1.0 near the top).
  const n = points.length;
  if (n < 2) return null;
  const x0 = 8;
  const x1 = 232;
  const yTop = 12;
  const yBot = 50;
  const mapped = points.map((p, i) => {
    const x = x0 + (i / (n - 1)) * (x1 - x0);
    const clamped = Math.max(0, Math.min(1, p));
    const y = yBot - clamped * (yBot - yTop);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
  });
  const d = mapped.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const area = `M${x0} 54 ${mapped.map((p) => `L${p[0]} ${p[1]}`).join(' ')} L${x1} 54 Z`;
  const end = mapped[mapped.length - 1];
  return (
    <svg
      className={cn('block h-full w-full', className)}
      viewBox="0 0 240 58"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`gsp${uid}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#00D9B6" stopOpacity=".55" />
          <stop offset="100%" stopColor="#00D9B6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`lnsp${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a8e7a" />
          <stop offset="100%" stopColor="#00D9B6" />
        </linearGradient>
      </defs>
      <line x1="8" y1="54" x2="232" y2="54" stroke="#22262e" strokeWidth="1" />
      <path d={area} fill={`url(#gsp${uid})`} opacity=".45" />
      <path
        d={d}
        fill="none"
        stroke={`url(#lnsp${uid})`}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ctrl-tr-draw"
        style={{ ['--len' as string]: '320' }}
      />
      <circle cx={end[0]} cy={end[1]} r="8" fill="#00D9B6" opacity=".2" className="ctrl-tr-breatheBig" />
      <circle cx={end[0]} cy={end[1]} r="3.6" fill="#aef6ea" />
    </svg>
  );
}
