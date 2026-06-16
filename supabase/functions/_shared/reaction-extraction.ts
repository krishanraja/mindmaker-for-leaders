// Reaction-number extraction: distil a claim's evidence into ONE short, honest,
// source-backed magnitude for the numerical-first heroes (cockpit / stone / briefing).
//
// THE HONESTY GATE (the whole point): a number surfaces ONLY if it is either
//   (a) SOURCED  - its numeric core appears verbatim in a retrieved evidence excerpt, or
//   (b) MODELLED - an explicit CTRL derivation the proposer flagged as such.
// Anything else (an invented figure) is REJECTED -> null, and the hero leads with
// WORDS. This is "clearest-unit-first + sanctity" made deterministic and testable.
// Locked rule: docs design-log "clearest-unit-first" + "number sanctity" (Krish 2026-06-15).

export interface ReactionCandidate {
  value: string; // the short magnitude, e.g. "~40%", "10x", "$2M"
  descriptor: string; // the words, e.g. "cheaper to rent than build"
  modelled?: boolean; // the proposer flags a CTRL derivation (not a verbatim source figure)
}

export interface EvidenceLite {
  id?: string | null;
  excerpt?: string | null;
}

export interface Reaction {
  value: string;
  descriptor: string;
  kind: 'sourced' | 'modelled';
  evidence_id: string | null; // the source it was lifted from (sourced only)
}

// Short reaction values only - the hero number is a glance, not a figure dump.
export const VALUE_MAX_LEN = 8;

// The numeric core of a short value, comma-stripped: "~40%" -> "40", "10x" -> "10",
// "$2.5M" -> "2.5", "3,200" -> "3200". null if the value carries no number (=> words lead).
export function numericCore(value: string): string | null {
  const m = value.match(/\d[\d,.]*\d|\d/);
  return m ? m[0].replace(/,/g, '') : null;
}

// Does the value's numeric core appear in any evidence excerpt? Returns the source.
export function findInEvidence(value: string, evidence: EvidenceLite[]): EvidenceLite | null {
  const core = numericCore(value);
  if (!core) return null;
  for (const e of evidence) {
    if (!e.excerpt) continue;
    if (e.excerpt.replace(/,/g, '').includes(core)) return e;
  }
  return null;
}

// Is the claim quantitatively grounded - does ANY excerpt carry a figure? A modelled
// (derived) magnitude is only honest on a claim that has real numbers to derive from;
// this blocks a modelled figure on a purely-qualitative claim (sanctity guard).
export function hasNumericEvidence(evidence: EvidenceLite[]): boolean {
  return evidence.some((e) => !!e.excerpt && /\d/.test(e.excerpt));
}

/**
 * THE GATE. Validate a proposed reaction against its evidence. Returns a Reaction
 * only if it is sourced or an explicit modelled derivation; otherwise null (the
 * surface leads with words). Pure + deterministic - the honesty guarantee lives here,
 * not in the LLM.
 */
export function gateReaction(
  candidate: ReactionCandidate | null | undefined,
  evidence: EvidenceLite[],
): Reaction | null {
  if (!candidate) return null;
  const value = candidate.value?.trim();
  const descriptor = candidate.descriptor?.trim();
  if (!value || !descriptor) return null;
  if (value.length > VALUE_MAX_LEN) return null; // budget
  if (!numericCore(value)) return null; // no number => words lead, not a "number"

  const src = findInEvidence(value, evidence);
  if (src) return { value, descriptor, kind: 'sourced', evidence_id: src.id ?? null };
  // A modelled (derived) magnitude is allowed only on a quantitatively-grounded claim,
  // and renders with the 'est.' mark so it never reads as measured.
  if (candidate.modelled && hasNumericEvidence(evidence)) return { value, descriptor, kind: 'modelled', evidence_id: null };
  return null; // invented / ungrounded figure -> rejected, hero leads with words
}

// The soft-number mark the UI shows beside the value. A sourced figure stands clean;
// only a modelled derivation is marked (so an estimate never reads as measured).
export function reactionKindMark(kind: Reaction['kind']): string {
  return kind === 'modelled' ? 'est.' : '';
}
