-- Repair the memory retention column that production never received.
--
-- Found by object readback on 2026-08-20 while preparing to schedule the
-- retention sweep. Migration 20260125000001_memory_encryption.sql was applied
-- to production only in part: the encryption columns landed, but
-- user_memory.retention_expires_at and the BEFORE INSERT trigger did not.
--
-- The consequences were worse than a dormant feature. All three functions that
-- reference the column exist in production and are wired up:
--
--   * cleanup_expired_memories() deletes on retention_expires_at, so any call
--     raises 42703 rather than cleaning anything.
--   * update_user_memory_retention() is an ACTIVE trigger on
--     user_memory_settings, so a user changing their retention window in
--     Settings raises 42703 and the setting fails to save.
--   * set_memory_retention_expiration() exists but was never attached to
--     user_memory, so new rows were never stamped.
--
-- Additive and safe to run now: all 109 user_memory_settings rows currently
-- hold retention_days IS NULL (keep forever), so no row gains an expiry and
-- nothing becomes eligible for deletion by applying this. Verified 2026-08-20.

ALTER TABLE public.user_memory
  ADD COLUMN IF NOT EXISTS retention_expires_at timestamptz;

COMMENT ON COLUMN public.user_memory.retention_expires_at IS
  'When this fact becomes eligible for retention cleanup. NULL means keep for the life of the account.';

-- The cleanup scans on this predicate; without the index it is a sequential
-- scan of every fact in the table on every nightly run.
CREATE INDEX IF NOT EXISTS user_memory_retention_expires_idx
  ON public.user_memory (retention_expires_at)
  WHERE retention_expires_at IS NOT NULL;

-- The missing half of the pair. update_memory_retention_on_settings_change
-- already exists on user_memory_settings and re-stamps existing rows when the
-- window changes; this one stamps each new row on insert.
DROP TRIGGER IF EXISTS set_memory_retention_trigger ON public.user_memory;
CREATE TRIGGER set_memory_retention_trigger
  BEFORE INSERT ON public.user_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_memory_retention_expiration();
