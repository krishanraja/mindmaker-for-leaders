-- Decision evidence: one-line key_point, published date, and a single 0-100 trust score.
--
-- The Decisions tab used to render each source as a full block paragraph of raw article text.
-- These three additive, nullable columns let it show each source as ONE line carrying a single
-- sophisticated score:
--   key_point      - the one-line distillation shown by default (the full excerpt stays one tap
--                    away; UI falls back to a first-clause of the excerpt for rows without one).
--   published_at   - the source's publish date when a retriever surfaced it (Exa publishedDate /
--                    NewsAPI publishedAt); feeds the freshness component of the score.
--   evidence_score - the single 0-100 score (freshness + reliability tier + corroboration),
--                    computed honestly at insert by decision-engine/reliability.ts scoreEvidence.
--
-- All nullable: old rows keep NULL and degrade gracefully (first-clause one-liner, hidden score
-- ring, unknown date). Idempotent so a re-run never errors.

ALTER TABLE public.decision_evidence ADD COLUMN IF NOT EXISTS key_point text;
ALTER TABLE public.decision_evidence ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.decision_evidence ADD COLUMN IF NOT EXISTS evidence_score numeric;

ALTER TABLE public.decision_evidence DROP CONSTRAINT IF EXISTS decision_evidence_score_range;
ALTER TABLE public.decision_evidence ADD CONSTRAINT decision_evidence_score_range
  CHECK (evidence_score IS NULL OR (evidence_score >= 0 AND evidence_score <= 100));
