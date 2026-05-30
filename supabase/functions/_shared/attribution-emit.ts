/**
 * Dormant warehouse forwarder (WS5, 2026-05-30).
 *
 * Forwards a canonical attribution event to the central MindmakerOS warehouse
 * `ingest-attribution` function. This NO-OPS (returns false, logs intent) until
 * BOTH WAREHOUSE_INGEST_URL and ATTRIBUTION_INGEST_SECRET are set as secrets on
 * this Supabase project. The `attribution` schema + the `ingest-attribution`
 * function are owned by the Mindmaker OS repo (project gojpffsrxybbpbdzzrvs),
 * NOT this app. This app only emits. See the Ctrl.md OS handoff for wiring.
 */

export interface AttributionEvent {
  app: "ctrl";
  event: "landed" | "signed_up" | "activated" | "purchased" | "refunded" | "churned";
  occurred_at?: string;
  anonymous_id?: string;
  user_id?: string;
  email?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_id?: string;
  agent?: string;
  referrer?: string;
  landing_path?: string;
  stripe_account?: "mindmaker_llc" | "fractionl_ai";
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  amount_cents?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  dedupe_key?: string;
}

export async function forwardToWarehouse(evt: AttributionEvent): Promise<boolean> {
  const url = Deno.env.get("WAREHOUSE_INGEST_URL");
  const secret = Deno.env.get("ATTRIBUTION_INGEST_SECRET");
  if (!url || !secret) {
    console.log(
      `[attribution] dormant (WAREHOUSE_INGEST_URL / ATTRIBUTION_INGEST_SECRET unset); would emit "${evt.event}" for ctrl`,
    );
    return false;
  }
  const payload = { occurred_at: new Date().toISOString(), ...evt, app: "ctrl" };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-attribution-secret": secret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      console.warn(`[attribution] ingest returned ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[attribution] forward failed:", (e as Error).message);
    return false;
  }
}

/** Pull attr_* keys out of a Stripe metadata bag back into a clean event shape. */
export function attrFromStripeMetadata(md: Record<string, string> = {}): Partial<AttributionEvent> {
  const get = (k: string) => md[`attr_${k}`] || undefined;
  return {
    anonymous_id: get("anonymous_id"),
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_content: get("utm_content"),
    utm_term: get("utm_term"),
    campaign_id: get("campaign_id"),
    agent: get("agent"),
    referrer: get("referrer"),
    landing_path: get("landing_path"),
  };
}
