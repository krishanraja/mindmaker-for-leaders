// CategoryMotif - the branded hero band art for a news headline card.
//
// One coherent family of nine abstract emerald-on-dark instrument visuals, one
// per news category (docs/MAIN-APP-POLISH-SPEC.md s2.2). Ported faithfully from
// the founder-approved prototype `prototypes/news-headline-cards.html`: same
// stroke language, same soft glow, same calm ambient motion. These are authored
// art, NOT icons-in-a-circle.
//
// COLOUR: the prototype hardcodes the emerald hex; here the strokes/fills use the
// app's emerald via a CSS variable (`--motif-accent`) seeded from the real token
// (hsl(var(--accent)) === #00D9B6, src/index.css) so the app theme stays the
// source of truth. The bright accent ink (#aef6ea) is the app's
// --ctrl-accent-ink-bright token (src/index.css).
//
// MOTION: ambient only (slow drift / breathe / draw / spin). All of it is
// disabled under `prefers-reduced-motion: reduce` (the media query in the
// scoped <style> sets every animation to none).

import { useId } from 'react';
import type { NewsCategoryId } from '@/types/newsCategory';

// Scoped styles for the motif family. Injected once (keyed by a constant id so a
// page with many cards still ships a single copy). Animations honour reduced motion.
const MOTIF_STYLE_ID = 'category-motif-styles';
const MOTIF_CSS = `
.ctrl-motif{ display:block; width:100%; height:100%;
  --motif-accent: hsl(var(--accent));
  --motif-ink: var(--ctrl-accent-ink-bright, #aef6ea); }
.ctrl-motif .stroke{ fill:none; stroke:var(--motif-accent); stroke-linecap:round; stroke-linejoin:round; }
.ctrl-motif .faint{ stroke:var(--ctrl-motif-faint, #2b3340); }
.ctrl-motif .dim{ stroke:color-mix(in srgb, var(--motif-accent) 40%, transparent); }
.ctrl-motif .glow-dot{ fill:var(--motif-accent); }

@keyframes ctrlMotifDrift { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-3px) } }
@keyframes ctrlMotifBreathe { 0%,100%{ opacity:.45 } 50%{ opacity:1 } }
@keyframes ctrlMotifBreatheBig { 0%,100%{ opacity:.25; transform:scale(.96) } 50%{ opacity:.7; transform:scale(1.04) } }
@keyframes ctrlMotifDraw { to{ stroke-dashoffset:0 } }
@keyframes ctrlMotifSpin { to{ transform:rotate(360deg) } }
@keyframes ctrlMotifSweep { 0%{ transform:translateX(-10%) } 100%{ transform:translateX(110%) } }
@keyframes ctrlMotifFlick { 0%,92%,100%{ opacity:1 } 96%{ opacity:.35 } }

.ctrl-motif .m-breathe{ animation:ctrlMotifBreathe 4.2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
.ctrl-motif .m-breatheBig{ animation:ctrlMotifBreatheBig 5s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
.ctrl-motif .m-drift{ animation:ctrlMotifDrift 6s ease-in-out infinite; transform-box:fill-box; }
.ctrl-motif .m-spin{ animation:ctrlMotifSpin 26s linear infinite; transform-box:fill-box; transform-origin:center; }
.ctrl-motif .m-draw{ stroke-dasharray:var(--len,400); stroke-dashoffset:var(--len,400); animation:ctrlMotifDraw 2.6s ease-out forwards; }
.ctrl-motif .m-flick{ animation:ctrlMotifFlick 5s ease-in-out infinite; }

.ctrl-motif-band{ position:relative; overflow:hidden; background:
    radial-gradient(120% 130% at 80% -10%, color-mix(in srgb, hsl(var(--accent)) 10%, transparent), transparent 60%),
    linear-gradient(180deg,var(--ctrl-surface-deep-1,#0d1218) 0%, var(--ctrl-surface-deep-2,#0a0e13) 100%); }
.ctrl-motif-band::after{ content:""; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(105deg, transparent 38%, color-mix(in srgb, hsl(var(--accent)) 6%, transparent) 50%, transparent 62%);
  width:60%; animation:ctrlMotifSweep 9s ease-in-out infinite; mix-blend-mode:screen; }

/* the calm row-in for the in-place "rest of what I'm tracking" stream reveal */
@keyframes ctrlStreamRowIn{ to{ opacity:1; transform:none; } }
.ctrl-streamrow-in{ opacity:0; transform:translateY(8px);
  animation:ctrlStreamRowIn .42s cubic-bezier(.22,1,.36,1) forwards; }

@media (prefers-reduced-motion: reduce){
  .ctrl-motif *{ animation:none !important; }
  .ctrl-motif .m-draw{ stroke-dashoffset:0 !important; }
  .ctrl-motif-band::after{ animation:none !important; opacity:0; }
  .ctrl-streamrow-in{ animation:none !important; opacity:1 !important; transform:none !important; }
}
`;

function MotifStyles() {
  // One <style> for the whole family; React dedupes by the constant id attribute
  // is not automatic, so we guard against double-inject at module scope below.
  return <style data-ctrl-motif-styles="">{MOTIF_CSS}</style>;
}

// Ensure the scoped CSS is in the document exactly once, even with many cards.
function ensureMotifStylesInjected() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MOTIF_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = MOTIF_STYLE_ID;
  el.textContent = MOTIF_CSS;
  document.head.appendChild(el);
}

// Shared <defs> (glow filter + emerald gradients), unique per instance so two
// motifs on a page never collide on gradient ids.
function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <radialGradient id={`g${uid}`} cx="50%" cy="40%" r="70%">
        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity=".55" />
        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`ln${uid}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--ctrl-accent-deep, #0a8e7a)" />
        <stop offset="100%" stopColor="hsl(var(--accent))" />
      </linearGradient>
      <filter id={`bl${uid}`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3.2" />
      </filter>
    </defs>
  );
}

// Each motif draws on a 320x150 viewBox, slice-fit into the band. dangerouslySet
// is avoided: the art is authored as JSX so it stays typed + token-driven.
type MotifInner = (uid: string) => JSX.Element;

const MOTIF_ART: Record<NewsCategoryId, MotifInner> = {
  // 1. Model & capability shifts -> a glowing neural core / capability dial
  model: (uid) => (
    <>
      <circle cx="160" cy="75" r="62" fill={`url(#g${uid})`} className="m-breatheBig" />
      <g className="m-spin">
        <circle cx="160" cy="75" r="48" className="stroke faint" strokeWidth="1" />
        <circle cx="160" cy="75" r="48" className="stroke" strokeWidth="2" strokeDasharray="44 256" strokeLinecap="round" />
      </g>
      <g className="m-spin" style={{ animationDuration: '38s', animationDirection: 'reverse' }}>
        <circle cx="160" cy="75" r="34" className="stroke dim" strokeWidth="1.5" strokeDasharray="30 184" />
      </g>
      <g className="m-breathe">
        <path className="stroke dim" strokeWidth="1" d="M160 75 L122 50 M160 75 L198 50 M160 75 L160 33 M160 75 L210 88 M160 75 L116 96" />
        <circle cx="122" cy="50" r="3" className="glow-dot" />
        <circle cx="198" cy="50" r="3" className="glow-dot" />
        <circle cx="160" cy="33" r="3" className="glow-dot" />
        <circle cx="210" cy="88" r="3" className="glow-dot" />
        <circle cx="116" cy="96" r="3" className="glow-dot" />
      </g>
      <circle cx="160" cy="75" r="9" fill="hsl(var(--accent))" filter={`url(#bl${uid})`} />
      <circle cx="160" cy="75" r="6" fill="var(--ctrl-accent-ink-bright,#aef6ea)" />
    </>
  ),

  // 2. AI economics -> a falling cost curve over a meter
  economics: (uid) => (
    <>
      <g strokeWidth="1">
        <line x1="44" y1="118" x2="288" y2="118" className="stroke faint" />
        <line x1="44" y1="30" x2="44" y2="118" className="stroke faint" />
        <line x1="44" y1="58" x2="288" y2="58" className="stroke faint" opacity=".4" />
        <line x1="44" y1="88" x2="288" y2="88" className="stroke faint" opacity=".4" />
      </g>
      <path d="M44 46 C 110 50, 150 92, 210 104 S 270 116, 288 116 L288 118 L44 118 Z" fill={`url(#g${uid})`} opacity=".5" />
      <path className="stroke m-draw" style={{ ['--len' as string]: '300' }} strokeWidth="2.6" d="M44 46 C 110 50, 150 92, 210 104 S 270 116, 288 116" />
      <circle cx="288" cy="116" r="9" fill="hsl(var(--accent))" opacity=".25" className="m-breatheBig" />
      <circle cx="288" cy="116" r="4" className="glow-dot" />
      <g className="m-drift" style={{ animationDuration: '5s' }}>
        <line x1="150" y1="40" x2="150" y2="62" className="stroke dim" strokeWidth="2" />
        <path className="stroke dim" strokeWidth="2" d="M144 56 L150 64 L156 56" />
      </g>
    </>
  ),

  // 3. Tools, platforms & vendors -> a connector lattice / stack
  tools: () => (
    <>
      <g className="m-drift">
        <path className="stroke dim" strokeWidth="1.4" d="M110 44 L210 44 L246 64 L146 64 Z" />
        <path className="stroke" strokeWidth="1.8" d="M104 74 L204 74 L240 94 L140 94 Z" />
        <path className="stroke dim" strokeWidth="1.4" d="M98 104 L198 104 L234 124 L134 124 Z" />
      </g>
      <g className="m-breathe" strokeWidth="1.4">
        <line x1="146" y1="54" x2="140" y2="114" className="stroke" />
        <line x1="178" y1="54" x2="172" y2="114" className="stroke" />
        <line x1="210" y1="54" x2="204" y2="114" className="stroke" />
      </g>
      <g>
        <circle cx="146" cy="54" r="3" className="glow-dot" />
        <circle cx="178" cy="54" r="3" className="glow-dot" />
        <circle cx="210" cy="54" r="3" className="glow-dot" />
        <circle cx="140" cy="114" r="3" className="glow-dot" />
        <circle cx="172" cy="114" r="3" className="glow-dot" />
        <circle cx="204" cy="114" r="3" className="glow-dot" />
      </g>
    </>
  ),

  // 4. Orchestration & agent reliability -> an agent mesh / node graph
  orchestration: (uid) => (
    <>
      <circle cx="160" cy="75" r="56" fill={`url(#g${uid})`} opacity=".5" className="m-breatheBig" />
      <g className="stroke dim m-breathe" strokeWidth="1.2">
        <line x1="160" y1="40" x2="104" y2="66" />
        <line x1="160" y1="40" x2="216" y2="66" />
        <line x1="104" y1="66" x2="132" y2="112" />
        <line x1="216" y1="66" x2="188" y2="112" />
        <line x1="132" y1="112" x2="188" y2="112" />
        <line x1="160" y1="40" x2="160" y2="78" />
        <line x1="104" y1="66" x2="160" y2="78" />
        <line x1="216" y1="66" x2="160" y2="78" />
        <line x1="132" y1="112" x2="160" y2="78" />
        <line x1="188" y1="112" x2="160" y2="78" />
      </g>
      <circle cx="160" cy="78" r="10" fill="hsl(var(--accent))" filter={`url(#bl${uid})`} />
      <circle cx="160" cy="78" r="6.5" fill="var(--ctrl-accent-ink-bright,#aef6ea)" />
      <circle cx="160" cy="40" r="6" fill="var(--ctrl-surface-deep-2, #0a0e13)" stroke="hsl(var(--accent))" strokeWidth="2" />
      <circle cx="104" cy="66" r="6" fill="var(--ctrl-surface-deep-2, #0a0e13)" stroke="hsl(var(--accent))" strokeWidth="2" className="m-flick" />
      <circle cx="216" cy="66" r="6" fill="var(--ctrl-surface-deep-2, #0a0e13)" stroke="hsl(var(--accent))" strokeWidth="2" />
      <circle cx="132" cy="112" r="6" fill="var(--ctrl-surface-deep-2, #0a0e13)" stroke="hsl(var(--accent))" strokeWidth="2" />
      <circle cx="188" cy="112" r="6" fill="var(--ctrl-surface-deep-2, #0a0e13)" stroke="hsl(var(--accent))" strokeWidth="2" className="m-flick" style={{ animationDelay: '2.4s' }} />
    </>
  ),

  // 5. AI-native product & go-to-market -> a packaged launch motif
  product: (uid) => (
    <>
      <circle cx="160" cy="82" r="50" fill={`url(#g${uid})`} opacity=".5" className="m-breatheBig" />
      <g className="m-drift" style={{ animationDuration: '5.5s' }}>
        <path className="stroke" strokeWidth="2" d="M160 50 L196 68 L196 106 L160 124 L124 106 L124 68 Z" />
        <path className="stroke dim" strokeWidth="1.4" d="M124 68 L160 86 L196 68 M160 86 L160 124" />
        <path className="stroke" strokeWidth="2" d="M152 96 l5 5 l11 -12" />
      </g>
      <path className="stroke dim m-draw" style={{ ['--len' as string]: '120' }} strokeWidth="2" d="M196 68 C 224 52, 246 40, 262 30" />
      <path className="stroke" strokeWidth="2" d="M256 30 L262 28 L262 36" />
      <circle cx="262" cy="30" r="3.5" className="glow-dot" />
    </>
  ),

  // 6. Governance, safety & compliance -> a shield / seal
  governance: (uid) => (
    <>
      <circle cx="160" cy="78" r="52" fill={`url(#g${uid})`} opacity=".5" className="m-breatheBig" />
      <g className="m-drift" style={{ animationDuration: '6s' }}>
        <path className="stroke" strokeWidth="2.2" d="M160 32 L206 48 V82 C206 108, 184 122, 160 130 C136 122, 114 108, 114 82 V48 Z" />
        <path className="stroke dim" strokeWidth="1.2" d="M160 44 L194 56 V82 C194 102, 178 113, 160 120 C142 113, 126 102, 126 82 V56 Z" />
        <path className="stroke m-draw" style={{ ['--len' as string]: '60' }} strokeWidth="2.6" d="M146 80 l9 10 l20 -24" />
      </g>
      <g className="m-spin" style={{ animationDuration: '30s' }}>
        <circle cx="160" cy="22" r="2.4" className="glow-dot" />
        <circle cx="220" cy="100" r="2.4" className="glow-dot" opacity=".7" />
        <circle cx="100" cy="100" r="2.4" className="glow-dot" opacity=".7" />
      </g>
    </>
  ),

  // 7. Security & agent risk -> a lock with a hairline fracture
  security: (uid) => (
    <>
      <circle cx="160" cy="80" r="48" fill={`url(#g${uid})`} opacity=".45" className="m-breatheBig" />
      <path className="stroke" strokeWidth="2.4" d="M138 70 V58 a22 22 0 0 1 44 0 V70" />
      <rect x="126" y="70" width="68" height="52" rx="9" className="stroke" strokeWidth="2.2" fill="var(--ctrl-surface-deep-2, #0a0e13)" />
      <circle cx="160" cy="92" r="5" className="stroke" strokeWidth="2" />
      <line x1="160" y1="96" x2="160" y2="108" className="stroke" strokeWidth="2.4" />
      <path className="stroke m-breathe" stroke="hsl(var(--accent))" strokeWidth="1.8" d="M150 70 l6 14 l-8 8 l10 10 l-5 12" opacity=".85" />
      <g className="m-flick">
        <circle cx="156" cy="84" r="1.8" fill="var(--ctrl-accent-ink-bright,#aef6ea)" />
        <circle cx="148" cy="92" r="1.6" fill="var(--ctrl-accent-ink-bright,#aef6ea)" />
        <circle cx="158" cy="102" r="1.6" fill="var(--ctrl-accent-ink-bright,#aef6ea)" />
      </g>
    </>
  ),

  // 8. Org, talent & ways of working -> an org-node / people graph
  org: (uid) => {
    const people: Array<[number, number]> = [
      [160, 46], [110, 92], [210, 92], [86, 114], [134, 114], [186, 114], [234, 114],
    ];
    return (
      <>
        <circle cx="160" cy="50" r="40" fill={`url(#g${uid})`} opacity=".45" className="m-breatheBig" />
        <g className="stroke dim m-breathe" strokeWidth="1.4">
          <path d="M160 56 V74 M160 74 H110 M160 74 H210 M110 74 V90 M210 74 V90" />
          <path d="M110 96 V108 M110 108 H86 M110 108 H134" />
          <path d="M210 96 V108 M210 108 H186 M210 108 H234" />
        </g>
        {people.map((p, i) => (
          <g
            key={i}
            transform={`translate(${p[0]} ${p[1]})`}
            className={i === 0 ? undefined : 'm-drift'}
            style={i === 0 ? undefined : { animationDelay: `${i * 0.4}s`, animationDuration: '6s' }}
          >
            <circle cx="0" cy="-4" r={i === 0 ? 5.5 : 4.4} fill="var(--ctrl-surface-deep-2, #0a0e13)" stroke="hsl(var(--accent))" strokeWidth="2" />
            <path className="stroke" strokeWidth="2" d={`M${i === 0 ? -7 : -6} ${i === 0 ? 7 : 6} a${i === 0 ? 7 : 6} ${i === 0 ? 6 : 5} 0 0 1 ${i === 0 ? 14 : 12} 0`} />
          </g>
        ))}
        <circle cx="160" cy="42" r="2" fill="var(--ctrl-accent-ink-bright,#aef6ea)" />
      </>
    );
  },

  // 9. Proof & adoption -> a rising signal / proof chart with verified ticks
  proof: (uid) => {
    const bars: Array<[number, number]> = [
      [70, 96], [108, 84], [146, 90], [184, 66], [222, 54], [260, 38],
    ];
    return (
      <>
        <g>
          <line x1="40" y1="118" x2="290" y2="118" className="stroke faint" strokeWidth="1" />
          <line x1="40" y1="34" x2="40" y2="118" className="stroke faint" strokeWidth="1" />
        </g>
        <g className="m-breathe">
          {bars.map((b, i) => (
            <rect
              key={i}
              x={b[0] - 9}
              y={b[1]}
              width="18"
              height={118 - b[1]}
              rx="3"
              fill={i >= 4 ? `url(#ln${uid})` : 'var(--ctrl-motif-bar, #16323a)'}
              opacity={0.55 + i * 0.07}
            />
          ))}
        </g>
        <path className="stroke m-draw" style={{ ['--len' as string]: '280' }} strokeWidth="2.4" d="M70 92 L108 82 L146 86 L184 62 L222 50 L266 32" />
        <circle cx="266" cy="32" r="11" fill="var(--ctrl-surface-deep-2, #0a0e13)" stroke="hsl(var(--accent))" strokeWidth="2" className="m-breathe" />
        <path className="stroke" strokeWidth="2.2" d="M261 32 l4 4 l7 -8" />
      </>
    );
  },
};

export interface CategoryMotifProps {
  category: NewsCategoryId;
  className?: string;
}

/**
 * CategoryMotif - render the branded SVG motif for a news category.
 * Driven purely by the category id; tokens come from the app theme. Use inside a
 * `.ctrl-motif-band` hero band (NewsHeadlineCard does this).
 */
export function CategoryMotif({ category, className }: CategoryMotifProps) {
  const uid = useId().replace(/[:]/g, ''); // stable per instance, safe for SVG ids
  ensureMotifStylesInjected();
  const art = MOTIF_ART[category] ?? MOTIF_ART.model;
  return (
    <svg
      className={['ctrl-motif', className].filter(Boolean).join(' ')}
      viewBox="0 0 320 150"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <Defs uid={uid} />
      {art(uid)}
    </svg>
  );
}

// Exported so a preview/fixture can inject the styles eagerly via SSR-safe render.
export { MotifStyles };
