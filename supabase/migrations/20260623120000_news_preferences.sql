-- news_preferences: each leader's chosen news priorities, used to re-rank the
-- shared Home headline pool into THEIR feed (src/lib/newsPriority.ts). One row
-- per user, owner-scoped. Idempotent: safe to re-run.

create table if not exists news_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- the nine category ids (src/types/newsCategory.ts) the leader wants lifted.
  boosted_categories text[] not null default '{}',
  -- 'big' (widely-reported moves) | 'practical' (act-on-now) | 'balanced'.
  bias text not null default 'balanced',
  updated_at timestamptz not null default now()
);

alter table news_preferences enable row level security;

-- Owner-scoped RLS (no IF NOT EXISTS for policies, so drop-then-create).
drop policy if exists news_preferences_select_own on news_preferences;
create policy news_preferences_select_own on news_preferences
  for select using (auth.uid() = user_id);

drop policy if exists news_preferences_insert_own on news_preferences;
create policy news_preferences_insert_own on news_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists news_preferences_update_own on news_preferences;
create policy news_preferences_update_own on news_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
