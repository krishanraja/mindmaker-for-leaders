-- Decision Engine (Phase A): living decision objects with typed claims,
-- retrieved evidence, tensions, alerts, and an audit/event log.
-- Additive only. RLS owner-scoped. Children carry user_id so RLS needs no joins.

-- ---------------------------------------------------------------------------
-- decision_cases: the living decision object
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  statement text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','decided','stale','archived')),
  decision_kind text DEFAULT 'other' CHECK (decision_kind IN ('binary','directional','investment','hiring','gtm','other')),
  source text DEFAULT 'advisor' CHECK (source IN ('advisor','capture','voice','fireflies')),
  stage text NOT NULL DEFAULT 'decomposing' CHECK (stage IN ('decomposing','verifying','cross_examining','advising','complete','error')),
  objective_fact_ids uuid[] DEFAULT '{}',
  user_decision_id uuid,
  recommendation text,
  counter_case text,
  breakpoint_assumption_id uuid,
  validate_next text[] DEFAULT '{}',
  confidence numeric(3,2),
  error_detail text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decision_cases_user ON public.decision_cases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_cases_status ON public.decision_cases(user_id, status);

-- ---------------------------------------------------------------------------
-- decision_claims: typed atomic units extracted from the statement
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_case_id uuid NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  type text NOT NULL CHECK (type IN ('factual','market','causal','assumption','forecast')),
  is_load_bearing boolean NOT NULL DEFAULT false,
  verdict text NOT NULL DEFAULT 'pending' CHECK (verdict IN ('supported','contested','unverified','unverifiable','pending')),
  confidence numeric(3,2),
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decision_claims_case ON public.decision_claims(decision_case_id);
CREATE INDEX IF NOT EXISTS idx_decision_claims_user ON public.decision_claims(user_id);

-- ---------------------------------------------------------------------------
-- decision_evidence: cited evidence per claim
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.decision_claims(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url text,
  source_type text,
  source_title text,
  excerpt text,
  stance text DEFAULT 'neutral' CHECK (stance IN ('supports','refutes','neutral')),
  retriever text CHECK (retriever IN ('perplexity','exa','brave','tavily','newsapi','pdl','builtwith','tranco','memory')),
  relevance_score numeric,
  retrieved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decision_evidence_claim ON public.decision_evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_decision_evidence_user ON public.decision_evidence(user_id);

-- ---------------------------------------------------------------------------
-- decision_tensions: contradictions surfaced (vs profile, vs evidence, internal, model disagreement)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_tensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_case_id uuid NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('vs_profile','vs_evidence','internal','model_disagreement')),
  description text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  related_claim_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decision_tensions_case ON public.decision_tensions(decision_case_id);
CREATE INDEX IF NOT EXISTS idx_decision_tensions_user ON public.decision_tensions(user_id);

-- ---------------------------------------------------------------------------
-- decision_alerts: WATCH output (Phase C), surfaced into the Daily Briefing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_case_id uuid NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.decision_claims(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('assumption_broke','evidence_shifted','new_contradiction')),
  headline text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  surfaced_in_briefing_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_decision_alerts_user_open ON public.decision_alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_decision_alerts_case ON public.decision_alerts(decision_case_id);

-- ---------------------------------------------------------------------------
-- decision_events: audit log + attribution warehouse source
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_case_id uuid NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('created','verified','advice_updated','assumption_broke','acknowledged')),
  payload jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decision_events_case ON public.decision_events(decision_case_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- decision_eval_cases: internal calibration set (service-role only, no user RLS policy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_eval_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_text text NOT NULL,
  claim_type text NOT NULL CHECK (claim_type IN ('factual','market','causal','assumption','forecast')),
  gold_verdict text NOT NULL CHECK (gold_verdict IN ('supported','contested','unverified','unverifiable')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS: enable on all, owner-scoped policies on user tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.decision_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_eval_cases ENABLE ROW LEVEL SECURITY;

-- Owner-scoped policies. Children carry user_id so each policy is a flat auth.uid() check.
-- decision_eval_cases intentionally has NO policy: only the service role (which bypasses RLS) touches it.

DROP POLICY IF EXISTS decision_cases_owner ON public.decision_cases;
CREATE POLICY decision_cases_owner ON public.decision_cases
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS decision_claims_owner ON public.decision_claims;
CREATE POLICY decision_claims_owner ON public.decision_claims
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS decision_evidence_owner ON public.decision_evidence;
CREATE POLICY decision_evidence_owner ON public.decision_evidence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS decision_tensions_owner ON public.decision_tensions;
CREATE POLICY decision_tensions_owner ON public.decision_tensions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS decision_alerts_owner ON public.decision_alerts;
CREATE POLICY decision_alerts_owner ON public.decision_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS decision_events_owner ON public.decision_events;
CREATE POLICY decision_events_owner ON public.decision_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
