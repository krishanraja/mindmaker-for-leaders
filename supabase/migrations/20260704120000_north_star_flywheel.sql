-- North Star instrumentation: the flywheel metric.
--
-- The one outcome that proves CTRL works: context in, judgment out, recurring.
-- A "flywheel leader" (this week) is a leader who BOTH
--   (a) holds a real brain: at least 5 current facts in user_memory, AND
--   (b) weighed at least one decision in the last 7 days (a decision_cases row).
-- Either half alone is not the product working. Both together is the flywheel
-- turning. brain_rich_users and active_deciders are the two component counts so a
-- dip can be diagnosed (context problem vs engagement problem).

-- Tunable: how many current facts make a brain "real".
create or replace function ns_brain_min_facts() returns int
  language sql immutable as 'select 5';

-- Current snapshot (on-demand). weekly_active_users is any leader with a decision
-- OR a memory write in the last 7 days, the denominator the flywheel converts.
create or replace view north_star_flywheel as
with brain_rich as (
  select user_id
  from user_memory
  where is_current = true
  group by user_id
  having count(*) >= ns_brain_min_facts()
),
active_deciders as (
  select distinct user_id
  from decision_cases
  where created_at >= now() - interval '7 days'
),
weekly_active as (
  select user_id from decision_cases where created_at >= now() - interval '7 days'
  union
  select user_id from user_memory where updated_at >= now() - interval '7 days'
)
select
  (select count(*) from brain_rich br where br.user_id in (select user_id from active_deciders)) as flywheel_users,
  (select count(*) from brain_rich) as brain_rich_users,
  (select count(*) from active_deciders) as active_deciders,
  (select count(distinct user_id) from weekly_active) as weekly_active_users;

-- Daily snapshot for the trend line (so the metric is tracked from day one).
create table if not exists north_star_daily (
  day date primary key,
  flywheel_users int not null default 0,
  brain_rich_users int not null default 0,
  active_deciders int not null default 0,
  weekly_active_users int not null default 0,
  computed_at timestamptz not null default now()
);

-- Owner-scoped analytics table: no public/anon access. Only the service role and
-- the snapshot function (security definer) touch it.
alter table north_star_daily enable row level security;

create or replace function snapshot_north_star() returns void
  language plpgsql security definer set search_path = public as $fn$
begin
  insert into north_star_daily (day, flywheel_users, brain_rich_users, active_deciders, weekly_active_users, computed_at)
  select current_date, flywheel_users, brain_rich_users, active_deciders, weekly_active_users, now()
  from north_star_flywheel
  on conflict (day) do update set
    flywheel_users = excluded.flywheel_users,
    brain_rich_users = excluded.brain_rich_users,
    active_deciders = excluded.active_deciders,
    weekly_active_users = excluded.weekly_active_users,
    computed_at = now();
end;
$fn$;

-- Daily at 06:00 UTC. The 3-arg cron.schedule is idempotent by jobname
-- (reschedules in place if it already exists).
select cron.schedule('north-star-daily-snapshot', '0 6 * * *', 'select snapshot_north_star()');

-- Seed today's row immediately so there is a baseline from day one.
select snapshot_north_star();
