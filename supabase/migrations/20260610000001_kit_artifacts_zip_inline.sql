-- Kit ZIP artifacts are stored inline as base64 on the artifact row, the same
-- way free-skill-export returns its kit (no storage bucket, no signed URLs,
-- no storage RLS to own). The artifacts are small (a few KB to tens of KB),
-- and the row persists for the life of the redemption, so the pack stays
-- downloadable forever. This avoids creating policies on storage.objects,
-- which the Management API role cannot own.
ALTER TABLE public.kit_artifacts
  ADD COLUMN IF NOT EXISTS zip_base64 TEXT;
