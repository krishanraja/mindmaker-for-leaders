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
    const key = `ff_${name}`;
    const storeKey = `ctrl_${key}`;
    const v = new URLSearchParams(window.location.search).get(key);
    // A URL override is sticky for the session so it survives SPA navigations
    // (the briefing / export flows navigate, which would otherwise drop ?ff_x=1).
    if (v === '1' || v === 'true') { sessionStorage.setItem(storeKey, '1'); return true; }
    if (v === '0' || v === 'false') { sessionStorage.setItem(storeKey, '0'); return false; }
    const stored = sessionStorage.getItem(storeKey);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    // SSR / no window / storage blocked
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
  /** Streaming briefing assembly preview (?ff_stream=1). */
  briefingStream: () => flag('stream'),
  /** Unauthenticated landing voice/text demo (?ff_voicedemo=1). */
  landingVoiceDemo: () => flag('voicedemo'),
  /** Public email-capture landing page at /download (?ff_capture=1). */
  publicCapture: () => flag('capture'),
};
