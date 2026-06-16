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

// "Getting sharper" - calibration over time, computed HONESTLY from the rows.
// We take only the rows where a gut-vs-ground call can actually be scored (calibrationMatch
// is non-null), order them oldest -> newest by decided_at, then ask: is the read-rate on your
// recent half better than your earlier half? That is the only honest trend the data supports:
// no fabricated sparkline, no invented per-day series. If there are too few scored calls to
// split into two halves, there is no trend to claim - the caller shows the honest "sharpens as
// more calls play out" state instead.
type SharpenTrend = {
  scored: number; // total calls we could actually score (call + verdict both present)
  read: number; // of those, how many you read the way the evidence did
  recentRate: number | null; // read-rate over your more recent scored half (0..1)
  earlierRate: number | null; // read-rate over your earlier scored half (0..1)
  direction: 'up' | 'down' | 'flat' | null; // null = not enough to claim a trend
};

function computeSharpenTrend(records: TrackRecordRow[]): SharpenTrend {
  // Oldest -> newest. The RPC returns newest-first (decided_at DESC), so reverse a sorted copy.
  const scoredRows = records
    .map((r) => ({ at: new Date(r.decided_at).getTime(), m: calibrationMatch(r.breakpoint_call, r.breakpoint_verdict) }))
    .filter((x): x is { at: number; m: boolean } => x.m !== null && !Number.isNaN(x.at))
    .sort((a, b) => a.at - b.at);

  const scored = scoredRows.length;
  const read = scoredRows.filter((x) => x.m).length;

  // Need at least 4 scored calls to honestly split into an earlier vs recent half.
  if (scored < 4) {
    return { scored, read, recentRate: null, earlierRate: null, direction: null };
  }

  const mid = Math.floor(scored / 2);
  const earlier = scoredRows.slice(0, mid);
  const recent = scoredRows.slice(scored - mid); // same-size recent half (drops the middle row on odds)
  const rate = (rows: { m: boolean }[]) => rows.filter((x) => x.m).length / rows.length;
  const earlierRate = rate(earlier);
  const recentRate = rate(recent);

  // A small epsilon so a one-call wobble doesn't read as a "trend".
  const delta = recentRate - earlierRate;
  const direction = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';
  return { scored, read, recentRate, earlierRate, direction };
}

// Freshness of the whole record: days since the most recent decided_at. Computed client-side;
// there is no freshness-event feed, so this is the honest "how live is this record" read.
function daysSinceLatest(records: TrackRecordRow[]): number | null {
  let newest = -Infinity;
  for (const r of records) {
    const t = new Date(r.decided_at).getTime();
    if (!Number.isNaN(t) && t > newest) newest = t;
  }
  if (newest === -Infinity) return null;
  return Math.max(0, Math.floor((Date.now() - newest) / 86_400_000));
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
  const trend = useMemo(() => computeSharpenTrend(records), [records]);
  const freshDays = useMemo(() => daysSinceLatest(records), [records]);

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

      {/* Getting sharper: calibration over time + how calls have played out. Only rendered
          once a real calibration signal exists; the trend line is shown only when there are
          enough scored calls to honestly split, otherwise the honest "sharpens" state. */}
      {stats.total > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Getting sharper</p>
            {freshDays !== null && (
              <span className="text-[11px] text-muted-foreground">
                {freshDays === 0 ? 'updated today' : `last call ${freshDays}d ago`}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-foreground">
            You read{' '}
            <span className="font-semibold text-accent">
              {stats.read} of {stats.total}
            </span>{' '}
            breakpoints the way the evidence did.
          </p>

          {/* The honest trend: recent half vs earlier half of your SCORED calls. */}
          {trend.direction && trend.recentRate !== null && trend.earlierRate !== null ? (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span
                className={
                  trend.direction === 'up'
                    ? 'inline-flex items-center gap-1 font-medium text-accent'
                    : trend.direction === 'down'
                      ? 'inline-flex items-center gap-1 font-medium text-amber-500'
                      : 'inline-flex items-center gap-1 font-medium text-muted-foreground'
                }
              >
                <TrendingUp
                  className={
                    trend.direction === 'down'
                      ? 'h-3.5 w-3.5 rotate-180'
                      : trend.direction === 'flat'
                        ? 'h-3.5 w-3.5 rotate-90'
                        : 'h-3.5 w-3.5'
                  }
                />
                {trend.direction === 'up'
                  ? 'Getting sharper'
                  : trend.direction === 'down'
                    ? 'Calibration slipped'
                    : 'Holding steady'}
              </span>
              <span className="text-muted-foreground">
                {Math.round(trend.earlierRate * 100)}% then to {Math.round(trend.recentRate * 100)}% now
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Sharpens as more calls play out.</p>
          )}

          {/* How the harvested calls actually landed - real counts, never a verdict on a watching call. */}
          {(groups.held.length > 0 || groups.broke.length > 0 || groups.watching.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {groups.held.length > 0 && (
                <span>
                  <span className="font-semibold text-accent">{groups.held.length}</span> held up
                </span>
              )}
              {groups.broke.length > 0 && (
                <span>
                  <span className="font-semibold text-amber-500">{groups.broke.length}</span> didn't hold
                </span>
              )}
              {groups.watching.length > 0 && (
                <span>
                  <span className="font-semibold text-foreground">{groups.watching.length}</span> watching
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-end">
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

      {/* Honest closer - only when no calibration section is carrying the "sharpens" line yet. */}
      {stats.total === 0 && (
        <p className="pt-1 text-center text-[11px] text-muted-foreground">Sharpens as more calls play out</p>
      )}
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
