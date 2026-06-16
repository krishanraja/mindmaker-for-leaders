import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as SupabaseClient;

export interface McpToken {
  id: string;
  token_prefix: string;
  label: string | null;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface MintedToken {
  id: string;
  token: string; // plaintext - shown ONCE
  prefix: string;
  label: string | null;
}

// The hosted MCP endpoint a leader points their agent at.
export const MCP_ENDPOINT_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://bkyuxvschuwngtcdhsyg.supabase.co'}/functions/v1/mcp-context`;

export function useMcpTokens() {
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await db.rpc('list_mcp_tokens');
    if (!error) setTokens((data as McpToken[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const mint = useCallback(
    async (label: string, includeBriefing = false): Promise<MintedToken> => {
      const { data, error } = await db.rpc('mint_mcp_token', {
        p_label: label.trim() || null,
        p_include_briefing: includeBriefing,
      });
      if (error) throw error;
      await refetch();
      return data as MintedToken;
    },
    [refetch],
  );

  const revoke = useCallback(
    async (id: string) => {
      const { error } = await db.rpc('revoke_mcp_token', { p_id: id });
      if (error) throw error;
      await refetch();
    },
    [refetch],
  );

  return { tokens, loading, mint, revoke, refetch };
}
