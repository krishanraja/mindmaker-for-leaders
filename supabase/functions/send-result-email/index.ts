import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { brandedEmailShell } from '../_shared/email-shell.ts';
import { getDefaultSender, sendEmail, type EmailResult } from '../_shared/email-utils.ts';
import { rankPoolForOnboarding } from '../_shared/onboarding-lens.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Card {
  headline: string;
  say?: string | null;
  source?: string | null;
  url?: string | null;
  category?: string | null;
  score?: number | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 320);
    if (!id || !EMAIL_RE.test(email)) return json({ error: 'Valid email required' }, 400);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    const rate = await checkRateLimit(
      { identifier: 'send-onboarding-result', maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 },
      id,
      admin,
    );
    if (!rate.allowed) return json({ ok: true, already_sent: true });

    const { data: result } = await admin.from('cannes_responses').select(
      'archetype_title, result_prose_12mo, result_prose_3yr, q2_extra_self, q4_company_future, q5_decision, email_sent_at, enrichment_company, enrichment_signals',
    ).eq('id', id).maybeSingle();
    if (!result) return json({ error: 'Result not found' }, 404);
    if (result.email_sent_at) return json({ ok: true, sent: true, already_sent: true });

    // A result email is only valid after the same address explicitly enabled
    // the briefing. This makes the public endpoint unusable as an arbitrary
    // email sender while keeping the one-click onboarding interaction.
    const destinationHash = await sha256(email);
    const { data: subscription } = await admin
      .from('delivery_subscriptions')
      .select('id')
      .eq('onboarding_response_id', id)
      .eq('destination_hash', destinationHash)
      .eq('status', 'active')
      .maybeSingle();
    if (!subscription) return json({ error: 'Briefing consent is required first.' }, 409);

    const claimedAt = new Date().toISOString();
    const staleClaim = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: claim } = await admin
      .from('cannes_responses')
      .update({ email_send_claimed_at: claimedAt })
      .eq('id', id)
      .is('email_sent_at', null)
      .or(`email_send_claimed_at.is.null,email_send_claimed_at.lt.${staleClaim}`)
      .select('id')
      .maybeSingle();
    if (!claim) return json({ ok: true, processing: true });
    const { data: poolRow } = await admin.from('live_headlines_cache').select('payload').order('briefing_date', { ascending: false }).limit(1).maybeSingle();
    const pool = Array.isArray(poolRow?.payload) ? poolRow.payload as Card[] : [];
    const companyCards: Card[] = Array.isArray(result.enrichment_signals) ? result.enrichment_signals.slice(0, 3).map((signal: Record<string, unknown>) => ({
      headline: String(signal.title ?? ''),
      say: String(signal.excerpt ?? 'Worth checking against the decision on your plate.'),
      source: String(signal.source ?? result.enrichment_company ?? ''),
      url: String(signal.url ?? ''),
    })).filter((card: Card) => card.headline && card.url?.startsWith('https://')) : [];
    const generalCards = rankPoolForOnboarding(pool, {
      q5: result.q5_decision,
      q2: result.q2_extra_self,
      q4: result.q4_company_future,
    });
    const seen = new Set(companyCards.map((card) => card.url));
    const cards = [...companyCards, ...generalCards.filter((card) => !seen.has(card.url))].slice(0, 3);
    const reads = cards.length ? `<h2 style="font-size:16px;margin:26px 0 12px">${companyCards.length ? `What changed around ${escapeHtml(result.enrichment_company || 'your company')}` : 'Three things worth reading through your decision'}</h2><ol style="padding-left:20px">${cards.map((card) => {
      const title = escapeHtml(card.headline);
      const link = card.url?.startsWith('https://') ? `<a href="${escapeHtml(card.url)}">${title}</a>` : title;
      return `<li style="margin:0 0 14px">${link}${card.source ? ` <span style="color:#64748b">${escapeHtml(card.source)}</span>` : ''}<br/><span style="color:#4a5a52">${escapeHtml(card.say)}</span></li>`;
    }).join('')}</ol>` : '';
    const html = brandedEmailShell({
      eyebrow: 'Your CTRL starting point',
      heading: escapeHtml(result.archetype_title || 'A quieter way through AI'),
      bodyHtml: `<p style="margin:0 0 16px">${escapeHtml(result.result_prose_12mo)}</p><p style="margin:0 0 16px">${escapeHtml(result.result_prose_3yr)}</p>${reads}<p style="margin:24px 0 0;color:#64748b;font-size:13px">Your morning briefing is on. It uses the same decision lens and includes audio. No login needed.</p>`,
      buttonLabel: 'Open CTRL',
      actionUrl: 'https://makeyourmindup.ai',
    });
    let sent: EmailResult;
    try {
      sent = await sendEmail({
        from: getDefaultSender('notification'),
        to: email,
        subject: result.archetype_title ? `Your CTRL starting point: ${result.archetype_title}` : 'Your CTRL starting point',
        html,
        emailType: 'notification',
        tags: [{ name: 'email_type', value: 'onboarding_result' }],
      });
    } catch (error) {
      await admin.from('cannes_responses').update({ email_send_claimed_at: null }).eq('id', id).eq('email_send_claimed_at', claimedAt);
      throw error;
    }
    await admin.from('cannes_responses').update(sent.success
      ? { email, email_sent_at: new Date().toISOString(), email_send_claimed_at: null }
      : { email_send_claimed_at: null }
    ).eq('id', id).eq('email_send_claimed_at', claimedAt);
    return json({ ok: sent.success, sent: sent.success });
  } catch {
    return json({ error: 'I could not send that result just now.' }, 500);
  }
});
