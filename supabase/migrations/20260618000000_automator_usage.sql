-- Free-tier Automator quota tracking.
--
-- Free tier includes one Automator skill export per calendar month (UTC).
-- Edge Pro is unlimited and never increments this table - the edge function
-- short-circuits the quota check for active or past_due subscribers.
--
-- One row per (user_id, month). Month is stored as 'YYYY-MM' UTC for a clean
-- partition key that the edge function builds at request time without any
-- additional date math.
--
-- RLS is owner-scoped (same shape as user_memory). The service role bypasses
-- RLS for the increment RPC, so the table is safe to read/write from the
-- generate-skill-export edge function under either client.

CREATE TABLE IF NOT EXISTS automator_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  exports_used INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);

ALTER TABLE automator_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automator_usage_owner_select ON automator_usage;
CREATE POLICY automator_usage_owner_select ON automator_usage
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS automator_usage_owner_modify ON automator_usage;
CREATE POLICY automator_usage_owner_modify ON automator_usage
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS automator_usage_user_month_idx
  ON automator_usage (user_id, month DESC);

-- Atomic increment so concurrent exports cannot under-count. SECURITY DEFINER
-- runs with the function-owner's privileges, which lets the edge function call
-- it under either the user JWT or the service role.
CREATE OR REPLACE FUNCTION increment_automator_usage(p_user_id UUID, p_month TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  new_used INT;
BEGIN
  INSERT INTO automator_usage (user_id, month, exports_used, updated_at)
  VALUES (p_user_id, p_month, 1, now())
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    exports_used = automator_usage.exports_used + 1,
    updated_at = now()
  RETURNING exports_used INTO new_used;
  RETURN new_used;
END;
$func$;

REVOKE ALL ON FUNCTION increment_automator_usage(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_automator_usage(UUID, TEXT) TO authenticated, service_role;
