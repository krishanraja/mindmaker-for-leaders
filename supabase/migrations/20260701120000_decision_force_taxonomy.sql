-- Decision "force spider": tag each claim with one of the 6 fixed AI-native forces, and carry a
-- short decision-specific label per force so the redesigned Decisions tab can render the decision
-- as a centre node with the six forces (Capability / Economics / Risk / Build-vs-buy / Team /
-- Timing) spidering out, colour-coded by health.
--
--   decision_claims.dimension  - which of the 6 forces a claim bears on. Groups claims into forces
--                                and drives each force's green/amber/grey health (rolled up on the
--                                client from claim verdicts).
--   decision_cases.force_labels - a jsonb map {force_key: "1-2 word specific concern"} e.g.
--                                {"economics":"Token cost","risk":"Hallucination"}. Supplies the
--                                decision-specific node captions (fallback to the generic force name).
--
-- Both nullable so old rows degrade gracefully (untagged claims are inferred client-side from
-- claim `type`; a missing label falls back to the generic force name). Idempotent.

ALTER TABLE public.decision_claims
  ADD COLUMN IF NOT EXISTS dimension text
  CHECK (dimension IS NULL OR dimension IN ('capability','economics','risk','build_buy','team','timing'));

ALTER TABLE public.decision_cases
  ADD COLUMN IF NOT EXISTS force_labels jsonb;
