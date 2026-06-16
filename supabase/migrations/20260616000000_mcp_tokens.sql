-- Memory Web as a read-only MCP server: per-leader, scoped, revocable API keys.
-- A leader mints a token, hands it to their own agent, and the agent pulls LIVE
-- brain-ranked context on every call (vs a paste that dies when the tab closes).
-- Only the SHA-256 hash is stored; the plaintext is shown once at mint time.
-- Read-only by design (the MCP endpoint only reads). Edge-Pro gated at the endpoint.

CREATE TABLE IF NOT EXISTS public.mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,            -- sha256(plaintext), hex; plaintext never stored
  token_prefix text NOT NULL,                 -- "ctrl_mcp_xxxxxxxx" for display only
  label text,                                 -- leader-given name, e.g. "My Claude agent"
  scopes text[] NOT NULL DEFAULT '{read}',    -- read-only for v1
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user ON public.mcp_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_hash ON public.mcp_tokens(token_hash) WHERE revoked_at IS NULL;

ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY;
-- A leader sees only their own tokens (never the hash via the list RPC). The MCP
-- endpoint resolves tokens with the service role, bypassing RLS.
DROP POLICY IF EXISTS mcp_tokens_owner_sel ON public.mcp_tokens;
CREATE POLICY mcp_tokens_owner_sel ON public.mcp_tokens FOR SELECT USING (auth.uid() = user_id);

-- Mint a token. Generates the plaintext server-side, stores only its hash, returns
-- the plaintext ONCE. Owner-scoped.
CREATE OR REPLACE FUNCTION public.mint_mcp_token(p_label text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_plain text;
  v_hash text;
  v_prefix text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  -- cap how many active tokens a leader can hold
  IF (SELECT count(*) FROM public.mcp_tokens WHERE user_id = v_uid AND revoked_at IS NULL) >= 10 THEN
    RAISE EXCEPTION 'token limit reached (revoke an existing token first)';
  END IF;
  v_plain := 'ctrl_mcp_' || encode(gen_random_bytes(24), 'hex');
  v_hash := encode(digest(v_plain, 'sha256'), 'hex');
  v_prefix := left(v_plain, 17);
  INSERT INTO public.mcp_tokens(user_id, token_hash, token_prefix, label)
  VALUES (v_uid, v_hash, v_prefix, NULLIF(trim(coalesce(p_label, '')), ''))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'token', v_plain, 'prefix', v_prefix, 'label', p_label);
END;
$func$;

-- Revoke a token (owner-scoped).
CREATE OR REPLACE FUNCTION public.revoke_mcp_token(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.mcp_tokens SET revoked_at = now()
  WHERE id = p_id AND user_id = v_uid AND revoked_at IS NULL;
  RETURN FOUND;
END;
$func$;

-- List a leader's tokens (never the hash or plaintext).
CREATE OR REPLACE FUNCTION public.list_mcp_tokens()
RETURNS TABLE (id uuid, token_prefix text, label text, created_at timestamptz, last_used_at timestamptz, revoked_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $func$
  SELECT id, token_prefix, label, created_at, last_used_at, revoked_at
  FROM public.mcp_tokens
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
$func$;

GRANT EXECUTE ON FUNCTION public.mint_mcp_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_mcp_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_mcp_tokens() TO authenticated;
