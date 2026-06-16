-- Reliability tier on decision_evidence: a REAL stored value for how trustworthy a
-- source is, set honestly from the retriever / source_type at insert time. Replaces
-- the StoneDeeper heuristic (which inferred a tier from the retriever string at render).
-- Nullable: null means "tier not stamped" (older rows) and the UI falls back to the
-- existing heuristic for those, so nothing regresses.
--   primary    - official / pricing / filing / gov / first-party primary source
--   reputable  - major news / research / known analyst or press
--   community  - blog / forum / community-authored
--   unverified - everything else (thin, link-only, unknown provenance)
ALTER TABLE public.decision_evidence ADD COLUMN IF NOT EXISTS reliability_tier text;

ALTER TABLE public.decision_evidence DROP CONSTRAINT IF EXISTS decision_evidence_reliability_tier_check;
ALTER TABLE public.decision_evidence ADD CONSTRAINT decision_evidence_reliability_tier_check
  CHECK (reliability_tier IS NULL OR reliability_tier IN ('primary','reputable','community','unverified'));
