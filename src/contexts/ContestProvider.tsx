/* eslint-disable react-refresh/only-export-components -- provider module legitimately exports the provider, a context hook, and a small wrapper */
import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import type { ContestTarget } from '@/types/contest';

const ContestDrawer = lazy(() => import('@/components/contest/ContestDrawer').then((module) => ({ default: module.ContestDrawer })))

interface ContestContextValue {
  openContest: (target: ContestTarget) => void;
}
const ContestContext = createContext<ContestContextValue | null>(null);

export function useContestActions(): ContestContextValue {
  const ctx = useContext(ContestContext);
  // No-op fallback so a component can render outside the provider (e.g. the QC
  // harness) without crashing - long-press simply does nothing there.
  return ctx ?? { openContest: () => {} };
}

/**
 * Wrap any element so a long-press contests it. The press auto-captures the
 * target (what is being contested) so the user barely types. Children keep
 * their own click/tap behaviour; only press-and-hold opens the sheet.
 */
export function ContestLongPress({ target, children, className }: { target: ContestTarget; children: ReactNode; className?: string }) {
  const { openContest } = useContestActions();
  const handlers = useLongPress({ onLongPress: () => openContest(target) });
  return (
    <div {...handlers} className={className} style={{ WebkitTouchCallout: 'none' }}>
      {children}
    </div>
  );
}

export function ContestProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ContestTarget | null>(null);

  const openContest = useCallback((t: ContestTarget) => {
    setTarget(t);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openContest }), [openContest]);

  return (
    <ContestContext.Provider value={value}>
      {children}
      {target && (
        <Suspense fallback={null}>
          <ContestDrawer open={open} target={target} onOpenChange={setOpen} />
        </Suspense>
      )}
    </ContestContext.Provider>
  );
}
