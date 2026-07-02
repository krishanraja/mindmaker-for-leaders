-- Decisions tab follow-through:
--  1. decision_check_items - the leader's own tick-state on the "what to check next" bullets, so a
--     finished decision's next steps become an interactive, persisted checklist (not dead text).
--     One row per (user, case, item); item_key is the normalized bullet text so a tick survives a
--     re-advise that keeps the same string. RLS owner-scoped (auth.uid() = user_id), no joins.
--  2. decision_evidence.theme - a short adjudicator-assigned category so the evidence drawer can
--     NEST many like sources under one heading instead of a flat 30-40 card scroll. Nullable and
--     additive; old rows and research-mode gathers fall back to the client-side grouper.

CREATE TABLE IF NOT EXISTS public.decision_check_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_case_id uuid NOT NULL REFERENCES public.decision_cases(id) ON DELETE CASCADE,
  item_key text NOT NULL,          -- normalized (lowercased/trimmed) bullet text; stable across re-advise
  item_text text NOT NULL,         -- verbatim bullet, for render + the email
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, decision_case_id, item_key)
);
CREATE INDEX IF NOT EXISTS idx_decision_check_items_case ON public.decision_check_items(decision_case_id, user_id);

ALTER TABLE public.decision_check_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS decision_check_items_owner ON public.decision_check_items;
CREATE POLICY decision_check_items_owner ON public.decision_check_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.decision_evidence ADD COLUMN IF NOT EXISTS theme text;
