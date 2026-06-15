-- Migration: CTRL Brain P2 keystone foundation - provenance DAG + decision outcomes.
-- Implements the data backbone for outcome-weighted behavioral adaptation
-- (CTRL-BRAIN-ARCHITECTURE.md delta 5): "why was X decided" + the credit loop that
-- makes day-100 != day-1. SQL-only; additive + idempotent.
--   - memory_links: a typed, weighted, polymorphic edge table (decision -> claim ->
--     evidence -> memory). Replaces the bare decision_cases.objective_fact_ids[] cache as
--     the traversable source of truth. Traversed with recursive CTEs (Postgres-native; no graph DB).
--   - decision_outcomes: what actually happened to a banked decision, judged on PROCESS not luck.
--   - lineage_of(): recursive backward traversal = the provenance subgraph for a decision.

-- === the lineage DAG (polymorphic edges; no FK on from_id/to_id by design) ===
CREATE TABLE IF NOT EXISTS memory_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_type TEXT NOT NULL,   -- decision | claim | evidence | memory | outcome
  from_id UUID NOT NULL,
  to_type TEXT NOT NULL,
  to_id UUID NOT NULL,
  edge_type TEXT NOT NULL CHECK (edge_type IN ('caused_by','supported_by','contradicts','derived_from','resolved_by')),
  weight NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_links_from ON memory_links(user_id, from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_to ON memory_links(user_id, to_type, to_id);
-- prevent duplicate edges
CREATE UNIQUE INDEX IF NOT EXISTS uq_memory_links_edge
  ON memory_links(user_id, from_type, from_id, to_type, to_id, edge_type);

ALTER TABLE memory_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memory_links_select_own ON memory_links;
CREATE POLICY memory_links_select_own ON memory_links FOR SELECT USING (user_id = auth.uid());

-- === decision outcomes (process-judged, harvested from signals; never a grading chore) ===
CREATE TABLE IF NOT EXISTS decision_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_case_id UUID NOT NULL REFERENCES decision_cases(id) ON DELETE CASCADE,
  resolution TEXT CHECK (resolution IN ('proceed','hold','reopen')),
  played_out TEXT CHECK (played_out IN ('true','false','too_early')),
  process_quality SMALLINT CHECK (process_quality BETWEEN 1 AND 5),
  outcome_note TEXT,
  source TEXT,               -- alert | thumbs | prompt | manual
  applied_to_brain BOOLEAN DEFAULT false,   -- has brain-adapt propagated this outcome's credit yet
  judged_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_outcomes_case ON decision_outcomes(user_id, decision_case_id);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_unapplied ON decision_outcomes(applied_to_brain) WHERE applied_to_brain = false;

ALTER TABLE decision_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS decision_outcomes_select_own ON decision_outcomes;
CREATE POLICY decision_outcomes_select_own ON decision_outcomes FOR SELECT USING (user_id = auth.uid());

-- === backfill the DAG from existing decision data (one-off; engine writes edges going forward) ===
-- decision -> memory (from objective_fact_ids)
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

-- === lineage_of(): recursive backward traversal - the provenance subgraph for a decision ===
CREATE OR REPLACE FUNCTION lineage_of(p_root_id UUID, p_max_depth INT DEFAULT 5)
RETURNS TABLE(depth INT, from_type TEXT, from_id UUID, to_type TEXT, to_id UUID, edge_type TEXT, weight NUMERIC)
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE walk AS (
    SELECT 1 AS depth, ml.from_type, ml.from_id, ml.to_type, ml.to_id, ml.edge_type, ml.weight
    FROM memory_links ml
    WHERE ml.from_id = p_root_id
    UNION ALL
    SELECT w.depth + 1, ml.from_type, ml.from_id, ml.to_type, ml.to_id, ml.edge_type, ml.weight
    FROM memory_links ml
    JOIN walk w ON ml.from_id = w.to_id
    WHERE w.depth < p_max_depth
  )
  SELECT depth, from_type, from_id, to_type, to_id, edge_type, weight FROM walk;
$$;
