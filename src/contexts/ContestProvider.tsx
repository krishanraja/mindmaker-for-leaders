/* eslint-disable react-refresh/only-export-components -- provider module legitimately exports the provider, a context hook, and a small wrapper */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { ContestPanel } from '@/components/contest/ContestPanel';
import { useContest } from '@/hooks/useContest';
import { useLongPress } from '@/hooks/useLongPress';
import type { ContestKind, ContestResult, ContestTarget } from '@/types/contest';

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
  const { submitContest, submitting } = useContest();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ContestTarget | null>(null);
  const [kind, setKind] = useState<ContestKind | null>(null);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<ContestResult | null>(null);

  const openContest = useCallback((t: ContestTarget) => {
    setTarget(t);
    setKind(null);
    setNote('');
    setResult(null);
    setOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!target || !kind) return;
    try {
      const r = await submitContest(target, kind, note);
      setResult(r);
    } catch (err) {
      console.error('contest submit failed', err);
      toast.error('Could not send that. Try again.');
    }
  }, [target, kind, note, submitContest]);

  const value = useMemo(() => ({ openContest }), [openContest]);

  return (
    <ContestContext.Provider value={value}>
      {children}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerTitle className="sr-only">Contest this</DrawerTitle>
          <ContestPanel
            target={target}
            selectedKind={kind}
            onSelectKind={setKind}
            note={note}
            onNoteChange={setNote}
            onSubmit={handleSubmit}
            submitting={submitting}
            result={result}
            onClose={() => setOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    </ContestContext.Provider>
  );
}
