/**
 * peer-corpus: the "someone else wrote this" items in a sort deck.
 *
 * ===========================================================================
 * CONSENT RULE. Not negotiable, and it is the reason this file exists (CH-11).
 * ===========================================================================
 *
 *   Never another customer's work. Never a managed client's artefact. Never
 *   anything anyone pasted into CTRL. Every entry is writing its author
 *   PUBLISHED IN PUBLIC under their own name, reproduced short and attributed,
 *   with a source_url a reader can open and check.
 *
 * The original spec named an `origin = 'peer'` class with no stated source and
 * no consent path, while two of ten held-out items were peer, so a fifth of the
 * number the product calls earned rested on a corpus that could not honestly be
 * assembled. CH-11's ruling: define the source before Phase 2, or drop the
 * class. The source is defined here. Public attributed sector writing needs no
 * consent because it was already published, and it satisfies source_label
 * because the author is named.
 *
 * ===========================================================================
 * WHY THE SHELVES BELOW ARE EMPTY, AND WHAT THAT COSTS
 * ===========================================================================
 *
 * A peer item's whole value is that the person has no authorship relationship
 * to it. Model-written prose with a real person's name stamped on it is not a
 * peer item; it is a fabricated attribution, and it would corrupt the exact
 * measurement the class exists to make (real work by someone else is the only
 * thing that separates a standard from a style).
 *
 * So this module ships the machinery and the rule, and NO invented entries.
 * Curating real excerpts is a human act of judgement (which authors, which
 * posts, what length is fair to quote), and it is a one-file edit. Until it
 * happens, build-sort runs the deck WITHOUT peer items and records the
 * shortfall in harness_runs.stage_detail rather than padding, the same
 * discipline it applies when a person has fewer than six own artefacts.
 *
 * Effect while empty: 26 unique items instead of 30, and the hold-out is 6 pair
 * items + 2 own instead of + 2 peer. Both degrade honestly; nothing lies.
 *
 * ===========================================================================
 * ADDING AN ENTRY (the checklist)
 * ===========================================================================
 *
 *   1. The author published it publicly under their own name.
 *   2. You have the URL open in front of you and the text is copied from it,
 *      character for character. No paraphrase, no tidying, no composite.
 *   3. It is short: an excerpt you would be comfortable quoting in a blog post.
 *   4. It is genuinely on the surface it is filed under. An off-surface peer
 *      item measures the surface gap, not the person's standard.
 *   5. It contains no third party's private information.
 *
 * If you cannot link it, it does not belong here. If you are unsure whether the
 * excerpt is too long, it is too long.
 *
 * ===========================================================================
 * HONEST LIMIT, worth logging rather than hiding
 * ===========================================================================
 *
 * Public sector writing may sit further from the person's own surface than
 * their own work does, which would flatter the measured number inside their own
 * bubble. CH-11's test is to report held-out agreement split by item origin. If
 * the gate fails on peer items, this class carried real weight and deserves a
 * larger, per-sector corpus with a real sourcing budget.
 */

export interface PeerSample {
  /** The excerpt exactly as published. What the grader reads. */
  body: string;
  /** The author's name as they publish under it. */
  author: string;
  /** Public URL. Required: an entry without one cannot be checked. */
  source_url: string;
  /** The sort surface this sample belongs to. */
  surface: string;
}

/**
 * Surfaces the sort supports today. A sort on any other surface runs without
 * peer items rather than borrowing another surface's writing.
 */
export const PEER_SURFACES = ["client updates", "board updates", "linkedin posts"] as const;
export type PeerSurface = typeof PEER_SURFACES[number];

/** Target entries per surface once curation has happened (CH-11 / SORT_BUDGET.peer). */
export const PEER_TARGET_PER_SURFACE = 4;

/**
 * The shelves. Fill these with real excerpts per the checklist above.
 *
 * Template for an entry, kept as a comment so no placeholder can ever reach a
 * grader as if it were somebody's writing:
 *
 *   {
 *     body: "<the excerpt, copied character for character from the URL>",
 *     author: "<name as published>",
 *     source_url: "https://...",
 *     surface: "client updates",
 *   },
 */
const CLIENT_UPDATES: PeerSample[] = [];
const BOARD_UPDATES: PeerSample[] = [];
const LINKEDIN_POSTS: PeerSample[] = [];

const CORPUS: Record<PeerSurface, PeerSample[]> = {
  "client updates": CLIENT_UPDATES,
  "board updates": BOARD_UPDATES,
  "linkedin posts": LINKEDIN_POSTS,
};

/** Loose aliases, so a surface a person typed still finds its shelf. */
const ALIASES: Record<string, PeerSurface> = {
  "client update": "client updates",
  "client emails": "client updates",
  "client email": "client updates",
  "client status emails": "client updates",
  "client status email": "client updates",
  "status emails": "client updates",
  "board update": "board updates",
  "board memo": "board updates",
  "board memos": "board updates",
  "investor update": "board updates",
  "investor updates": "board updates",
  "linkedin post": "linkedin posts",
  "linkedin": "linkedin posts",
};

export function normalisePeerSurface(surface: string): PeerSurface | null {
  const key = (surface ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  if (key in CORPUS) return key as PeerSurface;
  if (key in ALIASES) return ALIASES[key];
  return null;
}

/**
 * Up to `limit` public attributed samples for a surface. Returns [] for an
 * unsupported surface and [] while a shelf is uncurated. The caller reports the
 * shortfall; it never pads.
 */
export function peerSamplesForSurface(surface: string, limit = PEER_TARGET_PER_SURFACE): PeerSample[] {
  const key = normalisePeerSurface(surface);
  if (!key) return [];
  return CORPUS[key].slice(0, limit);
}

/** The sort_items.source_label value: named author plus the checkable link. */
export function peerSourceLabel(sample: PeerSample): string {
  return `${sample.author} (public: ${sample.source_url})`;
}

export interface PeerCorpusStatus {
  surface: string;
  /** null when the surface has no shelf at all. */
  resolvedSurface: PeerSurface | null;
  available: number;
  target: number;
  shortfall: number;
  /** True while the shelf is empty: the run proceeds without peer items. */
  awaitingCuration: boolean;
}

/** What build-sort writes into harness_runs.stage_detail, so the gap is visible. */
export function peerCorpusStatus(surface: string): PeerCorpusStatus {
  const resolvedSurface = normalisePeerSurface(surface);
  const available = resolvedSurface ? CORPUS[resolvedSurface].length : 0;
  return {
    surface,
    resolvedSurface,
    available,
    target: PEER_TARGET_PER_SURFACE,
    shortfall: Math.max(0, PEER_TARGET_PER_SURFACE - available),
    awaitingCuration: available === 0,
  };
}
