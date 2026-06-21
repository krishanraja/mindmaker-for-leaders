import { type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * MobilePageTransition: the mobile twin of PageTransition (desktop). The calm
 * cross-fade that makes moving between tabs read as one instrument shifting its
 * focus, not a hard cut between separate apps (CTRL-SYSTEM-SPEC.md 3.4 - "one
 * continuous feel").
 *
 * It wraps ONLY the routed <main> content inside MobileFrame. The shared mobile
 * chrome (AppHeader + BottomNav) lives OUTSIDE this wrapper, in the grid frame,
 * so the chrome stays mounted and only the content cross-fades. The bottom nav
 * therefore does NOT jump or re-mount on a tab switch - the exact problem that
 * blocked adding a mobile transition before the shell was extracted. Keep that
 * contract: never place persistent chrome inside this component.
 *
 * Layout-safety - the wrapper inherits the <main> row's bounds and adds NO
 * height and NO scroll of its own:
 *   - fit pages (main is overflow-hidden): the wrapper is a
 *     `flex h-full min-h-0 min-w-0 flex-col` column so its child can fill and
 *     bound itself to the viewport, exactly like the desktop PageTransition.
 *   - scrolling pages (main is overflow-y-auto): the wrapper is a plain
 *     `w-full` block with NO height cap, so the page's content flows at its
 *     natural height and <main> remains the single scroll region. A height cap
 *     here would silently break the scroll, so we never add one.
 * With `mode="wait"` only one frame is mounted at a time (the old one fully
 * exits before the new one enters), so there is no overlap reflow.
 *
 * Reduced motion: when `prefers-reduced-motion: reduce` is set we render the
 * content with no animation at all (instant swap), honoring the OS setting.
 */
export function MobilePageTransition({
  children,
  scroll = false,
}: {
  children: ReactNode;
  /** Mirror MobileFrame's `scroll`: true = <main> scrolls, so do not cap height. */
  scroll?: boolean;
}) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Key by pathname only (not search): switching ?view= on the same page is an
  // in-place content change, not a tab move, and should not cross-fade.
  const routeKey = location.pathname;

  const wrapperClass = scroll
    ? 'w-full min-w-0'
    : 'flex h-full min-h-0 min-w-0 flex-col';

  if (prefersReducedMotion) {
    return <div className={wrapperClass}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={cn(wrapperClass)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
