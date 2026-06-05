-- Free-tier compute soft cap support (spine phase B4/B7). Additive only.
-- ai_usage_audit already exists; add an estimated-cost column so a per-user
-- daily spend signal can be summed cheaply, plus an index for the daily lookup.
ALTER TABLE public.ai_usage_audit ADD COLUMN IF NOT EXISTS est_cost_usd numeric;
CREATE INDEX IF NOT EXISTS idx_ai_usage_audit_user_day
  ON public.ai_usage_audit(user_id, created_at);
