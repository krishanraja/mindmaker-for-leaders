-- Memory Web: honest fact-to-fact edges
-- Purpose: store derived (and user-affirmed) relationships BETWEEN facts in
-- user_memory, so the Memory Web can draw real cross-fact ropes (depends_on /
-- supports / tension / informs / relates) instead of only fact-to-world ropes.
--
-- Companion RPCs let the leader vouch for a fact (strengthen) or flag it wrong
-- (fix). Both are owner-scoped via auth.uid() and SECURITY DEFINER, matching
-- the existing verify_memory_fact pattern in 20260114000000_create_user_memory.sql.

-- ---------------------------------------------------------------------------
-- Enum extension: add 'disputed' to verification_status.
-- The original enum is ('inferred','verified','corrected','rejected'); fix_memory_fact
-- needs a distinct "you flagged this wrong" status that is NOT the same as the
-- existing 'rejected' (which is set by verify_memory_fact's reject path). Adding
-- the value is idempotent; it must be committed before fix_memory_fact runs, which
-- it is (function bodies cast enum literals at execution time, not at create time).
-- ---------------------------------------------------------------------------
ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'disputed';

-- ---------------------------------------------------------------------------
-- Table: memory_edges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memory_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_fact_id UUID NOT NULL REFERENCES public.user_memory(id) ON DELETE CASCADE,
  to_fact_id UUID NOT NULL REFERENCES public.user_memory(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  strength REAL NOT NULL DEFAULT 0.5,
  rationale TEXT,
  source TEXT NOT NULL DEFAULT 'inferred' CHECK (source IN ('inferred', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT memory_edges_relation_check
    CHECK (relation IN ('depends_on', 'supports', 'tension', 'informs', 'relates'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_edges_user_id ON public.memory_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_edges_from_fact_id ON public.memory_edges(from_fact_id);
CREATE INDEX IF NOT EXISTS idx_memory_edges_to_fact_id ON public.memory_edges(to_fact_id);

-- ---------------------------------------------------------------------------
-- RLS: owner-scoped on user_id = auth.uid(); service_role full.
-- CREATE POLICY has no IF NOT EXISTS, so each is dropped-then-created to stay
-- idempotent.
-- ---------------------------------------------------------------------------
ALTER TABLE public.memory_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memory edges" ON public.memory_edges;
CREATE POLICY "Users can view their own memory edges"
  ON public.memory_edges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own memory edges" ON public.memory_edges;
CREATE POLICY "Users can insert their own memory edges"
  ON public.memory_edges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own memory edges" ON public.memory_edges;
CREATE POLICY "Users can update their own memory edges"
  ON public.memory_edges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own memory edges" ON public.memory_edges;
CREATE POLICY "Users can delete their own memory edges"
  ON public.memory_edges FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all memory edges" ON public.memory_edges;
CREATE POLICY "Service role can manage all memory edges"
  ON public.memory_edges FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to keep updated_at fresh.
CREATE OR REPLACE FUNCTION update_memory_edges_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_memory_edges_updated_at_trigger ON public.memory_edges;
CREATE TRIGGER update_memory_edges_updated_at_trigger
  BEFORE UPDATE ON public.memory_edges
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_edges_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: strengthen_memory_fact
-- The leader vouches: honest "you confirmed this". Bumps confidence, marks
-- verified, stamps verified_at. Owner-scoped. Returns the updated row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strengthen_memory_fact(p_fact_id UUID)
RETURNS public.user_memory AS $func$
DECLARE
  v_row public.user_memory;
BEGIN
  UPDATE public.user_memory
  SET confidence_score = least(1, confidence_score + 0.15),
      verification_status = 'verified',
      verified_at = now()
  WHERE id = p_fact_id
    AND user_id = auth.uid()
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Fact not found or not owned by caller';
  END IF;

  RETURN v_row;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- RPC: fix_memory_fact
-- Honest "you flagged this wrong". Marks the fact disputed + not current, and
-- deactivates any edges touching it (from_ or to_). Owner-scoped. Returns true.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fix_memory_fact(p_fact_id UUID)
RETURNS BOOLEAN AS $func$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.user_memory WHERE id = p_fact_id;

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

  RETURN true;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated callers (RPCs self-scope via auth.uid()).
GRANT EXECUTE ON FUNCTION public.strengthen_memory_fact(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_memory_fact(UUID) TO authenticated;

COMMENT ON TABLE public.memory_edges IS 'Honest fact-to-fact relationships in the Memory Web (depends_on/supports/tension/informs/relates). source=inferred (LLM-derived, replaceable) or user (affirmed, never auto-touched).';
