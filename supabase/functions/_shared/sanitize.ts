// House-rule sanitizer for model-generated, user-facing text.
//
// The no-em-dash rule is enforced on SOURCE by standards/check-standards.mjs (it
// even blocks deploys), but nothing held LLM OUTPUT to the same bar, so generated
// copy could ship an em dash the codebase would reject. This is the runtime
// counterpart: run every user-facing model string through stripEmDashes before it
// is stored or shown. Pure, dependency-free, safe to run under Deno and vitest.

// Built from char codes, never a literal, so this file itself passes the guard.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/**
 * Replace em/en dashes with house-rule punctuation.
 * - A spaced dash used as an aside or appositive becomes ", ".
 * - A tight dash between words becomes ", ".
 * - A numeric range like "3 [dash] 5" becomes "3 to 5".
 * Idempotent: text with no dashes is returned unchanged.
 */
export function stripEmDashes(input: string | null | undefined): string {
  let s = String(input ?? "");
  if (!s.includes(EM_DASH) && !s.includes(EN_DASH)) return s;
  const dash = `[${EM_DASH}${EN_DASH}]`;
  // Numeric ranges: 3-5, 10 - 20 -> "3 to 5".
  s = s.replace(new RegExp(`(\\d)\\s*${dash}\\s*(\\d)`, "g"), "$1 to $2");
  // Everything else (aside/appositive/separator): collapse surrounding spaces to ", ".
  s = s.replace(new RegExp(`\\s*${dash}\\s*`, "g"), ", ");
  // Tidy any accidental doubling introduced by adjacent punctuation.
  s = s.replace(/,\s*,/g, ",").replace(/,\s*([.;:!?])/g, "$1");
  return s;
}

/** True if the string still contains an em or en dash. For tests/asserts. */
export function hasDisallowedDash(input: string | null | undefined): boolean {
  const s = String(input ?? "");
  return s.includes(EM_DASH) || s.includes(EN_DASH);
}
