-- One active declaration per normalized interest. The app already avoids
-- duplicates optimistically; this is the concurrent-write backstop so two
-- tabs or retries cannot split the same preference into separate live rows.
-- Historical inactive rows remain intact for provenance.

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, kind, lower(btrim(text))
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS position
  FROM public.briefing_interests
  WHERE is_active = true
)
UPDATE public.briefing_interests bi
SET is_active = false,
    updated_at = now()
FROM ranked r
WHERE bi.id = r.id
  AND r.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS briefing_interests_one_active_normalized
  ON public.briefing_interests (user_id, kind, lower(btrim(text)))
  WHERE is_active = true;
