-- Carry the confirmed onboarding dossier into CTRL without duplicating the
-- source enrichment. All fields are additive so the previous deployment can
-- remain live during rollback.

alter table public.cannes_responses
  add column if not exists dossier_confirmed_at timestamptz;

alter table public.portfolio_handoff
  add column if not exists person_name text,
  add column if not exists role_title text,
  add column if not exists linkedin_url text,
  add column if not exists company_name text,
  add column if not exists company_summary text,
  add column if not exists company_logo_url text,
  add column if not exists company_signals jsonb not null default '[]'::jsonb,
  add column if not exists dossier_strength jsonb not null default '{}'::jsonb,
  add column if not exists dossier_confirmed_at timestamptz;

alter table public.portfolio_handoff
  drop constraint if exists portfolio_handoff_company_signals_array;

alter table public.portfolio_handoff
  add constraint portfolio_handoff_company_signals_array
  check (jsonb_typeof(company_signals) = 'array');

comment on column public.portfolio_handoff.company_signals is
  'User-confirmed, source-linked company signals captured during onboarding; maximum three.';
