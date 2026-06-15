-- Migration: Track-Record surface data layer (CTRL Brain - additive feature A + the harvest).
--   - record_decision_outcome(): the HARVEST. A user thumb ("did this play out?") creates a
--     decision_outcome and IMMEDIATELY fires the credit loop, so the brain sharpens on the spot.
--     This is what activates the dormant keystone. Owner-scoped via auth.uid().
--   - get_track_record(): the READ. Per banked decision: its outcome, the gut-vs-ground
--     calibration on the breakpoint claim, and the count of importance adjustments it drove
--     (the "are you getting sharper" signal). Judged on PROCESS, not luck.

-- === the harvest: record an outcome + adapt immediately ===
CREATE OR REPLACE FUNCTION record_decision_outcome(
  p_decision_case_id UUID,
  p_resolution TEXT DEFAULT NULL,
  p_played_out TEXT DEFAULT NULL,
  p_process_quality SMALLINT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'thumbs'
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
  VALUES (v_user, p_decision_case_id, p_resolution, p_played_out, p_process_quality, p_note, p_source)
  RETURNING id INTO v_id;

  -- Sharpen the brain on the spot (instant feedback, not just nightly).
  PERFORM apply_outcome_to_brain(v_id);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION record_decision_outcome(UUID, TEXT, TEXT, SMALLINT, TEXT, TEXT) TO authenticated;

-- === the read: the track record ("are you getting sharper?"), judged on process ===
CREATE OR REPLACE FUNCTION get_track_record(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  decision_id UUID,
  statement TEXT,
  status TEXT,
  decision_kind TEXT,
  decided_at TIMESTAMPTZ,
  resolution TEXT,
  played_out TEXT,
  process_quality SMALLINT,
  breakpoint_call TEXT,        -- the user's commit-first gut on the breakpoint claim
  breakpoint_verdict TEXT,     -- what the evidence said (gut-vs-ground = calibration)
  importance_adjustments INT   -- how much this decision's outcome sharpened the brain
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  -- An authed user may only read their own; service-role (auth.uid() null) may pass any id.
  IF auth.uid() IS NOT NULL AND v_user <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    dc.id,
    dc.statement,
    dc.status,
    dc.decision_kind,
    dc.updated_at,
    o.resolution,
    o.played_out,
    o.process_quality,
    uc.call,
    bp.verdict,
    COALESCE(adj.cnt, 0)::INT
  FROM decision_cases dc
  LEFT JOIN LATERAL (
    SELECT * FROM decision_outcomes d
    WHERE d.decision_case_id = dc.id ORDER BY d.judged_at DESC LIMIT 1
  ) o ON true
  LEFT JOIN decision_claims bp ON bp.id = dc.breakpoint_assumption_id
  LEFT JOIN LATERAL (
    SELECT c.call FROM decision_user_calls c
    WHERE c.decision_case_id = dc.id AND c.claim_id = dc.breakpoint_assumption_id
    ORDER BY c.created_at DESC LIMIT 1
  ) uc ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM memory_events me
    WHERE me.kind = 'importance_adjusted' AND me.payload->>'decision_case_id' = dc.id::text
  ) adj ON true
  WHERE dc.user_id = v_user
  ORDER BY dc.updated_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_track_record(UUID) TO authenticated;
