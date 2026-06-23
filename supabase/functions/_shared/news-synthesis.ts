/**
 * news-synthesis - the editorial layer for the Home feed.
 *
 * After clustering picks the final stories, ONE batched OpenAI call does two
 * things per story, so the feed reads like a consistently-edited news app
 * rather than a wall of raw RSS titles:
 *   - headline: rewrites the outlet's title into a sharp, uniform NEWS headline
 *     (real headlines are often dull, factual, or badly written; a consistent
 *     editorial voice guarantees resonance + fit).
 *   - say: one grounded "why it matters to an AI-native operator" line.
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

export interface SynthInput {
  id: string;
  headline: string;
  snippet: string;
  category: string;
  sourceCount: number;
}

export interface SynthRead {
  headline?: string;
  say?: string;
}

const OPENAI_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT =
  "You are the news editor for CTRL, an AI-native chief of staff for a busy " +
  "business leader. For each story you get the original outlet title + snippet. " +
  "Produce TWO fields:\n" +
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
  "GROUND both fields strictly in the supplied title + snippet: NEVER invent or " +
  "change a fact, number, date, company, model name, or quote. When the snippet " +
  "is thin, stay conservative and factual.\n" +
  'Reply ONLY with JSON: {"reads":[{"id":"<id>","headline":"<headline>","say":"<line>"}]}.';

/**
 * Returns a map of story id -> { headline, say }. Empty map on any failure; the
 * caller should fall back to the cleaned title + snippet for missing ids.
 */
export async function synthesizeReads(
  apiKey: string | undefined,
  items: SynthInput[],
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ stories: userPayload }) },
        ],
      }),
    });
    if (!res.ok) return out;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return out;
    const parsed = JSON.parse(content) as {
      reads?: Array<{ id?: string; headline?: string; say?: string }>;
    };
    if (!Array.isArray(parsed?.reads)) return out;
    for (const r of parsed.reads) {
      if (typeof r?.id !== "string") continue;
      const read: SynthRead = {};
      if (typeof r.headline === "string" && r.headline.trim()) read.headline = r.headline.trim();
      if (typeof r.say === "string" && r.say.trim()) read.say = r.say.trim();
      if (read.headline || read.say) out.set(r.id, read);
    }
    return out;
  } catch {
    return out;
  } finally {
    clearTimeout(timer);
  }
}
