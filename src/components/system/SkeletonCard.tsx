// SkeletonCard - the reusable, branded in-shell loading primitive.
//
// CTRL-SYSTEM-SPEC s6: "No raw spinners: loading is purposeful, branded,
// anticipatory." This is the shared shimmer + skeleton-card family every surface
// reuses for its loading state, so loading reads as the SAME instrument warming
// up, not a black void with a spinner.
//
// Faithful to prototypes/home-2028.html (.sk / .skcard / .loadcap): an emerald
// shimmer sweeping a deep card, a motif-band header with a light sweep, and a
// "LoadingCaption" that says what is coming (anticipatory, feels like progress).
//
// Tokens only (ctrl-ds emerald + the deep surfaces). Motion respects
// prefers-reduced-motion via the scoped CSS below.

import { cn } from '@/lib/utils';

const SKELETON_STYLE_ID = 'ctrl-skeleton-styles';
const SKELETON_CSS = `
@keyframes ctrlSkShimmer { 0%{ background-position:-160% 0 } 100%{ background-position:160% 0 } }
@keyframes ctrlSkSweep { 0%{ transform:translateX(-10%) } 100%{ transform:translateX(110%) } }
@keyframes ctrlSkDot { 0%,100%{ opacity:.3; transform:translateY(0) } 50%{ opacity:1; transform:translateY(-2px) } }
.ctrl-sk{ background:linear-gradient(90deg,#12161d 25%,#1b212b 50%,#12161d 75%); background-size:220% 100%;
  animation:ctrlSkShimmer 1.5s ease-in-out infinite; border-radius:7px; }
.ctrl-sk-hero::after{ content:""; position:absolute; inset:0;
  background:linear-gradient(105deg, transparent 40%, color-mix(in srgb, hsl(var(--accent)) 10%, transparent) 50%, transparent 60%);
  width:55%; animation:ctrlSkSweep 1.6s ease-in-out infinite; }
.ctrl-sk-dot{ animation:ctrlSkDot 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce){
  .ctrl-sk, .ctrl-sk-hero::after, .ctrl-sk-dot{ animation:none !important; }
}
`;

function ensureSkeletonStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SKELETON_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = SKELETON_STYLE_ID;
  el.textContent = SKELETON_CSS;
  document.head.appendChild(el);
}

/** A single shimmering bar. Width/height via className. */
export function SkeletonBar({ className }: { className?: string }) {
  ensureSkeletonStyles();
  return <span className={cn('ctrl-sk block', className)} aria-hidden="true" />;
}

export interface SkeletonCardProps {
  /** lead = the wide desktop hero proportions; feed = the mobile/tile size. */
  variant?: 'feed' | 'lead' | 'tile';
  className?: string;
}

/**
 * A branded skeleton card: a motif-band header (with the emerald sweep) + a
 * shimmering topline, headline, and meta. Mirrors the real headline card so the
 * loading state previews the shape of what is coming.
 */
export function SkeletonCard({ variant = 'feed', className }: SkeletonCardProps) {
  ensureSkeletonStyles();
  const isLead = variant === 'lead';
  const heroH = isLead ? 'h-[170px]' : variant === 'tile' ? 'h-[112px]' : 'h-[128px]';
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-[18px] border border-border',
        'bg-[linear-gradient(180deg,#0e131b,#0a0e12)]',
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          'ctrl-sk-hero ctrl-motif-band relative overflow-hidden',
          heroH,
        )}
      />
      <div className="flex flex-col gap-[11px] p-[15px_17px_16px]">
        <div className="flex justify-between">
          <SkeletonBar className="h-[11px] w-[42%]" />
          <SkeletonBar className="h-[11px] w-[18%]" />
        </div>
        <SkeletonBar className="h-[15px] w-[94%]" />
        <SkeletonBar className="h-[15px] w-[72%]" />
        <SkeletonBar className="h-[10px] w-[88%]" />
        <div className="mt-1 flex">
          <SkeletonBar className="h-[9px] w-[34%]" />
        </div>
      </div>
    </div>
  );
}

/**
 * LoadingCaption - the anticipatory caption under a skeleton ("Reading the market
 * and your world"), with a three-dot pulse. Reusable wherever a surface warms up.
 */
export function LoadingCaption({ children }: { children: React.ReactNode }) {
  ensureSkeletonStyles();
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-muted-foreground">
      <span className="inline-flex gap-[3px]">
        <span className="ctrl-sk-dot h-1 w-1 rounded-full bg-accent" />
        <span className="ctrl-sk-dot h-1 w-1 rounded-full bg-accent" style={{ animationDelay: '.18s' }} />
        <span className="ctrl-sk-dot h-1 w-1 rounded-full bg-accent" style={{ animationDelay: '.36s' }} />
      </span>
      {children}
    </div>
  );
}
