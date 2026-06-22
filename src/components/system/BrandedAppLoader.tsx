// BrandedAppLoader - the ONE in-shell, anticipatory loading experience for the
// whole app shell (SPA boot, auth resolving, lazy-route Suspense fallbacks).
//
// CTRL-SYSTEM-SPEC s6: "No raw spinners: loading is purposeful, branded,
// anticipatory (it tells you what is coming and feels like progress)." This
// replaces every bare emerald spinner on black with the brand lockup over a
// settling chrome skeleton, so a route load reads as the SAME instrument warming
// up - never a black void with a spinner.
//
// Tokens only (ctrl-ds: deep surfaces + emerald accent). Motion is gated on
// prefers-reduced-motion via the scoped CSS below (and the shared SkeletonCard
// shimmer, which is itself reduced-motion aware).

import { BrandLockup } from '@/components/landing/BrandLockup';
import { SkeletonBar } from '@/components/system/SkeletonCard';

const LOADER_STYLE_ID = 'ctrl-app-loader-styles';
const LOADER_CSS = `
@keyframes ctrlLoaderPulse { 0%,100%{ opacity:.45 } 50%{ opacity:1 } }
@keyframes ctrlLoaderDot { 0%,100%{ opacity:.3; transform:translateY(0) } 50%{ opacity:1; transform:translateY(-2px) } }
.ctrl-loader-lockup{ animation:ctrlLoaderPulse 1.7s ease-in-out infinite; }
.ctrl-loader-dot{ animation:ctrlLoaderDot 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce){
  .ctrl-loader-lockup, .ctrl-loader-dot{ animation:none !important; }
}
`;

function ensureLoaderStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(LOADER_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = LOADER_STYLE_ID;
  el.textContent = LOADER_CSS;
  document.head.appendChild(el);
}

interface BrandedAppLoaderProps {
  /** The anticipatory line under the lockup - says what is coming. */
  caption?: string;
  /** Render full-viewport fixed (SPA boot / auth gate) vs filling its parent
      (an in-shell route Suspense fallback). */
  fullscreen?: boolean;
}

/**
 * The branded, anticipatory app-shell loader. A pulsing brand lockup over a calm
 * chrome skeleton (a faux header rule + a few settling lines) and a three-dot
 * anticipatory caption. Deep ctrl-ds surface, emerald accent, reduced-motion safe.
 */
export function BrandedAppLoader({
  caption = 'Bringing your workspace up',
  fullscreen = false,
}: BrandedAppLoaderProps) {
  ensureLoaderStyles();

  return (
    <div
      className={
        (fullscreen ? 'fixed inset-0 z-[150] ' : 'h-full w-full ') +
        'flex flex-col items-center justify-center gap-7 bg-[linear-gradient(180deg,#0a0e12,#070a0d)] px-6'
      }
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* The brand, pulsing - the instrument is warming up. */}
      <div className="ctrl-loader-lockup">
        <BrandLockup className="h-6" />
      </div>

      {/* A calm chrome skeleton: a header rule and a few settling lines, so the
          load previews the shape of a surface rather than spinning in a void. */}
      <div className="flex w-full max-w-[320px] flex-col gap-3.5" aria-hidden="true">
        <SkeletonBar className="h-[10px] w-[38%]" />
        <SkeletonBar className="h-[14px] w-[92%]" />
        <SkeletonBar className="h-[14px] w-[68%]" />
        <SkeletonBar className="mt-1 h-[9px] w-[46%]" />
      </div>

      {/* The anticipatory caption with a three-dot pulse: tells you what is
          coming, so the wait feels like progress. */}
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="inline-flex gap-[3px]" aria-hidden="true">
          <span className="ctrl-loader-dot h-1 w-1 rounded-full bg-accent" />
          <span className="ctrl-loader-dot h-1 w-1 rounded-full bg-accent" style={{ animationDelay: '.18s' }} />
          <span className="ctrl-loader-dot h-1 w-1 rounded-full bg-accent" style={{ animationDelay: '.36s' }} />
        </span>
        {caption}
      </div>
    </div>
  );
}
