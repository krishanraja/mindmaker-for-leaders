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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { forwardToWarehouse, type AttributionEvent } from "../_shared/attribution-emit.ts";

/**
 * Best-effort write of a signup into the shared audience_contacts table so CTRL
 * appears in the unified audience list tagged source='ctrl'. Never throws: a
 * failure here must not break the lifecycle emit or the client response.
 * audience_contacts has UNIQUE(email, source), so a returning subscriber (23505)
 * is treated as success.
 */
async function recordAudienceContact(email: string, metadata: Record<string, unknown>): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !supabaseServiceKey) return false;
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const { error } = await supabase
      .from("audience_contacts")
      .insert({ email: email.trim().toLowerCase(), source: "ctrl", metadata });
    if (error && error.code !== "23505") {
      console.error(`[audience_contacts] ctrl insert failed: ${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[audience_contacts] ctrl insert threw: ${(e as Error).message}`);
    return false;
  }
}

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

    // Unified audience capture: a signup is a Mindmaker lead. Tag source='ctrl'.
    let audience_recorded = false;
    if (event === "signed_up" && body?.email) {
      audience_recorded = await recordAudienceContact(String(body.email), {
        anonymous_id: a.anonymous_id ?? null,
        user_id: body?.user_id ?? null,
        utm_source: a.utm_source ?? null,
        utm_medium: a.utm_medium ?? null,
        utm_campaign: a.utm_campaign ?? null,
        referrer: a.referrer ?? null,
        landing_path: a.landing_path ?? null,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, forwarded, audience_recorded }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
