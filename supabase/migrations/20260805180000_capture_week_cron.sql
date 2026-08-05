-- Phase 8 / LEARN: schedule the weekly capture pass.
--
-- capture-week reads the last five weeks of `ledger`, applies two strikes, and
-- writes `proposals` rows with status 'awaiting'. It never edits a standard:
-- `criteria` is read and never written, and the only thing that changes a rule
-- is a person answering yes at /proposals.
--
-- Same shape as 20260612000100_memory_sweep_cron.sql: pg_cron + pg_net, a
-- service-role bearer read out of the database setting, and a 3-arg
-- cron.schedule keyed on the jobname, which is idempotent by itself. The
-- unschedule ahead of it makes a re-run of this file replace the schedule
-- rather than error on an existing job.
--
-- SUNDAY 20:00 UTC. Verified free against every cron.schedule call in this
-- migrations tree: 03:00 memory-sweep-nightly, 03:30 brain-adapt-nightly,
-- 06:00 north-star-daily-snapshot, 10:30 live-headlines-prewarm,
-- 11:00 Mon detect-trends-weekly, 12:00 daily-briefing-email,
-- 13:00 reactivation-nudge, 14:00 kit-nudges-email. Sunday
-- evening is deliberate: the week the pass reads is finished, and the owner
-- meets the decisions at the start of the next one rather than in the middle of
-- the week they are about.
--
-- The function must be deployed with verify_jwt off, because the bearer below
-- is a secret rather than a user JWT and the function's own 403 gate is the
-- auth:  supabase functions deploy capture-week --no-verify-jwt

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('capture-week')
where exists (select 1 from cron.job where jobname = 'capture-week');

select cron.schedule(
  'capture-week',
  '0 20 * * 0',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/capture-week',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
