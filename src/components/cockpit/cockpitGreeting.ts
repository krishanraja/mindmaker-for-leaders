// The chief-of-staff greeting for Home. Warm, advisory, AI-native; no em dashes.
// Shared by CockpitView (mobile) + DesktopHomeView (desktop) so the copy stays in
// one place. The per-state orientation line lives in HomeFeed (framingFor).

import type { User } from '@supabase/supabase-js';

/** "Good morning, Krish." (name optional - falls back to a warm, name-less greeting). */
export function cockpitGreeting(firstName?: string | null): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const name = (firstName ?? '').trim();
  return name ? `${part}, ${name}.` : `${part}.`;
}

/**
 * Decide whether a candidate string is a real human name we should print, or an
 * ugly machine identifier we should hide. A leader who signed up with only an
 * email (e.g. ctrl-qa-1782077550632@example.com) must NEVER see their raw email
 * prefix in the greeting; we gracefully omit the name instead.
 *
 * A value is treated as NOT a real name (so the caller omits it) when it looks
 * like an email local-part, a handle, a slug, or a random id: it contains an
 * @ . _ + or digit, contains a hyphen, or is one long unbroken token.
 */
function looksLikeHumanName(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  // These characters only show up in handles / emails / ids / slugs, never in a
  // spoken first name.
  if (/[@._+0-9]/.test(v)) return false;
  if (v.includes('-')) return false;
  if (v.includes(' ')) {
    // A multi-word value is fine (each token already passed the char check);
    // just reject an absurdly long blob.
    return v.length <= 40;
  }
  // A single very long token with no spaces reads like a random id, not a name.
  if (v.length > 24) return false;
  return true;
}

/**
 * Resolve the leader's display first name from the Supabase user, or null when
 * the only identifier we have looks like an email / handle / random id. Callers
 * pass the result straight into cockpitGreeting(), which omits the name when null
 * ("Good morning." rather than "Good morning, ctrl-qa-1782077550632.").
 *
 * Order of trust: explicit full_name, then name / given_name / first_name /
 * preferred_username, then a clean email prefix only if it actually reads like a
 * name. The email is the last resort precisely because it is the most likely to
 * be ugly.
 */
export function resolveDisplayName(user: User | null | undefined): string | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const candidates: Array<unknown> = [
    meta.full_name,
    meta.name,
    meta.given_name,
    meta.first_name,
    meta.preferred_username,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const first = candidate.trim().split(/\s+/)[0] ?? '';
    if (looksLikeHumanName(first)) return first;
  }

  // Email prefix is the last resort, and only if it still reads like a name
  // (so ctrl-qa-1782077550632@example.com yields null, not the raw prefix).
  const emailPrefix = user.email?.split('@')[0]?.trim() ?? '';
  if (looksLikeHumanName(emailPrefix)) {
    // Capitalise a clean single-word prefix ("jane" -> "Jane").
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }

  return null;
}
