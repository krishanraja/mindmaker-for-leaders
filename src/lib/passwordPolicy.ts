/**
 * The password rule, in one place, matching what the server actually enforces.
 *
 * Supabase project config is the authority here:
 *   password_min_length          = 12
 *   password_required_characters = lowercase : uppercase : digits
 *   password_hibp_enabled        = true
 *
 * Three separate surfaces used to state only the length half, so a leader could
 * satisfy the form and then get an opaque failure back from Supabase. Anything
 * that sets a password imports from here instead of writing its own rule.
 *
 * HIBP is deliberately NOT checked client-side. Whether a password appears in a
 * known breach is not knowable from the browser, so that one is announced up
 * front and enforced by the server. Better to name it than to let it arrive as
 * a surprise rejection.
 */

export const PASSWORD_MIN_LENGTH = 12;

/** Shown under any password field that sets, rather than verifies, a password. */
export const PASSWORD_RULE_TEXT =
  'At least 12 characters, with an uppercase letter, a lowercase letter and a number. Passwords found in known breaches are refused.';

/**
 * Returns null when the password satisfies every rule we can check here, or a
 * plain sentence naming the first thing wrong with it. The message is written
 * to be shown to a person, not logged.
 */
export function checkPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters. That one is ${password.length}.`;
  }
  if (!/[a-z]/.test(password)) return 'Add a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Add an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Add a number.';
  return null;
}
