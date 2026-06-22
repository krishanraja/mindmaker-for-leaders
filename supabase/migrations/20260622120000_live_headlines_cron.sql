-- live-headlines daily pre-warm: keep the Home news feed fresh and instant.
--
-- The live-headlines edge function caches one cross-verified, multi-source feed
-- per day in live_headlines_cache (one gather/day total). This migration (1)
-- ensures the cache table exists and (2) schedules a daily pg_cron job that
-- pre-warms tomorrow's feed with ?force=1, so the first user of the day never
-- waits on the multi-source gather. Idempotent: safe to re-run.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Cache table (already created via the Management API in #249; recreated here
-- idempotently so the migration history is self-contained). One row per day.
create table if not exists live_headlines_cache (
  briefing_date date primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- This is a shared, generic industry feed (not user data), read by the client
-- only through the edge function (service role). Keep RLS on with no public
-- policy so nothing is directly selectable; the edge function uses the service
-- role and bypasses RLS.
alter table live_headlines_cache enable row level security;

-- Re-schedule cleanly for idempotency.
select cron.unschedule('live-headlines-prewarm')
where exists (select 1 from cron.job where jobname = 'live-headlines-prewarm');

-- 10:30 UTC daily, ahead of the 12:00 daily-briefing send and the US morning.
-- force=1 makes the function re-gather across all sources and overwrite the
-- day's cache. The service-role key comes from the same Postgres setting the
-- other net.http_post triggers use, so it is never hardcoded here.
select cron.schedule(
  'live-headlines-prewarm',
  '30 10 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/live-headlines?force=1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
