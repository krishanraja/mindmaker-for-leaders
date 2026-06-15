-- Migration: CTRL Brain P1 foundation - importance + temporal validity + memory events
-- Implements deltas 1-3 (schema) from CTRL-BRAIN-ARCHITECTURE.md:
--   - importance (poignancy 1-10) at creation, the cheap permanent retrieval-quality win
--   - temporal validity windows (valid_from / valid_until): "what was true at T", honest
--     freshness/decay, ghost-fact prevention. On supersession we CLOSE valid_until rather
--     than only flipping is_current (Graphiti close-don't-delete).
--   - memory_events: first-class record of contradiction resolutions / supersessions /
--     expirations / outcome-driven importance adjustments (audit + Calibration Mirror feed).
-- Additive + idempotent. No changes to existing RLS on existing tables.

-- === Δ1: importance at creation ===
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS importance SMALLINT
  CHECK (importance IS NULL OR (importance BETWEEN 1 AND 10));

-- === Δ2: temporal validity windows ===
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

ALTER TABLE decision_claims ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now();
ALTER TABLE decision_claims ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

ALTER TABLE decision_evidence ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now();
ALTER TABLE decision_evidence ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- "currently true" filter: valid_until IS NULL OR valid_until > now()
CREATE INDEX IF NOT EXISTS idx_user_memory_valid_until
  ON user_memory(user_id, valid_until)
  WHERE is_current = true;

-- === Δ3 (schema): memory events ===
CREATE TABLE IF NOT EXISTS memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_id UUID REFERENCES user_memory(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,            -- contradiction_resolved | superseded | expired | importance_adjusted | confidence_adjusted
  strategy TEXT,                 -- recency | confidence | ask_user | preserve_both (for contradiction_resolved)
  related_fact_id UUID REFERENCES user_memory(id) ON DELETE SET NULL,  -- the loser / counterpart
  payload JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_events_user ON memory_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_events_fact ON memory_events(fact_id);

ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;

-- Owner-scoped RLS (edge functions write via service role, which bypasses RLS).
DROP POLICY IF EXISTS memory_events_select_own ON memory_events;
CREATE POLICY memory_events_select_own ON memory_events
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS memory_events_insert_own ON memory_events;
CREATE POLICY memory_events_insert_own ON memory_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- === Backfill importance for existing facts (one-off; new facts get LLM-scored) ===
-- Derive a sensible prior from category + high-stakes; LLM poignancy supersedes going forward.
UPDATE user_memory
SET importance = LEAST(10, GREATEST(1,
  (CASE fact_category
     WHEN 'identity'   THEN 8
     WHEN 'objective'  THEN 7
     WHEN 'blocker'    THEN 7
     WHEN 'business'   THEN 6
     WHEN 'preference' THEN 4
     ELSE 5
   END)
  + (CASE WHEN is_high_stakes THEN 1 ELSE 0 END)))
WHERE importance IS NULL;

-- valid_from defaults to now() for the column, but existing facts should reflect their origin
UPDATE user_memory SET valid_from = created_at WHERE valid_from IS NULL OR valid_from > created_at;
