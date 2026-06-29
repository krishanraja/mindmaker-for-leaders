-- Reactivation nudge: idempotency timestamp.
--
-- The cold-start / dormancy trap: decision-watch + send-daily-briefing only fire
-- for leaders who already have decision_cases AND opted into daily emails, so a
-- leader who set CTRL up but never weighed a decision (or lapsed) got ZERO
-- re-engagement. send-reactivation-nudge closes that. It is a lifecycle email
-- (not the marketing-style daily_briefing_enabled opt-in), de-duped on this
-- timestamp: at most one reactivation nudge per leader per re-arm window.

ALTER TABLE public.leader_notification_prefs
  ADD COLUMN IF NOT EXISTS reactivation_nudge_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.leader_notification_prefs.reactivation_nudge_sent_at IS
  'When the last reactivation (first-decision / dormancy) nudge was sent. Dedup key for send-reactivation-nudge; NULL = never nudged.';
