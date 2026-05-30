import { useEffect, useRef, type RefObject } from 'react';

/**
 * Smoothly scrolls a card into view when it mounts after the page has already
 * settled. Skips initial page load (when the scroll container is at top) so it
 * doesn't hijack the staggered hero animations.
 *
 * `enabled` lets callers gate the effect until their conditional content is
 * actually rendered (e.g. after an async data load), so the ref is attached
 * by the time we measure it. Once it fires, it won't fire again.
 */
export function useRevealOnMount<T extends HTMLElement>(
  ref: RefObject<T>,
  enabled: boolean = true,
) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled || firedRef.current) return;
    const el = ref.current;
    if (!el) return;
    firedRef.current = true;

    // Find the nearest scroll container (data-edge-scroll on Dashboard.tsx) so
    // we can skip the reveal when it's already at top - a strong proxy for
    // "this is the initial render, not a card that appeared later".
    const scroller = el.closest<HTMLElement>('[data-edge-scroll]');
    if (scroller && scroller.scrollTop === 0) return;

    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    // Only reveal when the card mounts *below* the visible area. Scrolling
    // upward to a card the user already scrolled past would feel like hijacking.
    if (rect.top <= viewportH) return;

    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
    // ref is stable; re-runs only on `enabled` flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
