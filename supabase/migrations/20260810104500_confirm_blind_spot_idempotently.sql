-- Confirming a reflection is a retryable write. Serialize confirmations by
-- user + normalized insight so double-clicks, network retries, and concurrent
-- tabs converge on one durable pattern without discarding historical rows.

CREATE OR REPLACE FUNCTION public.confirm_blind_spot_pattern(
  p_user_id UUID,
  p_pattern_text TEXT,
  p_evidence_count INTEGER,
  p_confidence NUMERIC
)
RETURNS TABLE(pattern_id UUID, created BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pattern_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_user_id::TEXT || '|blindspot|' || lower(btrim(p_pattern_text)),
      0
    )
  );

  SELECT id
  INTO v_pattern_id
  FROM public.user_patterns
  WHERE user_id = p_user_id
    AND pattern_type = 'blindspot'
    AND lower(btrim(pattern_text)) = lower(btrim(p_pattern_text))
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF v_pattern_id IS NOT NULL THEN
    UPDATE public.user_patterns
    SET evidence_count = GREATEST(COALESCE(evidence_count, 0), GREATEST(p_evidence_count, 2)),
        confidence = GREATEST(COALESCE(confidence, 0), LEAST(1, GREATEST(0, p_confidence))),
        status = 'confirmed',
        last_confirmed_at = now()
    WHERE id = v_pattern_id
      AND user_id = p_user_id;

    RETURN QUERY SELECT v_pattern_id, false;
    RETURN;
  END IF;

  INSERT INTO public.user_patterns (
    user_id,
    pattern_type,
    pattern_text,
    evidence_count,
    confidence,
    status,
    last_confirmed_at
  )
  VALUES (
    p_user_id,
    'blindspot',
    btrim(p_pattern_text),
    GREATEST(p_evidence_count, 2),
    LEAST(1, GREATEST(0, p_confidence)),
    'confirmed',
    now()
  )
  RETURNING id INTO v_pattern_id;

  RETURN QUERY SELECT v_pattern_id, true;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_blind_spot_pattern(UUID, TEXT, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_blind_spot_pattern(UUID, TEXT, INTEGER, NUMERIC) TO service_role;
