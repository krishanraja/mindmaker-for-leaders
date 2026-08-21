-- Close an unauthenticated cross-tenant read path.
--
-- export_user_memory, get_user_memory_context, get_memory_by_temperature and
-- get_track_record are SECURITY DEFINER, so they bypass row-level security, and
-- each takes the target user id as an argument. EXECUTE was held by PUBLIC,
-- which PostgREST exposes to the anon role, so an unauthenticated POST to
-- /rest/v1/rpc/<fn> carrying any user id returned that user's rows.
--
-- get_track_record does guard itself, but only for signed-in callers:
--   IF auth.uid() IS NOT NULL AND v_user <> auth.uid() THEN RAISE EXCEPTION
-- For anon, auth.uid() is null, so the guard is skipped and the caller-supplied
-- id is used. The other three carry no caller check at all.
--
-- This is the same class of defect as the May-June 2026 RLS incident recorded in
-- project-documentation/compliance/INCIDENT_RESPONSE_PLAN.md.
--
-- Grants only. No function body is redefined here, so behaviour for the
-- application and for service_role is unchanged.

-- 1. No caller in src/ or supabase/functions/ invokes these three. Remove all
--    client access; service_role continues to bypass grants.
REVOKE ALL ON FUNCTION public.export_user_memory(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_memory_context(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_memory_by_temperature(uuid, text) FROM PUBLIC, anon, authenticated;

-- 2. get_track_record is called by useTrackRecord and useCapabilitySignals with
--    the signed-in user's own id. Dropping anon leaves the existing in-function
--    guard to cover every remaining caller.
REVOKE ALL ON FUNCTION public.get_track_record(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_track_record(uuid) TO authenticated;

-- 3. The token functions raise 'not authenticated' when auth.uid() is null, so
--    they were not exploitable, but anon has no reason to hold EXECUTE.
REVOKE ALL ON FUNCTION public.mint_mcp_token(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_mcp_tokens() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_mcp_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mint_mcp_token(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_mcp_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_mcp_token(uuid) TO authenticated;
