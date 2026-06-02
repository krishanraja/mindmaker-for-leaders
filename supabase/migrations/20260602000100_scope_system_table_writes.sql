-- Secondary RLS hardening: close "manage" write-holes on shared system tables.
--
-- These tables had an `ALL` policy with USING(true) granted to the `public`
-- role, meaning any authenticated (and in some cases anonymous) user could
-- INSERT/UPDATE/DELETE shared configuration and content - a cross-tenant
-- integrity risk (SOC 2 CC6.1, ISO A.8.3). They are written by server-side
-- edge functions, which use the service role and bypass RLS, so removing the
-- public write policy does not affect legitimate writes. Public READ, where it
-- is intended (reference content), is preserved separately and untouched here.
--
-- REVIEW BEFORE APPLYING: confirm none of these tables are written directly
-- from the browser client. If a table is, replace the dropped policy with an
-- owner-scoped one instead of relying on the service role.
--
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Service can manage questions"              ON public.assessment_questions;
DROP POLICY IF EXISTS "Service can manage referrals"             ON public.assessment_referrals;
DROP POLICY IF EXISTS "Anyone can manage decision frameworks"    ON public.decision_frameworks;
DROP POLICY IF EXISTS "Anyone can manage effortless map items"   ON public.effortless_map_items;
DROP POLICY IF EXISTS "Admin can manage sync logs"               ON public.google_sheets_sync_log;
DROP POLICY IF EXISTS "System can manage prompt profiles"        ON public.prompt_library_profiles;
DROP POLICY IF EXISTS "Anyone can manage working group inputs"   ON public.working_group_inputs;
DROP POLICY IF EXISTS "System can manage lead qualification scores" ON public.lead_qualification_scores;

-- Revoke the underlying write grants so the default-deny actually bites for
-- non-service callers.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
  public.assessment_questions,
  public.assessment_referrals,
  public.decision_frameworks,
  public.effortless_map_items,
  public.google_sheets_sync_log,
  public.prompt_library_profiles,
  public.working_group_inputs,
  public.lead_qualification_scores
FROM anon, authenticated;
