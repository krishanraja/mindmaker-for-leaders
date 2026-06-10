-- kit-artifacts bucket: persisted ZIP artifacts for class kit packs.
-- Pattern mirrors 20260424000001_ctrl_briefings_bucket.sql (private bucket,
-- folder-based isolation on the first path segment = auth.uid()).
-- Path convention: <user_id>/<redemption_id>/<artifact_id>-v<version>.zip
-- Uploads happen via the service role inside kit-compose; end users only
-- ever read their own folder. Anonymous sessions are role `authenticated`,
-- so a code-redeeming student can download their own ZIPs directly.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kit-artifacts',
  'kit-artifacts',
  false,
  10485760,                 -- 10 MB
  ARRAY['application/zip']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['application/zip']::text[];

DROP POLICY IF EXISTS "Users can read their own kit artifacts" ON storage.objects;

CREATE POLICY "Users can read their own kit artifacts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kit-artifacts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON POLICY "Users can read their own kit artifacts" ON storage.objects IS
  'kit-artifacts: folder-based isolation. First path segment must equal auth.uid().';
