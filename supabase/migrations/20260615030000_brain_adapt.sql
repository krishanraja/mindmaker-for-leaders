-- Migration: CTRL Brain - the credit loop (apply_outcome_to_brain).
-- This is the keystone mechanism (CTRL-BRAIN-ARCHITECTURE.md delta 5): when a decision's
-- outcome lands, propagate credit BACKWARD along the provenance DAG to the memory facts that
-- fed it, AUTO-adjusting their importance (confidence stays gated per locked decision #3).
-- A fact that fed decisions that played out well rises; one that fed broken calls falls.
-- This is the moment the brain stops being a store and starts adapting (day-100 != day-1).
-- Pure SQL function so it is fully verifiable; a thin cron wrapper (brain-adapt edge fn) calls it.

CREATE OR REPLACE FUNCTION apply_outcome_to_brain(p_outcome_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_outcome RECORD;
  v_dir INT;
  v_count INT := 0;
  v_fact_ids UUID[];
BEGIN
  SELECT * INTO v_outcome FROM decision_outcomes WHERE id = p_outcome_id;
  IF NOT FOUND OR v_outcome.applied_to_brain THEN
    RETURN 0;  -- nothing to do / already applied (idempotent)
  END IF;

  -- Credit direction from how the decision PLAYED OUT (process-judged, not luck).
  v_dir := CASE v_outcome.played_out
             WHEN 'true'  THEN 1    -- played out well -> the facts that fed it were good anchors
             WHEN 'false' THEN -1   -- broke -> the facts that fed it were less load-bearing
             ELSE 0                 -- too_early / unknown -> no change yet
           END;

  IF v_dir <> 0 THEN
    -- The contributing MEMORY facts = those reachable from the decision in the lineage DAG.
    SELECT array_agg(DISTINCT l.to_id) INTO v_fact_ids
    FROM lineage_of(v_outcome.decision_case_id, 5) l
    WHERE l.to_type = 'memory';

    IF v_fact_ids IS NOT NULL THEN
      UPDATE user_memory um
      SET importance = GREATEST(1, LEAST(10, COALESCE(um.importance, 5) + v_dir))
      WHERE um.id = ANY(v_fact_ids)
        AND um.user_id = v_outcome.user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;

      -- Record each adjustment (audit + Calibration Mirror feed).
      INSERT INTO memory_events (user_id, fact_id, kind, strategy, payload)
      SELECT v_outcome.user_id, fid, 'importance_adjusted', 'outcome',
             jsonb_build_object('outcome_id', p_outcome_id,
                                'decision_case_id', v_outcome.decision_case_id,
                                'direction', v_dir)
      FROM unnest(v_fact_ids) AS fid;
    END IF;
  END IF;

  UPDATE decision_outcomes SET applied_to_brain = true WHERE id = p_outcome_id;
  RETURN v_count;
END;
$$;

-- === the runner: apply all unapplied outcomes (scheduled nightly, after memory-sweep) ===
CREATE OR REPLACE FUNCTION run_brain_adapt(p_limit INT DEFAULT 200)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  total INT := 0;
BEGIN
  FOR r IN
    SELECT id FROM decision_outcomes
    WHERE applied_to_brain = false
    ORDER BY judged_at
    LIMIT p_limit
  LOOP
    PERFORM apply_outcome_to_brain(r.id);
    total := total + 1;
  END LOOP;
  RETURN total;
END;
$$;

-- Schedule nightly at 03:30 UTC (after memory-sweep at 03:00). Idempotent: drop any prior job first.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'brain-adapt-nightly';
SELECT cron.schedule('brain-adapt-nightly', '30 3 * * *', 'SELECT run_brain_adapt();');
