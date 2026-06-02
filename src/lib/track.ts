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
