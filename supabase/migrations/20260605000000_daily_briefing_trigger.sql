-- Daily briefing trigger: the morning email that gives CTRL a real daily loop.
-- Adds an opt-in column and schedules the send-daily-briefing edge function via
-- pg_cron. Idempotent: safe to re-run.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Opt-in flag. Defaults to false so deploying this never blasts the user base:
-- a leader (or the owner, deliberately) must enable it. The settings toggle and
-- upsert-notification-prefs write this column.
alter table if exists leader_notification_prefs
  add column if not exists daily_briefing_enabled boolean not null default false;

-- Re-schedule cleanly for idempotency (unschedule only if it already exists).
select cron.unschedule('daily-briefing-email')
where exists (select 1 from cron.job where jobname = 'daily-briefing-email');

-- 12:00 UTC daily (~morning across the US). Per-user timezone-aware scheduling
-- is a later refinement; v1 sends one global pass. The service-role key comes
-- from the same Postgres setting the existing net.http_post triggers use, so it
-- is never hardcoded here. send-daily-briefing has verify_jwt = false.
select cron.schedule(
  'daily-briefing-email',
  '0 12 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/send-daily-briefing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
