-- Migration: atomic resolve_decision() - the ONE closing move for a decision.
-- Before this, resolving was two non-atomic client writes (record_decision_outcome RPC,
-- then UPDATE decision_cases SET status='decided'). If the RPC threw (its unguarded
-- apply_outcome_to_brain call being the usual culprit), the status flip never ran and the
-- "closed" decision kept auto-loading as open. This function does the outcome insert and
-- the status flip in ONE transaction, and makes the brain harvest best-effort: a
-- sharpening hiccup must never block the leader's intent to close the decision.
-- Conventions mirror record_decision_outcome (20260615050000): SECURITY DEFINER,
-- auth.uid() ownership check, GRANT to authenticated, CREATE OR REPLACE idempotent.

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
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM decision_cases WHERE id = p_decision_case_id AND user_id = v_user) THEN
    RAISE EXCEPTION 'decision not found for this user';
  END IF;

  INSERT INTO decision_outcomes (user_id, decision_case_id, resolution, played_out, process_quality, outcome_note, source)
  VALUES (v_user, p_decision_case_id, NULL, p_played_out, NULL, p_note, 'resolve')
  RETURNING id INTO v_id;

  UPDATE decision_cases
  SET status = 'decided', pinned_at = NULL, updated_at = now()
  WHERE id = p_decision_case_id AND user_id = v_user;

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
