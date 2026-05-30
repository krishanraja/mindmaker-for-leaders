-- Phase 2 (upgrade/ctrl/rebuild): security + correctness RLS fixes
-- Applied to prod bkyuxvschuwngtcdhsyg via Supabase Management API on 2026-05-30.
--
-- 1) leader_missions / leader_check_ins / leader_progress_snapshots used
--    USING (leader_id = auth.uid()) where leader_id is an FK to leaders.id
--    (an app UUID), not auth.users.id. That predicate matched zero rows for
--    every user, so the post-assessment mission / check-in / progress surface
--    was silently dead. Gate via the owning leaders row instead.
-- 2) tts_config / tts_quality_snapshots had RLS disabled, so any authenticated
--    user could read/write provider config + voice_id. Only service-role edge
--    functions consume these tables (aa-tts-monitor, synthesize-briefing,
--    synthesize-interview-audio), so lock to service_role.

-- ---- leader_missions ----
drop policy if exists "Users can insert their own missions" on public.leader_missions;
drop policy if exists "Users can view their own missions" on public.leader_missions;
drop policy if exists "Users can update their own missions" on public.leader_missions;
create policy "Users can view their own missions" on public.leader_missions
  for select using (leader_id in (select id from public.leaders where user_id = auth.uid()));
create policy "Users can insert their own missions" on public.leader_missions
  for insert with check (leader_id in (select id from public.leaders where user_id = auth.uid()));
create policy "Users can update their own missions" on public.leader_missions
  for update using (leader_id in (select id from public.leaders where user_id = auth.uid()))
  with check (leader_id in (select id from public.leaders where user_id = auth.uid()));

-- ---- leader_check_ins ----
drop policy if exists "Users can insert their own check-ins" on public.leader_check_ins;
drop policy if exists "Users can view their own check-ins" on public.leader_check_ins;
drop policy if exists "Users can update their own check-ins" on public.leader_check_ins;
create policy "Users can view their own check-ins" on public.leader_check_ins
  for select using (leader_id in (select id from public.leaders where user_id = auth.uid()));
create policy "Users can insert their own check-ins" on public.leader_check_ins
  for insert with check (leader_id in (select id from public.leaders where user_id = auth.uid()));
create policy "Users can update their own check-ins" on public.leader_check_ins
  for update using (leader_id in (select id from public.leaders where user_id = auth.uid()))
  with check (leader_id in (select id from public.leaders where user_id = auth.uid()));

-- ---- leader_progress_snapshots ----
drop policy if exists "Users can insert their own progress snapshots" on public.leader_progress_snapshots;
drop policy if exists "Users can view their own progress snapshots" on public.leader_progress_snapshots;
create policy "Users can view their own progress snapshots" on public.leader_progress_snapshots
  for select using (leader_id in (select id from public.leaders where user_id = auth.uid()));
create policy "Users can insert their own progress snapshots" on public.leader_progress_snapshots
  for insert with check (leader_id in (select id from public.leaders where user_id = auth.uid()));

-- ---- tts tables: enable RLS, service-role only ----
alter table public.tts_config enable row level security;
alter table public.tts_quality_snapshots enable row level security;
drop policy if exists "Service role manages tts_config" on public.tts_config;
drop policy if exists "Service role manages tts_quality_snapshots" on public.tts_quality_snapshots;
create policy "Service role manages tts_config" on public.tts_config
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role manages tts_quality_snapshots" on public.tts_quality_snapshots
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
