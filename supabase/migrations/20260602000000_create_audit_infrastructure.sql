-- Audit infrastructure for SOC 2 (CC7.2) and GDPR (Art. 30 / accountability).
--
-- The /compliance page and the delete-account function reference these tables
-- but they did not exist. This migration creates them with owner-scoped read
-- access and service-role-only writes, so the application's privileged edge
-- functions can record an immutable-ish trail without exposing it to clients.
--
-- Idempotent: safe to re-run.

-- 1. Data-access / mutation audit trail -------------------------------------
CREATE TABLE IF NOT EXISTS public.data_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,                       -- subject the row pertains to (nullable for system rows)
  actor_id     uuid,                       -- who performed the action (may equal user_id)
  action_type  text NOT NULL,             -- INSERT | UPDATE | DELETE | EXPORT | READ
  table_name   text NOT NULL,
  record_id    text,
  old_values   jsonb,
  new_values   jsonb,
  metadata     jsonb,
  ip_address   text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_audit_log_user_id   ON public.data_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_table     ON public.data_audit_log (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_created   ON public.data_audit_log (created_at DESC);

ALTER TABLE public.data_audit_log ENABLE ROW LEVEL SECURITY;

-- 2. AI-usage audit trail ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid,
  function_name   text NOT NULL,          -- edge function that made the call
  provider        text,                   -- vertex | openai | elevenlabs | perplexity | ...
  model           text,
  purpose         text,                   -- briefing | edge-artifact | transcription | embedding | ...
  prompt_tokens   integer,
  completion_tokens integer,
  total_tokens    integer,
  latency_ms      integer,
  status          text,                   -- ok | fallback | error
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_audit_user      ON public.ai_usage_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_audit_function  ON public.ai_usage_audit (function_name, created_at DESC);

ALTER TABLE public.ai_usage_audit ENABLE ROW LEVEL SECURITY;

-- 3. Policies: a user may read their own audit rows; only the service role
--    (which bypasses RLS) writes. No client INSERT/UPDATE/DELETE is granted,
--    which keeps the trail tamper-resistant from the browser.
DROP POLICY IF EXISTS "own_data_audit_select" ON public.data_audit_log;
CREATE POLICY "own_data_audit_select" ON public.data_audit_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_ai_usage_select" ON public.ai_usage_audit;
CREATE POLICY "own_ai_usage_select" ON public.ai_usage_audit
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Ensure clients cannot write the audit tables directly.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.data_audit_log FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ai_usage_audit FROM anon, authenticated;
