/**
 * capture-lead
 *
 * Public email capture for the /download starter-kit landing page. No auth
 * required (a cold visitor has no session yet). Mirrors submit-decision-capture
 * / send-kit-pack for CORS + response shape.
 *
 * Validates the email server side, silently drops any submission where the
 * `website` honeypot field is filled in (a sign of a bot filling every field),
 * then forwards the lead to the marketing automation webhook
 * (CAPTURE_WEBHOOK_URL, an n8n flow that sends the kit link email and any
 * follow ups). The webhook URL is never hardcoded; it is read from the
 * function's own env so the browser never talks to a third party directly.
 */

import { corsHeaders, getResponseHeaders } from "../_shared/security-headers.ts";
import { fetchWithTimeout } from "../_shared/with-timeout.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("capture-lead");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), { status, headers: getResponseHeaders() });
}

function str(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot: a real visitor never fills this field (it is offscreen and
    // never focusable). A filled honeypot is a bot; drop it silently with a
    // success-shaped response so the bot never learns it was caught.
    const website = str(body?.website, 200);
    if (website) {
      log.info("honeypot triggered, dropping silently");
      return jsonResponse({ ok: true }, 200);
    }

    const email = str(body?.email, 320).toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return jsonResponse({ error: "Enter a valid email address." }, 400);
    }

    const webhookUrl = Deno.env.get("CAPTURE_WEBHOOK_URL");
    if (!webhookUrl) {
      // Not configured yet. We cannot honor the promise to email the kit
      // link, so tell the truth instead of a fake success.
      log.error("CAPTURE_WEBHOOK_URL is not set");
      return jsonResponse({ error: "Could not send right now. Try again." }, 500);
    }

    const payload = {
      email,
      full_name: null,
      artifact_name: "CTRL starter kit",
      utm_source: str(body?.utm_source, 100) || "direct",
      utm_medium: str(body?.utm_medium, 100) || "organic",
      utm_campaign: str(body?.utm_campaign, 100) || "mm_ctrl_capture_page",
      utm_content: str(body?.utm_content, 100) || null,
      utm_term: str(body?.utm_term, 100) || null,
      page_url: str(body?.page_url, 500),
    };

    const res = await fetchWithTimeout(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeoutMs: 10_000,
      provider: "capture-webhook",
    });

    if (!res.ok) {
      log.error("capture webhook returned non-ok", { status: res.status });
      return jsonResponse({ error: "Could not send right now. Try again." }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    log.error("capture-lead error", { error: (err as Error).message });
    return jsonResponse({ error: "Something went wrong. Try again." }, 500);
  }
});
