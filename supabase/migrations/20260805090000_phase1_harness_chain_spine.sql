-- Phase 1 of the harness chain: the provenance spine.
-- Schema per CTRLHARNESSCHAINSPEC rev 3 section 3, as amended by the ruled
-- CHALLENGE.md register (2026-08-04):
--   CH-07: no org layer. Everything is person-scoped; criteria keeps a scope
--          column (person-only for now) plus owner_label so "Glynne's
--          standard" can render without a tenancy model.
--   CH-13: quotes verify by exact offset slice into a persisted source,
--          never by fuzzy ratio. evidence_sources holds the normalised text.
--   CH-05: situated -> standing is an audited promotion, not a bare UPDATE.
--   CH-06: retention + redaction on evidence (third-party speech), CASCADE
--          on every auth.users reference, all tables join the deletion sweep.
--   CH-03: criteria carries a deterministic observable; the four count
--          columns are per-criterion over the training items.
--   CH-12: sort_items.repeat_of marks self-agreement probes (never scored).
--   CH-10: origin 'rewrite' + derived_from_item_id for diff items.
--   CH-15: harness_runs is the pollable run state; idempotency keys on
--          sort_items; sort_grades upserts on item_id.
--   4.10.1: ledger carries the three signal classes (output/method/trigger).
--
-- All idempotent. All RLS owner-scoped auth.uid() = user_id, all four ops.

-- ---------------------------------------------------------------------------
-- evidence_sources: the persisted, normalised raw material quotes point into.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('transcript','paste','artefact','upload')),
  label       text NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_sources_user_idx ON public.evidence_sources(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- evidence: every claim anywhere in the chain resolves to a row here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind                  text NOT NULL CHECK (kind IN
                          ('utterance','artefact','grade','observation','declared','derived')),
  body                  text NOT NULL,
  quote                 text,
  source_id             uuid REFERENCES public.evidence_sources(id) ON DELETE SET NULL,
  quote_start           int,
  quote_end             int,
  source_label          text NOT NULL,
  source_ref            text,
  occurred_at           timestamptz,
  captured_at           timestamptz NOT NULL DEFAULT now(),
  situated              boolean NOT NULL DEFAULT true,
  situation             text,
  -- Situated -> standing is the operation this whole system exists to guard.
  -- Only grade-sort writes it, on two or more separating graded items, and
  -- the audit trail is non-optional (CH-05). No LLM path ever writes it.
  standing_promoted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  standing_at           timestamptz,
  standing_evidence_ids uuid[],
  -- Third-party speech controls (CH-06): a call transcript contains other
  -- people's words. Redaction empties the quote but keeps the row, so shipped
  -- provenance pointers resolve to a truthful redacted state, never a hole.
  speaker_is_owner      boolean,
  redacted_at           timestamptz,
  retention_expires_at  timestamptz,
  memory_fact_id        uuid REFERENCES public.user_memory(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT quote_required_for_speech CHECK (
    kind NOT IN ('utterance','declared')
    OR redacted_at IS NOT NULL
    OR (quote IS NOT NULL AND length(quote) > 0)),
  CONSTRAINT situation_required_when_situated CHECK (
    situated = false OR (situation IS NOT NULL AND length(situation) > 0)),
  CONSTRAINT standing_requires_promotion CHECK (
    situated = true
    OR (standing_promoted_by IS NOT NULL AND array_length(standing_evidence_ids, 1) >= 2)),
  CONSTRAINT derived_must_point_somewhere CHECK (
    kind <> 'derived' OR source_ref IS NOT NULL),
  CONSTRAINT offsets_come_together CHECK (
    (quote_start IS NULL AND quote_end IS NULL)
    OR (quote_start IS NOT NULL AND quote_end IS NOT NULL AND quote_end > quote_start))
);
CREATE INDEX IF NOT EXISTS evidence_user_kind_idx ON public.evidence(user_id, kind);
CREATE INDEX IF NOT EXISTS evidence_retention_idx ON public.evidence(retention_expires_at)
  WHERE retention_expires_at IS NOT NULL AND redacted_at IS NULL;

-- ---------------------------------------------------------------------------
-- constructs: Kelly's bipolar constructs, in the person's own words.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.constructs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope          text NOT NULL DEFAULT 'person' CHECK (scope = 'person'),
  emergent_pole  text NOT NULL,
  contrast_pole  text,
  rationale      text,
  observable     text,
  status         text NOT NULL DEFAULT 'candidate' CHECK (status IN
                   ('candidate','elicited','compiled','retired')),
  evidence_ids   uuid[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT elicited_needs_both_poles CHECK (
    status = 'candidate' OR (contrast_pole IS NOT NULL AND length(contrast_pole) > 0)),
  CONSTRAINT elicited_needs_evidence CHECK (
    status = 'candidate' OR array_length(evidence_ids, 1) >= 2)
);
CREATE INDEX IF NOT EXISTS constructs_user_status_idx ON public.constructs(user_id, status);

-- ---------------------------------------------------------------------------
-- criteria: the compiled rubric. Person-scoped (CH-07); the org layer, if it
-- ever lands, arrives as an additive migration, not a rewrite.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.criteria (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope               text NOT NULL DEFAULT 'person' CHECK (scope = 'person'),
  owner_label         text,
  construct_id        uuid REFERENCES public.constructs(id) ON DELETE SET NULL,
  surface             text NOT NULL,
  name                text NOT NULL,
  check_text          text NOT NULL,
  -- The deterministic probe the discrimination counts are computed from
  -- (CH-03). A criterion with no checkable observable can only ever be
  -- 'untested'; an LLM verdict is not a substitute for this column.
  observable          text,
  weight              text NOT NULL CHECK (weight IN
                        ('essential','important','optional','pitfall')),
  holds_example       text,
  breaks_example      text,
  -- Per-criterion counts over the training items whose probe was applied
  -- (CH-03). NOT global grade-split counts; those measured nothing.
  n_rejected          int,
  n_rejected_failing  int,
  n_accepted          int,
  n_accepted_failing  int,
  disc_verdict        text NOT NULL DEFAULT 'untested' CHECK (disc_verdict IN
                        ('keep','delete','untested')),
  provenance          jsonb NOT NULL,
  version             int NOT NULL DEFAULT 1,
  is_current          boolean NOT NULL DEFAULT true,
  disposition         text NOT NULL DEFAULT 'advisory' CHECK (disposition IN
                        ('advisory','blocking','retired')),
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT provenance_is_real CHECK (
    jsonb_typeof(provenance) = 'object' AND provenance <> '{}'::jsonb)
);
CREATE UNIQUE INDEX IF NOT EXISTS criteria_current_unique
  ON public.criteria(user_id, surface, name) WHERE is_current;
CREATE INDEX IF NOT EXISTS criteria_resolve_idx
  ON public.criteria(user_id, surface) WHERE is_current;

-- ---------------------------------------------------------------------------
-- harness_runs: the pollable run state (CH-15). One row per chain run; each
-- stage writes its name here exactly as decision-engine writes decision_cases
-- stages, and the reveal panel polls it at 2s.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.harness_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('sort','compile','generate','critique','measure')),
  surface      text,
  status       text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  stage        text NOT NULL DEFAULT 'created',
  stage_detail jsonb NOT NULL DEFAULT '{}',
  pass         int NOT NULL DEFAULT 1,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS harness_runs_user_idx ON public.harness_runs(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- sort_items + sort_grades: the instrument.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sort_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id            uuid NOT NULL REFERENCES public.harness_runs(id) ON DELETE CASCADE,
  surface               text NOT NULL,
  body                  text NOT NULL,
  origin                text NOT NULL CHECK (origin IN ('own','synthesised','peer','rewrite')),
  pair_id               uuid,
  pair_role             text CHECK (pair_role IN ('satisfies','violates')),
  -- The answer key for the manipulation check (CH-09): one plain sentence per
  -- pair naming the single intended difference. Never shown before grading.
  intended_dimension    text,
  derived_from_item_id  uuid REFERENCES public.sort_items(id) ON DELETE SET NULL,
  -- Self-agreement probe (CH-12): re-shows this earlier item. Excluded from
  -- training AND hold-out; three of these measure the grader, not the work.
  repeat_of             uuid REFERENCES public.sort_items(id) ON DELETE SET NULL,
  targets               uuid[] NOT NULL DEFAULT '{}',
  held_out              boolean NOT NULL DEFAULT false,
  manip_checked         boolean NOT NULL DEFAULT false,
  manip_ok              boolean,
  position              int NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT one_position_per_session UNIQUE (session_id, position),
  CONSTRAINT pair_role_needs_pair CHECK (
    (pair_id IS NULL AND pair_role IS NULL) OR (pair_id IS NOT NULL AND pair_role IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sort_items_session_idx ON public.sort_items(session_id, position);

CREATE TABLE IF NOT EXISTS public.sort_grades (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id      uuid NOT NULL REFERENCES public.sort_items(id) ON DELETE CASCADE,
  verdict      text NOT NULL CHECK (verdict IN ('send','would_not_send','skip')),
  why          text,
  ms_to_grade  int,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Upsert key (CH-15): a retried submit or a changed mind updates in place.
  CONSTRAINT sort_grades_item_unique UNIQUE (item_id)
);

-- ---------------------------------------------------------------------------
-- ledger: what the gate observed, and the two signal classes revision 2 had
-- no home for (4.10.1): method corrections and trigger accuracy.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week           text NOT NULL,
  surface        text NOT NULL,
  signal         text NOT NULL DEFAULT 'output' CHECK (signal IN ('output','method','trigger')),
  -- Method corrections only (4.10.2): what kind of method miss this was.
  class          text CHECK (class IN ('omission','stance','sequence','boundary')),
  criterion_id   uuid REFERENCES public.criteria(id) ON DELETE SET NULL,
  criterion_name text NOT NULL,
  verdict        text NOT NULL CHECK (verdict IN
                   ('holds','borderline','breaks','uncovered','undertrigger','fired')),
  quote          text,
  disposition    text NOT NULL DEFAULT 'unknown' CHECK (disposition IN
                   ('accepted','rejected','unknown')),
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT method_rows_carry_class CHECK (signal <> 'method' OR class IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ledger_user_week_idx ON public.ledger(user_id, week);

-- ---------------------------------------------------------------------------
-- proposals: the only thing that ever changes a standard, and it never
-- changes one itself. Person-scoped; if_wrong is non-optional.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('uncovered','false_positive','drift')),
  surface     text NOT NULL,
  headline    text NOT NULL,
  delta_text  text,
  if_wrong    text NOT NULL,
  size_delta  int,
  evidence    jsonb NOT NULL,
  status      text NOT NULL DEFAULT 'awaiting' CHECK (status IN
                ('awaiting','accepted','rejected')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  decided_at  timestamptz,

  -- A drift proposal is a question ("solved, or broken?"), never a change.
  CONSTRAINT drift_proposes_no_delta CHECK (type <> 'drift' OR delta_text IS NULL)
);
CREATE INDEX IF NOT EXISTS proposals_user_status_idx ON public.proposals(user_id, status);

-- ---------------------------------------------------------------------------
-- skill_provenance: one row per claim per pass. user_id present so the
-- deletion sweep and RLS need no join (CH-06).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_provenance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id   uuid NOT NULL REFERENCES public.generated_artifacts(id) ON DELETE CASCADE,
  pass          int NOT NULL DEFAULT 1,
  claim_hash    text NOT NULL,
  claim_text    text NOT NULL,
  section       text NOT NULL,
  evidence_id   uuid REFERENCES public.evidence(id) ON DELETE SET NULL,
  criterion_id  uuid REFERENCES public.criteria(id) ON DELETE SET NULL,
  resolution    text NOT NULL CHECK (resolution IN
                  ('cited','unresolved','marked_awaiting','deleted')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS skill_provenance_artifact_idx ON public.skill_provenance(artifact_id, pass);

-- ---------------------------------------------------------------------------
-- RLS: owner-scoped, all four operations, every table. No org branches.
-- ---------------------------------------------------------------------------
DO $rls$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'evidence_sources','evidence','constructs','criteria','harness_runs',
    'sort_items','sort_grades','ledger','proposals','skill_provenance'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_select_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "owner_delete_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "owner_select_%s" ON public.%I FOR SELECT USING (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "owner_insert_%s" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "owner_update_%s" ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "owner_delete_%s" ON public.%I FOR DELETE USING (auth.uid() = user_id)', t, t);
  END LOOP;
END
$rls$;
