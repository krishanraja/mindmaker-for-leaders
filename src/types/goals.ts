// Unified goals: the single source of truth for a user's goals.
// Backed by the public.goals table (RLS owner-scoped). New goals are written
// here; legacy sources (memory objectives) were backfilled with a `source`.

export type GoalStatus = 'active' | 'achieved' | 'paused' | 'dropped';
export type GoalHorizon = 'now' | 'quarter' | 'year' | 'north_star';
export type GoalSource =
  | 'manual'
  | 'business_context'
  | 'memory'
  | 'decision'
  | 'mission'
  | 'voice';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  detail: string | null;
  status: GoalStatus;
  horizon: GoalHorizon;
  priority: number;
  progress: number | null;
  target_date: string | null;
  source: GoalSource;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export const HORIZON_LABELS: Record<GoalHorizon, string> = {
  now: 'Now',
  quarter: 'This quarter',
  year: 'This year',
  north_star: 'North star',
};

// Ordered from nearest to furthest, for grouped display.
export const HORIZON_ORDER: GoalHorizon[] = ['now', 'quarter', 'year', 'north_star'];

export const STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Active',
  achieved: 'Achieved',
  paused: 'Paused',
  dropped: 'Dropped',
};

// Where a backfilled goal came from, for a quiet provenance hint in the UI.
export const SOURCE_LABELS: Partial<Record<GoalSource, string>> = {
  memory: 'from memory',
  business_context: 'from context',
  decision: 'from a decision',
  mission: 'from a mission',
  voice: 'from voice',
};
