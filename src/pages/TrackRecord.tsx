import { useMemo, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useDevice } from '@/hooks/useDevice';
import { useTrackRecord } from '@/hooks/useTrackRecord';
import type { PlayedOut } from '@/types/track-record';
import { DecisionCard, calibrationMatch } from '@/components/track-record/DecisionCard';
import { ShareWinButton } from '@/components/share/ShareWinButton';

const SUBTITLE = 'How your judgment is holding up. Banked decisions, judged on process - not luck.';

export default function TrackRecordPage() {
  const { isMobile } = useDevice();
  const { records, loading, recordOutcome } = useTrackRecord();
  const [busyId, setBusyId] = useState<string | null>(null);

  const calibration = useMemo(() => {
    let read = 0;
    let total = 0;
    for (const r of records) {
      const m = calibrationMatch(r.breakpoint_call, r.breakpoint_verdict);
      if (m === null) continue;
      total += 1;
      if (m) read += 1;
    }
    return { read, total };
  }, [records]);

  async function handleRecord(id: string, playedOut: PlayedOut) {
    setBusyId(id);
    try {
      await recordOutcome(id, playedOut);
      toast.success(playedOut === 'true' ? 'Logged - your brain just sharpened on it.' : 'Logged.');
    } catch (err) {
      console.error(err);
      toast.error('Could not save that. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  const content = (
    <div className="space-y-4">
      {calibration.total > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <p className="text-sm text-foreground">
            You read <span className="font-semibold text-accent">{calibration.read} of {calibration.total}</span> breakpoints
            the way the evidence did.
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Your calibration sharpens as you log how decisions play out.</p>
            <ShareWinButton
              win={{
                title: 'My decision calibration, on the record',
                stat: `${calibration.read}/${calibration.total}`,
                sub: 'breakpoints read the way the evidence did',
                text: `I read ${calibration.read}/${calibration.total} of my decision breakpoints the way the evidence did. CTRL keeps my judgment honest.`,
              }}
              label="Share"
              variant="ghost"
            />
          </div>
        </div>
      )}
      {records.map((r) => (
        <DecisionCard key={r.decision_id} row={r} onRecord={handleRecord} busy={busyId === r.decision_id} />
      ))}
    </div>
  );

  const empty = (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <TrendingUp className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        No banked decisions yet. Pressure-test a decision in Decide, and it shows up here so you can watch your judgment sharpen.
      </p>
    </div>
  );

  const inner = loading ? (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  ) : records.length === 0 ? (
    empty
  ) : (
    content
  );

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Workspace" title="Track Record">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <div className="mx-auto w-full max-w-3xl">
            <p className="mb-6 text-sm text-muted-foreground">{SUBTITLE}</p>
            {inner}
          </div>
        </div>
      </DesktopShell>
    );
  }

  return (
    <div className="h-screen-safe flex flex-col overflow-hidden bg-background">
      <AppHeader />
      <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 scrollbar-hide">
        <div className="mx-auto w-full max-w-3xl space-y-6 py-4">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Track Record</h1>
            </div>
            <p className="text-sm text-muted-foreground">{SUBTITLE}</p>
          </header>
          {inner}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
