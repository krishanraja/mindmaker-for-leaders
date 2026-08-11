// send-daily-briefing
//
// The daily retention trigger CTRL was missing: a morning email that brings the
// leader back to their briefing. Designed to be called by pg_cron (verify_jwt
// is false in config.toml), or manually with { "user_id": "..." } to test a
// single recipient.
//
// v1 is deliberately decoupled from generation: it does NOT run the heavy
// briefing pipeline in this fan-out (that would multiply API cost and risk
// timeouts). It emails today's briefing if one already exists, otherwise a
// short nudge that drives the leader into the app, where the existing pull
// flow generates the briefing on arrival. Pre-generation + richer content is a
// post-v1 enhancement.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, getDefaultSender, getAppUrl } from "../_shared/email-utils.ts";
import { brandedEmailShell } from "../_shared/email-shell.ts";
import { synthesizeSpeech } from "../_shared/tts.ts";
import { rankPoolForOnboarding } from "../_shared/onboarding-lens.ts";
import { isCronRequest, isServiceRequest } from "../_shared/service-request.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ctrl-cron-secret",
};

interface PrefRow {
  user_id: string;
  email: string | null;
}

interface BriefingRow {
  script_text: string;
  audio_duration_seconds: number | null;
}

interface SharedCard {
  headline: string;
  say?: string | null;
  source?: string | null;
  url?: string | null;
  category?: string | null;
  score?: number | null;
}

interface SubscriberRow {
  id: string;
  destination: string;
  content_modes: string[];
  unsubscribe_token: string;
  cannes_responses: {
    q2_extra_self?: string | null;
    q4_company_future?: string | null;
    q5_decision?: string | null;
  } | null;
}

/** A short, readable teaser from the conversational briefing script. */
function teaserFrom(script: string): string {
  const clean = script.replace(/\s+/g, " ").trim();
  if (clean.length <= 220) return clean;
  const cut = clean.slice(0, 220);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (lastStop > 120 ? cut.slice(0, lastStop + 1) : cut) + "...";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function anonymousScript(focus: string, cards: SharedCard[]): string {
  const opening = focus
    ? `You said the decision still pulling at you is ${focus}. So I read today through that question.`
    : `I read today's AI news for the small number of things that could change a real decision.`;
  const stories = cards.map((card, index) => {
    const lead = index === 0 ? 'First' : index === 1 ? 'Also worth your attention' : 'One more thing';
    const implication = (card.say ?? '').trim();
    return `${lead}: ${card.headline}. ${implication}`.trim();
  }).join(' ');
  return `Good morning. ${opening} ${stories} That is enough for today. Not more news, just the few things worth carrying into the next decision.`;
}

async function anonymousAudio(
  supabase: ReturnType<typeof createClient>,
  subscriptionId: string,
  today: string,
  script: string,
): Promise<string | null> {
  try {
    const path = `delivery/${subscriptionId}/${today}.mp3`;
    const folder = `delivery/${subscriptionId}`;
    const filename = `${today}.mp3`;
    const { data: existing } = await supabase.storage.from('ctrl-briefings').list(folder, {
      limit: 1,
      search: filename,
    });
    if (existing?.some((item) => item.name === filename)) {
      const { data } = await supabase.storage.from('ctrl-briefings').createSignedUrl(path, 172800);
      if (data?.signedUrl) return data.signedUrl;
    }

    const bytes = await synthesizeSpeech(supabase, script);
    await supabase.storage.createBucket('ctrl-briefings', {
      public: false,
      fileSizeLimit: 10485760,
    }).catch(() => {});
    const { error } = await supabase.storage.from('ctrl-briefings').upload(path, bytes, {
      contentType: 'audio/mpeg',
      upsert: true,
    });
    if (error) return null;
    const { data } = await supabase.storage.from('ctrl-briefings').createSignedUrl(path, 172800);
    return data?.signedUrl ?? null;
  } catch (error) {
    console.warn('Anonymous briefing audio unavailable', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceRequest = isServiceRequest(req.headers.get("Authorization"), supabaseServiceKey);
    const cronRequest = isCronRequest(
      req.headers.get("X-CTRL-Cron-Secret"),
      Deno.env.get("CTRL_CRON_SECRET") ?? "",
    );
    if (!serviceRequest && !cronRequest) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional single-recipient test mode.
    let testUserId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && typeof body.user_id === "string") testUserId = body.user_id;
      } catch {
        // empty/invalid body is fine (cron sends {})
      }
    }

    // Recipients: opted-in leaders with an email. Opt-in defaults to false, so
    // nothing sends until a leader enables daily briefing emails (or the owner
    // enrolls users deliberately).
    let prefsQuery = supabase
      .from("leader_notification_prefs")
      .select("user_id, email")
      .eq("daily_briefing_enabled", true)
      .not("email", "is", null);
    if (testUserId) prefsQuery = prefsQuery.eq("user_id", testUserId);

    const { data: prefs, error: prefsError } = await prefsQuery;

    if (prefsError) {
      console.error("Error fetching notification prefs:", prefsError);
      return new Response(JSON.stringify({ error: prefsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = (prefs ?? []) as PrefRow[];
    const appUrl = getAppUrl();
    const briefingUrl = `${appUrl}/briefing`;
    const manageUrl = `${appUrl}/settings?tab=notifications`;
    const today = new Date().toISOString().split("T")[0];

    let sentCount = 0;
    const sentEmails = new Set<string>();

    for (const r of recipients) {
      if (!r.email) continue;

      const { data: briefingData } = await supabase
        .from("briefings")
        .select("script_text, audio_duration_seconds")
        .eq("user_id", r.user_id)
        .eq("briefing_date", today)
        .maybeSingle();

      const briefing = briefingData as BriefingRow | null;

      let subject: string;
      let body: string;
      let buttonLabel: string;

      if (briefing?.script_text) {
        const minutes = briefing.audio_duration_seconds
          ? Math.max(1, Math.round(briefing.audio_duration_seconds / 60))
          : 3;
        subject = "Your morning briefing is ready";
        buttonLabel = `Listen now (about ${minutes} min)`;
        body = `
          <p>Good morning.</p>
          <p>I read today's shifts through your priorities and kept the useful part:</p>
          <blockquote style="border-left:3px solid #25e1ba;padding-left:12px;margin:16px 0;color:#c8d2cc;">
            ${teaserFrom(briefing.script_text)}
          </blockquote>
        `;
      } else {
        subject = "Your morning briefing is waiting";
        buttonLabel = "Open today's briefing";
        body = `
          <p>Good morning.</p>
          <p>There is a short read waiting, tuned to your priorities and the decisions on your plate. Open CTRL when you want it. Nothing else needs your attention here.</p>
        `;
      }

      const footer = `
        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
          You are receiving this because daily briefing emails are on.
          <a href="${manageUrl}" style="color: #64748b;">Manage email preferences</a>.
        </p>
      `;

      const result = await sendEmail({
        from: getDefaultSender("notification"),
        to: r.email,
        subject,
        html: brandedEmailShell({
          eyebrow: 'CTRL morning briefing',
          heading: 'The small number of things worth carrying into today.',
          bodyHtml: body + footer,
          buttonLabel,
          actionUrl: briefingUrl,
        }),
        emailType: "notification",
        metadata: { user_id: r.user_id },
        tags: [{ name: "email_type", value: "daily_briefing" }],
      });

      if (result.success) {
        sentCount++;
        sentEmails.add(r.email.trim().toLowerCase());
      }
    }

    // No-login subscribers use the same shared, corroborated pool as Home and
    // authenticated briefings. Their onboarding answers are only a ranking
    // lens; no second news pipeline is created.
    const { data: subscriberData, error: subscriberError } = await supabase
      .from('delivery_subscriptions')
      .select('id, destination, content_modes, unsubscribe_token, cannes_responses(q2_extra_self, q4_company_future, q5_decision)')
      .eq('status', 'active')
      .eq('channel', 'email')
      .or(`last_sent_date.is.null,last_sent_date.lt.${today}`)
      .limit(100);

    let anonymousSent = 0;
    if (subscriberError) console.error('Error fetching no-login subscriptions:', subscriberError);
    if (!subscriberError && subscriberData?.length) {
      const { data: poolRow } = await supabase
        .from('live_headlines_cache')
        .select('payload')
        .order('briefing_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      const pool = Array.isArray(poolRow?.payload) ? poolRow.payload as SharedCard[] : [];
      const subscribers = subscriberData as unknown as SubscriberRow[];
      for (const subscriber of subscribers) {
        const email = subscriber.destination.trim().toLowerCase();
        if (!email || sentEmails.has(email) || pool.length === 0) continue;
        const answers = subscriber.cannes_responses ?? {};
        const cards = rankPoolForOnboarding(pool, {
          q5: answers.q5_decision,
          q2: answers.q2_extra_self,
          q4: answers.q4_company_future,
        }).slice(0, 3);
        const staleClaim = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: claim } = await supabase
          .from('delivery_subscriptions')
          .update({ delivery_claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', subscriber.id)
          .eq('status', 'active')
          .or(`delivery_claimed_at.is.null,delivery_claimed_at.lt.${staleClaim}`)
          .select('id')
          .maybeSingle();
        if (!claim) continue;

        const script = anonymousScript(answers.q5_decision ?? '', cards);
        const wantsAudio = subscriber.content_modes?.includes('audio') !== false;
        const audioUrl = wantsAudio
          ? await anonymousAudio(supabase, subscriber.id, today, script)
          : null;
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-briefing?token=${subscriber.unsubscribe_token}`;
        const storyHtml = cards.map((card) => {
          const safeUrl = card.url?.startsWith('https://') ? card.url : null;
          const title = escapeHtml(card.headline);
          const source = card.source ? ` <span style="color:#64748b">${escapeHtml(card.source)}</span>` : '';
          const headline = safeUrl ? `<a href="${escapeHtml(safeUrl)}">${title}</a>` : title;
          return `<li style="margin:0 0 14px">${headline}${source}<br/><span style="color:#4a5a52">${escapeHtml(card.say ?? '')}</span></li>`;
        }).join('');
        const html = brandedEmailShell({
          eyebrow: 'CTRL morning briefing',
          heading: 'The small number of things worth carrying into today.',
          bodyHtml: `<p style="margin:0 0 16px">${escapeHtml(teaserFrom(script))}</p><ol style="padding-left:20px;margin:18px 0">${storyHtml}</ol>${audioUrl ? `<p><a href="${escapeHtml(audioUrl)}">Listen to the briefing</a></p>` : ''}<p style="margin:24px 0 0;font-size:12px"><a href="${unsubscribeUrl}">Stop the morning briefing</a></p>`,
          buttonLabel: audioUrl ? 'Listen now' : 'Open CTRL',
          actionUrl: audioUrl || 'https://makeyourmindup.ai',
        });
        const result = await sendEmail({
          from: getDefaultSender('notification'),
          to: email,
          subject: 'The useful part of today in AI',
          html,
          emailType: 'notification',
          tags: [{ name: 'email_type', value: 'anonymous_daily_briefing' }],
        });
        await supabase.from('delivery_subscriptions').update({
          ...(result.success
            ? { last_sent_date: today, last_error: null }
            : { last_error: String(result.error ?? 'send failed').slice(0, 500) }),
          delivery_claimed_at: null,
          updated_at: new Date().toISOString(),
        }).eq('id', subscriber.id);
        if (result.success) {
          anonymousSent++;
          sentEmails.add(email);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount + anonymousSent} daily briefing emails`,
        sent: sentCount + anonymousSent,
        authenticated_sent: sentCount,
        no_login_sent: anonymousSent,
        total: recipients.length + (subscriberData?.length ?? 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-daily-briefing:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
