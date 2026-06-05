-- Create leader_notification_prefs.
--
-- This table is written by upsert-notification-prefs and read by
-- send-daily-briefing, but it was missing on remote (local migration history is
-- out of sync), so weekly check-in prefs were silently failing to persist. This
-- creates it with the full shape both functions expect, including the new
-- daily_briefing_enabled opt-in (default false). Owner-scoped RLS; the service
-- role (used by the cron sender) bypasses RLS.

create table if not exists public.leader_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  weekly_checkin_enabled boolean not null default false,
  preferred_day text,
  timezone text,
  daily_briefing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leader_notification_prefs enable row level security;

create policy "own notification prefs select" on public.leader_notification_prefs
  for select using (auth.uid() = user_id);

create policy "own notification prefs insert" on public.leader_notification_prefs
  for insert with check (auth.uid() = user_id);

create policy "own notification prefs update" on public.leader_notification_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
