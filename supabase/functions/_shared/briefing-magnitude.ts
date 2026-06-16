// Briefing-segment magnitude extraction: distil ONE short, honest, source-backed
// number out of a briefing segment at GENERATION time, so the briefing hero can
// lead with a stored magnitude instead of re-deriving it from the headline at
// read-time. Mirrors the honesty discipline of reaction-extraction.ts.
//
// THE HONESTY GATE (the whole point): a magnitude surfaces ONLY if it is either
//   (a) SOURCED  - its numeric core appears verbatim in the segment's own
//                  evidence text (analysis / relevance_reason / matched_profile_fact
//                  / source), not merely in the headline, OR
//   (b) MODELLED  - the segment's own text explicitly flags it as a CTRL estimate
//                  ("est.", "~", "roughly", "approximately", "estimated") AND the
//                  segment is quantitatively grounded (carries a real figure to
//                  derive from). A modelled figure renders with the `est.` mark so
//                  it never reads as measured.
// Anything else (a figure the model asserted in the headline but that the segment
// body does not actually support) is REJECTED -> null, and the hero leads with
// WORDS. This reuses numericCore / findInEvidence / hasNumericEvidence so the gate
// is identical to the cockpit/stone heroes.
// Locked rule: docs design-log "clearest-unit-first" + "number sanctity" (Krish 2026-06-15).

import { numericCore, findInEvidence, hasNumericEvidence, type EvidenceLite } from "./reaction-extraction.ts";

export interface SegmentMagnitude {
  value: string; // the short magnitude, e.g. "40%", "10x", "$2M"
  kind: "sourced" | "modelled";
}

// The text fields of a segment the gate may read. Only the headline is the
// candidate SOURCE of the token; the rest form the evidence the token must be
// grounded in. Kept loose so both the v1 and v2 segment shapes satisfy it.
export interface SegmentLike {
  headline?: string | null;
  analysis?: string | null;
  relevance_reason?: string | null;
  matched_profile_fact?: string | null;
  source?: string | null;
}

// A SHORT, self-contained magnitude token at a word boundary: a multiplier (10x),
// a signed percent (-40%, +12%), or money ($2M, $1.4bn). Deliberately strict so
// prose numbers ("in 2026", "3 vendors") do not qualify. Same shape as the
// read-time regex in briefingRead.ts, kept in lockstep.
const MAGNITUDE_RE =
  /(?:^|\s)((?:[-+]?\$?\d[\d,.]*\s?(?:x|%|bn|m|k|b)\b)|(?:\$\d[\d,.]*\s?(?:bn|m|k|b)?))/gi;

// A hero number is a glance, not a figure dump.
const VALUE_MAX_LEN = 8;

// Words/marks that explicitly flag a figure as an estimate (=> modelled, `est.`).
const EST_MARK_RE = /\b(?:est\.?|estimated|approx(?:\.|imately)?|roughly|around|circa)\b|~/i;

/**
 * Collect every short magnitude token in a string, in order, deduped.
 * Each token is trimmed and length-capped so only clean units survive.
 */
function magnitudeTokens(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(MAGNITUDE_RE)) {
    const raw = (m[1] ?? "").trim();
    if (!raw || raw.length > VALUE_MAX_LEN) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

/**
 * THE GATE. Extract at most ONE honest magnitude for a segment, or null.
 *
 * Pure + deterministic - the honesty guarantee lives here, not in the LLM.
 * The candidate token is taken from the HEADLINE (the hero line). It is honest
 * only if its numeric core also appears verbatim somewhere in the segment's own
 * evidence body (sourced), or the segment explicitly marks it as an estimate and
 * is otherwise quantitatively grounded (modelled). Otherwise -> null (words lead).
 */
export function extractSegmentMagnitude(seg: SegmentLike): SegmentMagnitude | null {
  const headline = (seg.headline ?? "").trim();
  if (!headline) return null;

  const candidates = magnitudeTokens(headline);
  if (candidates.length === 0) return null;

  // The segment's own supporting text is its evidence. The headline is NOT part
  // of the evidence: a number is sourced only if the body actually carries it,
  // so a model-asserted headline figure with no backing is rejected.
  const bodyText = [seg.analysis, seg.relevance_reason, seg.matched_profile_fact, seg.source]
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .join(" ");
  const evidence: EvidenceLite[] = bodyText ? [{ id: null, excerpt: bodyText }] : [];

  // The whole segment text (headline + body) is what we scan for an explicit
  // estimate mark, since the model may write "~40%" or "(est.)" in either place.
  const wholeText = `${headline} ${bodyText}`;
  const flaggedEstimate = EST_MARK_RE.test(wholeText);
  const grounded = hasNumericEvidence(evidence);

  // Prefer the first candidate that is SOURCED (numeric core present in the body
  // verbatim). A sourced figure stands clean.
  for (const value of candidates) {
    if (findInEvidence(value, evidence)) {
      return { value, kind: "sourced" };
    }
  }

  // No sourced token. Allow a MODELLED figure only when the segment explicitly
  // marks it as an estimate AND carries real numbers to derive from. This blocks
  // a bare model-invented headline number from ever surfacing.
  if (flaggedEstimate && grounded) {
    const value = candidates[0];
    if (numericCore(value)) return { value, kind: "modelled" };
  }

  return null; // ungrounded / invented figure -> rejected, hero leads with words
}
