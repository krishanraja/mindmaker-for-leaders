// Track Record - the "are you getting sharper?" surface (CTRL Brain feature A).
// Shapes match the get_track_record() RPC (migration 20260615050000_brain_track_record.sql).

export type PlayedOut = 'true' | 'false' | 'too_early';
export type BreakpointCall = 'accept' | 'reject' | 'unsure';

export interface TrackRecordRow {
  decision_id: string;
  statement: string;
  status: string;
  decision_kind: string | null;
  decided_at: string;
  resolution: string | null;
  played_out: PlayedOut | null;
  process_quality: number | null;
  /** The user's commit-first gut on the breakpoint claim. */
  breakpoint_call: BreakpointCall | null;
  /** What the evidence said about that claim (gut-vs-ground = calibration). */
  breakpoint_verdict: string | null;
  /** How many memory-importance adjustments this decision's outcome drove (sharpening). */
  importance_adjustments: number;
}
