-- Read-only preflight for the forward-only database containment candidate.
-- Run this against the exact approved target before 01_forward_containment.sql.
-- Save the complete output immutably. It is the sole rollback authority and
-- the baseline for service_role and policy-preservation comparison.

begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '2s';
set local idle_in_transaction_session_timeout = '30s';
set local search_path = pg_catalog, public;
set local row_security = off;

select
  'preflight_context' as record_type,
  current_database() as database_name,
  current_user as database_user,
  current_setting('server_version') as server_version,
  clock_timestamp() as observed_at;

-- Prevention-only replay evidence for the legacy kit-nudge schedule. Expose
-- only existence/count; never select cron.command or any secret-bearing field.
select
  'legacy_cron_prerequisites' as record_type,
  to_regclass('cron.job') is not null as cron_job_catalog_exists,
  to_regprocedure('cron.unschedule(bigint)') is not null as unschedule_by_id_exists;

select
  'legacy_cron_job_baseline' as record_type,
  'kit-nudges-email' as job_name,
  count(*) = 0 as absent,
  count(*)::bigint as matching_job_count
from cron.job
where jobname = 'kit-nudges-email';

-- Raw relation state and table ACLs. A null relacl means PostgreSQL defaults.
with target_relations(object_name, containment_scope) as (
  values
    ('conversation_sessions', 'full client quarantine; preserve service_role'),
    ('chat_messages', 'full client quarantine; preserve service_role'),
    ('ai_insights_generated', 'full client quarantine; preserve service_role'),
    ('assessment_events', 'full client quarantine; preserve service_role'),
    ('booking_requests', 'full client quarantine; preserve service_role'),
    ('conversion_analytics', 'full client quarantine; preserve service_role'),
    ('engagement_analytics', 'full client quarantine; preserve service_role'),
    ('index_participant_data', 'full client quarantine; preserve service_role'),
    ('lead_qualification_scores', 'full client quarantine; preserve service_role'),
    ('lead_qualifications', 'full client quarantine; preserve service_role'),
    ('prompt_library_profiles', 'full client quarantine; preserve service_role'),
    ('roi_actuals', 'full client quarantine; preserve service_role'),
    ('velocity_events', 'full client quarantine; preserve service_role'),
    ('voice_instrumentation', 'full client quarantine; preserve service_role'),
    ('voice_sessions', 'full client quarantine; preserve service_role'),
    ('user_business_context', 'full client quarantine; preserve service_role'),
    ('audience_contacts', 'full client quarantine; preserve service_role'),
    ('feedback', 'full client quarantine; preserve service_role'),
    ('delivery_subscriptions', 'full client quarantine; preserve service_role'),
    ('portfolio_handoff', 'full client quarantine; preserve service_role'),
    ('tts_quality_snapshots', 'full client quarantine; preserve service_role'),
    ('ai_response_cache', 'full PUBLIC, anon, authenticated, service_role quarantine'),
    ('cannes_responses', 'PUBLIC and anon INSERT quarantine only')
)
select
  'relation_catalog' as record_type,
  format('public.%I', t.object_name) as object_name,
  t.containment_scope,
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

-- Expanded table ACL, including PUBLIC as grantee oid 0.
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

-- Raw and expanded column ACL evidence. Null attacl means there is no explicit
-- column grant; effective column access can still arrive through a table ACL.
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

-- Effective table privileges and grant-option state include direct, PUBLIC,
-- and inherited role grants.
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

-- Complete effective column evidence, aggregated per role and privilege to keep
-- the output reviewable. Table-level privileges are intentionally reflected.
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

-- Policy metadata is evidence only. The migration changes no policy.
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
  'policy_catalog' as record_type,
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

-- Function shape, raw ACL, expanded ACL, and effective EXECUTE evidence.
with target_functions(signature, containment_scope) as (
  values
    ('public.apply_outcome_to_brain(uuid)', 'revoke PUBLIC, anon, authenticated EXECUTE'),
    ('public.run_brain_adapt(integer)', 'revoke PUBLIC, anon, authenticated EXECUTE'),
    ('public.sync_decision_lineage()', 'revoke PUBLIC, anon, authenticated EXECUTE'),
    ('public.get_or_create_memory_settings(uuid)', 'transitional service_role-only EXECUTE'),
    ('public.trigger_anonymous_booking_sync()', 'revoke PUBLIC, anon, authenticated EXECUTE'),
    ('public.trigger_anonymous_lead_sync()', 'revoke PUBLIC, anon, authenticated EXECUTE'),
    ('public.claim_user_history(uuid,uuid,text)', 'if present, revoke every Data API role')
), resolved as (
  select t.*, to_regprocedure(t.signature) as procedure_oid
  from target_functions t
)
select
  'function_catalog' as record_type,
  r.signature,
  r.containment_scope,
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

-- Deterministic fingerprint of every effective service_role table or column
-- privilege the migration promises to preserve: the 21 quarantined tables and
-- Cannes INSERT. The postflight fingerprint must be byte-for-byte identical.
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

rollback;
