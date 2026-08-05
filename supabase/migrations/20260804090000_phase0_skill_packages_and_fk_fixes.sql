-- Phase 0 of the harness chain build (CHALLENGE.md ruling, 2026-08-04).
-- Three fixes that must land before anything is built on top:
--
-- 1. skill-packages Storage bucket. Until now the installable skill ZIP
--    existed only in the generation response (zip_path was never written),
--    so every generated package was unrecoverable once the tab closed.
--    Live data loss, spec 4.8a / Phase 0 item 11.
-- 2. skill_exports UPDATE + DELETE RLS. Users could not revise or remove
--    their own exports (only SELECT + INSERT policies existed).
-- 3. auth.users foreign keys with no ON DELETE clause (default NO ACTION)
--    make auth.admin.deleteUser() fail for any user with rows in these
--    tables, while delete-account still reports success (CH-06).
--
-- Remote truth checked 2026-08-04 via pg_constraint: the only NO ACTION
-- FKs to auth.users in prod are prompt_library_profiles.user_id and
-- llm_call_log.user_id (security_audit_log is already SET NULL there;
-- consent_audit carries no auth.users FK remotely; compliance_events and
-- the leader_* confidante tables were never applied remotely). Every ALTER
-- below is existence-guarded so this file runs anywhere.

-- ---------------------------------------------------------------------------
-- 1. skill-packages bucket: private, folder-isolated by auth.uid().
--    Path convention: <user_id>/<uuid>-<skill-name>.zip
--    Uploads happen with the service role from the export functions;
--    the SELECT policy lets a signed-in user create signed URLs for and
--    download their own packages from the Library.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'skill-packages',
  'skill-packages',
  false,
  20971520,                 -- 20 MB
  ARRAY['application/zip']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 20971520,
      allowed_mime_types = ARRAY['application/zip']::text[];

DROP POLICY IF EXISTS "Users can read their own skill packages"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own skill packages" ON storage.objects;

CREATE POLICY "Users can read their own skill packages"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'skill-packages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own skill packages"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'skill-packages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON POLICY "Users can read their own skill packages" ON storage.objects IS
  'skill-packages: folder-based isolation. First path segment must equal auth.uid().';

-- ---------------------------------------------------------------------------
-- 2. skill_exports: owner UPDATE + DELETE.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own skill exports" ON public.skill_exports;
CREATE POLICY "Users can update own skill exports"
  ON public.skill_exports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own skill exports" ON public.skill_exports;
CREATE POLICY "Users can delete own skill exports"
  ON public.skill_exports FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Foreign keys that block account deletion. User-data tables CASCADE;
--    audit tables SET NULL (their rows are the evidence of the erasure,
--    retained under GDPR Art 17(3)(b)).
-- ---------------------------------------------------------------------------

DO $guard$
BEGIN
  IF to_regclass('public.prompt_library_profiles') IS NOT NULL THEN
    ALTER TABLE public.prompt_library_profiles
      DROP CONSTRAINT IF EXISTS prompt_library_profiles_user_id_fkey;
    ALTER TABLE public.prompt_library_profiles
      ADD CONSTRAINT prompt_library_profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.llm_call_log') IS NOT NULL THEN
    ALTER TABLE public.llm_call_log
      DROP CONSTRAINT IF EXISTS llm_call_log_user_id_fkey;
    ALTER TABLE public.llm_call_log
      ADD CONSTRAINT llm_call_log_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.security_audit_log') IS NOT NULL THEN
    ALTER TABLE public.security_audit_log
      DROP CONSTRAINT IF EXISTS security_audit_log_user_id_fkey;
    ALTER TABLE public.security_audit_log
      ADD CONSTRAINT security_audit_log_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.compliance_events') IS NOT NULL THEN
    ALTER TABLE public.compliance_events
      DROP CONSTRAINT IF EXISTS compliance_events_user_id_fkey;
    ALTER TABLE public.compliance_events
      ADD CONSTRAINT compliance_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.leader_reflections') IS NOT NULL THEN
    ALTER TABLE public.leader_reflections
      DROP CONSTRAINT IF EXISTS leader_reflections_user_id_fkey;
    ALTER TABLE public.leader_reflections
      ADD CONSTRAINT leader_reflections_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.leader_patterns') IS NOT NULL THEN
    ALTER TABLE public.leader_patterns
      DROP CONSTRAINT IF EXISTS leader_patterns_user_id_fkey;
    ALTER TABLE public.leader_patterns
      ADD CONSTRAINT leader_patterns_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.leader_prompt_history') IS NOT NULL THEN
    ALTER TABLE public.leader_prompt_history
      DROP CONSTRAINT IF EXISTS leader_prompt_history_user_id_fkey;
    ALTER TABLE public.leader_prompt_history
      ADD CONSTRAINT leader_prompt_history_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$guard$;
