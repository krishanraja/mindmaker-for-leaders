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
import { sendEmail, getDefaultSender, createEmailTemplate, createEmailButton, getAppUrl } from "../_shared/email-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrefRow {
  user_id: string;
  email: string | null;
}

interface BriefingRow {
  script_text: string;
  audio_duration_seconds: number | null;
}

/** A short, readable teaser from the conversational briefing script. */
function teaserFrom(script: string): string {
  const clean = script.replace(/\s+/g, " ").trim();
  if (clean.length <= 220) return clean;
  const cut = clean.slice(0, 220);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (lastStop > 120 ? cut.slice(0, lastStop + 1) : cut) + "...";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No opted-in recipients", sent: 0, total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const appUrl = getAppUrl();
    const briefingUrl = `${appUrl}/briefing`;
    const manageUrl = `${appUrl}/settings?tab=notifications`;
    const today = new Date().toISOString().split("T")[0];

    let sentCount = 0;

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

      if (briefing?.script_text) {
        const minutes = briefing.audio_duration_seconds
          ? Math.max(1, Math.round(briefing.audio_duration_seconds / 60))
          : 3;
        subject = "Your morning briefing is ready";
        body = `
          <p>Good morning.</p>
          <p>Today's briefing is ready, tuned to your priorities, not the same generic news everyone else gets:</p>
          <blockquote style="border-left: 3px solid #10b981; padding-left: 12px; margin: 16px 0; color: #374151;">
            ${teaserFrom(briefing.script_text)}
          </blockquote>
          ${createEmailButton(briefingUrl, `Listen now (about ${minutes} min)`, "#10b981")}
        `;
      } else {
        subject = "Your morning briefing is waiting";
        body = `
          <p>Good morning.</p>
          <p>Three minutes, tuned to your priorities and the decisions on your plate, not the same generic news everyone else gets. Open CTRL and today's briefing builds itself around your world.</p>
          ${createEmailButton(briefingUrl, "Open today's briefing", "#10b981")}
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
        html: createEmailTemplate(body + footer, "CTRL Daily Briefing"),
        emailType: "notification",
        metadata: { user_id: r.user_id },
        tags: [{ name: "email_type", value: "daily_briefing" }],
      });

      if (result.success) sentCount++;
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} daily briefing emails`,
        sent: sentCount,
        total: recipients.length,
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
