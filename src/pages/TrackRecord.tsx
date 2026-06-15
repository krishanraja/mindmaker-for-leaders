import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Loader2, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useDevice } from '@/hooks/useDevice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTrackRecord } from '@/hooks/useTrackRecord';
import type { BreakpointCall, PlayedOut, TrackRecordRow } from '@/types/track-record';

const SUBTITLE = 'How your judgment is holding up. Banked decisions, judged on process - not luck.';

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const days = Math.floor((Date.now() - d) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Gut-vs-ground: did the user's commit-first call line up with what the evidence said?
function calibrationMatch(call: BreakpointCall | null, verdict: string | null): boolean | null {
  if (!call || !verdict || call === 'unsure') return null;
  const supports = verdict === 'supported';
  const doubts = verdict === 'contested' || verdict === 'unverified' || verdict === 'unverifiable';
  if (call === 'accept') return supports ? true : doubts ? false : null;
  if (call === 'reject') return doubts ? true : supports ? false : null;
  return null;
}

const PLAYED_OUT_LABEL: Record<PlayedOut, string> = {
  'true': 'Played out',
  'false': "Didn't hold",
  'too_early': 'Too early to tell',
};

function DecisionCard({
  row,
  onRecord,
  busy,
}: {
  row: TrackRecordRow;
  onRecord: (id: string, p: PlayedOut) => void;
  busy: boolean;
}) {
  const match = calibrationMatch(row.breakpoint_call, row.breakpoint_verdict);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{row.statement}</h3>
        <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(row.decided_at)}</span>
      </div>

      {/* Calibration: your gut vs the evidence */}
      {row.breakpoint_call && row.breakpoint_verdict && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Your call</span>
          <Badge variant="secondary" className="capitalize">{row.breakpoint_call}</Badge>
          <span className="text-muted-foreground">evidence</span>
          <Badge variant="secondary" className="capitalize">{row.breakpoint_verdict}</Badge>
          {match !== null && (
            <span className={cn('inline-flex items-center gap-1 font-medium', match ? 'text-accent' : 'text-amber-500')}>
              {match ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {match ? 'read it right' : 'gut differed'}
            </span>
          )}
        </div>
      )}

      {/* Outcome OR the harvest prompt */}
      {row.played_out ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className={cn(
              row.played_out === 'true' && 'border-accent/40 text-accent',
              row.played_out === 'false' && 'border-amber-500/40 text-amber-500',
            )}
          >
            {PLAYED_OUT_LABEL[row.played_out]}
          </Badge>
          {row.importance_adjustments > 0 && (
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              sharpened {row.importance_adjustments} {row.importance_adjustments === 1 ? 'fact' : 'facts'}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="mb-2 text-xs text-muted-foreground">Did this play out?</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onRecord(row.decision_id, 'true')}>
              <Check className="mr-1 h-3.5 w-3.5" /> Played out
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onRecord(row.decision_id, 'false')}>
              <X className="mr-1 h-3.5 w-3.5" /> Didn't
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onRecord(row.decision_id, 'too_early')}>
              <Clock className="mr-1 h-3.5 w-3.5" /> Too early
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

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
          <p className="mt-1 text-xs text-muted-foreground">Your calibration sharpens as you log how decisions play out.</p>
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
