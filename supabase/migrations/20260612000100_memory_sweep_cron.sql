-- Phase 0 / ITEM 2: schedule the dormant memory engines + the touch-immune synth gate.
-- Adds content_changed_at (the gate signal the touch does NOT move), a trigger that bumps it
-- only on genuine content change, the per-user synth watermark, a batch RPC, and the nightly
-- sweep cron (pg_cron + pg_net, same pattern as daily-briefing). Idempotent.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- (A) GATE-FIX: a content-change watermark that touch_memory_facts does NOT advance.
alter table if exists user_memory
  add column if not exists content_changed_at timestamptz default now();

-- Backfill existing rows so the first sweep has a sane baseline.
update user_memory set content_changed_at = coalesce(updated_at, created_at, now())
where content_changed_at is null;

-- Bump content_changed_at ONLY when fact content actually changes (create handled by default;
-- value/context edit or a verification-status change counts; a pure touch does NOT, because
-- touch only writes reference_count + last_referenced_at).
create or replace function bump_content_changed_at()
returns trigger
language plpgsql
as $FN$
begin
  if (tg_op = 'INSERT') then
    new.content_changed_at := now();
  elsif (tg_op = 'UPDATE') then
    if (new.fact_value is distinct from old.fact_value)
       or (new.fact_context is distinct from old.fact_context)
       or (new.verification_status is distinct from old.verification_status)
       or (new.is_current is distinct from old.is_current) then
      new.content_changed_at := now();
    end if;
    -- else: pure touch (reference_count/last_referenced_at only) -> leave content_changed_at untouched
  end if;
  return new;
end;
$FN$;

drop trigger if exists bump_content_changed_at_trigger on user_memory;
create trigger bump_content_changed_at_trigger
  before insert or update on user_memory
  for each row execute function bump_content_changed_at();

-- (B) Per-user synthesis watermark on the existing 1:1 budget row. NULL = never synthesized.
alter table if exists user_memory_budget
  add column if not exists last_synthesized_at timestamptz;

-- (C) Index for the active-users-by-stale-synthesis scan.
create index if not exists idx_user_memory_active_by_user
  on user_memory (user_id)
  where is_current = true and archived_at is null;

-- (D) Batch selector - GATE FIX APPLIED: last_fact_change = max(content_changed_at), NOT max(updated_at).
create or replace function get_memory_sweep_batch(p_limit int default 25)
returns table (user_id uuid, last_fact_change timestamptz, last_synth timestamptz)
language sql
security definer
set search_path = public
as $FN$
  select um.user_id,
         max(um.content_changed_at) as last_fact_change,   -- touch-immune signal
         b.last_synthesized_at      as last_synth
  from user_memory um
  left join user_memory_budget b on b.user_id = um.user_id
  where um.is_current = true and um.archived_at is null
  group by um.user_id, b.last_synthesized_at
  order by b.last_synthesized_at asc nulls first
  limit p_limit;
$FN$;

-- (E) The nightly sweep cron. 03:00 UTC - quiet, off 12:00 briefing / 14:00 kit-nudge slots,
-- BEFORE the 12:00 briefing build so it reads freshly re-temperatured + newly-synthesized data.
select cron.unschedule('memory-sweep-nightly')
where exists (select 1 from cron.job where jobname = 'memory-sweep-nightly');

select cron.schedule(
  'memory-sweep-nightly',
  '0 3 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/memory-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
