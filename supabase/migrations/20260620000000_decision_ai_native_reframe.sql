-- Decision engine: AI-native reframe fields (additive only).
--
-- CTRL only pressure-tests the AI-native version of a decision. When a leader
-- submits a general-business decision, the engine reframes it into its AI-native
-- version and reasons on the reframed statement. We carry BOTH the original
-- (decision_cases.statement, unchanged) and the reframed statement + an honest
-- note, so the reframe is surfaced to the leader and never silently swapped.
--
-- All columns are nullable / defaulted, so existing rows and the existing data
-- flow (useDecisionEngine / useDecisionInbox select *) keep working unchanged.

ALTER TABLE public.decision_cases
  ADD COLUMN IF NOT EXISTS reframed boolean NOT NULL DEFAULT false;

ALTER TABLE public.decision_cases
  ADD COLUMN IF NOT EXISTS reframed_statement text;

ALTER TABLE public.decision_cases
  ADD COLUMN IF NOT EXISTS reframe_note text;

-- The AI-native lifecycle stage the (reframed) decision lives in. Nullable
-- because it is only known when the reframe/classifier resolves it.
ALTER TABLE public.decision_cases
  ADD COLUMN IF NOT EXISTS lifecycle_stage text
    CHECK (lifecycle_stage IS NULL OR lifecycle_stage IN ('build','orchestrate','productize','gtm','substrate'));

COMMENT ON COLUMN public.decision_cases.reframed IS
  'true when a general-business statement was reframed into its AI-native version before the engine reasoned on it.';
COMMENT ON COLUMN public.decision_cases.reframed_statement IS
  'the AI-native restatement the pipeline decomposed/advised on; null when no reframe was needed (the original statement was already AI-native).';
COMMENT ON COLUMN public.decision_cases.reframe_note IS
  'the honest, leader-facing note explaining that and why the decision was reframed.';
COMMENT ON COLUMN public.decision_cases.lifecycle_stage IS
  'the AI-native lifecycle stage (build/orchestrate/productize/gtm/substrate) the decision lives in, when known.';
