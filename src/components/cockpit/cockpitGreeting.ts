// The chief-of-staff greeting + framing line for the one-thing home.
// Warm, advisory, AI-native; no em dashes. Shared by CockpitView (live) and the
// /preview fixture so the copy stays in one place.

/** "Good morning, Krish." (name optional - falls back to a warm, name-less greeting). */
export function cockpitGreeting(firstName?: string | null): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const name = (firstName ?? '').trim();
  return name ? `${part}, ${name}.` : `${part}.`;
}

/** The single framing line above the one hero. */
export const COCKPIT_FRAMING = "The one thing I'd put in front of you today:";
