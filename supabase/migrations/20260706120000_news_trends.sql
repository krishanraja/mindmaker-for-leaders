-- news_trends: structural-shift ("trend") surfacing for Home.
--
-- The Home feed answers "what happened today" (live_headlines_cache, one row per
-- day). A structural SHIFT is different: a pattern that recurs across many
-- distinct stories over WEEKS and tells a leader how their org may need to
-- change (e.g. "the rise of the forward-deployed engineer"). The detect-trends
-- edge function reads the last ~3 weeks of live_headlines_cache, has an LLM name
-- candidate shifts, and keeps only those whose cited evidence really recurs
-- across enough distinct days + sources (the confabulation gate in
-- _shared/news-trends.ts). The verified shifts land here, one row per shift.
--
-- Shared, generic industry insight (not per-user), like live_headlines_cache:
-- read by the client only through the edge function (service role). Idempotent.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pgcrypto;

create table if not exists news_trends (
  id uuid primary key default gen_random_uuid(),
  detected_on date not null default current_date,
  category text not null,          -- one of the nine NewsCategoryId lanes
  title text not null,             -- "The rise of the forward-deployed engineer"
  summary text not null,           -- what is changing (grounded in the stories)
  implication text not null,       -- what it means for how a leader organises
  evidence jsonb not null default '[]'::jsonb, -- [{headline, source, url, date}] real dated stories
  day_span int not null default 0,      -- distinct days the theme recurred across
  source_count int not null default 0,  -- distinct corroborating sources
  momentum real not null default 0,     -- durability + recency (ranking)
  is_current boolean not null default true, -- false once a newer detection supersedes it
  created_at timestamptz not null default now()
);

-- The read path pulls the current set ordered by momentum.
create index if not exists news_trends_current_idx on news_trends (is_current, momentum desc);

-- Shared industry insight, not user data. Keep RLS on with no public policy so
-- nothing is directly selectable; the edge function uses the service role and
-- bypasses RLS (mirrors live_headlines_cache).
alter table news_trends enable row level security;

-- Weekly recompute. Shifts move over WEEKS, not days, so a daily job would be
-- wasteful and churny - Monday 11:00 UTC, after the daily live-headlines prewarm
-- (10:30) so the latest day is already in the cache. force=1 runs detection +
-- overwrites the current set. Idempotent by jobname.
select cron.unschedule('detect-trends-weekly')
where exists (select 1 from cron.job where jobname = 'detect-trends-weekly');

select cron.schedule(
  'detect-trends-weekly',
  '0 11 * * 1',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/detect-trends?force=1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
