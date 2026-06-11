-- Kit Engine: class follow-up portal (session codes -> personalized packs).
-- One engine, many class presets. Presets live in-repo under
-- supabase/functions/_shared/kit-presets/; the DB stores only class_slug +
-- preset_version strings. Anonymous sessions are role `authenticated` with a
-- real auth.uid(), so plain owner-scoped RLS works for code-redeeming students
-- who never created an account.

-- 1. kit_codes: operator-seeded session codes (one per class run).
--    Service-role only: RLS enabled with ZERO policies so no client role can
--    enumerate codes. Redemption goes through the redeem_kit_code() RPC.
CREATE TABLE IF NOT EXISTS public.kit_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  class_slug TEXT NOT NULL,
  label TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_redemptions INT,
  redemption_count INT NOT NULL DEFAULT 0,
  pass_days INT NOT NULL DEFAULT 30,
  skill_quota INT NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kit_codes ENABLE ROW LEVEL SECURITY;

-- 2. kit_redemptions: the time-boxed session pass a student holds.
CREATE TABLE IF NOT EXISTS public.kit_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.kit_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_slug TEXT NOT NULL,
  preset_version TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  skill_quota INT NOT NULL DEFAULT 3,
  skills_used INT NOT NULL DEFAULT 0,
  delivery_email TEXT,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kit_redemptions_code_user_key UNIQUE (code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_kit_redemptions_user ON public.kit_redemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_kit_redemptions_nudge
  ON public.kit_redemptions (redeemed_at)
  WHERE delivery_email IS NOT NULL;

ALTER TABLE public.kit_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own kit redemptions" ON public.kit_redemptions;
CREATE POLICY "Users can read their own kit redemptions"
  ON public.kit_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. kit_builds: one row per compose run. The row IS the progress UX: the
--    orchestrator updates artifact_statuses as it works and the client polls.
CREATE TABLE IF NOT EXISTS public.kit_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES public.kit_redemptions(id) ON DELETE CASCADE,
  class_slug TEXT NOT NULL,
  preset_version TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'initial' CHECK (kind IN ('initial', 'regenerate', 'new_skill')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'partial', 'complete', 'failed')),
  intake JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback TEXT,
  only_artifact_ids TEXT[],
  artifact_statuses JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kit_builds_user ON public.kit_builds (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kit_builds_redemption ON public.kit_builds (redemption_id, created_at DESC);

ALTER TABLE public.kit_builds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own kit builds" ON public.kit_builds;
CREATE POLICY "Users can read their own kit builds"
  ON public.kit_builds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. kit_artifacts: system of record for the pack. The pack stays viewable
--    forever; regeneration inserts version+1 and flips is_current.
CREATE TABLE IF NOT EXISTS public.kit_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES public.kit_redemptions(id) ON DELETE CASCADE,
  build_id UUID REFERENCES public.kit_builds(id) ON DELETE SET NULL,
  artifact_id TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('markdown', 'json', 'zip')),
  body TEXT,
  storage_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kit_artifacts_version_key UNIQUE (redemption_id, artifact_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kit_artifacts_current
  ON public.kit_artifacts (redemption_id, artifact_id)
  WHERE is_current;

CREATE INDEX IF NOT EXISTS idx_kit_artifacts_user ON public.kit_artifacts (user_id);

ALTER TABLE public.kit_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own kit artifacts" ON public.kit_artifacts;
CREATE POLICY "Users can read their own kit artifacts"
  ON public.kit_artifacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. kit_journey_events: append-only journey log (7-day checklist + shipped).
--    Clients write these directly via supabase-js; current state is the latest
--    event per (day_index, item_id).
CREATE TABLE IF NOT EXISTS public.kit_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES public.kit_redemptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('day_checked', 'day_unchecked', 'shipped')),
  day_index INT,
  item_id TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kit_journey_redemption
  ON public.kit_journey_events (redemption_id, created_at DESC);

ALTER TABLE public.kit_journey_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own kit journey events" ON public.kit_journey_events;
CREATE POLICY "Users can read their own kit journey events"
  ON public.kit_journey_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can log their own kit journey events" ON public.kit_journey_events;
CREATE POLICY "Users can log their own kit journey events"
  ON public.kit_journey_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. kit_nudges: send-dedupe ledger for pack/day-3/day-7 emails.
--    Service-role only.
CREATE TABLE IF NOT EXISTS public.kit_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES public.kit_redemptions(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('pack', 'day_3', 'day_7')),
  email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kit_nudges_once_key UNIQUE (redemption_id, nudge_type)
);

ALTER TABLE public.kit_nudges ENABLE ROW LEVEL SECURITY;

-- 7. Atomic redemption RPC. Holding a row lock on the code while checking
--    max_redemptions closes the race when a class full of students redeems
--    at the same moment. SECURITY DEFINER + revoked from client roles: only
--    the service role (edge function kit-redeem) may call it.
CREATE OR REPLACE FUNCTION public.redeem_kit_code(
  p_code TEXT,
  p_user_id UUID,
  p_preset_version TEXT
)
RETURNS TABLE (
  result TEXT,
  redemption_id UUID,
  class_slug TEXT,
  preset_version TEXT,
  expires_at TIMESTAMPTZ,
  skill_quota INT,
  skills_used INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_code public.kit_codes%ROWTYPE;
  v_redemption public.kit_redemptions%ROWTYPE;
BEGIN
  SELECT * INTO v_code
  FROM public.kit_codes
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND OR NOT v_code.is_active THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::text, NULL::text, NULL::timestamptz, NULL::int, NULL::int;
    RETURN;
  END IF;

  IF v_code.starts_at IS NOT NULL AND now() < v_code.starts_at THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::text, NULL::text, NULL::timestamptz, NULL::int, NULL::int;
    RETURN;
  END IF;

  IF v_code.expires_at IS NOT NULL AND now() > v_code.expires_at THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::text, NULL::text, NULL::timestamptz, NULL::int, NULL::int;
    RETURN;
  END IF;

  -- Idempotent: re-scanning the QR returns the existing pass.
  SELECT * INTO v_redemption
  FROM public.kit_redemptions r
  WHERE r.code_id = v_code.id AND r.user_id = p_user_id;

  IF FOUND THEN
    RETURN QUERY SELECT 'ok'::text, v_redemption.id, v_redemption.class_slug,
      v_redemption.preset_version, v_redemption.expires_at,
      v_redemption.skill_quota, v_redemption.skills_used;
    RETURN;
  END IF;

  IF v_code.max_redemptions IS NOT NULL AND v_code.redemption_count >= v_code.max_redemptions THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::text, NULL::text, NULL::timestamptz, NULL::int, NULL::int;
    RETURN;
  END IF;

  INSERT INTO public.kit_redemptions (code_id, user_id, class_slug, preset_version, expires_at, skill_quota)
  VALUES (
    v_code.id,
    p_user_id,
    v_code.class_slug,
    p_preset_version,
    now() + make_interval(days => v_code.pass_days),
    v_code.skill_quota
  )
  RETURNING * INTO v_redemption;

  UPDATE public.kit_codes
  SET redemption_count = redemption_count + 1
  WHERE id = v_code.id;

  RETURN QUERY SELECT 'ok'::text, v_redemption.id, v_redemption.class_slug,
    v_redemption.preset_version, v_redemption.expires_at,
    v_redemption.skill_quota, v_redemption.skills_used;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.redeem_kit_code(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_kit_code(TEXT, UUID, TEXT) FROM anon, authenticated;

-- 8. Atomic skill-quota consumption (net-new skills on the pass).
CREATE OR REPLACE FUNCTION public.consume_kit_skill(p_redemption_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ok BOOLEAN;
BEGIN
  UPDATE public.kit_redemptions
  SET skills_used = skills_used + 1
  WHERE id = p_redemption_id AND skills_used < skill_quota
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.consume_kit_skill(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_kit_skill(UUID) FROM anon, authenticated;
