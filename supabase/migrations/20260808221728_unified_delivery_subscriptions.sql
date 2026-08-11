-- Canonicalise the public CTRL front door and add delivery without an account.
-- Existing shared-project tables are preserved; every statement is additive.

create extension if not exists pgcrypto;

create table if not exists public.cannes_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  q1_week_needs_me int,
  q2_extra_self text,
  q3_company_ai int,
  q4_company_future text,
  q5_decision text,
  archetype_title text,
  archetype_variant char(1),
  result_prose_12mo text,
  result_prose_3yr text,
  email text,
  email_captured_at timestamptz,
  email_sent_at timestamptz,
  fork_choice text,
  fork_clicked_at timestamptz,
  user_agent text,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  completion_time_ms int
);

alter table public.cannes_responses
  add column if not exists entry_variant text,
  add column if not exists enrichment_status text,
  add column if not exists enrichment_kind text,
  add column if not exists enrichment_name text,
  add column if not exists enrichment_role text,
  add column if not exists enrichment_company text,
  add column if not exists enrichment_company_blurb text,
  add column if not exists enrichment_signals jsonb,
  add column if not exists enrichment_started_at timestamptz,
  add column if not exists enrichment_completed_at timestamptz,
  add column if not exists enrichment_raw_input jsonb,
  add column if not exists resolved_linkedin_url text,
  add column if not exists resolution_confidence text,
  add column if not exists resolution_provenance jsonb,
  add column if not exists providers_hit jsonb,
  add column if not exists email_deliverable boolean,
  add column if not exists company_domain text,
  add column if not exists company_context jsonb,
  add column if not exists person_experience jsonb,
  add column if not exists email_send_claimed_at timestamptz;

create index if not exists cannes_responses_created_at_idx on public.cannes_responses (created_at desc);
create index if not exists cannes_responses_email_idx on public.cannes_responses (email) where email is not null;
create index if not exists cannes_responses_source_idx on public.cannes_responses (source);
create index if not exists cannes_responses_entry_variant_idx on public.cannes_responses (entry_variant) where entry_variant is not null;

alter table public.cannes_responses enable row level security;
drop policy if exists "allow anonymous insert" on public.cannes_responses;
create policy "allow anonymous insert" on public.cannes_responses for insert to anon with check (true);

create table if not exists public.portfolio_handoff (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'ctrl_onboarding',
  source_response_id uuid,
  entry_variant text,
  q2 text,
  q4 text,
  anxiety_lane text,
  company_domain text,
  archetype_title text,
  destination text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists portfolio_handoff_created_idx on public.portfolio_handoff (created_at desc);
alter table public.portfolio_handoff add column if not exists idempotency_key text;
create unique index if not exists portfolio_handoff_idempotency_idx
  on public.portfolio_handoff (idempotency_key) where idempotency_key is not null;
alter table public.portfolio_handoff enable row level security;

-- One delivery spine. An account is optional; the onboarding response is
-- enough context for a useful morning brief. Provider credentials never live
-- here. Future Slack/WhatsApp rows point at an OAuth connection id instead.
create table if not exists public.delivery_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  onboarding_response_id uuid references public.cannes_responses(id) on delete set null,
  channel text not null check (channel in ('email', 'slack', 'whatsapp')),
  destination text not null,
  destination_hash text not null,
  provider_connection_id uuid,
  status text not null default 'active' check (status in ('active', 'paused', 'unsubscribed', 'bounced')),
  content_modes text[] not null default array['text', 'audio']::text[],
  timezone text not null default 'UTC',
  delivery_hour smallint not null default 8 check (delivery_hour between 0 and 23),
  consent_at timestamptz not null default now(),
  consent_source text not null default 'ctrl_onboarding',
  unsubscribe_token text not null,
  unsubscribe_token_hash text not null,
  last_sent_date date,
  delivery_claimed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, destination_hash)
);

alter table public.delivery_subscriptions
  add column if not exists delivery_claimed_at timestamptz;

create index if not exists delivery_subscriptions_due_idx
  on public.delivery_subscriptions (status, channel, last_sent_date);
create index if not exists delivery_subscriptions_user_idx
  on public.delivery_subscriptions (user_id) where user_id is not null;
create unique index if not exists delivery_subscriptions_unsubscribe_idx
  on public.delivery_subscriptions (unsubscribe_token_hash);
alter table public.delivery_subscriptions enable row level security;

comment on table public.delivery_subscriptions is
  'Canonical delivery spine for CTRL briefings. Service-role only; public subscribe/unsubscribe functions enforce consent and token checks.';
