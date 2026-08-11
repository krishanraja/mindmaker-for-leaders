-- Blind Spot Trusted-Advisor vertical slice.
-- Additive and rollback-compatible with the existing Blind Spot response.

ALTER TABLE public.user_patterns
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS anchor_fingerprint text,
  ADD COLUMN IF NOT EXISTS evidence_strength jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmation_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_patterns_blindspot_fingerprint
  ON public.user_patterns(user_id, anchor_fingerprint)
  WHERE pattern_type = 'blindspot' AND anchor_fingerprint IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_patterns_confirmation_key
  ON public.user_patterns(user_id, confirmation_key)
  WHERE confirmation_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.blind_spot_evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_id uuid NOT NULL REFERENCES public.user_patterns(id) ON DELETE CASCADE,
  source_kind text NOT NULL CHECK (source_kind IN ('memory', 'decision', 'decision_case', 'mission', 'check_in')),
  source_id uuid NOT NULL,
  source_snapshot jsonb NOT NULL,
  observed_at timestamptz NOT NULL,
  role text NOT NULL CHECK (role IN ('intention', 'recurrence')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pattern_id, source_kind, source_id, role)
);

CREATE INDEX IF NOT EXISTS idx_blind_spot_evidence_user
  ON public.blind_spot_evidence_links(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blind_spot_evidence_pattern
  ON public.blind_spot_evidence_links(pattern_id);

CREATE TABLE IF NOT EXISTS public.blind_spot_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_id uuid NOT NULL REFERENCES public.user_patterns(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  instruction text NOT NULL CHECK (char_length(instruction) BETWEEN 1 AND 240),
  check_in_prompt text NOT NULL CHECK (char_length(check_in_prompt) BETWEEN 1 AND 180),
  duration_minutes integer NOT NULL DEFAULT 15 CHECK (duration_minutes BETWEEN 5 AND 15),
  due_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  outcome text CHECK (outcome IN ('positive', 'not_really', 'not_yet')),
  defer_count integer NOT NULL DEFAULT 0 CHECK (defer_count BETWEEN 0 AND 1),
  user_note text CHECK (user_note IS NULL OR char_length(user_note) <= 500),
  surfaced_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > due_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blind_spot_one_active_experiment
  ON public.blind_spot_experiments(pattern_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_blind_spot_experiments_due
  ON public.blind_spot_experiments(user_id, due_at)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.blind_spot_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anchor_fingerprint text NOT NULL CHECK (char_length(anchor_fingerprint) = 64),
  reason text NOT NULL CHECK (reason IN ('wrong_pattern', 'evidence_stale', 'missing_context')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, anchor_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_blind_spot_rejections_user
  ON public.blind_spot_rejections(user_id, updated_at DESC);

ALTER TABLE public.blind_spot_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blind_spot_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blind_spot_rejections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blind spot evidence" ON public.blind_spot_evidence_links;
CREATE POLICY "Users can view own blind spot evidence"
  ON public.blind_spot_evidence_links FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own blind spot experiments" ON public.blind_spot_experiments;
CREATE POLICY "Users can view own blind spot experiments"
  ON public.blind_spot_experiments FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own blind spot rejections" ON public.blind_spot_rejections;
CREATE POLICY "Users can view own blind spot rejections"
  ON public.blind_spot_rejections FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

REVOKE ALL ON public.blind_spot_evidence_links FROM anon, authenticated;
REVOKE ALL ON public.blind_spot_experiments FROM anon, authenticated;
REVOKE ALL ON public.blind_spot_rejections FROM anon, authenticated;
GRANT SELECT ON public.blind_spot_evidence_links TO authenticated;
GRANT SELECT ON public.blind_spot_experiments TO authenticated;
GRANT SELECT ON public.blind_spot_rejections TO authenticated;
GRANT ALL ON public.blind_spot_evidence_links TO service_role;
GRANT ALL ON public.blind_spot_experiments TO service_role;
GRANT ALL ON public.blind_spot_rejections TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_blind_spot_candidate_v2(
  p_user_id uuid,
  p_pattern_text text,
  p_explanation text,
  p_anchor_fingerprint text,
  p_evidence_strength jsonb,
  p_anchors jsonb,
  p_experiment jsonb,
  p_idempotency_key text
)
RETURNS TABLE(pattern_id uuid, experiment_id uuid, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern_id uuid;
  v_experiment_id uuid;
  v_created boolean := false;
  v_anchor jsonb;
  v_source_id uuid;
  v_source_owned boolean;
  v_existing_fingerprint text;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;
  IF char_length(btrim(coalesce(p_pattern_text, ''))) < 3
    OR char_length(p_pattern_text) > 96
    OR array_length(regexp_split_to_array(btrim(p_pattern_text), '[[:space:]]+'), 1) > 8 THEN
    RAISE EXCEPTION 'Invalid Blind Spot headline';
  END IF;
  IF char_length(coalesce(p_anchor_fingerprint, '')) <> 64
    OR char_length(btrim(coalesce(p_idempotency_key, ''))) < 8 THEN
    RAISE EXCEPTION 'Invalid confirmation identity';
  END IF;
  IF jsonb_typeof(p_anchors) <> 'array'
    OR jsonb_array_length(p_anchors) < 3
    OR jsonb_typeof(p_experiment) <> 'object' THEN
    RAISE EXCEPTION 'Pattern confirmation requires evidence and an experiment';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_anchors) anchor WHERE anchor->>'role' = 'intention') <> 1
    OR (SELECT count(*) FROM jsonb_array_elements(p_anchors) anchor WHERE anchor->>'role' = 'recurrence') < 2
    OR (SELECT count(DISTINCT (anchor->>'sourceKind') || ':' || (anchor->>'sourceId')) FROM jsonb_array_elements(p_anchors) anchor) <> jsonb_array_length(p_anchors) THEN
    RAISE EXCEPTION 'Pattern confirmation requires one intention and two distinct recurrences';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_anchor_fingerprint, 0));

  SELECT up.id, up.anchor_fingerprint INTO v_pattern_id, v_existing_fingerprint
  FROM public.user_patterns up
  WHERE up.user_id = p_user_id
    AND (up.confirmation_key = p_idempotency_key OR up.anchor_fingerprint = p_anchor_fingerprint)
  ORDER BY up.created_at ASC
  LIMIT 1;

  IF v_pattern_id IS NOT NULL AND v_existing_fingerprint IS DISTINCT FROM p_anchor_fingerprint THEN
    RAISE EXCEPTION 'Idempotency key already belongs to different evidence';
  END IF;

  IF v_pattern_id IS NULL THEN
    INSERT INTO public.user_patterns (
      user_id,
      pattern_type,
      pattern_text,
      explanation,
      anchor_fingerprint,
      evidence_strength,
      confirmation_key,
      evidence_count,
      confidence,
      status,
      last_confirmed_at
    ) VALUES (
      p_user_id,
      'blindspot',
      btrim(p_pattern_text),
      nullif(btrim(p_explanation), ''),
      p_anchor_fingerprint,
      coalesce(p_evidence_strength, '{}'::jsonb),
      p_idempotency_key,
      jsonb_array_length(p_anchors),
      1,
      'confirmed',
      now()
    ) RETURNING id INTO v_pattern_id;
    v_created := true;
  ELSE
    UPDATE public.user_patterns
    SET last_confirmed_at = now(),
        evidence_count = greatest(evidence_count, jsonb_array_length(p_anchors)),
        evidence_strength = coalesce(p_evidence_strength, evidence_strength),
        status = 'confirmed'
    WHERE id = v_pattern_id AND user_id = p_user_id;
  END IF;

  FOR v_anchor IN SELECT value FROM jsonb_array_elements(p_anchors)
  LOOP
    IF (v_anchor->>'sourceKind') NOT IN ('memory', 'decision', 'decision_case', 'mission', 'check_in')
      OR (v_anchor->>'role') NOT IN ('intention', 'recurrence') THEN
      RAISE EXCEPTION 'Invalid evidence anchor';
    END IF;

    v_source_id := (v_anchor->>'sourceId')::uuid;
    v_source_owned := CASE v_anchor->>'sourceKind'
      WHEN 'memory' THEN EXISTS (
        SELECT 1 FROM public.user_memory WHERE id = v_source_id AND user_id = p_user_id
      )
      WHEN 'decision' THEN EXISTS (
        SELECT 1 FROM public.user_decisions WHERE id = v_source_id AND user_id = p_user_id
      )
      WHEN 'decision_case' THEN EXISTS (
        SELECT 1 FROM public.decision_cases WHERE id = v_source_id AND user_id = p_user_id
      )
      WHEN 'mission' THEN EXISTS (
        SELECT 1 FROM public.leader_missions lm
        LEFT JOIN public.leaders l ON l.id = lm.leader_id
        WHERE lm.id = v_source_id AND (lm.leader_id = p_user_id OR l.user_id = p_user_id)
      )
      WHEN 'check_in' THEN EXISTS (
        SELECT 1 FROM public.leader_check_ins lci
        LEFT JOIN public.leaders l ON l.id = lci.leader_id
        WHERE lci.id = v_source_id AND (lci.leader_id = p_user_id OR l.user_id = p_user_id)
      ) OR EXISTS (
        SELECT 1 FROM public.blind_spot_experiments bse
        WHERE bse.id = v_source_id AND bse.user_id = p_user_id AND bse.outcome = 'positive'
      )
      ELSE false
    END;

    IF NOT v_source_owned THEN
      RAISE EXCEPTION 'Evidence source is not owned by the confirming user';
    END IF;

    INSERT INTO public.blind_spot_evidence_links (
      user_id,
      pattern_id,
      source_kind,
      source_id,
      source_snapshot,
      observed_at,
      role
    ) VALUES (
      p_user_id,
      v_pattern_id,
      v_anchor->>'sourceKind',
      v_source_id,
      jsonb_build_object(
        'label', v_anchor->>'label',
        'excerpt', v_anchor->>'excerpt'
      ),
      (v_anchor->>'observedAt')::timestamptz,
      v_anchor->>'role'
    )
    ON CONFLICT (pattern_id, source_kind, source_id, role) DO NOTHING;
  END LOOP;

  SELECT bse.id INTO v_experiment_id
  FROM public.blind_spot_experiments bse
  WHERE bse.pattern_id = v_pattern_id AND bse.status = 'active'
  LIMIT 1;

  IF v_experiment_id IS NULL THEN
    INSERT INTO public.blind_spot_experiments (
      user_id,
      pattern_id,
      title,
      instruction,
      check_in_prompt,
      duration_minutes,
      due_at,
      expires_at
    ) VALUES (
      p_user_id,
      v_pattern_id,
      left(btrim(p_experiment->>'title'), 80),
      left(btrim(p_experiment->>'instruction'), 240),
      left(btrim(p_experiment->>'checkInPrompt'), 180),
      least(15, greatest(5, coalesce((p_experiment->>'durationMinutes')::integer, 15))),
      now() + interval '24 hours',
      now() + interval '14 days'
    ) RETURNING id INTO v_experiment_id;
  END IF;

  RETURN QUERY SELECT v_pattern_id, v_experiment_id, v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_blind_spot_candidate_v2(uuid, text, text, text, jsonb, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_blind_spot_candidate_v2(uuid, text, text, text, jsonb, jsonb, jsonb, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.record_blind_spot_experiment_outcome(
  p_user_id uuid,
  p_experiment_id uuid,
  p_outcome text,
  p_note text DEFAULT NULL
)
RETURNS TABLE(experiment_id uuid, status text, outcome text, due_at timestamptz, defer_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_experiment public.blind_spot_experiments%ROWTYPE;
BEGIN
  IF p_outcome NOT IN ('positive', 'not_really', 'not_yet') THEN
    RAISE EXCEPTION 'Invalid experiment outcome';
  END IF;

  SELECT * INTO v_experiment
  FROM public.blind_spot_experiments
  WHERE id = p_experiment_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_experiment.id IS NULL THEN
    RAISE EXCEPTION 'Experiment not found';
  END IF;
  IF v_experiment.status <> 'active' THEN
    RETURN QUERY SELECT v_experiment.id, v_experiment.status, v_experiment.outcome,
      v_experiment.due_at, v_experiment.defer_count;
    RETURN;
  END IF;
  IF v_experiment.expires_at <= now() THEN
    UPDATE public.blind_spot_experiments
    SET status = 'expired', updated_at = now()
    WHERE id = v_experiment.id;
  ELSIF p_outcome = 'not_yet' AND v_experiment.defer_count = 0 THEN
    UPDATE public.blind_spot_experiments
    SET outcome = 'not_yet', defer_count = 1, due_at = least(now() + interval '48 hours', expires_at),
        user_note = left(nullif(btrim(p_note), ''), 500), updated_at = now()
    WHERE id = v_experiment.id;
  ELSIF p_outcome = 'not_yet' THEN
    RAISE EXCEPTION 'Experiment has already been deferred once';
  ELSE
    UPDATE public.blind_spot_experiments
    SET status = 'completed', outcome = p_outcome,
        user_note = left(nullif(btrim(p_note), ''), 500), completed_at = now(), updated_at = now()
    WHERE id = v_experiment.id;
  END IF;

  RETURN QUERY
  SELECT bse.id, bse.status, bse.outcome, bse.due_at, bse.defer_count
  FROM public.blind_spot_experiments bse
  WHERE bse.id = v_experiment.id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_blind_spot_experiment_outcome(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_blind_spot_experiment_outcome(uuid, uuid, text, text)
  TO service_role;

COMMENT ON TABLE public.blind_spot_evidence_links IS
  'Owner-scoped immutable evidence snapshots for user-confirmed Blind Spot patterns.';
COMMENT ON TABLE public.blind_spot_experiments IS
  'One low-cost experiment per confirmed Blind Spot pattern, surfaced later in a briefing.';
COMMENT ON TABLE public.blind_spot_rejections IS
  'Stores only a rejection reason and evidence fingerprint so unchanged evidence is suppressed.';
