-- Migration: CTRL Brain P1 activation - make the P1 columns actually do something.
--   1. Close valid_until whenever a fact is retired (is_current true->false) on ANY path
--      (delete, reject, supersede, swap) via a single trigger - activates temporal validity.
--   2. Memory loading drops expired facts and ranks by importance then recency - so the
--      importance score earns its keep, especially while the touch/reference loop is sparse.
-- Idempotent (CREATE OR REPLACE / DROP TRIGGER IF EXISTS). No data migration.

-- 1. Temporal-validity activation: close the window the moment a fact stops being current.
CREATE OR REPLACE FUNCTION close_validity_on_retire()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_current = true AND NEW.is_current = false AND NEW.valid_until IS NULL THEN
    NEW.valid_until := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_validity_on_retire ON user_memory;
CREATE TRIGGER trg_close_validity_on_retire
  BEFORE UPDATE ON user_memory
  FOR EACH ROW
  EXECUTE FUNCTION close_validity_on_retire();

-- 2. Importance-aware loading: skip expired facts, surface high-importance + recent first.
CREATE OR REPLACE FUNCTION get_memory_by_temperature(p_user_id UUID, p_temperature TEXT)
RETURNS SETOF user_memory
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM user_memory
  WHERE user_id = p_user_id
    AND temperature = p_temperature
    AND archived_at IS NULL
    AND is_current = true
    AND (valid_until IS NULL OR valid_until > now())
  ORDER BY importance DESC NULLS LAST, last_referenced_at DESC;
END;
$$;
