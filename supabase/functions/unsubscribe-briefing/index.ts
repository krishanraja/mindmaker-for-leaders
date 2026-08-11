import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function page(message: string, status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CTRL briefing</title><body style="margin:0;background:#0a0908;color:#f5f1ea;font:18px Georgia,serif;display:grid;min-height:100vh;place-items:center"><main style="max-width:32rem;padding:2rem"><p style="color:#ec4899;font:11px monospace;letter-spacing:.16em;text-transform:uppercase">CTRL</p><h1 style="font-size:2rem;line-height:1.1">${message}</h1><p style="color:#aaa29a;line-height:1.6">You can close this window.</p></main></body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  let token = url.searchParams.get('token')?.trim() ?? '';
  if (!token && req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    token = String(body?.token ?? '').trim();
  }
  if (token.length < 32) return page('That unsubscribe link is not valid.', 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const tokenHash = await sha256(token);
  const { data, error } = await admin
    .from('delivery_subscriptions')
    .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
    .eq('unsubscribe_token_hash', tokenHash)
    .select('id')
    .maybeSingle();
  if (error || !data) return page('That briefing was already stopped, or the link has expired.', 404);
  return page('Your morning briefing has stopped.');
});
