-- Close two more unauthenticated paths that the 2026-08-20 sweep missed.
--
-- 20260820090000_revoke_anon_definer_reads.sql fixed the SECURITY DEFINER
-- functions that read a named user's rows. It searched by read-shaped names and
-- therefore skipped these two, which are named for maintenance but are exposed
-- through PostgREST exactly the same way.
--
-- get_memory_sweep_batch is SECURITY DEFINER and bypasses row-level security.
-- It returns user_id for every account holding current memory, together with
-- last_fact_change and last_synthesized_at. EXECUTE was held by anon, so an
-- unauthenticated POST to /rest/v1/rpc/get_memory_sweep_batch enumerated the
-- user base and its per-account activity timing. That is a cross-tenant
-- disclosure of the same class as the May to June 2026 RLS incident recorded in
-- project-documentation/compliance/INCIDENT_RESPONSE_PLAN.md.
--
-- cleanup_expired_memories is SECURITY DEFINER and DELETEs across every
-- account. EXECUTE was held by anon, so any caller could force a global
-- retention sweep on demand. No row is currently eligible, because every
-- user_memory_settings row holds retention_days IS NULL, but that stops being
-- true the moment one leader chooses a 30 or 90 day window.
--
-- Both are invoked only with the service role: memory-sweep/index.ts calls
-- get_memory_sweep_batch, cleanup-expired-data/index.ts calls
-- cleanup_expired_memories, and the retention-cleanup cron job reaches the
-- latter through that function. Grants only; no body is redefined, so
-- application and service_role behaviour is unchanged.

REVOKE ALL ON FUNCTION public.get_memory_sweep_batch(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_memory_sweep_batch(integer) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_memories() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_memories() TO service_role;
