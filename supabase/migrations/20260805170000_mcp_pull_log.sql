-- Per-call pull logging for the MCP server (CH-01b).
--
-- Until now the only trace a live pull left was `mcp_tokens.last_used_at`, one
-- timestamp overwritten on every call. That answers "was this key ever used"
-- and nothing else: it cannot say which skill an agent loaded, how often, or
-- whether a skill stopped being pulled after a criterion changed. CH-01 names
-- that gap as the reason DELIVER does not unblock LEARN, and names this table
-- as the honest, sufficient writer for Type C drift, which needs no verdict
-- from the leader, only observation.
--
-- One row per read call. Written with the service role from mcp-context (the
-- endpoint resolves tokens with the service role and bypasses RLS), read by the
-- leader who owns it. Nothing here is a judgement about the work, so nothing
-- here needs the leader's confirmation.
--
-- Idempotent: IF NOT EXISTS throughout, policy dropped before create.

CREATE TABLE IF NOT EXISTS public.mcp_pulls (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Which read tool ran: list_skills, get_skill, list_skill_files.
  tool        text NOT NULL,
  -- The skill the call was about, when the call was about one. list_skills
  -- names no skill, so NULL there is the honest value rather than a placeholder.
  skill_name  text,
  artifact_id uuid,
  called_at   timestamptz NOT NULL DEFAULT now()
);

-- The two reads this table exists for: "what has my agent been pulling" (user,
-- newest first) and "is this particular skill live" (user + skill).
CREATE INDEX IF NOT EXISTS idx_mcp_pulls_user_called
  ON public.mcp_pulls(user_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_pulls_user_skill
  ON public.mcp_pulls(user_id, skill_name);

ALTER TABLE public.mcp_pulls ENABLE ROW LEVEL SECURITY;

-- Owner-scoped read, exactly like mcp_tokens. There is deliberately no INSERT
-- policy: the only writer is the MCP endpoint holding the service role, so a
-- client cannot manufacture evidence that a skill is in use.
DROP POLICY IF EXISTS mcp_pulls_owner_sel ON public.mcp_pulls;
CREATE POLICY mcp_pulls_owner_sel ON public.mcp_pulls
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.mcp_pulls IS
  'One row per read call to the mcp-context MCP server. Replaces the single overwritten mcp_tokens.last_used_at so live-pull usage is observable per skill and per call.';
