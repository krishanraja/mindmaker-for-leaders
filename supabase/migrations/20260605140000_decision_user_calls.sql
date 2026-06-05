-- Critical-evaluation muscle (spine phase B6): the user's own call on a
-- load-bearing claim, recorded before CTRL's recommendation is revealed.
-- Additive only. RLS owner-scoped (auth.uid() = user_id), no joins.

CREATE TABLE IF NOT EXISTS public.decision_user_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_case_id uuid NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.decision_claims(id) ON DELETE CASCADE,
  call text NOT NULL CHECK (call IN ('accept','reject','unsure')),
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decision_user_calls_case ON public.decision_user_calls(decision_case_id);
CREATE INDEX IF NOT EXISTS idx_decision_user_calls_user ON public.decision_user_calls(user_id, created_at DESC);

ALTER TABLE public.decision_user_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS decision_user_calls_owner ON public.decision_user_calls;
CREATE POLICY decision_user_calls_owner ON public.decision_user_calls
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
