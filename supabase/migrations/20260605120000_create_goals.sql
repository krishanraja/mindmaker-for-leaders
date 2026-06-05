-- Unified goals: the single source of truth for a user's goals (spine phase B2).
-- Additive only. RLS owner-scoped (auth.uid() = user_id), no joins. updated_at is
-- set by the app layer (matches the decision_* convention; no trigger).

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','paused','dropped')),
  horizon text NOT NULL DEFAULT 'quarter' CHECK (horizon IN ('now','quarter','year','north_star')),
  priority integer NOT NULL DEFAULT 0,
  progress numeric(3,2),
  target_date date,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','business_context','memory','decision','mission','voice')),
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_user_horizon ON public.goals(user_id, horizon);
-- Idempotent backfill key: one backfilled goal per (user, source, source_ref).
-- Manual goals have a null source_ref and are exempt from the uniqueness rule.
CREATE UNIQUE INDEX IF NOT EXISTS uq_goals_source
  ON public.goals(user_id, source, source_ref) WHERE source_ref IS NOT NULL;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS goals_owner ON public.goals;
CREATE POLICY goals_owner ON public.goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Additive links (nullable, non-breaking). The live decision/briefing pipelines
-- are not rewritten in this phase; legacy references remain readable.
ALTER TABLE public.decision_cases ADD COLUMN IF NOT EXISTS goal_ids uuid[] DEFAULT '{}';
ALTER TABLE public.leader_missions ADD COLUMN IF NOT EXISTS goal_id uuid;

-- Backfill from user_memory objectives (current rows only). This is the canonical
-- goal source on the live schema. Note: user_business_context has no goals column
-- on the live database (only primary_challenges, which are blockers, not goals), so
-- there is no business_context backfill here.
INSERT INTO public.goals (user_id, title, status, horizon, source, source_ref)
SELECT m.user_id, m.fact_value, 'active', 'quarter', 'memory', 'mem:' || m.id::text
FROM public.user_memory m
WHERE m.fact_category::text = 'objective'
  AND COALESCE(m.is_current, true) = true
  AND m.fact_value IS NOT NULL AND length(trim(m.fact_value)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.goals x
    WHERE x.user_id = m.user_id AND x.source = 'memory' AND x.source_ref = 'mem:' || m.id::text
  );
