/**
 * news-synthesis - the editorial layer for the Home feed.
 *
 * After clustering picks the final stories, ONE batched OpenAI call does four
 * things per story, so the feed reads like a consistently-edited news app
 * rather than a wall of raw RSS titles:
 *   - headline: rewrites the outlet's title into a sharp, uniform NEWS headline
 *     (real headlines are often dull, factual, or badly written; a consistent
 *     editorial voice guarantees resonance + fit).
 *   - say: one grounded "why it matters to an AI-native operator" line.
 *   - affects: the audience axis (which business divisions the story lands on),
 *     because the single `category` records the SUBJECT and the subject always
 *     wins; no keyword pass over a headline can tell the team you manage from
 *     a team of AI agents, but a classifier that has read the text can.
 *   - stance: what the story asks of a leader (opportunity/shift/risk/damage);
 *     "damage" items are dropped by the caller before caching.
 *
 * Best-effort: on any failure (no key, timeout, bad JSON) the caller falls back
 * to the cleaned original title + the snippet, so the feed never depends on the
 * LLM and never blocks.
 *
 * Honesty rule (baked into the prompt): both fields are GROUNDED strictly in the
 * supplied title + snippet; never invent a fact, number, company, or quote. The
 * rewrite tightens and clarifies, it never sensationalises or adds claims, and
 * the real article is one tap away.
 */

import type { EditorialLens } from "./editorial-lens.ts";

export interface SynthInput {
  id: string;
  headline: string;
  snippet: string;
  category: string;
  sourceCount: number;
}

/**
 * The audience axis: which parts of a business a story lands on. A story has a
 * subject (the existing `category`) AND an audience, and one field can only
 * record one of them; `affects` records the second. The eight identifiers are
 * an allowlist shared with a downstream lead-capture form and a database check
 * constraint on the consuming side: never invent, alias or pluralise them.
 */
export const AFFECTS_IDS = [
  "leadership",
  "sales",
  "marketing",
  "product",
  "engineering",
  "operations",
  "finance",
  "people",
] as const;
export type AffectsId = (typeof AFFECTS_IDS)[number];

/**
 * What a story asks of a leader. "damage" (it only reports harm and there is
 * no move in it) is a classification the pipeline uses to DROP the item before
 * caching; a served card never carries it.
 */
export const STANCE_IDS = ["opportunity", "shift", "risk", "damage"] as const;
export type StanceId = (typeof STANCE_IDS)[number];
export const DAMAGE_STANCE: StanceId = "damage";

// An item landing on six or more divisions is over-assigned: a filter that
// returns everything reads as broken. Two or three entries is typical.
const MAX_AFFECTS = 5;

/**
 * Validate a model-emitted `affects` value: keep only allowlisted identifiers
 * (trimmed, lowercased), deduped, in model order, capped at MAX_AFFECTS.
 * Returns undefined when the value is not an array at all (absent field), and
 * [] when the model genuinely answered "nobody in particular".
 */
export function sanitizeAffects(value: unknown): AffectsId[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: AffectsId[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const id = entry.trim().toLowerCase();
    if ((AFFECTS_IDS as readonly string[]).includes(id) && !out.includes(id as AffectsId)) {
      out.push(id as AffectsId);
      if (out.length >= MAX_AFFECTS) break;
    }
  }
  return out;
}

/** Validate a model-emitted `stance`: exactly one of STANCE_IDS or undefined. */
export function sanitizeStance(value: unknown): StanceId | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim().toLowerCase();
  return (STANCE_IDS as readonly string[]).includes(id) ? (id as StanceId) : undefined;
}

/**
 * The editorial rule: an item whose stance is "damage" only reports harm (a
 * redundancy round, a collapse, a shutdown) with no move in it for the reader,
 * and is never cached or served. An item with no stance at all is KEPT: the
 * classifier is best-effort and an unclassified pool must not go dark.
 */
export function dropDamage<T extends { stance?: string }>(cards: T[]): T[] {
  return cards.filter((c) => c.stance !== DAMAGE_STANCE);
}

export interface SynthRead {
  headline?: string;
  say?: string;
  /** Opinionated POV line. Only produced when an editorial lens is active. */
  pov?: string;
  /** Audience axis, validated against AFFECTS_IDS. [] is a real answer. */
  affects?: AffectsId[];
  /** What the story asks of a leader, validated against STANCE_IDS. */
  stance?: StanceId;
}

const OPENAI_TIMEOUT_MS = 20_000;

/**
 * The audience-axis field spec, numbered from `first` so the same wording
 * serves the full editorial prompt (fields 3 and 4) and the classify-only
 * backfill prompt (fields 1 and 2). The worked examples pin the exact failure
 * this axis exists to fix: the subject always wins the single `category`, so
 * "staff replaced by AI" filed under model never reached the people lane.
 */
function audienceFieldsSpec(first: number): string {
  return (
    `${first}. "affects": which parts of a business this story LANDS ON. Answer ` +
    '"whose week does this change?", NOT "what is this about?" (the category ' +
    "already answers that). A story ABOUT a model can still land on the humans: " +
    "staff being replaced by AI or a study on AI and entry-level jobs affects " +
    '"people"; a plan, accelerator or bet leaders must answer for affects ' +
    '"leadership"; a team of AI agents is a tool, not "people". An array of ZERO ' +
    "or more of EXACTLY these identifiers, lowercase, never invented, aliased or " +
    "pluralised: leadership, sales, marketing, product, engineering, operations, " +
    "finance, people. Be specific: two or three entries is typical, five is the " +
    "hard maximum, and a story that lands on everyone lands on no one. When it " +
    'lands on nobody in particular, "affects" is []: an empty array is a real ' +
    "answer, never pad it.\n" +
    `${first + 1}. "stance": what the story asks of a leader. Exactly ONE of ` +
    '"opportunity" (an opening to take), "shift" (something changed that has to ' +
    'be absorbed and worked with), "risk" (an exposure to manage), "damage" (it ' +
    "ONLY reports harm, a redundancy round or collapse or shutdown, and there is " +
    "no move in it for the reader). Bad news WITH an action attached is risk or " +
    "shift, not damage: entry-level hiring changing shape is a shift, a " +
    "credential-leak flaw in a popular framework is a risk, a bare layoff count " +
    "is damage. If the only honest read of an item is that it is bad, its stance " +
    "is damage.\n"
  );
}

const BASE_SYSTEM_PROMPT =
  "You are the news editor for CTRL, a calm and curious decision partner for a busy " +
  "business leader. For each story you get the original outlet title + snippet. " +
  "Produce FOUR fields:\n" +
  "1. \"headline\": Rewrite the title into a sharp, professional NEWS headline " +
  "(MAX 11 words). Present tense, active voice, specific and concrete; lead with " +
  "the subject and what happened. NO outlet/source name, no clickbait, no " +
  "questions, no leading label-and-colon, no trailing punctuation, no em dashes. " +
  "It must read like a clean wire-service headline and stay strictly TRUE to the " +
  "source. If the original is already strong, just tighten it.\n" +
  "2. \"say\": ONE line (MAX 16 words) on why it matters to an operator building, " +
  "orchestrating, productizing or getting to market the AI-native version of " +
  "their business. Lead with the concrete so-what; specific, practical, plain " +
  "words, no hype, no em dashes. VARY the opening across stories - do NOT start " +
  "every line with the same words (especially not 'You can now'); sometimes name " +
  "the shift, the number, the risk, or the move directly.\n" +
  audienceFieldsSpec(3) +
  "GROUND every field strictly in the supplied title + snippet: NEVER invent or " +
  "change a fact, number, date, company, model name, or quote. When the snippet " +
  "is thin, stay conservative and factual.\n";

const REPLY_SPEC_BASE =
  'Reply ONLY with JSON: {"reads":[{"id":"<id>","headline":"<headline>","say":"<line>","affects":["<division>"],"stance":"<stance>"}]}.';
const REPLY_SPEC_WITH_POV =
  'Reply ONLY with JSON: {"reads":[{"id":"<id>","headline":"<headline>","say":"<line>","affects":["<division>"],"stance":"<stance>","pov":"<line>"}]}.';

/**
 * The optional editorial-POV addendum, appended only when a lens is active.
 * The pov carries the same editorial law as stance: it must name something a
 * leader could do or stop doing, never bare doom.
 */
function lensAddendum(lens: EditorialLens): string {
  const calib = lens.exemplarPOVs.slice(0, 3).map((p) => `"${p}"`).join("; ");
  return (
    "You also hold a consistent editorial point of view.\n" +
    `Thesis: ${lens.thesis}\n` +
    "5. \"pov\": ONE sharp, opinionated line (MAX 18 words) reading THIS story " +
    "through that thesis, in the CTRL chief-of-staff voice - what it really means " +
    "for a leader building the AI-native version of their business, and what to do " +
    "or stop doing. Take a clear stance; push against the easy button and hype with " +
    "no shipped proof. Still GROUNDED strictly in the supplied title + snippet: " +
    "never invent a fact, number, company or quote. If the story does not speak to " +
    "the thesis, return \"pov\" as an empty string rather than forcing it. No em dashes.\n" +
    `Calibration POVs (match the register, never copy verbatim): ${calib}\n`
  );
}

function buildSystemPrompt(lens?: EditorialLens | null): string {
  if (!lens) return BASE_SYSTEM_PROMPT + REPLY_SPEC_BASE;
  return BASE_SYSTEM_PROMPT + lensAddendum(lens) + REPLY_SPEC_WITH_POV;
}

/**
 * Returns a map of story id -> { headline, say }. Empty map on any failure; the
 * caller should fall back to the cleaned title + snippet for missing ids.
 */
export async function synthesizeReads(
  apiKey: string | undefined,
  items: SynthInput[],
  lens?: EditorialLens | null,
): Promise<Map<string, SynthRead>> {
  const out = new Map<string, SynthRead>();
  if (!apiKey || items.length === 0) return out;

  const userPayload = items.map((i) => ({
    id: i.id,
    category: i.category,
    sources: i.sourceCount,
    headline: i.headline,
    snippet: i.snippet.slice(0, 280),
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(lens) },
          { role: "user", content: JSON.stringify({ stories: userPayload }) },
        ],
      }),
    });
    if (!res.ok) return out;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return out;
    const parsed = JSON.parse(content) as {
      reads?: Array<{ id?: string; headline?: string; say?: string; pov?: string; affects?: unknown; stance?: unknown }>;
    };
    if (!Array.isArray(parsed?.reads)) return out;
    for (const r of parsed.reads) {
      if (typeof r?.id !== "string") continue;
      const read: SynthRead = {};
      if (typeof r.headline === "string" && r.headline.trim()) read.headline = r.headline.trim();
      if (typeof r.say === "string" && r.say.trim()) read.say = r.say.trim();
      if (typeof r.pov === "string" && r.pov.trim()) read.pov = r.pov.trim();
      const affects = sanitizeAffects(r.affects);
      if (affects) read.affects = affects;
      const stance = sanitizeStance(r.stance);
      if (stance) read.stance = stance;
      if (read.headline || read.say || read.pov || read.affects || read.stance) out.set(r.id, read);
    }
    return out;
  } catch {
    return out;
  } finally {
    clearTimeout(timer);
  }
}

export interface AudienceInput {
  id: string;
  headline: string;
  snippet: string;
}

export interface AudienceRead {
  affects?: AffectsId[];
  stance?: StanceId;
}

const AUDIENCE_SYSTEM_PROMPT =
  "You classify daily AI-business news for CTRL, a decision partner for a busy " +
  "business leader. For each story you get the title + snippet. Judge from that " +
  "text only; never invent facts. Produce TWO fields:\n" +
  audienceFieldsSpec(1) +
  'Reply ONLY with JSON: {"reads":[{"id":"<id>","affects":["<division>"],"stance":"<stance>"}]}.';

/**
 * Classify affects + stance ONLY, for already-cached cards whose headline and
 * say must not be rewritten (the retained-days backfill). Same grounding, same
 * validation, same best-effort contract as synthesizeReads: empty map on any
 * failure, and a missing id simply stays unclassified.
 */
export async function classifyAudience(
  apiKey: string | undefined,
  items: AudienceInput[],
): Promise<Map<string, AudienceRead>> {
  const out = new Map<string, AudienceRead>();
  if (!apiKey || items.length === 0) return out;

  const userPayload = items.map((i) => ({
    id: i.id,
    headline: i.headline,
    snippet: i.snippet.slice(0, 280),
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: AUDIENCE_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ stories: userPayload }) },
        ],
      }),
    });
    if (!res.ok) return out;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return out;
    const parsed = JSON.parse(content) as {
      reads?: Array<{ id?: string; affects?: unknown; stance?: unknown }>;
    };
    if (!Array.isArray(parsed?.reads)) return out;
    for (const r of parsed.reads) {
      if (typeof r?.id !== "string") continue;
      const read: AudienceRead = {};
      const affects = sanitizeAffects(r.affects);
      if (affects) read.affects = affects;
      const stance = sanitizeStance(r.stance);
      if (stance) read.stance = stance;
      if (read.affects || read.stance) out.set(r.id, read);
    }
    return out;
  } catch {
    return out;
  } finally {
    clearTimeout(timer);
  }
}
