// trackRecordModel - the HONEST mapping from raw banked-decision rows to the You-tab
// view state. This is where the cold/warm/rich decision is made, and where every number
// is derived from REAL data (never fabricated). The page and the /preview harness both
// drive the same TrackRecordView off this model, so what a user sees is what the harness
// shows.
//
// The state ladder is driven by DATA VOLUME, faithfully to CTRL-SYSTEM-SPEC s3:
//   cold  = no banked calls         -> a PROMISE + invitation (never zeros)
//   warm  = a first honest pattern  -> calibration read + honest caveat + first aged calls
//   rich  = an earned track record  -> hero hit-rate + honest trend + insight + full list
//
// "Banked" = a call that has actually played out (played_out is set). A call still in
// flight is "watching" and never counts toward a verdict.

import type { TrackRecordRow } from '@/types/track-record';
import { calibrationMatch } from './DecisionCard';

export type TrackRecordStateKind = 'cold' | 'warm' | 'rich';

export type AgedOutcome = 'held' | 'broke' | 'watch';

export interface AgedCall {
  id: string;
  outcome: AgedOutcome;
  /** The decision statement (the call itself). */
  statement: string;
  /** The statement re-phrased as the key question it answered (the card lead). */
  question: string;
  /** Human freshness/aging label, e.g. "aged 14 weeks" / "decided 6d ago". */
  ageLabel: string;
  /** Whether this call could be SCORED (gut vs ground both present and resolvable). */
  scored: boolean;
  /** If scored, whether the read matched the ground. */
  readMatch: boolean | null;
}

export interface CalibrationRead {
  scored: number; // calls we could actually score
  read: number; // of those, read the way the evidence landed
  /** A whole-percent hit-rate (rich hero), or null when there is nothing to score. */
  pct: number | null;
}

export type TrendDirection = 'up' | 'down' | 'flat';

export interface SharpenTrend {
  direction: TrendDirection | null; // null = not enough scored calls to claim a trend
  earlierRate: number | null; // 0..1
  recentRate: number | null; // 0..1
  /** Per-window read-rate series (oldest -> newest), only when a trend is claimable. */
  series: number[];
}

export interface TrackRecordModel {
  kind: TrackRecordStateKind;
  totalBanked: number; // calls that have played out
  calibration: CalibrationRead;
  trend: SharpenTrend;
  /** Days since the most recent decided_at; null when there are no rows. */
  freshDays: number | null;
  /** The aged calls, newest-first, already shaped for the row component. */
  calls: AgedCall[];
  /** The one honest "where your gut beat the data" insight, or null when none earns it. */
  insight: string | null;
}

// --- aging / freshness helpers -------------------------------------------------------

function daysSince(iso: string): number | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

// "aged 14 weeks" for played-out calls, "decided 6d ago" for watching calls. Honest and
// derived purely from decided_at.
function ageLabelFor(row: TrackRecordRow, outcome: AgedOutcome): string {
  const days = daysSince(row.decided_at);
  if (days === null) return '';
  if (outcome === 'watch') {
    if (days <= 0) return 'decided today';
    if (days === 1) return 'decided yesterday';
    if (days < 14) return `decided ${days}d ago`;
    if (days < 60) return `decided ${Math.floor(days / 7)}w ago`;
    return `decided ${Math.floor(days / 30)}mo ago`;
  }
  // played-out: lead with "aged" to convey time-tested
  if (days < 14) return days <= 1 ? 'aged 1 day' : `aged ${days} days`;
  if (days < 90) return `aged ${Math.floor(days / 7)} weeks`;
  return `aged ${Math.floor(days / 30)} months`;
}

function outcomeFor(row: TrackRecordRow): AgedOutcome {
  if (row.played_out === 'true') return 'held';
  if (row.played_out === 'false') return 'broke';
  return 'watch'; // too_early or not-yet-recorded
}

// Re-phrase a decision statement as the key question it answered, so each History
// card reads as a question (the founder's ask). Pure + client-side: it only
// reshapes the leader's own words, never invents content.
export function statementToQuestion(statement: string): string {
  let s = (statement ?? '').trim();
  if (!s) return 'Was this the right call?';
  // drop a trailing "because ..." rationale clause - the question is the call, not the why.
  s = s.replace(/[,;]?\s+because\b[\s\S]*$/i, '').trim();
  s = s.replace(/[.!]+$/, '').trim();
  if (s.endsWith('?')) return s.charAt(0).toUpperCase() + s.slice(1);
  // strip a leading commitment phrase -> "Should we X?"
  const m = s.match(
    /^(?:we should|we need to|we have to|we must|we will|we'?re going to|we are going to|i should|i need to|i'?ll|i will|let'?s|let us)\s+(.+)$/i,
  );
  if (m && m[1]) {
    const rest = m[1].trim();
    return `Should we ${rest.charAt(0).toLowerCase()}${rest.slice(1)}?`;
  }
  // generic fallback: pose the statement itself as a yes/no call.
  return `Was this the right call: ${s.charAt(0).toLowerCase()}${s.slice(1)}?`;
}

// --- the trend (recent half vs earlier half of SCORED calls) -------------------------
// Honest by construction: we only claim a trend with >= 4 scorable calls, and the series
// we hand the sparkline is the per-window read-rate, never an invented per-day curve.

function computeTrend(scoredChrono: { m: boolean }[]): SharpenTrend {
  const scored = scoredChrono.length;
  if (scored < 4) {
    return { direction: null, earlierRate: null, recentRate: null, series: [] };
  }
  const mid = Math.floor(scored / 2);
  const earlier = scoredChrono.slice(0, mid);
  const recent = scoredChrono.slice(scored - mid);
  const rate = (rows: { m: boolean }[]) => rows.filter((x) => x.m).length / rows.length;
  const earlierRate = rate(earlier);
  const recentRate = rate(recent);
  const delta = recentRate - earlierRate;
  const direction: TrendDirection = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';

  // Build an honest cumulative-window read-rate series for the sparkline: at each scored
  // call i (>= 2 so a rate is meaningful), the running read-rate so far. This is a true
  // running measure of the data, not a fabricated shape.
  const series: number[] = [];
  let cum = 0;
  scoredChrono.forEach((x, i) => {
    if (x.m) cum += 1;
    if (i >= 1) series.push(cum / (i + 1));
  });

  return { direction, earlierRate, recentRate, series };
}

// --- the insight ("where your gut beat the data") ------------------------------------
// Honest: only surfaced when there is a real scored call where the leader READ IT RIGHT.
// We pick the most recent such call and describe it plainly, no fabricated specifics.

function buildInsight(rows: TrackRecordRow[]): string | null {
  // newest-first already (RPC returns decided_at DESC); find the first scored, read-right call
  for (const r of rows) {
    const m = calibrationMatch(r.breakpoint_call, r.breakpoint_verdict);
    if (m === true) {
      const q = statementToQuestion(r.statement);
      const short = q.length > 92 ? `${q.slice(0, 90).trimEnd()}...` : q;
      return `"${short}"`;
    }
  }
  return null;
}

// --- the public builder --------------------------------------------------------------

export function buildTrackRecordModel(records: TrackRecordRow[]): TrackRecordModel {
  const totalBanked = records.filter((r) => r.played_out).length;

  // Scored calls in chronological order (oldest -> newest) for trend + series.
  const scoredChrono = records
    .map((r) => ({ at: new Date(r.decided_at).getTime(), m: calibrationMatch(r.breakpoint_call, r.breakpoint_verdict) }))
    .filter((x): x is { at: number; m: boolean } => x.m !== null && !Number.isNaN(x.at))
    .sort((a, b) => a.at - b.at);

  const scored = scoredChrono.length;
  const read = scoredChrono.filter((x) => x.m).length;
  const pct = scored > 0 ? Math.round((read / scored) * 100) : null;
  const calibration: CalibrationRead = { scored, read, pct };

  const trend = computeTrend(scoredChrono);

  let freshDays: number | null = null;
  for (const r of records) {
    const d = daysSince(r.decided_at);
    if (d !== null && (freshDays === null || d < freshDays)) freshDays = d;
  }

  // The aged calls, newest-first (RPC order preserved).
  const calls: AgedCall[] = records.map((r) => {
    const outcome = outcomeFor(r);
    const m = calibrationMatch(r.breakpoint_call, r.breakpoint_verdict);
    return {
      id: r.decision_id,
      outcome,
      statement: r.statement,
      question: statementToQuestion(r.statement),
      ageLabel: ageLabelFor(r, outcome),
      scored: m !== null,
      readMatch: m,
    };
  });

  const insight = buildInsight(records);

  // State ladder by DATA VOLUME:
  //  - cold: nothing banked yet (no played-out calls AND nothing scorable)
  //  - rich: a real, earned record (>= 4 scored calls -> a defensible hit-rate + trend)
  //  - warm: in between (a first pattern is showing, but not enough to claim a trend)
  let kind: TrackRecordStateKind;
  if (records.length === 0) {
    kind = 'cold';
  } else if (scored >= 4) {
    kind = 'rich';
  } else {
    kind = 'warm';
  }

  return { kind, totalBanked, calibration, trend, freshDays, calls, insight };
}
