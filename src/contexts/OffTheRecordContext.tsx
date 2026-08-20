import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Off the record: one conversation that leaves no trace.
 *
 * Deliberately session-scoped and deliberately not persisted. The durable
 * switch already exists in Settings as `store_memory_enabled`; this is the
 * version you reach for once, mid-thought, when you want to think out loud
 * about something before it is a proposal.
 *
 * Because it is never written down, it resets on reload. That is the correct
 * failure direction: a user who expects it to be off finds it off, rather
 * than believing a stale flag is still protecting them.
 */
interface OffTheRecordValue {
  /** True while the current session must not write anything durable. */
  isOffTheRecord: boolean;
  /** True once an off-the-record session has ended, so we can confirm it saved nothing. */
  hasEnded: boolean;
  setOffTheRecord: (next: boolean) => void;
  acknowledgeEnded: () => void;
}

const OffTheRecordContext = createContext<OffTheRecordValue | null>(null);

export function OffTheRecordProvider({ children }: { children: ReactNode }) {
  const [isOffTheRecord, setIsOffTheRecord] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  const setOffTheRecord = useCallback((next: boolean) => {
    setIsOffTheRecord(next);
    // Turning it off is the moment we owe the user a confirmation that the
    // session really did save nothing. Saying so is the whole point: the
    // promise has to be visible, not merely true.
    setHasEnded((previous) => (next ? false : previous || true));
  }, []);

  const acknowledgeEnded = useCallback(() => setHasEnded(false), []);

  const value = useMemo(
    () => ({ isOffTheRecord, hasEnded, setOffTheRecord, acknowledgeEnded }),
    [isOffTheRecord, hasEnded, setOffTheRecord, acknowledgeEnded],
  );

  return <OffTheRecordContext.Provider value={value}>{children}</OffTheRecordContext.Provider>;
}

/**
 * Safe outside the provider so a surface that has not been wrapped yet simply
 * behaves as on the record, rather than crashing.
 */
export function useOffTheRecord(): OffTheRecordValue {
  const ctx = useContext(OffTheRecordContext);
  return (
    ctx ?? {
      isOffTheRecord: false,
      hasEnded: false,
      setOffTheRecord: () => {},
      acknowledgeEnded: () => {},
    }
  );
}
