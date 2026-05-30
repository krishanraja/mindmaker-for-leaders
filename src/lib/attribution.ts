/**
 * Attribution capture (WS5, 2026-05-30).
 *
 * First-touch UTM + referrer capture for fleet revenue attribution. Captured on
 * landing, persisted through signup into Supabase user_metadata, and stamped onto
 * the Stripe customer + checkout session at purchase. Lifecycle events are emitted
 * to the central MindmakerOS attribution warehouse via the track-event edge
 * function (see src/lib/track.ts and supabase/functions/track-event).
 *
 * Runtime contract is published at /.well-known/product.json (attribution block).
 */

const STORAGE_KEY = "ctrl_attribution_v1";
const ANON_KEY = "ctrl_anonymous_id";

export interface Attribution {
  anonymous_id: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  agent?: string;
  campaign_id?: string;
  referrer?: string;
  landing_path?: string;
  first_seen_at: string;
}

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "agent",
  "campaign_id",
] as const;

function safeUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "anon_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function getAnonymousId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = safeUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return safeUUID();
  }
}

/**
 * Capture first-touch attribution on landing. Idempotent: the first call that
 * sees campaign params wins and is never overwritten, so later organic visits do
 * not clobber the acquisition source.
 */
export function captureAttribution(): Attribution | null {
  try {
    const anonymous_id = getAnonymousId();
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing) as Attribution;

    const params = new URLSearchParams(window.location.search);
    const attr: Attribution = {
      anonymous_id,
      first_seen_at: new Date().toISOString(),
    };
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) (attr as Record<string, string>)[k] = v.slice(0, 200);
    }
    const ref = (document.referrer || "").slice(0, 300);
    if (ref) attr.referrer = ref;
    attr.landing_path = (window.location.pathname + window.location.search).slice(0, 300);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(attr));
    return attr;
  } catch {
    return null;
  }
}

export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Attribution;
    return captureAttribution();
  } catch {
    return null;
  }
}

/**
 * Flatten to a string-only map for Stripe metadata (keys prefixed attr_, values
 * truncated). Safe to spread into a Stripe metadata object.
 */
export function attributionForStripe(): Record<string, string> {
  const a = getAttribution();
  if (!a) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) {
    if (v != null && v !== "") out[`attr_${k}`] = String(v).slice(0, 480);
  }
  return out;
}
