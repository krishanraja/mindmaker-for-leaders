/* eslint-disable react-refresh/only-export-components -- co-locates the card with its calibration helpers */
import { motion } from 'framer-motion';
import { Check, Clock, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  'too_early': 'Too early to tell',
};

export function DecisionCard({
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
