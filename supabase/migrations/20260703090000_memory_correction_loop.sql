-- ============================================================================
-- Memory correction loop: corrections persist as signals, not just overwrites.
--
-- Before this migration, verify_memory_fact's corrected path destructively
-- overwrote fact_value and the prior value was lost; rejected facts left the
-- dedup set (is_current = false) so the extractor could re-infer the same
-- wrong fact later. Now every user correction / rejection / dispute writes a
-- memory_events row carrying the prior value, so:
--   - the extractor can be correction-aware (never re-infer a known-wrong value)
--   - the product can honestly say "I won't make that mistake again"
--
-- memory_events (20260615000000_brain_p1_foundation.sql) already has owner
-- RLS and the right shape; kind is free text so no enum change is needed.
-- New kinds: user_corrected | user_rejected | user_disputed.
-- Payload carries plaintext prior/new values (same exposure as fact_context).
--
-- NOTE: signatures of verify_memory_fact / fix_memory_fact are unchanged so
-- PostgREST RPC callers keep working.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_memory_events_user_kind
  ON memory_events(user_id, kind, occurred_at DESC);

-- Function to verify a fact (replaces 20260114000000 definition; adds event logging)
CREATE OR REPLACE FUNCTION verify_memory_fact(
  p_fact_id UUID,
  p_new_value TEXT DEFAULT NULL,
  p_is_correct BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $func$
DECLARE
  v_user_id UUID;
  v_fact_key TEXT;
  v_fact_label TEXT;
  v_prior_value TEXT;
BEGIN
  SELECT user_id, fact_key, fact_label, fact_value
    INTO v_user_id, v_fact_key, v_fact_label, v_prior_value
  FROM public.user_memory WHERE id = p_fact_id;

  -- Verify ownership
  IF v_user_id != auth.uid() THEN
    RETURN false;
  END IF;

  IF p_is_correct AND p_new_value IS NULL THEN
    -- User confirmed the fact as-is
    UPDATE public.user_memory
    SET verification_status = 'verified',
        verified_at = now()
    WHERE id = p_fact_id;
  ELSIF p_is_correct AND p_new_value IS NOT NULL THEN
    -- User corrected the fact: the new value IS the truth, but the prior
    -- value persists as a correction signal for the extractor.
    UPDATE public.user_memory
    SET verification_status = 'corrected',
        fact_value = p_new_value,
        verified_at = now()
    WHERE id = p_fact_id;

    INSERT INTO public.memory_events (user_id, fact_id, kind, payload)
    VALUES (v_user_id, p_fact_id, 'user_corrected', jsonb_build_object(
      'fact_key', v_fact_key,
      'fact_label', v_fact_label,
      'prior_value', v_prior_value,
      'new_value', p_new_value
    ));
  ELSE
    -- User rejected the fact
    UPDATE public.user_memory
    SET verification_status = 'rejected',
        is_current = false,
        verified_at = now()
    WHERE id = p_fact_id;

    INSERT INTO public.memory_events (user_id, fact_id, kind, payload)
    VALUES (v_user_id, p_fact_id, 'user_rejected', jsonb_build_object(
      'fact_key', v_fact_key,
      'fact_label', v_fact_label,
      'prior_value', v_prior_value
    ));
  END IF;

  RETURN true;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_memory_fact TO authenticated;

-- fix_memory_fact (replaces 20260616120000 definition; adds event logging)
CREATE OR REPLACE FUNCTION public.fix_memory_fact(p_fact_id UUID)
RETURNS BOOLEAN AS $func$
DECLARE
  v_user_id UUID;
  v_fact_key TEXT;
  v_fact_label TEXT;
  v_prior_value TEXT;
BEGIN
  SELECT user_id, fact_key, fact_label, fact_value
    INTO v_user_id, v_fact_key, v_fact_label, v_prior_value
  FROM public.user_memory WHERE id = p_fact_id;

  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE public.user_memory
  SET verification_status = 'disputed',
      is_current = false
  WHERE id = p_fact_id
    AND user_id = auth.uid();

  UPDATE public.memory_edges
  SET is_active = false
  WHERE user_id = auth.uid()
    AND (from_fact_id = p_fact_id OR to_fact_id = p_fact_id);

  INSERT INTO public.memory_events (user_id, fact_id, kind, payload)
  VALUES (v_user_id, p_fact_id, 'user_disputed', jsonb_build_object(
    'fact_key', v_fact_key,
    'fact_label', v_fact_label,
    'prior_value', v_prior_value
  ));

  RETURN true;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.fix_memory_fact(UUID) TO authenticated;
