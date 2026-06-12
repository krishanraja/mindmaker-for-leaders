-- Batched, RLS-safe touch for the memory-reliance signal. One UPDATE over an array; self-scopes
-- to auth.uid() so it is safe to GRANT to authenticated (export/edge fns run on a user JWT).
-- Service role (auth.uid() IS NULL) retains touch-any for facts it legitimately loaded.

create or replace function touch_memory_facts(p_fact_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $FN$
declare v_touched integer;
begin
  if p_fact_ids is null or array_length(p_fact_ids, 1) is null then
    return 0;
  end if;
  update public.user_memory
  set reference_count    = reference_count + 1,
      last_referenced_at = now()
  where id = any(p_fact_ids)
    and is_current = true
    and (user_id = auth.uid() or auth.uid() is null);
  get diagnostics v_touched = row_count;
  return v_touched;
end;
$FN$;

-- Retro-fence the pre-existing single-id fn with the same tenant guard.
create or replace function touch_memory_fact(p_fact_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $FN$
begin
  update public.user_memory
  set reference_count    = reference_count + 1,
      last_referenced_at = now()
  where id = p_fact_id
    and is_current = true
    and (user_id = auth.uid() or auth.uid() is null);
end;
$FN$;

grant execute on function touch_memory_facts(uuid[]) to authenticated;
grant execute on function touch_memory_facts(uuid[]) to service_role;
grant execute on function touch_memory_fact(uuid)  to authenticated;
grant execute on function touch_memory_fact(uuid)  to service_role;
