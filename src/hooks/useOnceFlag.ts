import { useCallback, useState } from 'react';

/**
 * Tracks a "show this only once, ever" flag in localStorage. Used for the
 * first-run welcome tour and per-surface coachmarks so a returning user is
 * never re-interrupted. SSR/parse failures fail safe to "already seen" so we
 * never block the UI behind a storage error.
 *
 * Returns [seen, markSeen]. Render the one-time UI only when !seen.
 */
export function useOnceFlag(key: string): [boolean, () => void] {
  const storageKey = `ctrl_seen_${key}`;

  const [seen, setSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return true;
    }
  });

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* storage unavailable - still hide for this session */
    }
    setSeen(true);
  }, [storageKey]);

  return [seen, markSeen];
}
