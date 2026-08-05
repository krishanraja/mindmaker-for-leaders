-- Phase 2 additive schema, from what building the sort actually needed.
-- Three gaps the Phase 1 spine did not anticipate. All additive, all
-- idempotent; nothing here changes an existing column.
--
-- 1. sort_items.source_label. Peer attribution is the entire basis on which
--    CH-11 permits the peer class to exist: the item is only worth grading
--    because it is genuinely someone else's published work, and the source
--    has to travel with the row. It was living in a jsonb side-channel on
--    harness_runs, which is not where a load-bearing consent fact belongs.
--
-- 2. sort_items.manip_answer. CH-09 replaced the leading manipulation
--    question with an OPEN one, and the whole point is that the person's own
--    answer is the diagnostic for WHY a pair failed to split. The spine
--    carried only the manip_checked / manip_ok booleans, which record that a
--    check happened and lose the thing worth reading.
--
-- 3. A repeat probe may never also be a pair half. A repeat lands a second
--    grade on the same body; if it also carried pair_id it would put a third
--    grade into that pair and skew the split rate that gates Phase 3. The
--    code already does this; the constraint writes it down.

ALTER TABLE public.sort_items
  ADD COLUMN IF NOT EXISTS source_label text;

ALTER TABLE public.sort_items
  ADD COLUMN IF NOT EXISTS manip_answer text;

COMMENT ON COLUMN public.sort_items.source_label IS
  'Attribution for peer-origin items: who published it and where. Required for origin = peer (CH-11: public, attributed, never another customer''s work).';

COMMENT ON COLUMN public.sort_items.manip_answer IS
  'The grader''s own words answering the open manipulation question. The diagnostic for why a pair did or did not isolate its dimension (CH-09).';

ALTER TABLE public.sort_items
  DROP CONSTRAINT IF EXISTS repeat_is_not_a_pair_half;
ALTER TABLE public.sort_items
  ADD CONSTRAINT repeat_is_not_a_pair_half CHECK (
    repeat_of IS NULL OR pair_id IS NULL);
