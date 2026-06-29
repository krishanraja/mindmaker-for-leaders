-- Daily reactivation-nudge sweep (first-decision + dormancy re-engagement).
-- Mirrors 20260610000003_kit_nudge_cron.sql: pg_cron + pg_net POST to the edge
-- function with the service role key. The function itself decides who is due
-- (onboarded-but-never-weighed, or lapsed >14d), de-dupes on
-- leader_notification_prefs.reactivation_nudge_sent_at, and caps the batch.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-schedule cleanly for idempotency.
select cron.unschedule('reactivation-nudge')
where exists (select 1 from cron.job where jobname = 'reactivation-nudge');

-- 13:00 UTC daily (an hour before the kit-nudge sweep, so the two never overlap).
select cron.schedule(
  'reactivation-nudge',
  '0 13 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/send-reactivation-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
