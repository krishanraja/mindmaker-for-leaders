-- Stage 3a of the harness chain (CH-18): the compiled standard becomes a
-- first-class artefact.
--
-- CH-18's whole point is that this costs ONE check-constraint migration and no
-- new table. Rule 0.2 holds: there is no third artifact table, and the standard
-- rides the same generated_artifacts row shape, the same RLS, the same Library
-- tab and the same one-click download that already ships my-ai-context.md.
--
-- The measurement that gates Phase 6 (the share of sort completers who open or
-- download their standard inside a week) needs the artefact to exist first, and
-- this is the only schema change it needs.
--
-- Idempotent: drop the CHECK if it is there and recreate it with every existing
-- value plus 'standard'. The existing values are the five from
-- 20260513000000_generated_artifacts.sql; none is removed.

ALTER TABLE public.generated_artifacts
  DROP CONSTRAINT IF EXISTS generated_artifacts_kind_check;

ALTER TABLE public.generated_artifacts
  ADD CONSTRAINT generated_artifacts_kind_check
  CHECK (kind IN (
    'skill',
    'draft',
    'export',
    'framework',
    'briefing_custom',
    'standard'
  ));

-- The Library and the download both read the newest standard per user; this is
-- the one index that read needs and it does not exist on (user_id, kind, created_at).
CREATE INDEX IF NOT EXISTS idx_generated_artifacts_user_kind_created
  ON public.generated_artifacts(user_id, kind, created_at DESC);
