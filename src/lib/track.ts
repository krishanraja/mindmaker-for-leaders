/**
 * Lifecycle event emitter (WS5, 2026-05-30).
 *
 * Best-effort, fire-and-forget emission of attribution lifecycle events to the
 * track-event edge function, which forwards to the central MindmakerOS warehouse.
 * Every call is wrapped so a failed or dormant pipeline never affects the UX.
 *
 * Events: landed | signed_up | activated. (purchased / refunded fire server-side
 * from stripe-webhook.)
 */

import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";

export type LifecycleEvent = "landed" | "signed_up" | "activated";

export type KitLifecycleEvent =
  | "kit_redeemed"
  | "kit_intake_completed"
  | "kit_composed"
  | "kit_capsule_pasted"
  | "kit_artifact_downloaded"
  | "kit_shipped"
  | "kit_email_captured"
  | "kit_waitlist_joined";

export interface KitEventDims {
  class_slug?: string;
  code?: string;
  redemption_id?: string;
}

/**
 * Emit a Kit Engine funnel event. Not session-deduped: downloads and
 * regenerations legitimately repeat. Fire-and-forget like emitEvent.
 */
export async function emitKitEvent(
  event: KitLifecycleEvent,
  kit: KitEventDims = {},
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    const attribution = getAttribution();
    void supabase.functions
      .invoke("track-event", { body: { event, attribution, kit, ...extra } })
      .catch(() => {});
  } catch {
    // Attribution must never break the app.
  }
}

const SESSION_GUARD_PREFIX = "ctrl_evt_";

/**
 * Emit a lifecycle event. `once` (default true) de-dupes per browser session so
 * we do not spam landed on every route change.
 */
export async function emitEvent(
  event: LifecycleEvent,
  extra: Record<string, unknown> = {},
  once = true,
): Promise<void> {
  try {
    if (once) {
      const key = SESSION_GUARD_PREFIX + event;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    }
    const attribution = getAttribution();
    // Do not await network on the critical path; swallow all errors.
    void supabase.functions
      .invoke("track-event", { body: { event, attribution, ...extra } })
      .catch(() => {});
  } catch {
    // Attribution must never break the app.
  }
}
