-- Fix security warnings: Add search_path to functions

-- Fix round_percentile function
CREATE OR REPLACE FUNCTION public.round_percentile(
  raw_percentile NUMERIC,
  rounding INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN (ROUND(raw_percentile / rounding) * rounding)::INTEGER;
END;
$$;

-- Fix calculate_momentum_components function
CREATE OR REPLACE FUNCTION public.calculate_momentum_components()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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