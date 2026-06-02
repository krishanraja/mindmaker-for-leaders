-- Rate limiting table for distributed edge function deployments
-- Replaces in-memory rate limiting with database-backed solution

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_limit_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint on rate_limit_key to prevent duplicates
  CONSTRAINT rate_limits_key_unique UNIQUE (rate_limit_key)
);

-- Index for fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(rate_limit_key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Enable Row Level Security (restrictive - only service role can access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (edge functions use service role key)
CREATE POLICY "Service role only for rate limits"
  ON public.rate_limits
  FOR ALL
  USING (false); -- Effectively blocks all access except service role

-- Function to check and update rate limit atomically
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_rate_limit_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE(
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_reset_at TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- Calculate reset time
  v_reset_at := v_now + (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Try to get or create rate limit entry
  INSERT INTO public.rate_limits (rate_limit_key, request_count, reset_at)
  VALUES (p_rate_limit_key, 1, v_reset_at)
  ON CONFLICT (rate_limit_key) DO UPDATE
  SET
    -- If reset time has passed, reset the counter
    request_count = CASE
      WHEN rate_limits.reset_at < v_now THEN 1
      ELSE rate_limits.request_count + 1
    END,
    reset_at = CASE
      WHEN rate_limits.reset_at < v_now THEN v_reset_at
      ELSE rate_limits.reset_at
    END,
    updated_at = v_now
  RETURNING request_count, reset_at INTO v_current_count, v_reset_at;
  
  -- Check if limit exceeded
  v_allowed := v_current_count <= p_max_requests;
  v_remaining := GREATEST(0, p_max_requests - v_current_count);
  
  -- Clean up expired entries (older than 24 hours)
  DELETE FROM public.rate_limits
  WHERE reset_at < v_now - INTERVAL '24 hours';
  
  RETURN QUERY SELECT v_allowed, v_remaining, v_reset_at;
END;
$$;

-- Function to clean up old rate limit entries (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_at < now() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits TO service_role;







