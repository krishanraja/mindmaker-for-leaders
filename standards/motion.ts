/**
 * MindmakerOS shared motion grammar (framework-agnostic constants).
 *
 * Wire these into Framer Motion (or any engine) per app. Motion must communicate
 * state, never decorate. Always gate large motion behind prefers-reduced-motion.
 * These mirror CTRL's src/lib/motion.ts ground truth.
 */

export const DURATION = {
  fast: 0.15,    // 150ms: taps, toggles, micro feedback
  base: 0.3,     // 300ms: standard transitions
  slow: 0.5,     // 500ms: entrances, sheet slides
} as const;

export const SPRING = {
  // Physical, object-like response. Use for the magic-moment interactions.
  stiffness: 400,
  damping: 30,
  mass: 0.8,
} as const;

export const LIMITS = {
  maxMovementPx: 24,   // never move an element more than this in a transition
  maxScale: 1.05,      // never scale beyond this on hover/press
} as const;

export const EASING = {
  // Standard ease for non-spring transitions.
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
};

/** Returns a reduced set when the user prefers reduced motion. */
export function respectReducedMotion(prefersReduced: boolean) {
  if (prefersReduced) {
    return { duration: 0, spring: { stiffness: 1000, damping: 100, mass: 1 } };
  }
  return { duration: DURATION.base, spring: SPRING };
}
