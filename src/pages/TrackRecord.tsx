import { useMemo, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useDevice } from '@/hooks/useDevice';
import { useTrackRecord } from '@/hooks/useTrackRecord';
import type { PlayedOut, TrackRecordRow } from '@/types/track-record';
import { DecisionCard, calibrationMatch } from '@/components/track-record/DecisionCard';
import { ShareWinButton } from '@/components/share/ShareWinButton';

const SUBTITLE = 'How your judgment is holding up. Banked decisions, judged on process - not luck.';

// A single Apple-clean stat tile: the number leads, the label sits under it.
// `tone` carries an honest accent only where the data earns it; never a fake green.
function StatTile({ value, label, tone }: { value: string; label: string; tone?: 'go' | 'warn' }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-card px-3 py-3 text-left">
      <div
        className={
          tone === 'go'
            ? 'text-2xl font-bold leading-none tracking-tight text-accent [font-variant-numeric:tabular-nums]'
            : tone === 'warn'
              ? 'text-2xl font-bold leading-none tracking-tight text-amber-500 [font-variant-numeric:tabular-nums]'
              : 'text-2xl font-bold leading-none tracking-tight text-foreground [font-variant-numeric:tabular-nums]'
        }
      >
        {value}
      </div>
      <div className="mt-2 text-[11px] font-medium leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 ml-1 mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
      {children}
    </p>
  );
}

// Group the record by life-stage, honestly: Held up (played out true), Didn't hold
// (played out false), and Watching (not yet played out / uncertain). We never imply a
// verdict for a call that has not actually played out.
function groupRecords(records: TrackRecordRow[]) {
  const held: TrackRecordRow[] = [];
  const broke: TrackRecordRow[] = [];
  const watching: TrackRecordRow[] = [];
  for (const r of records) {
    if (r.played_out === 'true') held.push(r);
    else if (r.played_out === 'false') broke.push(r);
    else watching.push(r);
  }
  return { held, broke, watching };
}

export default function TrackRecordPage() {
  const { isMobile } = useDevice();
  const { records, loading, recordOutcome } = useTrackRecord();
  const [busyId, setBusyId] = useState<string | null>(null);

  const stats = useMemo(() => {
    let read = 0;
    let total = 0;
    let banked = 0;
    let sharpened = 0;
    for (const r of records) {
      if (r.played_out) banked += 1;
      sharpened += r.importance_adjustments;
      const m = calibrationMatch(r.breakpoint_call, r.breakpoint_verdict);
      if (m === null) continue;
      total += 1;
      if (m) read += 1;
    }
    return { read, total, banked, sharpened };
  }, [records]);

  const groups = useMemo(() => groupRecords(records), [records]);

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

  function renderGroup(label: string, rows: TrackRecordRow[]) {
    if (rows.length === 0) return null;
    return (
      <div>
        <SectionLabel>{label}</SectionLabel>
        <div className="space-y-3">
          {rows.map((r) => (
            <DecisionCard key={r.decision_id} row={r} onRecord={handleRecord} busy={busyId === r.decision_id} />
          ))}
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* The calibration hero: the numbers lead. Breakpoints (read/total) carries the whole point. */}
      <div className="flex gap-2.5">
        <StatTile value={String(stats.banked)} label="Banked" />
        {stats.total > 0 ? (
          <StatTile value={`${stats.read}/${stats.total}`} label="Breakpoints read" tone="go" />
        ) : (
          <StatTile value="-" label="Breakpoints read" />
        )}
        <StatTile value={String(stats.sharpened)} label="Facts sharpened" tone={stats.sharpened > 0 ? 'go' : undefined} />
      </div>

      {/* The honest one-liner + share, only once a calibration signal actually exists. */}
      {stats.total > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <p className="text-sm text-foreground">
            You read{' '}
            <span className="font-semibold text-accent">
              {stats.read} of {stats.total}
            </span>{' '}
            breakpoints the way the evidence did.
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Your calibration sharpens as you log how decisions play out.</p>
            <ShareWinButton
              win={{
                title: 'My decision calibration, on the record',
                stat: `${stats.read}/${stats.total}`,
                sub: 'breakpoints read the way the evidence did',
                text: `I read ${stats.read}/${stats.total} of my decision breakpoints the way the evidence did. CTRL keeps my judgment honest.`,
              }}
              label="Share"
              variant="ghost"
            />
          </div>
        </div>
      )}

      {renderGroup('Held up', groups.held)}
      {renderGroup("Didn't hold", groups.broke)}
      {renderGroup('Watching', groups.watching)}

      <p className="pt-1 text-center text-[11px] text-muted-foreground">Sharpens as more calls play out</p>
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
