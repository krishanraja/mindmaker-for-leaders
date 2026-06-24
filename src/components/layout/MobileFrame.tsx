import type { ReactNode } from 'react';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { MobilePageTransition } from './MobilePageTransition';
import { useBriefingContext } from '@/contexts/BriefingContext';
import { cn } from '@/lib/utils';

/**
 * When the audio mini-player is showing, it floats `fixed` just above the bottom
 * nav. Reserve that height on the frame so no page's content (a scroll bottom or
 * a pinned shelf) ever hides under it. Padding the grid root shrinks the 1fr
 * <main> from the bottom, lifting every surface uniformly without touching any
 * page's own nav-clearance padding. ~56px = player row (48) + progress + breathing room.
 */
const MINI_PLAYER_CLEARANCE = '56px';

/**
 * MobileFrame: the ONE shared mobile chrome for every authenticated page.
 *
 * This encodes the working pattern that the cockpit home already nails
 * (CockpitView.tsx) and lifts it out of every page so the chrome stops being
 * rebuilt per route. It is the mobile twin of the desktop DesktopShell:
 * persistent header + persistent bottom nav, with only the content zone
 * swapping between routes (CTRL-SYSTEM-SPEC.md 3.1 "one frame", 3.4
 * "persistent chrome + continuous transitions").
 *
 * Structure (a single CSS grid, exactly as CockpitView):
 *
 *   grid h-screen-safe grid-rows-[auto_1fr_auto] overflow-hidden bg-background
 *     row 1 (auto) : AppHeader (+ an optional banner slot)
 *     row 2 (1fr)  : a bounded <main className="min-h-0 ..."> that owns its own
 *                    fit; the cross-fade wraps ONLY this row's children
 *     row 3 (auto) : BottomNav, pinned bottom
 *
 * Because BottomNav is `position: fixed`, the grid's third row collapses to
 * zero and the nav floats over the viewport bottom; pages that need their
 * content to clear the nav pass that clearance via `padding` (matching the
 * `pb-*` they used before), so behaviour is reproduced exactly.
 *
 * The chrome (AppHeader + BottomNav) lives OUTSIDE the transition wrapper, so
 * it stays mounted and does not jump or re-mount on a tab switch. Only the
 * <main> content cross-fades.
 */
interface MobileFrameProps {
  children: ReactNode;
  /**
   * Optional onboarding / status / heading banner rendered in the top row,
   * directly under the AppHeader, so the whole surface still fits one viewport.
   */
  banner?: ReactNode;
  /** Header action: render the Add (+) button and wire its handler. */
  onAdd?: () => void;
  /** Header action: render the Export (arrow) button and wire its handler. */
  onExport?: () => void;
  /**
   * Does the content row scroll? Default false = a fit-to-viewport,
   * no-page-scroll surface (overflow-hidden). Pass true for pages whose
   * content legitimately runs longer than the viewport (the single scroll
   * region is then <main>, never the page frame).
   */
  scroll?: boolean;
  /** Hide the scrollbar on a scrolling main (matches the app's scrollbar-hide). */
  hideScrollbar?: boolean;
  /**
   * Horizontal max-width for the content column. When set, the children are
   * centred in a `mx-auto w-full max-w-*` column. Omit to let children own
   * their own width.
   */
  maxWidth?: string;
  /**
   * Padding utilities applied to <main>. Defaults to the common `px-4`. Pages
   * pass their exact prior padding here (for example the bottom clearance for
   * the fixed nav) so the migrated surface reproduces its old spacing 1:1.
   */
  padding?: string;
  /**
   * Full escape hatch: when a page's <main> classes cannot be expressed by the
   * structured props above without changing its look, pass the exact class
   * string here. It REPLACES the derived main classes (the grid frame, header
   * and nav are still owned by the frame). Use this to guarantee no regression.
   */
  mainClassName?: string;
  /**
   * Extra elements rendered as direct grid children OUTSIDE <main> and the
   * transition (for example a MiniPlayer that must sit above the BottomNav, or
   * page-level sheets / dialogs). Mounted persistently, like the chrome.
   */
  extras?: ReactNode;
}

export function MobileFrame({
  children,
  banner,
  onAdd,
  onExport,
  scroll = false,
  hideScrollbar = false,
  maxWidth,
  padding = 'px-4',
  mainClassName,
  extras,
}: MobileFrameProps) {
  const { isMiniPlayerVisible } = useBriefingContext();
  const derivedMainClass = cn(
    'min-h-0',
    scroll ? 'overflow-y-auto' : 'overflow-hidden',
    scroll && hideScrollbar && 'scrollbar-hide',
    padding,
  );

  return (
    <div
      className="grid h-screen-safe grid-rows-[auto_1fr_auto] overflow-hidden bg-background"
      style={isMiniPlayerVisible ? { paddingBottom: MINI_PLAYER_CLEARANCE } : undefined}
    >
      <div className="min-h-0">
        <AppHeader onAdd={onAdd} onExport={onExport} />
        {banner}
      </div>
      <main className={mainClassName ?? derivedMainClass}>
        <MobilePageTransition scroll={scroll}>
          {maxWidth ? (
            <div className={cn('mx-auto w-full', maxWidth)}>{children}</div>
          ) : (
            children
          )}
        </MobilePageTransition>
      </main>
      {extras}
      <BottomNav />
    </div>
  );
}
