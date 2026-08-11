import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const responseId = String(body?.response_id ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 320);
    if (!responseId || !EMAIL_RE.test(email) || body?.consent !== true) {
      return json({ error: 'A valid email and explicit consent are required.' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    const destinationHash = await sha256(email);
    const rate = await checkRateLimit(
      { identifier: 'subscribe-briefing', maxRequests: 5, windowMs: 60 * 60 * 1000 },
      destinationHash,
      admin,
    );
    if (!rate.allowed) return json({ error: 'That address was updated recently. Try again later.' }, 429);

    const { data: response } = await admin
      .from('cannes_responses')
      .select('id')
      .eq('id', responseId)
      .maybeSingle();
    if (!response) return json({ error: 'Onboarding response not found.' }, 404);

    const unsubscribeToken = randomToken();
    const unsubscribeHash = await sha256(unsubscribeToken);
    const { error } = await admin
      .from('delivery_subscriptions')
      .upsert({
        onboarding_response_id: responseId,
        channel: 'email',
        destination: email,
        destination_hash: destinationHash,
        status: 'active',
        content_modes: ['text', 'audio'],
        consent_at: new Date().toISOString(),
        consent_source: 'ctrl_onboarding',
        unsubscribe_token: unsubscribeToken,
        unsubscribe_token_hash: unsubscribeHash,
        updated_at: new Date().toISOString(),
        last_error: null,
      }, { onConflict: 'channel,destination_hash' });
    if (error) throw error;

    await admin.from('cannes_responses').update({
      email,
      email_captured_at: new Date().toISOString(),
    }).eq('id', responseId);

    // Deliberately do not send a second confirmation email here. The caller
    // sends one useful onboarding result that also confirms delivery is on.
    return json({ ok: true, subscribed: true });
  } catch (error) {
    console.error('subscribe-briefing failed', error);
    return json({ error: 'I could not start the morning briefing just now. Try once more.' }, 500);
  }
});
