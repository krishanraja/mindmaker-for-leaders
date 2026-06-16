-- #3: Daily Briefing as an agent feed. A leader can tick "expose today's briefing"
-- when minting a key; that key gets the 'briefing' scope and the MCP endpoint then
-- offers a get_todays_briefing tool. Default keys stay read-context-only.

-- mint now takes an include-briefing flag -> scopes.
DROP FUNCTION IF EXISTS public.mint_mcp_token(text);
CREATE OR REPLACE FUNCTION public.mint_mcp_token(p_label text DEFAULT NULL, p_include_briefing boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_plain text; v_hash text; v_prefix text; v_id uuid;
  v_scopes text[] := CASE WHEN p_include_briefing THEN ARRAY['read','briefing'] ELSE ARRAY['read'] END;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF (SELECT count(*) FROM public.mcp_tokens WHERE user_id = v_uid AND revoked_at IS NULL) >= 10 THEN
    RAISE EXCEPTION 'token limit reached (revoke an existing token first)';
  END IF;
  v_plain := 'ctrl_mcp_' || encode(gen_random_bytes(24), 'hex');
  v_hash := encode(digest(v_plain, 'sha256'), 'hex');
  v_prefix := left(v_plain, 17);
  INSERT INTO public.mcp_tokens(user_id, token_hash, token_prefix, label, scopes)
  VALUES (v_uid, v_hash, v_prefix, NULLIF(trim(coalesce(p_label, '')), ''), v_scopes)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'token', v_plain, 'prefix', v_prefix, 'label', p_label, 'scopes', v_scopes);
END;
$func$;
GRANT EXECUTE ON FUNCTION public.mint_mcp_token(text, boolean) TO authenticated;

-- list now surfaces scopes (so the UI can mark briefing-enabled keys).
DROP FUNCTION IF EXISTS public.list_mcp_tokens();
CREATE OR REPLACE FUNCTION public.list_mcp_tokens()
RETURNS TABLE (id uuid, token_prefix text, label text, scopes text[], created_at timestamptz, last_used_at timestamptz, revoked_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $func$
  SELECT id, token_prefix, label, scopes, created_at, last_used_at, revoked_at
  FROM public.mcp_tokens
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
$func$;
GRANT EXECUTE ON FUNCTION public.list_mcp_tokens() TO authenticated;
