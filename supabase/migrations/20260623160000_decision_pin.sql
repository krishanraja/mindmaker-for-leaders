-- One pinned decision at a time.
--
-- "Pinned" was only ever "the most recent case" picked at read time; nothing
-- enforced a single focus. This makes it real: a nullable pinned_at + a partial
-- unique index so AT MOST ONE row per user is pinned, an RPC that atomically
-- moves the pin, and a backfill so every existing user has exactly one.

alter table decision_cases add column if not exists pinned_at timestamptz;

create unique index if not exists decision_cases_one_pin
  on decision_cases (user_id)
  where pinned_at is not null;

-- pin_decision: clear the caller's other pins, then pin the target. Atomic so
-- the partial unique index is never transiently violated.
create or replace function pin_decision(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  select user_id into v_user from decision_cases where id = p_case_id;
  if v_user is null or v_user <> auth.uid() then
    raise exception 'not allowed';
  end if;
  update decision_cases
    set pinned_at = null
    where user_id = v_user and pinned_at is not null and id <> p_case_id;
  update decision_cases
    set pinned_at = now()
    where id = p_case_id;
end;
$$;

grant execute on function pin_decision(uuid) to authenticated;

-- Backfill: pin each user's most-recent active case (one per user), skipping
-- any user who somehow already has a pin.
with ranked as (
  select id, user_id,
         row_number() over (partition by user_id order by created_at desc) as rn
  from decision_cases
  where status = 'active'
)
update decision_cases dc
  set pinned_at = now()
  from ranked r
  where dc.id = r.id
    and r.rn = 1
    and not exists (
      select 1 from decision_cases x
      where x.user_id = dc.user_id and x.pinned_at is not null
    );
