-- Daily kit nudge sweep (day-3 and day-7 follow-up emails).
-- Pattern mirrors 20260605000000_daily_briefing_trigger.sql: pg_cron +
-- pg_net POST to the edge function with the service role key. The function
-- itself decides who is due (delivery_email set, day diff 3-4 or 7-8, no
-- prior send of that nudge type, not shipped).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-schedule cleanly for idempotency (unschedule only if it already exists).
select cron.unschedule('kit-nudges-email')
where exists (select 1 from cron.job where jobname = 'kit-nudges-email');

-- 14:00 UTC daily (morning in the US, evening in APAC).
select cron.schedule(
  'kit-nudges-email',
  '0 14 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/send-kit-nudges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
