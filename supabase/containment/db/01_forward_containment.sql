-- Forward-only production containment candidate.
-- Source evidence: independently verified live catalog state plus repository
-- revision 9d23e92c189ee304c983e36123c10022bea8c556.
--
-- This migration changes privileges and removes one exact legacy pg_cron
-- schedule through cron.unschedule(). It performs no application-data writes,
-- deletes, truncation, backfill, ownership change, policy DDL, trigger DDL, or
-- function body change. Existing RLS policies remain intact as evidence.

begin;
set local statement_timeout = '15s';
set local lock_timeout = '2s';
set local idle_in_transaction_session_timeout = '30s';
set local search_path = pg_catalog, public;
set local row_security = off;

-- Fail before changing ACLs if the exact required roles, relations, or
-- privileged function signatures are not present. The latent claim RPC is the
-- sole optional object because it was independently verified absent live.
do $object_guard$
declare
  relation_name text;
  relation_oid oid;
  function_signature text;
  function_oid oid;
  owner_name text;
  is_security_definer boolean;
begin
  if exists (
    select 1
    from (values ('anon'), ('authenticated'), ('service_role')) expected(role_name)
    left join pg_roles r on r.rolname = expected.role_name
    where r.oid is null
  ) then
    raise exception 'containment aborted: one or more required Supabase roles are absent';
  end if;

  if to_regclass('cron.job') is null then
    raise exception 'containment aborted: required pg_cron catalog cron.job is absent';
  end if;

  if to_regprocedure('cron.unschedule(bigint)') is null then
    raise exception 'containment aborted: required function cron.unschedule(bigint) is absent';
  end if;

  foreach relation_name in array array[
    'conversation_sessions',
    'chat_messages',
    'ai_insights_generated',
    'assessment_events',
    'booking_requests',
    'conversion_analytics',
    'engagement_analytics',
    'index_participant_data',
    'lead_qualification_scores',
    'lead_qualifications',
    'prompt_library_profiles',
    'roi_actuals',
    'velocity_events',
    'voice_instrumentation',
    'voice_sessions',
    'user_business_context',
    'audience_contacts',
    'feedback',
    'delivery_subscriptions',
    'portfolio_handoff',
    'tts_quality_snapshots',
    'ai_response_cache',
    'cannes_responses'
  ]
  loop
    select c.oid
      into relation_oid
    from pg_namespace n
    join pg_class c on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = relation_name
      and c.relkind in ('r', 'p');

    if relation_oid is null then
      raise exception 'containment aborted: required table public.% is absent or not a table', relation_name;
    end if;
  end loop;

  foreach function_signature in array array[
    'public.apply_outcome_to_brain(uuid)',
    'public.run_brain_adapt(integer)',
    'public.sync_decision_lineage()',
    'public.get_or_create_memory_settings(uuid)',
    'public.trigger_anonymous_booking_sync()',
    'public.trigger_anonymous_lead_sync()'
  ]
  loop
    function_oid := to_regprocedure(function_signature);
    if function_oid is null then
      raise exception 'containment aborted: required function % is absent', function_signature;
    end if;

    select r.rolname, p.prosecdef
      into owner_name, is_security_definer
    from pg_proc p
    join pg_roles r on r.oid = p.proowner
    where p.oid = function_oid;

    if owner_name <> 'postgres' or not is_security_definer then
      raise exception
        'containment aborted: function % no longer matches verified SECURITY DEFINER owner postgres shape',
        function_signature;
    end if;
  end loop;
end
$object_guard$;

-- Quarantine the 21 exact live-verified tables from direct PUBLIC, anon, and
-- authenticated access. Capture effective service_role table privileges,
-- column-only privileges, and grant-option state before revocation. Regrant and
-- assert that service access inside this transaction before commit.
do $table_quarantine$
declare
  relation_name text;
  relation_oid oid;
  column_name text;
  table_grants jsonb;
  column_grants jsonb;
  grant_record record;
  supported_table_privileges text[];
begin
  foreach relation_name in array array[
    'conversation_sessions',
    'chat_messages',
    'ai_insights_generated',
    'assessment_events',
    'booking_requests',
    'conversion_analytics',
    'engagement_analytics',
    'index_participant_data',
    'lead_qualification_scores',
    'lead_qualifications',
    'prompt_library_profiles',
    'roi_actuals',
    'velocity_events',
    'voice_instrumentation',
    'voice_sessions',
    'user_business_context',
    'audience_contacts',
    'feedback',
    'delivery_subscriptions',
    'portfolio_handoff',
    'tts_quality_snapshots'
  ]
  loop
    relation_oid := to_regclass(format('public.%I', relation_name));

    select array_agg(acl.privilege_type order by acl.privilege_type)
      into supported_table_privileges
    from pg_class c
    cross join lateral aclexplode(acldefault('r', c.relowner)) acl
    where c.oid = relation_oid;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'privilege_name', p.name,
          'grantable', has_table_privilege(
            'service_role', relation_oid, p.name || ' WITH GRANT OPTION'
          )
        ) order by p.name
      ) filter (
        where has_table_privilege('service_role', relation_oid, p.name)
      ),
      '[]'::jsonb
    )
      into table_grants
    from unnest(supported_table_privileges) as p(name);

    -- Save column privileges that would not be fully reconstructed by the
    -- captured table-level grant, including stronger column grant options.
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'column_name', a.attname,
          'privilege_name', p.name,
          'grantable', has_column_privilege(
            'service_role', relation_oid, a.attnum, p.name || ' WITH GRANT OPTION'
          )
        ) order by a.attnum, p.name
      ) filter (
        where has_column_privilege('service_role', relation_oid, a.attnum, p.name)
          and (
            not has_table_privilege('service_role', relation_oid, p.name)
            or (
              has_column_privilege(
                'service_role', relation_oid, a.attnum, p.name || ' WITH GRANT OPTION'
              )
              and not has_table_privilege(
                'service_role', relation_oid, p.name || ' WITH GRANT OPTION'
              )
            )
          )
      ),
      '[]'::jsonb
    )
      into column_grants
    from pg_attribute a
    cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']::text[]) p(name)
    where a.attrelid = relation_oid
      and a.attnum > 0
      and not a.attisdropped;

    execute format(
      'revoke all privileges on table public.%I from PUBLIC, anon, authenticated',
      relation_name
    );

    -- Explicitly remove every grantable column privilege. This makes the
    -- column boundary independent of server-version REVOKE behavior.
    for column_name in
      select a.attname
      from pg_attribute a
      where a.attrelid = relation_oid
        and a.attnum > 0
        and not a.attisdropped
      order by a.attnum
    loop
      execute format(
        'revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) '
        'on table public.%2$I from PUBLIC, anon, authenticated',
        column_name,
        relation_name
      );
    end loop;

    for grant_record in
      select *
      from jsonb_to_recordset(table_grants)
        as x(privilege_name text, grantable boolean)
    loop
      execute format(
        'grant %s on table public.%I to service_role%s',
        grant_record.privilege_name,
        relation_name,
        case when grant_record.grantable then ' with grant option' else '' end
      );
    end loop;

    for grant_record in
      select *
      from jsonb_to_recordset(column_grants)
        as x(column_name text, privilege_name text, grantable boolean)
    loop
      execute format(
        'grant %s (%I) on table public.%I to service_role%s',
        grant_record.privilege_name,
        grant_record.column_name,
        relation_name,
        case when grant_record.grantable then ' with grant option' else '' end
      );
    end loop;

    if exists (
      select 1
      from (values ('anon'), ('authenticated')) r(role_name)
      cross join unnest(supported_table_privileges) p(name)
      where has_table_privilege(r.role_name, relation_oid, p.name)
    ) or exists (
      select 1
      from (values ('anon'), ('authenticated')) r(role_name)
      cross join pg_attribute a
      cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']::text[]) p(name)
      where a.attrelid = relation_oid
        and a.attnum > 0
        and not a.attisdropped
        and has_column_privilege(r.role_name, relation_oid, a.attnum, p.name)
    ) then
      raise exception 'containment aborted: client privilege remains on public.%', relation_name;
    end if;

    for grant_record in
      select *
      from jsonb_to_recordset(table_grants)
        as x(privilege_name text, grantable boolean)
    loop
      if not has_table_privilege(
        'service_role',
        relation_oid,
        grant_record.privilege_name ||
          case when grant_record.grantable then ' WITH GRANT OPTION' else '' end
      ) then
        raise exception 'containment aborted: service_role table privilege was not preserved on public.%', relation_name;
      end if;
    end loop;

    for grant_record in
      select *
      from jsonb_to_recordset(column_grants)
        as x(column_name text, privilege_name text, grantable boolean)
    loop
      if not has_column_privilege(
        'service_role',
        relation_oid,
        grant_record.column_name,
        grant_record.privilege_name ||
          case when grant_record.grantable then ' WITH GRANT OPTION' else '' end
      ) then
        raise exception 'containment aborted: service_role column privilege was not preserved on public.%.%', relation_name, grant_record.column_name;
      end if;
    end loop;
  end loop;
end
$table_quarantine$;

-- Restrict only direct PUBLIC and anon INSERT on the Cannes response table.
-- Other roles and operations remain unchanged by explicit scope decision.
do $onboarding_quarantine$
declare
  relation_oid oid := to_regclass('public.cannes_responses');
  column_name text;
  table_grantable boolean;
  table_insert boolean;
  column_grants jsonb;
  grant_record record;
begin
  table_insert := has_table_privilege('service_role', relation_oid, 'INSERT');
  table_grantable := has_table_privilege(
    'service_role', relation_oid, 'INSERT WITH GRANT OPTION'
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'column_name', a.attname,
        'grantable', has_column_privilege(
          'service_role', relation_oid, a.attnum, 'INSERT WITH GRANT OPTION'
        )
      ) order by a.attnum
    ) filter (
      where has_column_privilege('service_role', relation_oid, a.attnum, 'INSERT')
        and (
          not table_insert
          or (
            has_column_privilege(
              'service_role', relation_oid, a.attnum, 'INSERT WITH GRANT OPTION'
            ) and not table_grantable
          )
        )
    ),
    '[]'::jsonb
  )
    into column_grants
  from pg_attribute a
  where a.attrelid = relation_oid
    and a.attnum > 0
    and not a.attisdropped;

  revoke insert on table public.cannes_responses from PUBLIC, anon;
  for column_name in
    select a.attname
    from pg_attribute a
    where a.attrelid = relation_oid
      and a.attnum > 0
      and not a.attisdropped
    order by a.attnum
  loop
    execute format(
      'revoke insert (%I) on table public.cannes_responses from PUBLIC, anon',
      column_name
    );
  end loop;

  if table_insert then
    execute 'grant insert on table public.cannes_responses to service_role' ||
      case when table_grantable then ' with grant option' else '' end;
  end if;

  for grant_record in
    select *
    from jsonb_to_recordset(column_grants)
      as x(column_name text, grantable boolean)
  loop
    execute format(
      'grant insert (%I) on table public.cannes_responses to service_role%s',
      grant_record.column_name,
      case when grant_record.grantable then ' with grant option' else '' end
    );
  end loop;

  if has_table_privilege('anon', relation_oid, 'INSERT') or exists (
    select 1
    from pg_attribute a
    where a.attrelid = relation_oid
      and a.attnum > 0
      and not a.attisdropped
      and has_column_privilege('anon', relation_oid, a.attnum, 'INSERT')
  ) then
    raise exception 'containment aborted: anonymous INSERT remains on public.cannes_responses';
  end if;

  if table_insert and not has_table_privilege(
    'service_role', relation_oid,
    'INSERT' || case when table_grantable then ' WITH GRANT OPTION' else '' end
  ) then
    raise exception 'containment aborted: service_role INSERT was not preserved on public.cannes_responses';
  end if;

  for grant_record in
    select *
    from jsonb_to_recordset(column_grants)
      as x(column_name text, grantable boolean)
  loop
    if not has_column_privilege(
      'service_role',
      relation_oid,
      grant_record.column_name,
      'INSERT' || case when grant_record.grantable then ' WITH GRANT OPTION' else '' end
    ) then
      raise exception
        'containment aborted: service_role INSERT was not preserved on public.cannes_responses.%',
        grant_record.column_name;
    end if;
  end loop;
end
$onboarding_quarantine$;

-- Disable the shared AI cache for every Data API role, including service_role.
-- Callers must treat cache failures as misses.
do $cache_quarantine$
declare
  relation_oid oid := to_regclass('public.ai_response_cache');
  column_name text;
  supported_table_privileges text[];
begin
  select array_agg(acl.privilege_type order by acl.privilege_type)
    into supported_table_privileges
  from pg_class c
  cross join lateral aclexplode(acldefault('r', c.relowner)) acl
  where c.oid = relation_oid;

  revoke all privileges on table public.ai_response_cache
    from PUBLIC, anon, authenticated, service_role;

  for column_name in
    select a.attname
    from pg_attribute a
    where a.attrelid = relation_oid
      and a.attnum > 0
      and not a.attisdropped
    order by a.attnum
  loop
    execute format(
      'revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) '
      'on table public.ai_response_cache from PUBLIC, anon, authenticated, service_role',
      column_name
    );
  end loop;

  if exists (
    select 1
    from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
    cross join unnest(supported_table_privileges) p(name)
    where has_table_privilege(r.role_name, relation_oid, p.name)
  ) or exists (
    select 1
    from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
    cross join pg_attribute a
    cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']::text[]) p(name)
    where a.attrelid = relation_oid
      and a.attnum > 0
      and not a.attisdropped
      and has_column_privilege(r.role_name, relation_oid, a.attnum, p.name)
  ) then
    raise exception 'containment aborted: Data API privilege remains on public.ai_response_cache';
  end if;
end
$cache_quarantine$;

-- Remove every Data API execution path from five exact live-verified SECURITY
-- DEFINER functions. Trigger invocation itself does not require direct EXECUTE
-- through PostgREST. The memory settings helper is handled separately below.
do $function_quarantine$
declare
  function_signature text;
  function_oid oid;
begin
  foreach function_signature in array array[
    'public.apply_outcome_to_brain(uuid)',
    'public.run_brain_adapt(integer)',
    'public.sync_decision_lineage()',
    'public.trigger_anonymous_booking_sync()',
    'public.trigger_anonymous_lead_sync()'
  ]
  loop
    function_oid := to_regprocedure(function_signature);
    execute format(
      'revoke all privileges on function %s from PUBLIC, anon, authenticated, service_role',
      function_oid::regprocedure
    );

    if has_function_privilege('anon', function_oid, 'EXECUTE')
       or has_function_privilege('authenticated', function_oid, 'EXECUTE')
       or has_function_privilege('service_role', function_oid, 'EXECUTE') then
      raise exception 'containment aborted: Data API EXECUTE remains on %', function_signature;
    end if;
  end loop;

  -- Explicit product decision: this is the sole transitional server-callable
  -- helper. Remove any prior grant topology, then grant non-grantable EXECUTE
  -- to service_role only.
  function_oid := to_regprocedure('public.get_or_create_memory_settings(uuid)');
  execute format(
    'revoke all privileges on function %s from PUBLIC, anon, authenticated, service_role',
    function_oid::regprocedure
  );
  execute format(
    'grant execute on function %s to service_role',
    function_oid::regprocedure
  );

  if has_function_privilege('anon', function_oid, 'EXECUTE')
     or has_function_privilege('authenticated', function_oid, 'EXECUTE')
     or not has_function_privilege('service_role', function_oid, 'EXECUTE')
     or has_function_privilege(
       'service_role', function_oid, 'EXECUTE WITH GRANT OPTION'
     ) then
    raise exception 'containment aborted: transitional memory helper ACL is not exact';
  end if;
end
$function_quarantine$;

-- Repository history can create this unsafe SECURITY DEFINER claim RPC. It was
-- absent in the verified live catalog, so absence is allowed. If present, make
-- it inaccessible to every Data API role. The owner retains inspection access.
do $latent_claim_quarantine$
declare
  function_oid oid := to_regprocedure('public.claim_user_history(uuid,uuid,text)');
begin
  if function_oid is not null then
    execute format(
      'revoke all privileges on function %s from PUBLIC, anon, authenticated, service_role',
      function_oid::regprocedure
    );

    if has_function_privilege('anon', function_oid, 'EXECUTE')
       or has_function_privilege('authenticated', function_oid, 'EXECUTE')
       or has_function_privilege('service_role', function_oid, 'EXECUTE') then
      raise exception 'containment aborted: claim_user_history remains executable by a Data API role';
    end if;
  else
    raise notice 'latent claim function remains absent';
  end if;
end
$latent_claim_quarantine$;

-- A historical migration can recreate this retired outbound-email schedule.
-- Remove every matching job idempotently. Readback deliberately exposes no
-- schedule, command, headers, configuration values, or other secret material.
do $legacy_cron_quarantine$
declare
  target_job record;
begin
  for target_job in
    select jobid
    from cron.job
    where jobname = 'kit-nudges-email'
    order by jobid
  loop
    perform cron.unschedule(target_job.jobid);
  end loop;

  if exists (
    select 1 from cron.job where jobname = 'kit-nudges-email'
  ) then
    raise exception 'containment aborted: legacy kit-nudges-email cron job remains scheduled';
  end if;
end
$legacy_cron_quarantine$;

commit;
