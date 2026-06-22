/**
 * DecisionOrb - the branded "pressure-testing" instrument.
 *
 * Faithful to prototypes/decisions-2028.html (.orb): concentric counter-rotating
 * rings around a breathing core with a balanced scale glyph and a halo glow. This
 * is the calm, anticipatory thinking state the running pipeline orbits, NOT a
 * spinner. All emerald from ctrl-ds tokens (hsl(var(--accent))); motion respects
 * prefers-reduced-motion via the scoped CSS below.
 */

const ORB_STYLE_ID = 'ctrl-decision-orb-styles';
const ORB_CSS = `
@keyframes ctrlOrbSpin { to { transform: rotate(360deg); } }
@keyframes ctrlOrbSpinRev { to { transform: rotate(-360deg); } }
@keyframes ctrlOrbCore { 0%,100% { opacity:.85; transform:scale(.94); } 50% { opacity:1; transform:scale(1.06); } }
@keyframes ctrlOrbHalo { 0%,100% { opacity:.25; transform:scale(.96); } 50% { opacity:.7; transform:scale(1.04); } }
.ctrl-orb-r1 { animation: ctrlOrbSpin 14s linear infinite; transform-origin: center; transform-box: fill-box; }
.ctrl-orb-r2 { animation: ctrlOrbSpinRev 22s linear infinite; transform-origin: center; transform-box: fill-box; }
.ctrl-orb-core { animation: ctrlOrbCore 2.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.ctrl-orb-halo { animation: ctrlOrbHalo 3.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
@media (prefers-reduced-motion: reduce) {
  .ctrl-orb-r1, .ctrl-orb-r2, .ctrl-orb-core, .ctrl-orb-halo { animation: none !important; }
}
`;

function ensureOrbStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ORB_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = ORB_STYLE_ID;
  el.textContent = ORB_CSS;
  document.head.appendChild(el);
}

export function DecisionOrb({ size = 132 }: { size?: number }) {
  ensureOrbStyles();
  return (
    <div style={{ width: size, height: size }} className="relative" aria-hidden="true">
      <svg viewBox="0 0 132 132" fill="none" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="ctrlOrbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ctrlOrbLine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--accent) / 0.55)" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <circle className="ctrl-orb-halo" cx="66" cy="66" r="58" fill="url(#ctrlOrbGlow)" />
        <circle cx="66" cy="66" r="52" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />
        <circle
          className="ctrl-orb-r1"
          cx="66"
          cy="66"
          r="52"
          stroke="url(#ctrlOrbLine)"
          strokeWidth="2.4"
          fill="none"
          strokeDasharray="70 256"
          strokeLinecap="round"
        />
        <circle
          className="ctrl-orb-r2"
          cx="66"
          cy="66"
          r="40"
          stroke="hsl(var(--accent) / 0.4)"
          strokeWidth="1.6"
          fill="none"
          strokeDasharray="40 210"
          strokeLinecap="round"
        />
        <g className="ctrl-orb-core">
          <circle cx="66" cy="66" r="17" fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth="1.5" />
          <path
            d="M58 60v12M74 60v12M58 64l9 4 7-4M58 72a4 4 0 0 0 8 0M74 64l3 9a2.4 2.4 0 0 1-5 0z"
            stroke="hsl(var(--accent) / 0.85)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
        <circle cx="66" cy="14" r="3" fill="hsl(var(--accent) / 0.9)" />
      </svg>
    </div>
  );
}
