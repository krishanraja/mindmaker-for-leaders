-- Phase 3 (upgrade/ctrl/rebuild): lead-signal consent (master-prompt 5f).
-- Applied to prod bkyuxvschuwngtcdhsyg via Supabase Management API on 2026-05-30.
-- Gate for fleet re-engagement of free-tier non-converters. The existing
-- consentToInsights flag is for AI insight generation, not marketing, so this
-- is a distinct, explicit marketing-consent signal defaulting to false.
alter table public.leaders add column if not exists marketing_consent boolean not null default false;
alter table public.leaders add column if not exists marketing_consent_at timestamptz;
