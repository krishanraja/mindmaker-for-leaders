-- ============================================
-- PHASE 1: AI LEADERSHIP INDEX FOUNDATION (FIXED)
-- Security-hardened schema with consent, RLS, hashing, and statistical guardrails
-- Fixed: Use triggers instead of generated columns for time-based calculations
-- ============================================

-- Step 1: Create enums for type safety
CREATE TYPE public.consent_purpose AS ENUM (
  'index_publication',
  'sales_outreach', 
  'case_study',
  'product_improvements',
  'research_partnerships'
);

CREATE TYPE public.action_signal_level AS ENUM ('low', 'mid', 'high');
CREATE TYPE public.roi_provenance AS ENUM ('instrumented', 'system_report', 'estimate');
CREATE TYPE public.roi_unit_type AS ENUM ('hours_saved', 'revenue_increase', 'cost_reduction', 'nps_increase', 'time_to_market');
CREATE TYPE public.momentum_tier AS ENUM ('experimenting', 'scaling', 'institutionalizing');

-- Step 2: Company identifier salt storage (KMS-style)
CREATE TABLE public.company_identifier_salt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salt_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rotated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.company_identifier_salt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for salt"
  ON public.company_identifier_salt
  FOR ALL
  USING (false);

INSERT INTO public.company_identifier_salt (salt_value, is_active)
VALUES (encode(gen_random_bytes(32), 'hex'), true);

-- Step 3: Index participant data with granular consent
CREATE TABLE public.index_participant_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  
  industry TEXT,
  company_size TEXT,
  role_title TEXT,
  company_identifier_hash TEXT,
  
  readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
  tier TEXT CHECK (tier IN ('emerging', 'establishing', 'advancing', 'leading')),
  dimension_scores JSONB DEFAULT '{}'::jsonb,
  
  assessment_type TEXT CHECK (assessment_type IN ('voice', 'quiz')),
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  consent_flags JSONB DEFAULT '{
    "index_publication": false,
    "sales_outreach": false,
    "case_study": false,
    "product_improvements": true,
    "research_partnerships": false
  }'::jsonb,
  consent_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  confidence_weight NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence_weight BETWEEN 0 AND 1),
  effective_sample_contribution NUMERIC(3,2) GENERATED ALWAYS AS (
    CASE 
      WHEN (consent_flags->>'index_publication')::boolean THEN confidence_weight
      ELSE 0
    END
  ) STORED,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, completed_at)
);

CREATE INDEX idx_participant_industry ON public.index_participant_data(industry) WHERE (consent_flags->>'index_publication')::boolean = true;
CREATE INDEX idx_participant_company_size ON public.index_participant_data(company_size) WHERE (consent_flags->>'index_publication')::boolean = true;
CREATE INDEX idx_participant_completed ON public.index_participant_data(completed_at) WHERE (consent_flags->>'index_publication')::boolean = true;
CREATE INDEX idx_participant_company_hash ON public.index_participant_data(company_identifier_hash);

ALTER TABLE public.index_participant_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own participant data"
  ON public.index_participant_data
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own participant data"
  ON public.index_participant_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own consent"
  ON public.index_participant_data
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Step 4: Consent audit trail
CREATE TABLE public.consent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.index_participant_data(id) ON DELETE CASCADE,
  user_id UUID,
  consent_purpose public.consent_purpose NOT NULL,
  previous_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by TEXT,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_consent_audit_participant ON public.consent_audit(participant_id);
CREATE INDEX idx_consent_audit_changed_at ON public.consent_audit(changed_at);

ALTER TABLE public.consent_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent audit"
  ON public.consent_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- Step 5: Index publication rules
CREATE TABLE public.index_publication_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  
  min_segment_size INTEGER DEFAULT 30,
  min_effective_sample_size INTEGER DEFAULT 20,
  
  confidence_level NUMERIC(3,2) DEFAULT 0.95,
  bootstrap_iterations INTEGER DEFAULT 1000,
  percentile_rounding INTEGER DEFAULT 5,
  
  outlier_method TEXT DEFAULT 'winsorize',
  outlier_threshold NUMERIC(3,2) DEFAULT 0.05,
  
  methodology_url TEXT,
  changelog TEXT,
  
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE public.index_publication_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active methodology"
  ON public.index_publication_rules
  FOR SELECT
  USING (is_active = true);

INSERT INTO public.index_publication_rules (
  version, 
  is_active,
  min_segment_size,
  min_effective_sample_size,
  confidence_level,
  methodology_url
) VALUES (
  '2025-Q1-v1',
  true,
  30,
  20,
  0.95,
  '/methodology'
);

-- Step 6: Index snapshots with confidence intervals
CREATE TABLE public.ai_leadership_index_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter TEXT NOT NULL UNIQUE,
  methodology_version TEXT REFERENCES public.index_publication_rules(version),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  total_assessments INTEGER DEFAULT 0,
  effective_sample_size NUMERIC(6,2) DEFAULT 0,
  consent_rate NUMERIC(5,2),
  
  avg_readiness_score NUMERIC(5,2),
  avg_readiness_score_ci_lower NUMERIC(5,2),
  avg_readiness_score_ci_upper NUMERIC(5,2),
  median_readiness_score NUMERIC(5,2),
  
  tier_emerging_pct NUMERIC(5,2),
  tier_establishing_pct NUMERIC(5,2),
  tier_advancing_pct NUMERIC(5,2),
  tier_leading_pct NUMERIC(5,2),
  
  industry_benchmarks JSONB DEFAULT '{}'::jsonb,
  company_size_benchmarks JSONB DEFAULT '{}'::jsonb,
  role_benchmarks JSONB DEFAULT '{}'::jsonb,
  
  dimension_benchmarks JSONB DEFAULT '{}'::jsonb,
  
  qoq_change NUMERIC(5,2),
  qoq_change_significant BOOLEAN,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_index_quarter ON public.ai_leadership_index_snapshots(quarter);

ALTER TABLE public.ai_leadership_index_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published index snapshots"
  ON public.ai_leadership_index_snapshots
  FOR SELECT
  USING (true);

-- Step 7: Public anonymized view
CREATE VIEW public.public_index_snapshots AS
SELECT 
  quarter,
  methodology_version,
  published_at,
  total_assessments,
  effective_sample_size,
  consent_rate,
  avg_readiness_score,
  avg_readiness_score_ci_lower,
  avg_readiness_score_ci_upper,
  median_readiness_score,
  tier_emerging_pct,
  tier_establishing_pct,
  tier_advancing_pct,
  tier_leading_pct,
  industry_benchmarks,
  company_size_benchmarks,
  role_benchmarks,
  dimension_benchmarks,
  qoq_change,
  qoq_change_significant
FROM public.ai_leadership_index_snapshots
WHERE published_at IS NOT NULL;

-- Step 8: Velocity events table
CREATE TABLE public.velocity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  contact_email TEXT NOT NULL,
  
  event_type TEXT NOT NULL,
  action_signal_level public.action_signal_level NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  assessment_completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  initial_readiness_score INTEGER,
  
  days_since_assessment INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM event_date - assessment_completed_at)::INTEGER
  ) STORED,
  
  event_description TEXT,
  event_metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_velocity_session ON public.velocity_events(session_id);
CREATE INDEX idx_velocity_signal ON public.velocity_events(action_signal_level);
CREATE INDEX idx_velocity_days ON public.velocity_events(days_since_assessment);

ALTER TABLE public.velocity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own velocity events"
  ON public.velocity_events
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own velocity events"
  ON public.velocity_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Step 9: Enhanced ROI actuals
CREATE TABLE public.roi_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  pilot_tracker_id UUID,
  user_id UUID,
  
  predicted_conservative_monthly NUMERIC(12,2),
  predicted_likely_monthly NUMERIC(12,2),
  
  actual_monthly_value NUMERIC(12,2),
  currency_code TEXT DEFAULT 'USD',
  unit_type public.roi_unit_type NOT NULL,
  unit_value_monthly NUMERIC(12,2),
  baseline_value_monthly NUMERIC(12,2),
  window_days INTEGER DEFAULT 30,
  
  provenance public.roi_provenance NOT NULL,
  provenance_weight NUMERIC(3,2) DEFAULT 1.0 CHECK (provenance_weight BETWEEN 0 AND 1),
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  confidence_weight NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence_weight BETWEEN 0 AND 1),
  
  aggregate_weight NUMERIC(3,2) GENERATED ALWAYS AS (
    provenance_weight * confidence_weight
  ) STORED,
  
  fte_count INTEGER DEFAULT 1,
  normalized_monthly_per_fte NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE WHEN fte_count > 0 THEN actual_monthly_value / fte_count ELSE NULL END
  ) STORED,
  
  roi_variance_pct NUMERIC(6,2),
  exceeded_prediction BOOLEAN,
  
  actual_metric_description TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reported_via TEXT,
  
  allow_index_aggregation BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_roi_session ON public.roi_actuals(session_id);
CREATE INDEX idx_roi_provenance ON public.roi_actuals(provenance);
CREATE INDEX idx_roi_aggregation ON public.roi_actuals(allow_index_aggregation) WHERE allow_index_aggregation = true;

ALTER TABLE public.roi_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roi actuals"
  ON public.roi_actuals
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own roi actuals"
  ON public.roi_actuals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own roi actuals"
  ON public.roi_actuals
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Step 10: Adoption momentum (FIXED: regular columns + trigger for time-based calcs)
CREATE TABLE public.adoption_momentum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_identifier_hash TEXT NOT NULL UNIQUE,
  
  total_assessments INTEGER DEFAULT 0,
  total_unique_users INTEGER DEFAULT 0,
  total_advisory_sprints INTEGER DEFAULT 0,
  total_workshop_bookings INTEGER DEFAULT 0,
  
  first_assessment_date TIMESTAMP WITH TIME ZONE,
  latest_assessment_date TIMESTAMP WITH TIME ZONE,
  days_between_first_last INTEGER,
  
  referred_companies INTEGER DEFAULT 0,
  verified_referrals INTEGER DEFAULT 0,
  
  -- Momentum components (updated by trigger, not generated)
  repeat_rate_capped NUMERIC(5,2) DEFAULT 0,
  team_growth_sqrt NUMERIC(5,2) DEFAULT 0,
  referral_quality_score NUMERIC(5,2) DEFAULT 0,
  recency_decay NUMERIC(5,2) DEFAULT 1.0,
  
  momentum_score INTEGER DEFAULT 0,
  momentum_tier public.momentum_tier,
  
  industry TEXT,
  company_size TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_adoption_company_hash ON public.adoption_momentum(company_identifier_hash);
CREATE INDEX idx_adoption_momentum_score ON public.adoption_momentum(momentum_score DESC);
CREATE INDEX idx_adoption_latest_date ON public.adoption_momentum(latest_assessment_date DESC);

ALTER TABLE public.adoption_momentum ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for adoption momentum"
  ON public.adoption_momentum
  FOR SELECT
  USING (false);

CREATE POLICY "Service role can manage adoption momentum"
  ON public.adoption_momentum
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Step 11: Referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_company_hash TEXT NOT NULL,
  referred_company_hash TEXT NOT NULL,
  referred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  referred_company_completed_assessment BOOLEAN DEFAULT false,
  referred_company_first_assessment_date TIMESTAMP WITH TIME ZONE,
  
  referral_source TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(referring_company_hash, referred_company_hash)
);

CREATE INDEX idx_referrals_referring ON public.referrals(referring_company_hash);
CREATE INDEX idx_referrals_completed ON public.referrals(referred_company_completed_assessment);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for referrals"
  ON public.referrals
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Step 12: Security definer function for company hashing
CREATE OR REPLACE FUNCTION public.hash_company_identifier(email_domain TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_salt TEXT;
  normalized_domain TEXT;
BEGIN
  SELECT salt_value INTO active_salt
  FROM public.company_identifier_salt
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  normalized_domain := LOWER(TRIM(email_domain));
  
  RETURN encode(
    digest(active_salt || normalized_domain, 'sha256'),
    'hex'
  );
END;
$$;

-- Step 13: Bootstrap CI calculation
CREATE OR REPLACE FUNCTION public.calculate_bootstrap_ci(
  sample_values NUMERIC[],
  confidence_level NUMERIC DEFAULT 0.95,
  iterations INTEGER DEFAULT 1000
)
RETURNS TABLE(mean NUMERIC, ci_lower NUMERIC, ci_upper NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sample_size INTEGER;
  bootstrap_means NUMERIC[];
  lower_percentile NUMERIC;
  upper_percentile NUMERIC;
  i INTEGER;
  bootstrap_sample NUMERIC[];
  bootstrap_mean NUMERIC;
BEGIN
  sample_size := array_length(sample_values, 1);
  
  IF sample_size < 10 THEN
    RETURN QUERY SELECT 
      AVG(v)::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC
    FROM unnest(sample_values) AS v;
    RETURN;
  END IF;
  
  bootstrap_means := ARRAY[]::NUMERIC[];
  FOR i IN 1..iterations LOOP
    SELECT array_agg(sample_values[1 + floor(random() * sample_size)::int])
    INTO bootstrap_sample
    FROM generate_series(1, sample_size);
    
    SELECT AVG(v) INTO bootstrap_mean FROM unnest(bootstrap_sample) AS v;
    bootstrap_means := array_append(bootstrap_means, bootstrap_mean);
  END LOOP;
  
  lower_percentile := (1 - confidence_level) / 2;
  upper_percentile := 1 - lower_percentile;
  
  RETURN QUERY
  WITH stats AS (
    SELECT 
      AVG(v) AS sample_mean,
      percentile_cont(lower_percentile) WITHIN GROUP (ORDER BY v) AS ci_low,
      percentile_cont(upper_percentile) WITHIN GROUP (ORDER BY v) AS ci_high
    FROM unnest(bootstrap_means) AS v
  )
  SELECT 
    sample_mean::NUMERIC,
    ci_low::NUMERIC,
    ci_high::NUMERIC
  FROM stats;
END;
$$;

-- Step 14: Round percentiles
CREATE OR REPLACE FUNCTION public.round_percentile(
  raw_percentile NUMERIC,
  rounding INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN (ROUND(raw_percentile / rounding) * rounding)::INTEGER;
END;
$$;

-- Step 15: Consent audit trigger
CREATE OR REPLACE FUNCTION public.log_consent_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.consent_flags IS DISTINCT FROM NEW.consent_flags THEN
    INSERT INTO public.consent_audit (
      participant_id,
      user_id,
      consent_purpose,
      previous_value,
      new_value,
      changed_by
    )
    SELECT 
      NEW.id,
      NEW.user_id,
      purpose::public.consent_purpose,
      (OLD.consent_flags->>purpose)::boolean,
      (NEW.consent_flags->>purpose)::boolean,
      'user'
    FROM jsonb_object_keys(NEW.consent_flags) AS purpose
    WHERE (OLD.consent_flags->>purpose)::boolean IS DISTINCT FROM (NEW.consent_flags->>purpose)::boolean;
    
    NEW.consent_updated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER consent_audit_trigger
  BEFORE UPDATE ON public.index_participant_data
  FOR EACH ROW
  EXECUTE FUNCTION public.log_consent_change();

-- Step 16: Calculate momentum components trigger
CREATE OR REPLACE FUNCTION public.calculate_momentum_components()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Repeat rate (capped at 10)
  NEW.repeat_rate_capped := LEAST(
    CASE WHEN NEW.days_between_first_last > 0 
      THEN (NEW.total_assessments::NUMERIC / NEW.days_between_first_last) * 30
      ELSE 0
    END,
    10.0
  );
  
  -- Team growth (square root)
  NEW.team_growth_sqrt := SQRT(NEW.total_unique_users::NUMERIC);
  
  -- Referral quality
  NEW.referral_quality_score := NEW.verified_referrals::NUMERIC * 1.0;
  
  -- Recency decay (time-based)
  NEW.recency_decay := CASE 
    WHEN NEW.latest_assessment_date >= NOW() - INTERVAL '30 days' THEN 1.0
    WHEN NEW.latest_assessment_date >= NOW() - INTERVAL '60 days' THEN 0.7
    WHEN NEW.latest_assessment_date >= NOW() - INTERVAL '90 days' THEN 0.4
    ELSE 0.1
  END;
  
  -- Final momentum score
  NEW.momentum_score := ROUND(
    40 * NEW.repeat_rate_capped +
    30 * LEAST(NEW.team_growth_sqrt, 5.0) +
    20 * LEAST(NEW.referral_quality_score, 3.0) +
    10 * NEW.recency_decay
  )::INTEGER;
  
  -- Set momentum tier
  NEW.momentum_tier := CASE
    WHEN NEW.momentum_score >= 70 THEN 'institutionalizing'::public.momentum_tier
    WHEN NEW.momentum_score >= 40 THEN 'scaling'::public.momentum_tier
    ELSE 'experimenting'::public.momentum_tier
  END;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_momentum_trigger
  BEFORE INSERT OR UPDATE ON public.adoption_momentum
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_momentum_components();