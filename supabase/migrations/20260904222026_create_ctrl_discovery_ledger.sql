-- Public schema projection for the private CTRL discovery ledger.
-- Canonical private rows are intentionally omitted; only the redacted snapshot is publishable.
-- Applied database migrations: create_ctrl_discovery_ledger_and_seed_001,
-- verify_ctrl_discovery_ledger_001, index_ctrl_discovery_previous_record_001.

create schema ctrl_discovery;
comment on schema ctrl_discovery is
  'Private append-only product discovery ledger for the mm-ctrl evolution session. Not exposed to the Data API.';

revoke all on schema ctrl_discovery from public, anon, authenticated, service_role;

create table ctrl_discovery.sessions (
  session_key text primary key
    check (session_key ~ '^[a-z0-9][a-z0-9-]{7,127}$'),
  objective text not null
    check (length(btrim(objective)) > 0),
  status text not null
    check (status in ('active','complete','paused','abandoned')),
  repository_full_name text not null,
  repository_ref text not null
    check (repository_ref ~ '^[0-9a-f]{40}$'),
  source_thread_ref text not null unique,
  sensitivity text not null default 'internal'
    check (sensitivity in ('public','internal','personal','restricted','secret')),
  export_policy text not null default 'redact'
    check (export_policy in ('include','redact','exclude')),
  created_at timestamptz not null,
  created_by text not null
);

create table ctrl_discovery.records (
  sequence_no bigint generated always as identity primary key,
  record_uuid uuid not null default gen_random_uuid() unique,
  session_key text not null
    references ctrl_discovery.sessions(session_key) on delete restrict,
  record_key text not null
    check (record_key ~ '^[A-Z]+-[0-9]{3,}$'),
  version integer not null
    check (version > 0),
  previous_record_uuid uuid null
    references ctrl_discovery.records(record_uuid) on delete restrict,
  record_type text not null
    check (record_type in (
      'decision','hypothesis','assumption','evidence','contradiction',
      'open_question','milestone','risk','source'
    )),
  state text not null
    check (state in (
      'final','provisional','observed','open','answered','resolved',
      'pending','in_progress','complete','superseded','withdrawn','blocked'
    )),
  title text not null
    check (length(btrim(title)) > 0),
  statement text not null
    check (length(btrim(statement)) > 0),
  private_content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(private_content) = 'object'),
  export_content jsonb null
    check (export_content is null or jsonb_typeof(export_content) = 'object'),
  export_policy text not null
    check (export_policy in ('include','redact','exclude')),
  redaction_reason text null,
  authority text not null
    check (authority in ('user','agent','external','system')),
  capture_method text not null
    check (capture_method in (
      'user_statement','user_selection','user_authorization','direct_user_instruction',
      'agent_synthesis','repository_audit','live_site_audit','external_research',
      'system_readback','migration_event'
    )),
  source_ref text not null
    check (length(btrim(source_ref)) > 0),
  source_commit text null
    check (source_commit is null or source_commit ~ '^[0-9a-f]{40}$'),
  sensitivity text not null
    check (sensitivity in ('public','internal','personal','restricted','secret')),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  recorded_by text not null,
  idempotency_key text not null,
  private_content_sha256 text generated always as (
    encode(extensions.digest(private_content::text, 'sha256'), 'hex')
  ) stored,
  export_content_sha256 text generated always as (
    case
      when export_content is null then null
      else encode(extensions.digest(export_content::text, 'sha256'), 'hex')
    end
  ) stored,
  record_sha256 text not null,
  unique (session_key, record_key, version),
  unique (session_key, idempotency_key),
  check (
    (export_policy in ('include','redact') and export_content is not null)
    or (export_policy = 'exclude' and export_content is null)
  ),
  check (
    (export_policy = 'include' and redaction_reason is null)
    or (export_policy in ('redact','exclude') and length(btrim(redaction_reason)) > 0)
  ),
  check (
    sensitivity not in ('personal','restricted','secret')
    or export_policy = 'exclude'
  ),
  check (
    record_type <> 'decision'
    or state <> 'final'
    or (
      authority = 'user'
      and capture_method in (
        'user_statement','user_selection','user_authorization','direct_user_instruction'
      )
      and private_content ?& array[
        'decider','accountable_owner','scope','affected_entities','rationale',
        'alternatives','dissent','tradeoffs','evidence_refs','assumption_refs',
        'revisit','authority_granted','decided_on','capture_method',
        'paraphrase_status','outcome','events'
      ]
    )
  )
);

create index records_session_type_key_idx
  on ctrl_discovery.records
  (session_key, record_type, record_key collate "C", version desc);

create index records_session_state_idx
  on ctrl_discovery.records
  (session_key, state, record_type);

create index records_previous_record_uuid_idx
  on ctrl_discovery.records (previous_record_uuid)
  where previous_record_uuid is not null;

create or replace function ctrl_discovery.prepare_record_append()
returns trigger
language plpgsql
set search_path = pg_catalog, ctrl_discovery
as $$
declare
  prior ctrl_discovery.records%rowtype;
  expected_prefix text;
  secret_candidate text;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.session_key || ':' || new.record_key, 0)
  );

  expected_prefix := case new.record_type
    when 'decision' then 'D'
    when 'hypothesis' then 'H'
    when 'assumption' then 'A'
    when 'evidence' then 'E'
    when 'contradiction' then 'C'
    when 'open_question' then 'Q'
    when 'milestone' then 'M'
    when 'risk' then 'R'
    when 'source' then 'S'
  end;

  if split_part(new.record_key, '-', 1) <> expected_prefix then
    raise exception using
      errcode = '23514',
      message = 'record key prefix does not match record type';
  end if;

  select *
  into prior
  from ctrl_discovery.records
  where session_key = new.session_key
    and record_key = new.record_key
  order by version desc
  limit 1;

  if not found then
    if new.version <> 1 then
      raise exception using
        errcode = '23514',
        message = 'the first version of a record must be version 1';
    end if;
    new.previous_record_uuid := null;
  else
    if new.version <> prior.version + 1 then
      raise exception using
        errcode = '23514',
        message = 'record versions must be contiguous';
    end if;
    if new.record_type <> prior.record_type then
      raise exception using
        errcode = '23514',
        message = 'record type cannot change across versions';
    end if;
    new.previous_record_uuid := prior.record_uuid;
  end if;

  secret_candidate :=
    new.title || E'\n' ||
    new.statement || E'\n' ||
    new.private_content::text || E'\n' ||
    coalesce(new.export_content::text, '') || E'\n' ||
    new.source_ref;

  if secret_candidate ~* '(ghp_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|sbp_[a-z0-9]{20,}|vcp_[a-z0-9]{20,}|sk_(live|test)_[a-z0-9]{16,})' then
    raise exception using
      errcode = '22023',
      message = 'possible credential detected; record rejected';
  end if;

  new.record_sha256 := encode(
    extensions.digest(
      jsonb_build_object(
        'session_key', new.session_key,
        'record_key', new.record_key,
        'version', new.version,
        'previous_record_uuid', new.previous_record_uuid,
        'record_type', new.record_type,
        'state', new.state,
        'title', new.title,
        'statement', new.statement,
        'private_content', new.private_content,
        'export_content', new.export_content,
        'export_policy', new.export_policy,
        'redaction_reason', new.redaction_reason,
        'authority', new.authority,
        'capture_method', new.capture_method,
        'source_ref', new.source_ref,
        'source_commit', new.source_commit,
        'sensitivity', new.sensitivity,
        'observed_at', new.observed_at,
        'recorded_at', new.recorded_at,
        'recorded_by', new.recorded_by,
        'idempotency_key', new.idempotency_key
      )::text,
      'sha256'
    ),
    'hex'
  );

  return new;
end;
$$;

revoke all on function ctrl_discovery.prepare_record_append()
  from public, anon, authenticated, service_role;

create trigger prepare_record_append
before insert on ctrl_discovery.records
for each row execute function ctrl_discovery.prepare_record_append();

create or replace function ctrl_discovery.reject_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'ctrl_discovery history is append-only; append a new version instead';
end;
$$;

revoke all on function ctrl_discovery.reject_history_mutation()
  from public, anon, authenticated, service_role;

create trigger sessions_no_update_or_delete
before update or delete on ctrl_discovery.sessions
for each statement execute function ctrl_discovery.reject_history_mutation();

create trigger sessions_no_truncate
before truncate on ctrl_discovery.sessions
for each statement execute function ctrl_discovery.reject_history_mutation();

create trigger records_no_update_or_delete
before update or delete on ctrl_discovery.records
for each statement execute function ctrl_discovery.reject_history_mutation();

create trigger records_no_truncate
before truncate on ctrl_discovery.records
for each statement execute function ctrl_discovery.reject_history_mutation();

alter table ctrl_discovery.sessions enable row level security;
alter table ctrl_discovery.sessions force row level security;
alter table ctrl_discovery.records enable row level security;
alter table ctrl_discovery.records force row level security;

create view ctrl_discovery.current_records
with (security_invoker = true)
as
select distinct on (session_key, record_key)
  sequence_no, record_uuid, session_key, record_key, version,
  previous_record_uuid, record_type, state, title, statement,
  private_content, export_content, export_policy, redaction_reason,
  authority, capture_method, source_ref, source_commit, sensitivity,
  observed_at, recorded_at, recorded_by, private_content_sha256,
  export_content_sha256, record_sha256
from ctrl_discovery.records
order by session_key, record_key, version desc, sequence_no desc;

create view ctrl_discovery.progress
with (security_invoker = true)
as
select
  session_key,
  record_key as milestone_key,
  state,
  title,
  statement,
  private_content,
  record_sha256
from ctrl_discovery.current_records
where record_type = 'milestone';

create view ctrl_discovery.export_snapshot
with (security_invoker = true)
as
select
  session_key,
  record_key,
  version,
  record_type,
  state,
  authority,
  capture_method,
  export_content as content,
  export_content_sha256 as content_sha256,
  source_ref,
  source_commit
from ctrl_discovery.current_records
where export_policy in ('include','redact')
  and export_content is not null;

comment on table ctrl_discovery.sessions is
  'Immutable discovery-session metadata. Lifecycle is represented by milestone records.';
comment on table ctrl_discovery.records is
  'Append-only typed, versioned records. Private and export-safe content are separate.';
comment on view ctrl_discovery.export_snapshot is
  'Allowlisted source for deterministic public Git JSONL. Never exports private_content or private hashes.';

revoke all on all tables in schema ctrl_discovery
  from public, anon, authenticated, service_role;
revoke all on all sequences in schema ctrl_discovery
  from public, anon, authenticated, service_role;
revoke all on all functions in schema ctrl_discovery
  from public, anon, authenticated, service_role;

alter default privileges in schema ctrl_discovery
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema ctrl_discovery
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema ctrl_discovery
  revoke execute on functions from public, anon, authenticated, service_role;
