-- Burn a confirmed Blind Spot pattern.
--
-- Blind Spot stores a named pattern, dated evidence snapshots and an
-- experiment, for the life of the account. A senior leader reads that as a
-- permanent, evidenced record of their weaknesses, and the existence of the
-- artifact is the thing that worries them, not who can see it. Rejection
-- already existed, but it only suppresses a candidate that was never saved.
-- There was no way to remove a pattern once confirmed.
--
-- Burn deletes the pattern, its evidence links and its experiment. It keeps
-- one content-free row: the anchor fingerprint, so the same read does not
-- regenerate on the next pass. That fingerprint is a hash of the evidence
-- sources and carries no text, which is why the surface can honestly say the
-- pattern is gone while the suppression still holds.

CREATE OR REPLACE FUNCTION public.burn_blind_spot_pattern(
  p_user_id uuid,
  p_pattern_id uuid
)
RETURNS TABLE(burned boolean, anchor_fingerprint text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fingerprint text;
BEGIN
  IF p_user_id IS NULL OR p_pattern_id IS NULL THEN
    RAISE EXCEPTION 'Invalid burn request';
  END IF;

  -- Ownership is checked here rather than trusted from the caller. The
  -- function is service_role only, so this is the boundary that stops one
  -- account burning another account's pattern.
  SELECT up.anchor_fingerprint INTO v_fingerprint
  FROM public.user_patterns up
  WHERE up.id = p_pattern_id
    AND up.user_id = p_user_id
    AND up.pattern_type = 'blindspot';

  IF v_fingerprint IS NULL THEN
    RETURN QUERY SELECT false, NULL::text;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_fingerprint, 0));

  DELETE FROM public.blind_spot_experiments
  WHERE pattern_id = p_pattern_id AND user_id = p_user_id;

  DELETE FROM public.blind_spot_evidence_links
  WHERE pattern_id = p_pattern_id AND user_id = p_user_id;

  DELETE FROM public.user_patterns
  WHERE id = p_pattern_id AND user_id = p_user_id;

  -- Content-free suppression. Reuses the rejection table so the read pipeline
  -- needs no new concept: it already skips anything whose fingerprint appears
  -- here. 'wrong_pattern' is the existing allowed reason closest to "I do not
  -- want this held".
  INSERT INTO public.blind_spot_rejections (user_id, anchor_fingerprint, reason, updated_at)
  VALUES (p_user_id, v_fingerprint, 'wrong_pattern', now())
  ON CONFLICT (user_id, anchor_fingerprint)
  DO UPDATE SET reason = 'wrong_pattern', updated_at = now();

  RETURN QUERY SELECT true, v_fingerprint;
END;
$$;

REVOKE ALL ON FUNCTION public.burn_blind_spot_pattern(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.burn_blind_spot_pattern(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.burn_blind_spot_pattern(uuid, uuid) IS
  'Deletes a confirmed Blind Spot pattern, its evidence links and its experiment. Retains only the content-free anchor fingerprint so the same read is not regenerated.';
