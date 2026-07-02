/**
 * send-decision-summary
 *
 * The "email this to me" moment on a finished decision. Composes a warm, first-person chief-of-staff
 * note from the leader's OWN decision - how CTRL framed it, the call, what would change the call, and
 * the "what to check next" checklist (with any items already ticked in the app shown done) - and mails
 * it to the authenticated leader. Reuses the shared branded kit email shell + the Resend sender so the
 * look matches every other CTRL email. Honest by construction: every line is the real engine output;
 * nothing is asserted that the decision does not already hold.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, getDefaultSender } from "../_shared/email-utils.ts";
import { kitEmailShell } from "../_shared/kit-presets/email-shell.ts";
import { createLogger } from "../_shared/logger.ts";

// The button must always land on the live production app, not the marketing apex. Hardcode the
// canonical CTRL host (same convention as the kit emails' KIT_URL) so an unset/misconfigured
// APP_URL env can never point the leader at the wrong place.
const DECISION_URL = "https://ctrl.themindmaker.ai/decision";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("send-decision-summary");

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const INK = "#13282c";
const INK_SOFT = "#4a5a52";
const EMERALD_DEEP = "#1E7860";
const FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** A labelled section: a small emerald eyebrow + a paragraph of body copy. */
function section(label: string, bodyHtml: string): string {
  return `<div style="margin:0 0 20px 0;">
    <p style="font-family:${FONT};font-weight:900;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${EMERALD_DEEP};margin:0 0 6px 0;">${esc(label)}</p>
    ${bodyHtml}
  </div>`;
}

function paragraph(text: string): string {
  return `<p style="font-family:${FONT};font-size:16px;line-height:1.6;color:${INK};margin:0;">${esc(text)}</p>`;
}

/** The checklist, rendered as ticked/open rows so the leader sees exactly what is left to do. */
function checklist(items: Array<{ text: string; done: boolean }>): string {
  const rows = items.map((it) => {
    const mark = it.done ? "&#10003;" : "&#9744;";
    const markColor = it.done ? EMERALD_DEEP : INK_SOFT;
    const textStyle = it.done
      ? `color:${INK_SOFT};text-decoration:line-through;`
      : `color:${INK};`;
    return `<tr>
      <td valign="top" style="font-family:${FONT};font-size:16px;line-height:1.5;color:${markColor};padding:0 10px 8px 0;">${mark}</td>
      <td valign="top" style="font-family:${FONT};font-size:15px;line-height:1.5;${textStyle}padding:0 0 8px 0;">${esc(it.text)}</td>
    </tr>`;
  }).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${rows}</table>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Session required." }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return json({ error: "Session required." }, 401);
    const email = user.email ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ error: "Your account has no email address to send to." }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const caseId = typeof body?.case_id === "string" ? body.case_id : "";
    if (!caseId) return json({ error: "case_id is required." }, 400);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: caseRow } = await service
      .from("decision_cases")
      .select("id, user_id, title, statement, reframed, reframed_statement, reframe_note, recommendation, counter_case, validate_next, confidence")
      .eq("id", caseId)
      .maybeSingle();
    if (!caseRow || caseRow.user_id !== user.id) return json({ error: "Not found." }, 404);

    const { data: checkRows } = await service
      .from("decision_check_items")
      .select("item_key, done")
      .eq("decision_case_id", caseId)
      .eq("user_id", user.id);
    const doneByKey = new Map<string, boolean>();
    for (const r of checkRows ?? []) doneByKey.set(String(r.item_key), !!r.done);

    const decisionLine = (caseRow.title || caseRow.statement || "Your decision").toString();
    const validateNext: string[] = Array.isArray(caseRow.validate_next) ? caseRow.validate_next : [];
    const items = validateNext
      .filter((t) => typeof t === "string" && t.trim())
      .map((t) => ({ text: t, done: doneByKey.get(t.trim().toLowerCase()) ?? false }));

    // Compose the body. Warm, first person, no em dashes. Only render a section it actually has.
    const parts: string[] = [];
    parts.push(paragraph("Here is where your decision stands, so you have it in your inbox."));
    if (caseRow.reframed && caseRow.reframe_note) {
      parts.push(section("How I looked at it", paragraph(caseRow.reframe_note)));
    }
    if (caseRow.recommendation) {
      const pct = typeof caseRow.confidence === "number" ? Math.round(caseRow.confidence * 100) : null;
      const conf = pct != null
        ? `<p style="font-family:${FONT};font-size:13px;line-height:1.5;color:${INK_SOFT};margin:8px 0 0 0;">My confidence in this call: ${pct} of 100.</p>`
        : "";
      parts.push(section("The call", paragraph(caseRow.recommendation) + conf));
    }
    if (caseRow.counter_case) {
      parts.push(section("What would change my mind", paragraph(caseRow.counter_case)));
    }
    if (items.length) {
      parts.push(section("What to check next", checklist(items)));
    }

    const html = kitEmailShell({
      heading: decisionLine,
      bodyHtml: parts.join("\n"),
      buttonLabel: "Open in CTRL",
      kitUrl: DECISION_URL,
      eyebrow: "CTRL - your chief of staff",
    });

    const subject = `Your decision: ${decisionLine}`.slice(0, 180);
    const result = await sendEmail({
      from: getDefaultSender("notification"),
      to: email,
      subject,
      html,
      emailType: "decision_summary",
      metadata: { user_id: user.id, decision_case_id: caseId },
    });

    if (!result.success) {
      log.error("decision summary send failed", { userId: user.id, error: result.error });
      return json({ error: "Could not send the email just now. Try again in a moment." }, 502);
    }

    log.info("decision summary sent", { userId: user.id, caseId });
    return json({ ok: true, sent_to: email });
  } catch (e) {
    log.error("send-decision-summary handler error", { error: e instanceof Error ? e.message : String(e) });
    return json({ error: "Unexpected error." }, 500);
  }
});
