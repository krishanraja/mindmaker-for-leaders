// The chief-of-staff greeting for Home. Warm, advisory, AI-native; no em dashes.
// Shared by CockpitView (mobile) + DesktopHomeView (desktop) so the copy stays in
// one place. The per-state orientation line lives in HomeFeed (framingFor).

/** "Good morning, Krish." (name optional - falls back to a warm, name-less greeting). */
export function cockpitGreeting(firstName?: string | null): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const name = (firstName ?? '').trim();
  return name ? `${part}, ${name}.` : `${part}.`;
}
