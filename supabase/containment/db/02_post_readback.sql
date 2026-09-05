-- Independent, read-only verification for 01_forward_containment.sql.
-- Run in a fresh database session. PASS proves the named ACL boundary only.
-- Runtime fail-safe behavior and replacement product flows require separate tests.

begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '2s';
set local idle_in_transaction_session_timeout = '30s';
set local search_path = pg_catalog, public;
set local row_security = off;

select
  'post_readback_context' as record_type,
  current_database() as database_name,
  current_user as database_user,
  current_setting('server_version') as server_version,
  clock_timestamp() as observed_at;

-- Exact replay-containment evidence. Expose only existence/count; never select
-- cron.command or any secret-bearing field.
select
  'legacy_cron_job_absence' as record_type,
  'kit-nudges-email' as job_name,
  count(*) = 0 as absent,
  count(*)::bigint as matching_job_count
from cron.job
where jobname = 'kit-nudges-email';

-- Raw relation and table ACL evidence.
with target_relations(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots'),
    ('ai_response_cache'), ('cannes_responses')
)
select
  'relation_catalog' as record_type,
  format('public.%I', t.object_name) as object_name,
  c.oid is not null as object_exists,
  c.relkind,
  owner_role.rolname as owner_name,
  c.relrowsecurity as row_security_enabled,
  c.relforcerowsecurity as row_security_forced,
  c.relacl::text as raw_relacl
from target_relations t
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = t.object_name
left join pg_roles owner_role on owner_role.oid = c.relowner
order by t.object_name;

with target_relations(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots'),
    ('ai_response_cache'), ('cannes_responses')
)
select
  'relation_acl' as record_type,
  format('public.%I', t.object_name) as object_name,
  case when a.grantee = 0 then 'PUBLIC' else grantee_role.rolname end as grantee,
  grantor_role.rolname as grantor,
  a.privilege_type,
  a.is_grantable
from target_relations t
join pg_namespace n on n.nspname = 'public'
join pg_class c on c.relnamespace = n.oid and c.relname = t.object_name
cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
left join pg_roles grantee_role on grantee_role.oid = a.grantee
left join pg_roles grantor_role on grantor_role.oid = a.grantor
order by t.object_name, grantee, a.privilege_type;

-- Raw and expanded column ACL evidence.
with target_relations(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots'),
    ('ai_response_cache'), ('cannes_responses')
)
select
  'raw_column_acl' as record_type,
  format('public.%I', t.object_name) as object_name,
  a.attnum as column_number,
  a.attname as column_name,
  a.attacl::text as raw_attacl
from target_relations t
join pg_namespace n on n.nspname = 'public'
join pg_class c on c.relnamespace = n.oid and c.relname = t.object_name
join pg_attribute a on a.attrelid = c.oid
where a.attnum > 0
  and not a.attisdropped
  and a.attacl is not null
order by t.object_name, a.attnum;

with target_relations(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots'),
    ('ai_response_cache'), ('cannes_responses')
)
select
  'column_acl' as record_type,
  format('public.%I', t.object_name) as object_name,
  a.attnum as column_number,
  a.attname as column_name,
  case when acl.grantee = 0 then 'PUBLIC' else grantee_role.rolname end as grantee,
  grantor_role.rolname as grantor,
  acl.privilege_type,
  acl.is_grantable
from target_relations t
join pg_namespace n on n.nspname = 'public'
join pg_class c on c.relnamespace = n.oid and c.relname = t.object_name
join pg_attribute a on a.attrelid = c.oid
cross join lateral aclexplode(a.attacl) acl
left join pg_roles grantee_role on grantee_role.oid = acl.grantee
left join pg_roles grantor_role on grantor_role.oid = acl.grantor
where a.attnum > 0
  and not a.attisdropped
  and a.attacl is not null
order by t.object_name, a.attnum, grantee, acl.privilege_type;

-- Effective table and column evidence, including grant options. The 21
-- service_role rows are the independent post state to compare with preflight.
with target_relations(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots'),
    ('ai_response_cache'), ('cannes_responses')
), target_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
), privilege_names(privilege_name) as (
  select distinct acl.privilege_type
  from pg_roles r
  cross join lateral aclexplode(acldefault('r', r.oid)) acl
  where r.rolname = current_user
)
select
  'effective_relation_privileges' as record_type,
  format('public.%I', t.object_name) as object_name,
  r.role_name,
  c.oid is not null as object_exists,
  coalesce(
    array_agg(p.privilege_name order by p.privilege_name)
      filter (
        where c.oid is not null
          and role_oid.oid is not null
          and has_table_privilege(r.role_name, c.oid, p.privilege_name)
      ),
    array[]::text[]
  ) as effective_privileges,
  coalesce(
    array_agg(p.privilege_name order by p.privilege_name)
      filter (
        where c.oid is not null
          and role_oid.oid is not null
          and has_table_privilege(
            r.role_name, c.oid, p.privilege_name || ' WITH GRANT OPTION'
          )
      ),
    array[]::text[]
  ) as effective_privileges_with_grant_option
from target_relations t
cross join target_roles r
cross join privilege_names p
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = t.object_name
left join pg_roles role_oid on role_oid.rolname = r.role_name
group by t.object_name, r.role_name, c.oid
order by t.object_name, r.role_name;

with target_relations(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots'),
    ('ai_response_cache'), ('cannes_responses')
), target_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
), privilege_names(privilege_name) as (
  values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')
)
select
  'effective_column_privileges' as record_type,
  format('public.%I', t.object_name) as object_name,
  r.role_name,
  p.privilege_name,
  coalesce(
    array_agg(a.attname order by a.attnum)
      filter (
        where role_oid.oid is not null
          and has_column_privilege(r.role_name, c.oid, a.attnum, p.privilege_name)
      ),
    array[]::text[]
  ) as effective_columns,
  coalesce(
    array_agg(a.attname order by a.attnum)
      filter (
        where role_oid.oid is not null
          and has_column_privilege(
            r.role_name, c.oid, a.attnum, p.privilege_name || ' WITH GRANT OPTION'
          )
      ),
    array[]::text[]
  ) as effective_columns_with_grant_option
from target_relations t
join pg_namespace n on n.nspname = 'public'
join pg_class c on c.relnamespace = n.oid and c.relname = t.object_name
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
cross join target_roles r
cross join privilege_names p
left join pg_roles role_oid on role_oid.rolname = r.role_name
group by t.object_name, r.role_name, p.privilege_name
order by t.object_name, r.role_name, p.privilege_name;

-- Policy catalog and deterministic fingerprints must match preflight exactly.
with target_relations(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots'),
    ('ai_response_cache'), ('cannes_responses')
)
select
  'policy_catalog_preserved' as record_type,
  format('%I.%I', p.schemaname, p.tablename) as object_name,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
from pg_policies p
join target_relations t on t.object_name = p.tablename
where p.schemaname = 'public'
order by p.tablename, p.policyname;

with target_relations(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots'),
    ('ai_response_cache'), ('cannes_responses')
)
select
  'policy_fingerprint' as record_type,
  format('public.%I', t.object_name) as object_name,
  count(p.policyname) as policy_count,
  md5(
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'policyname', p.policyname,
          'permissive', p.permissive,
          'roles', p.roles,
          'cmd', p.cmd,
          'qual', p.qual,
          'with_check', p.with_check
        ) order by p.policyname
      ) filter (where p.policyname is not null),
      '[]'::jsonb
    )::text
  ) as fingerprint
from target_relations t
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = t.object_name
group by t.object_name
order by t.object_name;

-- Function shape, raw ACL, and effective execution evidence.
with target_functions(signature) as (
  values
    ('public.apply_outcome_to_brain(uuid)'),
    ('public.run_brain_adapt(integer)'),
    ('public.sync_decision_lineage()'),
    ('public.get_or_create_memory_settings(uuid)'),
    ('public.trigger_anonymous_booking_sync()'),
    ('public.trigger_anonymous_lead_sync()'),
    ('public.claim_user_history(uuid,uuid,text)')
), resolved as (
  select t.signature, to_regprocedure(t.signature) as procedure_oid
  from target_functions t
)
select
  'function_catalog' as record_type,
  r.signature,
  r.procedure_oid is not null as object_exists,
  owner_role.rolname as owner_name,
  p.prosecdef as security_definer,
  p.proacl::text as raw_proacl,
  case when p.oid is null then null else pg_get_function_identity_arguments(p.oid) end as identity_arguments
from resolved r
left join pg_proc p on p.oid = r.procedure_oid
left join pg_roles owner_role on owner_role.oid = p.proowner
order by r.signature;

with target_functions(signature) as (
  values
    ('public.apply_outcome_to_brain(uuid)'),
    ('public.run_brain_adapt(integer)'),
    ('public.sync_decision_lineage()'),
    ('public.get_or_create_memory_settings(uuid)'),
    ('public.trigger_anonymous_booking_sync()'),
    ('public.trigger_anonymous_lead_sync()'),
    ('public.claim_user_history(uuid,uuid,text)')
), resolved as (
  select t.signature, to_regprocedure(t.signature) as procedure_oid
  from target_functions t
)
select
  'function_acl' as record_type,
  r.signature,
  case when a.grantee = 0 then 'PUBLIC' else grantee_role.rolname end as grantee,
  grantor_role.rolname as grantor,
  a.privilege_type,
  a.is_grantable
from resolved r
join pg_proc p on p.oid = r.procedure_oid
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
left join pg_roles grantee_role on grantee_role.oid = a.grantee
left join pg_roles grantor_role on grantor_role.oid = a.grantor
order by r.signature, grantee;

with target_functions(signature) as (
  values
    ('public.apply_outcome_to_brain(uuid)'),
    ('public.run_brain_adapt(integer)'),
    ('public.sync_decision_lineage()'),
    ('public.get_or_create_memory_settings(uuid)'),
    ('public.trigger_anonymous_booking_sync()'),
    ('public.trigger_anonymous_lead_sync()'),
    ('public.claim_user_history(uuid,uuid,text)')
), target_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
), resolved as (
  select t.signature, to_regprocedure(t.signature) as procedure_oid
  from target_functions t
)
select
  'effective_function_privileges' as record_type,
  r.signature,
  tr.role_name,
  r.procedure_oid is not null as object_exists,
  case
    when r.procedure_oid is null or role_oid.oid is null then null
    else has_function_privilege(tr.role_name, r.procedure_oid, 'EXECUTE')
  end as can_execute,
  case
    when r.procedure_oid is null or role_oid.oid is null then null
    else has_function_privilege(
      tr.role_name, r.procedure_oid, 'EXECUTE WITH GRANT OPTION'
    )
  end as can_execute_with_grant_option
from resolved r
cross join target_roles tr
left join pg_roles role_oid on role_oid.rolname = tr.role_name
order by r.signature, tr.role_name;

-- This fingerprint must exactly equal the preflight value. It covers every
-- effective service_role table and column privilege promised to survive,
-- including grant-option state. Function EXECUTE is deliberately excluded:
-- five functions lose it and the memory helper receives the sole exception.
with
preserved_tables(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots')
), table_privileges(privilege_name) as (
  select distinct acl.privilege_type
  from pg_roles r
  cross join lateral aclexplode(acldefault('r', r.oid)) acl
  where r.rolname = current_user
), column_privileges(privilege_name) as (
  values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')
), table_state as (
  select
    t.object_name,
    p.privilege_name,
    has_table_privilege('service_role', resolved.oid, p.privilege_name) as allowed,
    has_table_privilege(
      'service_role', resolved.oid, p.privilege_name || ' WITH GRANT OPTION'
    ) as grantable
  from preserved_tables t
  cross join table_privileges p
  cross join lateral (
    select to_regclass(format('public.%I', t.object_name)) as oid
  ) resolved
), column_state as (
  select
    t.object_name,
    a.attnum,
    a.attname as column_name,
    p.privilege_name,
    has_column_privilege(
      'service_role', c.oid, a.attnum, p.privilege_name
    ) as allowed,
    has_column_privilege(
      'service_role', c.oid, a.attnum, p.privilege_name || ' WITH GRANT OPTION'
    ) as grantable
  from preserved_tables t
  join pg_class c on c.oid = to_regclass(format('public.%I', t.object_name))
  join pg_attribute a
    on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  cross join column_privileges p
), cannes_state as (
  select
    'cannes_responses'::text as object_name,
    0::smallint as attnum,
    null::name as column_name,
    has_table_privilege('service_role', c.oid, 'INSERT') as allowed,
    has_table_privilege(
      'service_role', c.oid, 'INSERT WITH GRANT OPTION'
    ) as grantable
  from pg_class c
  where c.oid = to_regclass('public.cannes_responses')

  union all

  select
    'cannes_responses',
    a.attnum,
    a.attname,
    has_column_privilege('service_role', c.oid, a.attnum, 'INSERT'),
    has_column_privilege(
      'service_role', c.oid, a.attnum, 'INSERT WITH GRANT OPTION'
    )
  from pg_class c
  join pg_attribute a
    on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where c.oid = to_regclass('public.cannes_responses')
)
select
  'service_role_preservation_fingerprint' as record_type,
  md5(
    jsonb_build_object(
      'tables', coalesce(
        (select jsonb_agg(to_jsonb(s) order by s.object_name, s.privilege_name)
         from table_state s),
        '[]'::jsonb
      ),
      'columns', coalesce(
        (select jsonb_agg(to_jsonb(s) order by s.object_name, s.attnum, s.privilege_name)
         from column_state s),
        '[]'::jsonb
      ),
      'cannes_insert', coalesce(
        (select jsonb_agg(to_jsonb(s) order by s.attnum)
         from cannes_state s),
        '[]'::jsonb
      )
    )::text
  ) as fingerprint;

-- Machine-readable verdict. Missing required objects are violations, not
-- warnings. claim_user_history is the only object allowed to remain absent.
with
quarantined_tables(object_name) as (
  values
    ('conversation_sessions'), ('chat_messages'), ('ai_insights_generated'),
    ('assessment_events'), ('booking_requests'), ('conversion_analytics'),
    ('engagement_analytics'), ('index_participant_data'),
    ('lead_qualification_scores'), ('lead_qualifications'),
    ('prompt_library_profiles'), ('roi_actuals'), ('velocity_events'),
    ('voice_instrumentation'), ('voice_sessions'), ('user_business_context'),
    ('audience_contacts'), ('feedback'), ('delivery_subscriptions'),
    ('portfolio_handoff'), ('tts_quality_snapshots')
), required_relations(object_name) as (
  select object_name from quarantined_tables
  union all select 'ai_response_cache'
  union all select 'cannes_responses'
), client_roles(role_name) as (
  values ('anon'), ('authenticated')
), data_api_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
), table_privileges(privilege_name) as (
  select distinct acl.privilege_type
  from pg_roles r
  cross join lateral aclexplode(acldefault('r', r.oid)) acl
  where r.rolname = current_user
), column_privileges(privilege_name) as (
  values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')
), protected_functions(signature) as (
  values
    ('public.apply_outcome_to_brain(uuid)'),
    ('public.run_brain_adapt(integer)'),
    ('public.sync_decision_lineage()'),
    ('public.get_or_create_memory_settings(uuid)'),
    ('public.trigger_anonymous_booking_sync()'),
    ('public.trigger_anonymous_lead_sync()')
), service_blocked_functions(signature) as (
  values
    ('public.apply_outcome_to_brain(uuid)'),
    ('public.run_brain_adapt(integer)'),
    ('public.sync_decision_lineage()'),
    ('public.trigger_anonymous_booking_sync()'),
    ('public.trigger_anonymous_lead_sync()')
), violations as (
  select
    'missing_role'::text as violation_type,
    r.role_name as detail
  from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
  left join pg_roles actual on actual.rolname = r.role_name
  where actual.oid is null

  union all

  select
    'missing_required_relation',
    format('public.%I', r.object_name)
  from required_relations r
  where to_regclass(format('public.%I', r.object_name)) is null

  union all

  select
    'missing_required_relation',
    'cron.job'
  where to_regclass('cron.job') is null

  union all

  select
    'missing_required_function',
    f.signature
  from protected_functions f
  where to_regprocedure(f.signature) is null

  union all

  select
    'missing_required_function',
    'cron.unschedule(bigint)'
  where to_regprocedure('cron.unschedule(bigint)') is null

  union all

  select
    'legacy_cron_job_present',
    'cron.job:kit-nudges-email'
  where exists (
    select 1 from cron.job where jobname = 'kit-nudges-email'
  )

  union all

  select
    'privileged_function_shape_drift',
    f.signature
  from protected_functions f
  join pg_proc p on p.oid = to_regprocedure(f.signature)
  join pg_roles owner_role on owner_role.oid = p.proowner
  where not p.prosecdef or owner_role.rolname <> 'postgres'

  union all

  select
    'client_table_privilege',
    format('public.%I:%s:%s', t.object_name, r.role_name, p.privilege_name)
  from quarantined_tables t
  cross join client_roles r
  cross join table_privileges p
  cross join lateral (select to_regclass(format('public.%I', t.object_name)) as oid) resolved
  where resolved.oid is not null
    and has_table_privilege(r.role_name, resolved.oid, p.privilege_name)

  union all

  select
    'client_column_privilege',
    format('public.%I.%I:%s:%s', t.object_name, a.attname, r.role_name, p.privilege_name)
  from quarantined_tables t
  cross join client_roles r
  cross join column_privileges p
  cross join lateral (select to_regclass(format('public.%I', t.object_name)) as oid) resolved
  join pg_attribute a
    on a.attrelid = resolved.oid and a.attnum > 0 and not a.attisdropped
  where resolved.oid is not null
    and has_column_privilege(r.role_name, resolved.oid, a.attnum, p.privilege_name)

  union all

  select
    'public_table_acl',
    format('public.%I:%s', t.object_name, acl.privilege_type)
  from quarantined_tables t
  join pg_class c on c.oid = to_regclass(format('public.%I', t.object_name))
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
  where acl.grantee = 0

  union all

  select
    'public_column_acl',
    format('public.%I.%I:%s', t.object_name, a.attname, acl.privilege_type)
  from quarantined_tables t
  join pg_class c on c.oid = to_regclass(format('public.%I', t.object_name))
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  cross join lateral aclexplode(a.attacl) acl
  where a.attacl is not null and acl.grantee = 0

  union all

  select
    'cache_table_privilege',
    format('public.ai_response_cache:%s:%s', r.role_name, p.privilege_name)
  from data_api_roles r
  cross join table_privileges p
  cross join lateral (select to_regclass('public.ai_response_cache') as oid) resolved
  where resolved.oid is not null
    and has_table_privilege(r.role_name, resolved.oid, p.privilege_name)

  union all

  select
    'cache_column_privilege',
    format('public.ai_response_cache.%I:%s:%s', a.attname, r.role_name, p.privilege_name)
  from data_api_roles r
  cross join column_privileges p
  cross join lateral (select to_regclass('public.ai_response_cache') as oid) resolved
  join pg_attribute a
    on a.attrelid = resolved.oid and a.attnum > 0 and not a.attisdropped
  where resolved.oid is not null
    and has_column_privilege(r.role_name, resolved.oid, a.attnum, p.privilege_name)

  union all

  select
    'cache_public_table_acl',
    format('public.ai_response_cache:%s', acl.privilege_type)
  from pg_class c
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
  where c.oid = to_regclass('public.ai_response_cache') and acl.grantee = 0

  union all

  select
    'cache_public_column_acl',
    format('public.ai_response_cache.%I:%s', a.attname, acl.privilege_type)
  from pg_class c
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  cross join lateral aclexplode(a.attacl) acl
  where c.oid = to_regclass('public.ai_response_cache')
    and a.attacl is not null
    and acl.grantee = 0

  union all

  select
    'onboarding_anon_insert',
    'public.cannes_responses:anon:INSERT'
  from (select to_regclass('public.cannes_responses') as oid) resolved
  where resolved.oid is not null
    and has_table_privilege('anon', resolved.oid, 'INSERT')

  union all

  select
    'onboarding_anon_column_insert',
    format('public.cannes_responses.%I:anon:INSERT', a.attname)
  from (select to_regclass('public.cannes_responses') as oid) resolved
  join pg_attribute a
    on a.attrelid = resolved.oid and a.attnum > 0 and not a.attisdropped
  where resolved.oid is not null
    and has_column_privilege('anon', resolved.oid, a.attnum, 'INSERT')

  union all

  select
    'onboarding_public_insert_acl',
    'public.cannes_responses:PUBLIC:INSERT'
  from pg_class c
  cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
  where c.oid = to_regclass('public.cannes_responses')
    and acl.grantee = 0
    and acl.privilege_type = 'INSERT'

  union all

  select
    'onboarding_public_column_insert_acl',
    format('public.cannes_responses.%I:PUBLIC:INSERT', a.attname)
  from pg_class c
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  cross join lateral aclexplode(a.attacl) acl
  where c.oid = to_regclass('public.cannes_responses')
    and a.attacl is not null
    and acl.grantee = 0
    and acl.privilege_type = 'INSERT'

  union all

  select
    'client_function_execute',
    format('%s:%s', f.signature, r.role_name)
  from protected_functions f
  cross join client_roles r
  cross join lateral (select to_regprocedure(f.signature) as oid) resolved
  where resolved.oid is not null
    and has_function_privilege(r.role_name, resolved.oid, 'EXECUTE')

  union all

  select
    'service_function_execute',
    f.signature
  from service_blocked_functions f
  cross join lateral (select to_regprocedure(f.signature) as oid) resolved
  where resolved.oid is not null
    and has_function_privilege('service_role', resolved.oid, 'EXECUTE')

  union all

  select
    'public_function_acl',
    f.signature
  from protected_functions f
  join pg_proc p on p.oid = to_regprocedure(f.signature)
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'

  union all

  select
    'latent_claim_execute',
    format('public.claim_user_history(uuid,uuid,text):%s', r.role_name)
  from data_api_roles r
  cross join lateral (
    select to_regprocedure('public.claim_user_history(uuid,uuid,text)') as oid
  ) resolved
  where resolved.oid is not null
    and has_function_privilege(r.role_name, resolved.oid, 'EXECUTE')

  union all

  select
    'latent_claim_public_acl',
    'public.claim_user_history(uuid,uuid,text):PUBLIC'
  from pg_proc p
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  where p.oid = to_regprocedure('public.claim_user_history(uuid,uuid,text)')
    and acl.grantee = 0
    and acl.privilege_type = 'EXECUTE'

  union all

  select
    'missing_transitional_service_execute',
    'public.get_or_create_memory_settings(uuid):service_role'
  from (
    select to_regprocedure('public.get_or_create_memory_settings(uuid)') as oid
  ) resolved
  where resolved.oid is not null
    and not has_function_privilege('service_role', resolved.oid, 'EXECUTE')

  union all

  select
    'transitional_service_grant_option',
    'public.get_or_create_memory_settings(uuid):service_role:WITH GRANT OPTION'
  from (
    select to_regprocedure('public.get_or_create_memory_settings(uuid)') as oid
  ) resolved
  where resolved.oid is not null
    and has_function_privilege(
      'service_role', resolved.oid, 'EXECUTE WITH GRANT OPTION'
    )
)
select
  case when count(*) = 0 then 'PASS' else 'FAIL' end as containment_status,
  count(*) as violation_count,
  coalesce(
    jsonb_agg(to_jsonb(violations) order by violation_type, detail),
    '[]'::jsonb
  ) as violations
from violations;

rollback;
