/**
 * track-event (WS5, 2026-05-30).
 *
 * Public, unauthenticated emit proxy for client-originated attribution lifecycle
 * events (landed | signed_up | activated). Holds no secret on the client: the
 * frontend calls this, and this forwards to the central warehouse via the
 * server-held ATTRIBUTION_INGEST_SECRET. Dormant (forwards no-op) until the
 * warehouse env is configured. Deploy with --no-verify-jwt (it is public).
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { forwardToWarehouse, type AttributionEvent } from "../_shared/attribution-emit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLIENT_EVENTS = new Set(["landed", "signed_up", "activated"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const event = String(body?.event || "");
    if (!CLIENT_EVENTS.has(event)) {
      return new Response(
        JSON.stringify({ error: "Unsupported event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const a = body?.attribution || {};
    const evt: AttributionEvent = {
      app: "ctrl",
      event: event as AttributionEvent["event"],
      anonymous_id: a.anonymous_id,
      user_id: body?.user_id,
      email: body?.email,
      utm_source: a.utm_source,
      utm_medium: a.utm_medium,
      utm_campaign: a.utm_campaign,
      utm_content: a.utm_content,
      utm_term: a.utm_term,
      campaign_id: a.campaign_id,
      agent: a.agent,
      referrer: a.referrer,
      landing_path: a.landing_path,
      stripe_account: "mindmaker_llc",
      dedupe_key: `${event}:${a.anonymous_id || body?.user_id || "anon"}:${a.first_seen_at || ""}`,
    };
    const forwarded = await forwardToWarehouse(evt);
    return new Response(
      JSON.stringify({ ok: true, forwarded }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
