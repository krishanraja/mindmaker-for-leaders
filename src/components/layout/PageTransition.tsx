import { type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition: the shared, calm cross-fade that makes moving between tabs
 * read as one instrument shifting its focus, not a hard cut between separate
 * apps (CTRL-SYSTEM-SPEC.md section 3.4 - "one continuous feel").
 *
 * It wraps ONLY the routed content zone. The shared chrome (the desktop rail +
 * top bar, the mobile bottom nav) lives OUTSIDE this wrapper, so the chrome
 * stays mounted and only the content cross-fades. Keep that contract: never
 * place persistent chrome inside this component.
 *
 * Layout-safety: the wrapper is a `flex-1 min-h-0 min-w-0` column that inherits
 * its parent's bounds. It adds NO height and NO scroll of its own, so it cannot
 * cause layout shift or a second scrollbar. With `mode="wait"` only one frame
 * is mounted at a time (the old one fully exits before the new one enters), so
 * there is no overlap reflow.
 *
 * Reduced motion: when `prefers-reduced-motion: reduce` is set we render the
 * content with no animation at all (instant swap), honoring the OS setting.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Key by pathname only (not search): switching ?view= on the same page is an
  // in-place content change, not a tab move, and should not cross-fade.
  const routeKey = location.pathname;

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="flex flex-1 min-h-0 min-w-0 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
