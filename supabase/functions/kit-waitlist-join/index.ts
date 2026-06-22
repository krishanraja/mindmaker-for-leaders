/**
 * kit-waitlist-join
 *
 * The main CTRL app is not in production yet, so kit users are offered a spot on
 * the waitlist instead of a direct sign-up. This records them in the central
 * `kit_waitlist` log (idempotent on email) and notifies the founder by email so
 * the list can be monitored as it grows.
 *
 * Mirrors send-kit-pack: a kit session (anonymous or real) is required, and any
 * supplied redemption is validated against the caller.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, getDefaultSender } from "../_shared/email-utils.ts";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("kit-waitlist-join");

// Where the "someone joined" notification lands. Overridable via env so the
// recipient can change without a redeploy; defaults to the founder.
const NOTIFY_EMAIL = Deno.env.get("WAITLIST_NOTIFY_EMAIL") || "krishanraja@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Session required." }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return jsonResponse({ error: "Session required." }, 401);

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : null;
    const redemptionId = typeof body?.redemption_id === "string" ? body.redemption_id : null;
    const source = typeof body?.source === "string" ? body.source.slice(0, 40) : "kit";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return jsonResponse({ error: "Enter a valid email address." }, 400);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // If a redemption was passed, validate it belongs to the caller and pull the
    // class for the log; never trust a redemption id we cannot tie to the user.
    let classSlug: string | null = null;
    if (redemptionId) {
      const { data: redemption } = await serviceClient
        .from("kit_redemptions")
        .select("id, user_id, class_slug")
        .eq("id", redemptionId)
        .maybeSingle();
      if (redemption && redemption.user_id === user.id) {
        classSlug = redemption.class_slug ?? null;
      }
    }

    // Already on the list? Idempotent success, no second notification.
    const { data: existing } = await serviceClient
      .from("kit_waitlist")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      log.info("waitlist already joined", { email });
      return jsonResponse({ ok: true, already_joined: true }, 200);
    }

    const { error: insertErr } = await serviceClient.from("kit_waitlist").insert({
      email,
      name,
      redemption_id: redemptionId,
      user_id: user.id,
      class_slug: classSlug,
      source,
      metadata: { tool: typeof body?.tool === "string" ? body.tool : undefined },
    });

    if (insertErr) {
      // Unique-index race: another tap landed first. Treat as success.
      if (insertErr.code === "23505") {
        return jsonResponse({ ok: true, already_joined: true }, 200);
      }
      log.error("kit_waitlist insert failed", { error: insertErr.message });
      return jsonResponse({ error: "Could not add you right now. Try again." }, 500);
    }

    // Running total for the founder notification (best effort).
    const { count } = await serviceClient
      .from("kit_waitlist")
      .select("id", { count: "exact", head: true });

    const total = count ?? null;

    const notify = await sendEmail({
      from: getDefaultSender("notification"),
      to: NOTIFY_EMAIL,
      subject: `New CTRL waitlist signup${total ? ` (#${total})` : ""}: ${email}`,
      html: notificationHtml({ email, name, classSlug, source, total }),
      replyTo: email,
      emailType: "notification",
      metadata: { kind: "kit_waitlist_join", email, class_slug: classSlug ?? undefined },
    });

    if (notify.success) {
      await serviceClient
        .from("kit_waitlist")
        .update({ notified_at: new Date().toISOString() })
        .ilike("email", email);
    } else {
      // The person is recorded regardless; the notification is best-effort.
      log.error("waitlist notification failed", { error: notify.error });
    }

    log.info("waitlist joined", { email, total });
    return jsonResponse({ ok: true, total }, 200);
  } catch (err) {
    log.error("kit-waitlist-join error", { error: (err as Error).message });
    return jsonResponse({ error: "Something went wrong. Try again." }, 500);
  }
});

function notificationHtml(args: {
  email: string;
  name: string | null;
  classSlug: string | null;
  source: string;
  total: number | null;
}): string {
  const { email, name, classSlug, source, total } = args;
  const rows: Array<[string, string]> = [
    ["Email", email],
    ["Name", name || "Not provided"],
    ["Kit", classSlug || "Unknown"],
    ["Source", source],
    ["Joined", new Date().toUTCString()],
  ];
  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px;color:#64748b;font-weight:600;">${k}</td><td style="padding:6px 14px;color:#0f172a;">${v}</td></tr>`,
    )
    .join("");
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#0f172a;margin:0 0 4px;">Someone joined the CTRL waitlist</h2>
      ${total ? `<p style="color:#0a9e84;font-weight:700;margin:0 0 16px;">Waitlist is now ${total} ${total === 1 ? "person" : "people"}.</p>` : ""}
      <table style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;width:100%;">
        ${tableRows}
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;">
        Full list lives in the <code>kit_waitlist</code> table. Reply to this email to reach them directly.
      </p>
    </div>
  `;
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
