-- Contest mechanism: "the leader can always overrule, and the brain learns."
-- A user can flag anything wrong. Visual/functional reports go to an operational
-- queue; a FACTUAL contest on the user's own decision claim is honored LIVE and
-- fed into the brain (high-authority refutation -> verdict -> event -> re-check).
-- Locked rule: _DESIGN-LOG.md "Contest this" (Krish 2026-06-15).

-- 1. Let a user-sourced refutation live in the evidence + an event type for it.
ALTER TABLE public.decision_evidence DROP CONSTRAINT IF EXISTS decision_evidence_retriever_check;
ALTER TABLE public.decision_evidence ADD CONSTRAINT decision_evidence_retriever_check
  CHECK (retriever IN ('perplexity','exa','brave','tavily','newsapi','pdl','builtwith','tranco','memory','user_contest'));

ALTER TABLE public.decision_events DROP CONSTRAINT IF EXISTS decision_events_type_check;
ALTER TABLE public.decision_events ADD CONSTRAINT decision_events_type_check
  CHECK (type IN ('created','verified','advice_updated','assumption_broke','acknowledged','contested_by_user'));

-- 2. The report ledger (both destinations: operational bugs + factual contests).
CREATE TABLE IF NOT EXISTS public.contest_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('visual','functional','factual')),
  target_type text CHECK (target_type IN ('decision_claim','memory_fact','market_read','ui_element')),
  target_id uuid,                              -- the contested claim/fact, when applicable
  surface text,                                -- route/surface the user was on
  element text,                                -- human label of the contested element
  note text,                                   -- optional one-line from the user
  context jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {state, app_version, ...} auto-captured
  honored boolean NOT NULL DEFAULT false,      -- a live brain effect was applied
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','honored','triaged','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contest_reports_user ON public.contest_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contest_reports_open ON public.contest_reports(status) WHERE status = 'open';

ALTER TABLE public.contest_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contest_reports_owner_sel ON public.contest_reports;
CREATE POLICY contest_reports_owner_sel ON public.contest_reports FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS contest_reports_owner_ins ON public.contest_reports;
CREATE POLICY contest_reports_owner_ins ON public.contest_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. submit_contest: record the report; for a FACTUAL contest on the user's own
--    decision claim, honor it live + feed the brain. Owner-scoped (auth.uid()).
CREATE OR REPLACE FUNCTION public.submit_contest(
  p_kind text,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_surface text DEFAULT NULL,
  p_element text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_report_id uuid;
  v_honored boolean := false;
  v_claim public.decision_claims%ROWTYPE;
  v_evidence_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_kind NOT IN ('visual','functional','factual') THEN
    RAISE EXCEPTION 'invalid contest kind: %', p_kind;
  END IF;

  INSERT INTO public.contest_reports(user_id, kind, target_type, target_id, surface, element, note, context)
  VALUES (v_uid, p_kind, p_target_type, p_target_id, p_surface, p_element, p_note, COALESCE(p_context, '{}'::jsonb))
  RETURNING id INTO v_report_id;

  -- Factual contest on the user's OWN decision claim => honor live + feed the brain.
  IF p_kind = 'factual' AND p_target_type = 'decision_claim' AND p_target_id IS NOT NULL THEN
    SELECT * INTO v_claim FROM public.decision_claims WHERE id = p_target_id AND user_id = v_uid;
    IF FOUND THEN
      -- (1) the leader's overrule, recorded as a HIGH-AUTHORITY refutation
      INSERT INTO public.decision_evidence(claim_id, user_id, source_type, source_title, excerpt, stance, retriever, relevance_score)
      VALUES (v_claim.id, v_uid, 'user', 'Contested by the leader', p_note, 'refutes', 'user_contest', 1.0)
      RETURNING id INTO v_evidence_id;
      -- (2) honor it in the read: verdict -> contested, knock confidence down
      UPDATE public.decision_claims
        SET verdict = 'contested',
            confidence = LEAST(COALESCE(confidence, 0.5), 0.30),
            updated_at = now()
        WHERE id = v_claim.id;
      -- (3) immutable audit + a re-check signal (decision-watch re-verifies load-bearing claims;
      --     the alert resurfaces it and marks the loop "go re-verify this").
      INSERT INTO public.decision_events(decision_case_id, user_id, type, payload)
      VALUES (v_claim.decision_case_id, v_uid, 'contested_by_user',
              jsonb_build_object('claim_id', v_claim.id, 'note', p_note, 'contest_report_id', v_report_id));
      INSERT INTO public.decision_alerts(decision_case_id, user_id, claim_id, kind, headline, detail)
      VALUES (v_claim.decision_case_id, v_uid, v_claim.id, 'new_contradiction',
              'You flagged a claim - re-checking it against sources', left(COALESCE(p_note, ''), 280));
      v_honored := true;
      UPDATE public.contest_reports SET honored = true, status = 'honored' WHERE id = v_report_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'report_id', v_report_id,
    'honored', v_honored,
    'verdict', CASE WHEN v_honored THEN 'contested' ELSE NULL END,
    'evidence_id', v_evidence_id
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.submit_contest(text, text, uuid, text, text, text, jsonb) TO authenticated;
