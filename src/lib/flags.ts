/**
 * Feature flags (5X deep features, 2026-05-30).
 *
 * Default OFF in production. Enable per-feature via a Vite env var
 * (VITE_FF_<NAME>=true) or, for live QA without a redeploy, a URL override
 * (?ff_<name>=1 / ?ff_<name>=0). This keeps the live magic-moment surfaces
 * untouched until each feature is reviewed and switched on.
 */

function urlOverride(name: string): boolean | null {
  try {
    const v = new URLSearchParams(window.location.search).get(`ff_${name}`);
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    // SSR / no window
  }
  return null;
}

export function flag(name: string): boolean {
  const o = urlOverride(name);
  if (o !== null) return o;
  const env = (import.meta as { env?: Record<string, unknown> }).env;
  const val = env?.[`VITE_FF_${name.toUpperCase()}`];
  return val === 'true' || val === true;
}

export const FF = {
  /** Cross-app context broadcast on the Export page (?ff_broadcast=1). */
  contextBroadcast: () => flag('broadcast'),
  /** Streaming briefing assembly via Realtime (?ff_stream=1). */
  briefingStream: () => flag('stream'),
  /** Unauthenticated landing voice/text demo (?ff_voicedemo=1). */
  landingVoiceDemo: () => flag('voicedemo'),
};
