-- Migration: resolving a decision archives its duplicate runs.
-- Weighing the same statement again creates a NEW decision_cases row, so a leader who
-- re-ran a decision a few times ends up with active duplicates. Resolving closed only
-- the pinned row; the tab's auto-load then surfaced an older duplicate of the very
-- decision they just closed ("it takes me back to the decision I closed").
--
-- Two changes, both idempotent:
--   1. resolve_decision() v2: after flipping the resolved case to 'decided', archive
--      the leader's OTHER active runs of the same statement (byte-identical after
--      whitespace/case normalization - statements are the leader's original words, so
--      an exact normalized match is the honest definition of "the same decision").
--   2. Backfill: apply the same rule to history - archive active cases that duplicate
--      a decision the same leader has already decided.

CREATE OR REPLACE FUNCTION resolve_decision(
  p_decision_case_id UUID,
  p_played_out TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id UUID;
  v_statement TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  SELECT statement INTO v_statement
  FROM decision_cases WHERE id = p_decision_case_id AND user_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'decision not found for this user';
  END IF;

  INSERT INTO decision_outcomes (user_id, decision_case_id, resolution, played_out, process_quality, outcome_note, source)
  VALUES (v_user, p_decision_case_id, NULL, p_played_out, NULL, p_note, 'resolve')
  RETURNING id INTO v_id;

  UPDATE decision_cases
  SET status = 'decided', pinned_at = NULL, updated_at = now()
  WHERE id = p_decision_case_id AND user_id = v_user;

  -- Archive the leader's other ACTIVE runs of this same decision so the close sticks.
  UPDATE decision_cases
  SET status = 'archived', pinned_at = NULL, updated_at = now()
  WHERE user_id = v_user
    AND id <> p_decision_case_id
    AND status = 'active'
    AND lower(regexp_replace(statement, '\s+', ' ', 'g'))
        = lower(regexp_replace(v_statement, '\s+', ' ', 'g'));

  -- Best-effort brain sharpening: never let the harvest block the close.
  BEGIN
    PERFORM apply_outcome_to_brain(v_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_decision(UUID, TEXT, TEXT) TO authenticated;

-- Backfill: archive active duplicates of decisions their owner already decided.
UPDATE decision_cases dc
SET status = 'archived', pinned_at = NULL, updated_at = now()
WHERE dc.status = 'active'
  AND EXISTS (
    SELECT 1 FROM decision_cases done
    WHERE done.user_id = dc.user_id
      AND done.status = 'decided'
      AND done.id <> dc.id
      AND lower(regexp_replace(done.statement, '\s+', ' ', 'g'))
          = lower(regexp_replace(dc.statement, '\s+', ' ', 'g'))
  );
