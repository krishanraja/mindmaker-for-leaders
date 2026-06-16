-- Reaction-number storage on decision_claims (the bet's hero magnitude derives from
-- its strongest claim). Nullable => null means "no honest number" => hero leads with
-- words. kind: sourced (verbatim in evidence) | modelled (CTRL derivation, marked est.).
-- Honesty gate lives in supabase/functions/_shared/reaction-extraction.ts (deno-tested).
ALTER TABLE public.decision_claims ADD COLUMN IF NOT EXISTS reaction_value text;
ALTER TABLE public.decision_claims ADD COLUMN IF NOT EXISTS reaction_descriptor text;
ALTER TABLE public.decision_claims ADD COLUMN IF NOT EXISTS reaction_kind text;
ALTER TABLE public.decision_claims ADD COLUMN IF NOT EXISTS reaction_evidence_id uuid;
ALTER TABLE public.decision_claims DROP CONSTRAINT IF EXISTS decision_claims_reaction_kind_check;
ALTER TABLE public.decision_claims ADD CONSTRAINT decision_claims_reaction_kind_check
  CHECK (reaction_kind IS NULL OR reaction_kind IN ('sourced','modelled'));
