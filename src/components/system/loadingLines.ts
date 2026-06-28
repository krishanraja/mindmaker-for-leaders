// loadingLines - what the GlobeLoader cycles through while Home warms up.
//
// The brief: stop wasting the loading moment. Instead of one static
// "Curating what you need to know in AI today", rotate short lines that start
// adding value the instant the globe appears. Three flavours, blended:
//   1. AI_FLUENCY_LINES - evergreen coaching one-liners grounded in the
//      project's AI-native theory (orchestration is the moat, hand off don't
//      prompt, the nine lanes). Bundled, no network, always work.
//   2. DURABLE_TRENDS - a few "true for months, not days" orientation lines
//      (cost curve falling, agents as a discipline, software repricing around
//      capability). Calm, authoritative; mirrors coldDeck.ts voice.
//   3. cached real headlines - the actual cards from the LAST loaded feed
//      (written to localStorage by useCockpit), so loading previews real
//      stories on a repeat visit. First-ever load has none and falls back to
//      the evergreen lines, so the moment is never empty.
//
// Conventions: plain language, no em dashes, AI-native lens (CLAUDE.md).
// buildLoadingLines is pure + unit-testable (headlines can be injected).

const LS_KEY = 'ctrl_last_headlines';
const MAX_CACHED = 6;
const MAX_LINE = 72;

// Evergreen AI-fluency one-liners. Mindset, not news: what a leader should hold
// in their head to stay across the shift. Grounded in the docs' frameworks.
export const AI_FLUENCY_LINES: readonly string[] = [
  "The edge isn't a better model; it's the work you've wired it into.",
  'Fluency is knowing what to hand off, not how to prompt.',
  'Read the shift weekly. You do not need to read it daily.',
  'Every workaround you built for old limits is worth re-checking.',
  'Orchestration beats raw capability. The wiring is the moat.',
  'Ask what an agent could own end to end, not just assist with.',
  'A demo is a model. A system is evals, guardrails and clean hand-offs.',
  'Track the few moves that change what you can build, not every release.',
  'The question is never "can AI do this", it is "what do I hand it first".',
];

// Durable orientation lines: the handful of shifts that stay true for months.
export const DURABLE_TRENDS: readonly string[] = [
  'The cost of capable AI keeps falling. Re-open what you shelved on price.',
  'Agent reliability is becoming an engineering discipline, not a prompt.',
  'Software is repricing itself around the AI capability, not the seat.',
];

/** Read the headlines cached from the last loaded feed (best-effort). */
export function readCachedHeadlines(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .slice(0, MAX_CACHED);
  } catch {
    return [];
  }
}

/** Persist the freshly-loaded headlines so the NEXT load can preview them. */
export function cacheHeadlines(headlines: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const clean = headlines.map((h) => h.trim()).filter(Boolean).slice(0, MAX_CACHED);
    if (clean.length) localStorage.setItem(LS_KEY, JSON.stringify(clean));
  } catch {
    /* ignore - the loader just falls back to evergreen lines */
  }
}

/** Tidy a headline for the uppercase caption (collapse whitespace, cap length). */
function frameHeadline(h: string): string {
  const t = h.trim().replace(/\s+/g, ' ');
  return t.length > MAX_LINE ? `${t.slice(0, MAX_LINE - 1).trimEnd()}…` : t;
}

export interface BuildLoadingLinesOpts {
  /** Real headlines to interleave; defaults to the localStorage cache. */
  headlines?: string[];
}

/**
 * Compose the loading rotation. Always opens with the evergreen orientation
 * lines (so the first frame adds value with zero dependency on a prior load),
 * then interleaves any cached real headlines so the rotation previews real
 * stories too. Returns at least the evergreen set; never empty.
 */
export function buildLoadingLines(opts: BuildLoadingLinesOpts = {}): string[] {
  const headlines = (opts.headlines ?? readCachedHeadlines()).map(frameHeadline).filter(Boolean);

  // Orientation = durable trends first (the strongest "stay across it" lines),
  // then the fluency coaching lines.
  const orientation = [...DURABLE_TRENDS, ...AI_FLUENCY_LINES];
  if (headlines.length === 0) return orientation;

  // Interleave: an orientation line, then a real headline, alternating, so the
  // leader gets both mindset and a preview of what is actually waiting.
  const out: string[] = [];
  const max = Math.max(orientation.length, headlines.length);
  for (let i = 0; i < max; i++) {
    if (i < orientation.length) out.push(orientation[i]);
    if (i < headlines.length) out.push(headlines[i]);
  }
  return out;
}
