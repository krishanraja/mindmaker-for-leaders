-- personal_pool_cache: the per-user (Tier 2) half of the Home curation cache.
--
-- The shared daily pool lives in live_headlines_cache (one gather/day for
-- everyone). This table holds each leader's RE-SCORED feed (the shared pool
-- ranked against their brain by personalization-core), so the relevance pass
-- runs once per user per day. The `signature` is the brainSignature: when the
-- brain changes (a new memory, decision, tuning, or interest), the signature
-- changes and the next request re-scores instead of serving a stale feed - the
-- self-recursive refresh. Owner-scoped; the edge function writes via service role.
-- Idempotent: safe to re-run.

create table if not exists personal_pool_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_date date not null,
  -- brainSignature() at the time this feed was scored; a mismatch busts the cache.
  signature text not null,
  -- the scored HeadlineCard[] for this leader, this day.
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, briefing_date)
);

alter table personal_pool_cache enable row level security;

-- Owner-scoped RLS (no IF NOT EXISTS for policies, so drop-then-create).
drop policy if exists personal_pool_cache_select_own on personal_pool_cache;
create policy personal_pool_cache_select_own on personal_pool_cache
  for select using (auth.uid() = user_id);
