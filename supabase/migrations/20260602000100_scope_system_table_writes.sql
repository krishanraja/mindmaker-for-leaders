-- Secondary RLS hardening: close "manage" write-holes on shared system tables.
--
-- These tables had an `ALL` policy with USING(true) granted to the `public`
-- role, meaning any authenticated (and in some cases anonymous) user could
-- INSERT/UPDATE/DELETE shared configuration and content - a cross-tenant
-- integrity risk (SOC 2 CC6.1, ISO A.8.3). They are written only by
-- server-side edge functions, which use the service role and bypass RLS, so
-- removing the public write policy does not affect legitimate writes. Public
-- READ, where intended (reference content), is preserved and untouched here.
--
-- SCOPE NOTE: this migration covers ONLY the four tables verified to have NO
-- browser-client writes. Four further tables that also had ALL/USING(true)
-- policies are DELIBERATELY EXCLUDED because the client writes them directly
-- as part of the anonymous assessment / lead-generation funnel:
--   - assessment_referrals       (client INSERT, generateReferralCode.ts)
--   - assessment_questions       (client UPSERT, contextLinking.ts)
--   - lead_qualification_scores  (client UPSERT, useLeadQualification.ts)
--   - google_sheets_sync_log     (client UPDATE, processPendingSyncs.ts)
-- Those need session-scoped RLS policies (a larger change), not a blanket
-- revoke, and are tracked as a Phase-1 item in the compliance roadmap.
--
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Anyone can manage decision frameworks"  ON public.decision_frameworks;
DROP POLICY IF EXISTS "Anyone can manage effortless map items" ON public.effortless_map_items;
DROP POLICY IF EXISTS "Anyone can manage working group inputs" ON public.working_group_inputs;
DROP POLICY IF EXISTS "System can manage prompt profiles"      ON public.prompt_library_profiles;

-- Revoke the underlying write grants so default-deny actually bites for
-- non-service callers. (prompt_library_profiles is read by the client; SELECT
-- grant + its public-read policy, if any, are left intact.)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
  public.decision_frameworks,
  public.effortless_map_items,
  public.working_group_inputs,
  public.prompt_library_profiles
FROM anon, authenticated;
