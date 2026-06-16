// Derive an HONEST "what just moved" read from a real Briefing, for the
// numerical-first briefing hero (mock: briefing-num.html).
//
// Cardinal rule: clearest-unit-first + NEVER fabricate a number.
// As of the stored-magnitude pass, segments now carry an honest, gated
// `magnitude` populated at GENERATION time (sourced = the numeric core is
// verbatim in the segment's evidence; modelled = an explicit estimate shown
// `est.`). We PREFER that stored figure: a sourced number stands clean (no
// mark), a modelled one keeps the `est.` mark. Only when no segment carries a
// stored magnitude do we fall back to the legacy read-time headline regex,
// which surfaces a short token (e.g. "10x", "-40%", "$2M") as a MODELLED read
// marked `est.` (a read of the move, never a measured quote). Either way we
// never invent a value the data does not contain; if neither exists the hero
// leads with WORDS (the strongest headline).
//
// The "rests on" mini-spine is the few segments the read draws from, each
// shown VISUALLY by its honest state (moved / only-you / thin / quiet),
// never as a wall of text.

import type { Briefing, BriefingSegment, FrameworkTag } from '@/types/briefing';

// The honest per-consideration state, read like the spine material.
export type ConsiderationState = 'moved' | 'you' | 'thin' | 'quiet';

export interface ReadConsideration {
  // a short label (the segment's subject in 1-2 words), wraps, never clipped
  label: string;
  state: ConsiderationState;
  tag: FrameworkTag;
}

// The magnitude the hero leads with. `kind` is the soft mark rendered beside the
// value: '' for a sourced (verbatim-grounded) figure, which stands clean; 'est.'
// for a modelled figure or a legacy headline-regex read, which must never read as
// measured.
export interface ReadMagnitude {
  value: string; // "10x" | "-40%" | "$2M"
  kind: 'est.' | '';
}

// The honest signal-state of the whole read (mirrors the bet board chips).
export type ReadState = 'countered' | 'explore' | 'quiet';

export interface BriefingRead {
  // the bet / question this read answers, in the leader's words (optional)
  bet?: string;
  betState: ReadState;
  // hero: a magnitude leads ONLY when one is honestly present; else words lead
  magnitude: ReadMagnitude | null;
  // the one-line "what moved" read (always present - the words read)
  headline: string;
  // a short supporting line under the hero (optional, never fabricated)
  sub?: string;
  // the few considerations the read rests on (visual mini-spine)
  considerations: ReadConsideration[];
  movedCount: number;
  youCount: number;
  // how many distinct sources fed the underlying briefing (for the deeper row)
  sourceCount: number;
  segmentCount: number;
}

// Matches a SHORT, self-contained magnitude token at a word boundary:
// a multiplier (10x), a signed percent (-40%, +12%), or money ($2M, $1.4bn).
// Deliberately strict so prose numbers ("in 2026", "3 vendors") don't qualify.
const MAGNITUDE_RE =
  /(?:^|\s)((?:[-+]?\$?\d[\d,.]*\s?(?:x|%|bn|m|k|b)\b)|(?:\$\d[\d,.]*\s?(?:bn|m|k|b)?))/i;

function extractMagnitude(text: string): string | null {
  const m = MAGNITUDE_RE.exec(text || '');
  if (!m) return null;
  const raw = m[1].trim();
  // keep it short - a hero number is <=6 chars or it isn't a clean unit
  return raw.length > 0 && raw.length <= 6 ? raw : null;
}

// Resolve the hero magnitude for the lead segment. PREFER the stored, gated
// segment.magnitude (sourced => clean mark, modelled => `est.`); only when none
// is stored do we fall back to the legacy read-time headline regex (marked
// `est.`, a read of the move). Returns null => the hero leads with words.
function magnitudeForLead(lead: BriefingSegment | undefined): ReadMagnitude | null {
  if (!lead) return null;
  const stored = lead.magnitude;
  if (stored && typeof stored.value === 'string' && stored.value.trim().length > 0) {
    return { value: stored.value.trim(), kind: stored.kind === 'modelled' ? 'est.' : '' };
  }
  const token = extractMagnitude(lead.headline);
  return token ? { value: token, kind: 'est.' } : null;
}

// Map a framework tag to the honest consideration state.
function stateForTag(seg: BriefingSegment): ConsiderationState {
  const anchor = (seg.matched_profile_fact ?? '').trim();
  if (anchor.length > 0) return 'you'; // rests on the leader's own input
  switch (seg.framework_tag) {
    case 'signal':
    case 'decision_trigger':
    case 'decision_alert':
      return 'moved';
    case 'noise':
      return 'quiet';
    case 'krishs_take':
    default:
      return 'thin';
  }
}

// The whole-read signal state, honest: an alert/trigger present => countered;
// a fresh signal => explore; otherwise quiet. Never a faked "validated".
function readState(segments: BriefingSegment[]): ReadState {
  if (segments.some((s) => s.framework_tag === 'decision_alert' || s.framework_tag === 'decision_trigger'))
    return 'countered';
  if (segments.some((s) => s.framework_tag === 'signal')) return 'explore';
  return 'quiet';
}

// A 1-2 word label for a consideration, from its anchor or headline subject.
function shortLabel(seg: BriefingSegment): string {
  const anchor = (seg.matched_profile_fact ?? '').trim();
  const src = anchor.length > 0 ? anchor : seg.headline || seg.source || '';
  // first 2 words, stripped of trailing punctuation
  const words = src.split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
  return words.replace(/[.,;:]+$/, '') || 'Signal';
}

// Rank segments so the strongest market read leads the hero.
const TAG_RANK: Record<FrameworkTag, number> = {
  decision_alert: 0,
  decision_trigger: 1,
  signal: 2,
  krishs_take: 3,
  noise: 4,
};

export function deriveBriefingRead(briefing: Briefing): BriefingRead {
  const segments = (briefing.segments ?? []).filter(Boolean);

  const ranked = [...segments].sort((a, b) => {
    const r = (TAG_RANK[a.framework_tag] ?? 9) - (TAG_RANK[b.framework_tag] ?? 9);
    if (r !== 0) return r;
    return (b.relevance_score ?? 0) - (a.relevance_score ?? 0);
  });

  const lead = ranked[0];
  const headline = lead?.headline?.trim() || 'Your read is ready';
  // The bet/question this read answers, in the leader's own words. Set ONLY when
  // the lead segment is decision-linked (prependDecisionAlerts stamped a real
  // decision_statement from the open alert's decision_case). When no
  // decision-linked segment leads, bet stays undefined and the hero shows no
  // bet line - the honest empty state.
  const betStatement = lead?.decision_statement?.trim();
  const bet = betStatement && betStatement.length > 0 ? betStatement : undefined;
  // a magnitude leads only when one is honestly present: prefer the stored,
  // gated segment.magnitude, else fall back to the headline regex.
  const magnitude: ReadMagnitude | null = magnitudeForLead(lead);
  // if a number leads, the words move to the sub-line so the hero stays clean
  const sub = magnitude ? headline : lead?.relevance_reason?.trim() || undefined;

  // the considerations the read rests on: the few distinct segments, visual.
  // Cap at 5 so the spine stays a calm strip, not a wall.
  const considerations: ReadConsideration[] = ranked.slice(0, 5).map((seg) => ({
    label: shortLabel(seg),
    state: stateForTag(seg),
    tag: seg.framework_tag,
  }));

  const movedCount = considerations.filter((c) => c.state === 'moved').length;
  const youCount = considerations.filter((c) => c.state === 'you').length;

  const sources = new Set<string>();
  for (const s of segments) {
    const src = (s.source ?? '').trim();
    if (src) sources.add(src.toLowerCase());
  }

  return {
    bet,
    betState: readState(segments),
    magnitude,
    headline: magnitude ? (lead?.headline?.trim() || headline) : headline,
    sub,
    considerations,
    movedCount,
    youCount,
    sourceCount: sources.size,
    segmentCount: segments.length,
  };
}
