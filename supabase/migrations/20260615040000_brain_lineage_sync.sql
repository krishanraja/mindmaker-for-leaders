-- Migration: keep the provenance DAG current for NEW decisions.
-- The P2 backfill was one-time; without this, a new decision creates claims/evidence/facts
-- but NO memory_links edges, so lineage_of() returns nothing and the credit loop can't reach
-- its facts. sync_decision_lineage() re-derives edges from decision_cases/claims/evidence
-- (idempotent via ON CONFLICT), and run_brain_adapt() calls it before crediting outcomes.

CREATE OR REPLACE FUNCTION sync_decision_lineage()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_before BIGINT;
  v_after BIGINT;
BEGIN
  SELECT count(*) INTO v_before FROM memory_links;

  -- decision -> memory (objective_fact_ids)
  INSERT INTO memory_links (user_id, from_type, from_id, to_type, to_id, edge_type, weight)
  SELECT dc.user_id, 'decision', dc.id, 'memory', fid, 'supported_by', 1.0
  FROM decision_cases dc, unnest(dc.objective_fact_ids) AS fid
  ON CONFLICT DO NOTHING;

  -- decision -> claim
  INSERT INTO memory_links (user_id, from_type, from_id, to_type, to_id, edge_type, weight)
  SELECT cl.user_id, 'decision', cl.decision_case_id, 'claim', cl.id, 'supported_by',
         CASE WHEN cl.is_load_bearing THEN 2.0 ELSE 1.0 END
  FROM decision_claims cl
  ON CONFLICT DO NOTHING;

  -- claim -> evidence
  INSERT INTO memory_links (user_id, from_type, from_id, to_type, to_id, edge_type, weight)
  SELECT ev.user_id, 'claim', ev.claim_id, 'evidence', ev.id, 'supported_by', 1.0
  FROM decision_evidence ev
  WHERE ev.claim_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_after FROM memory_links;
  RETURN (v_after - v_before)::INT;  -- new edges added
END;
$$;

-- Fold the sync into the nightly runner: keep the DAG current, then credit outcomes.
CREATE OR REPLACE FUNCTION run_brain_adapt(p_limit INT DEFAULT 200)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  total INT := 0;
BEGIN
  PERFORM sync_decision_lineage();  -- keep lineage current before crediting
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
