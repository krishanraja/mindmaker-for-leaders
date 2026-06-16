/* eslint-disable react-refresh/only-export-components -- co-locates the card with its calibration helpers */
import { motion } from 'framer-motion';
import { Check, Circle, Clock, GitFork, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BreakpointCall, PlayedOut, TrackRecordRow } from '@/types/track-record';

export function relativeTime(iso: string): string {
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
export function calibrationMatch(call: BreakpointCall | null, verdict: string | null): boolean | null {
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
  'too_early': 'Not yet played out',
};

const CALL_LABEL: Record<BreakpointCall, string> = {
  accept: 'Backed it',
  reject: 'Pushed back',
  unsure: 'Unsure',
};

// Honest verdict labels: never green-tick "validated". A neutral verdict reads neutrally.
const VERDICT_LABEL: Record<string, string> = {
  supported: 'Held up',
  contested: 'Contested',
  unverified: 'Thin',
  unverifiable: 'Only-you',
  pending: 'Checking',
};

// Process quality (1-5) -> an honest phrase, never a score with a halo.
function processQualityLabel(q: number | null): string | null {
  if (q == null) return null;
  if (q >= 5) return 'Process: thorough';
  if (q >= 4) return 'Process: solid';
  if (q >= 3) return 'Process: workable';
  if (q >= 2) return 'Process: thin';
  return 'Process: rushed';
}

export function DecisionCard({
  row,
  onRecord,
  busy,
  animated = true,
}: {
  row: TrackRecordRow;
  onRecord: (id: string, p: PlayedOut) => void;
  busy: boolean;
  animated?: boolean; // false renders at final state (QC harness / static capture)
}) {
  const match = calibrationMatch(row.breakpoint_call, row.breakpoint_verdict);
  const verdictLabel = row.breakpoint_verdict ? VERDICT_LABEL[row.breakpoint_verdict] ?? row.breakpoint_verdict : null;
  const processLabel = processQualityLabel(row.process_quality);

  // The leading status glyph reflects the HONEST state, never a fabricated green tick.
  const statusGlyph =
    row.played_out === 'true'
      ? { Icon: Check, cls: 'bg-accent/10 text-accent' }
      : row.played_out === 'false'
        ? { Icon: X, cls: 'bg-amber-500/10 text-amber-500' }
        : row.played_out === 'too_early'
          ? { Icon: Circle, cls: 'bg-secondary text-muted-foreground' }
          : { Icon: GitFork, cls: 'bg-secondary text-muted-foreground' };

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      {/* 2-row bet-card law: the headline gets the full width and wraps; the meta sits on its own line. */}
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-px grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border',
            statusGlyph.cls,
          )}
        >
          <statusGlyph.Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <h3 className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
          {row.statement}
        </h3>
        <span className="mt-px shrink-0 whitespace-nowrap text-xs text-muted-foreground">
          {relativeTime(row.decided_at)}
        </span>
      </div>

      {/* Calibration signal: your call vs the ground, read honestly (no fake validated). */}
      {row.breakpoint_call && verdictLabel && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-[38px] text-xs">
          <span className="text-muted-foreground">Your call</span>
          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-medium text-foreground">
            {row.breakpoint_call ? CALL_LABEL[row.breakpoint_call] : ''}
          </span>
          <span className="text-muted-foreground">ground</span>
          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-medium text-foreground">
            {verdictLabel}
          </span>
          {match !== null && (
            <span className={cn('inline-flex items-center gap-1 font-medium', match ? 'text-accent' : 'text-amber-500')}>
              {match ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {match ? 'read it right' : 'gut differed'}
            </span>
          )}
        </div>
      )}

      {/* Outcome row OR the harvest prompt. */}
      {row.played_out ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-[38px] text-xs">
          <span
            className={cn(
              'rounded-md border px-2 py-0.5 font-medium',
              row.played_out === 'true' && 'border-accent/40 bg-accent/5 text-accent',
              row.played_out === 'false' && 'border-amber-500/40 bg-amber-500/5 text-amber-500',
              row.played_out === 'too_early' && 'border-border bg-secondary text-muted-foreground',
            )}
          >
            {PLAYED_OUT_LABEL[row.played_out]}
          </span>
          {processLabel && <span className="text-muted-foreground">{processLabel}</span>}
          {row.importance_adjustments > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              sharpened {row.importance_adjustments} {row.importance_adjustments === 1 ? 'fact' : 'facts'}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t border-border/60 pt-3 pl-[38px]">
          <p className="mb-2 text-xs text-muted-foreground">Did this play out?</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onRecord(row.decision_id, 'true')}>
              <Check className="mr-1 h-3.5 w-3.5" /> Played out
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onRecord(row.decision_id, 'false')}>
              <X className="mr-1 h-3.5 w-3.5" /> Didn't hold
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onRecord(row.decision_id, 'too_early')}>
              <Clock className="mr-1 h-3.5 w-3.5" /> Uncertain
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
