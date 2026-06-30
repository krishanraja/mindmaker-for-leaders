/**
 * evidence-keypoint - the one-line distiller for decision evidence.
 *
 * The Decisions tab used to show each source as a full block paragraph of raw article text.
 * This batched pass turns each source into ONE line - the single key stat, fact, or opinion in
 * it that bears on the decision - so the leader can scan "what this is based on" instead of
 * reading walls of excerpt. The full excerpt stays one tap away (the "interrogate" reveal), so
 * nothing is hidden, just folded.
 *
 * Best-effort: on any failure (no key, timeout, bad JSON) the caller falls back to a
 * deterministic first-clause of the excerpt, so the feature never blocks and never depends on
 * the LLM.
 *
 * Honesty rule (baked into the prompt): the line is GROUNDED strictly in the supplied title +
 * excerpt; it never invents a number, date, company, model, or quote. It distils, it never adds.
 */

export interface KeyPointInput {
  id: string;
  title: string;
  excerpt: string;
}

const OPENAI_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT =
  "You distil decision evidence for CTRL, an AI-native chief of staff for a busy business " +
  "leader. For each evidence snippet you get an id, a source title, and an excerpt. Write " +
  '"key_point": ONE line (MAX 18 words) stating the single key stat, fact, or opinion in the ' +
  "snippet that bears on a decision. Lead with the concrete so-what (a number, the finding, the " +
  "claim). Plain words, no hype, no marketing, no em dashes, no trailing punctuation, no leading " +
  "label-and-colon. GROUND it strictly in the supplied title + excerpt: NEVER invent or change a " +
  "number, date, company, model name, or quote. If the snippet is thin, restate its one concrete " +
  "point plainly.\n" +
  'Reply ONLY with JSON: {"points":[{"id":"<id>","key_point":"<line>"}]}.';

/**
 * Returns a map of evidence id -> key_point. Empty map on any failure; the caller should fall
 * back to a deterministic first-clause of the excerpt for missing ids.
 */
export async function distillKeyPoints(
  apiKey: string | undefined,
  items: KeyPointInput[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!apiKey || items.length === 0) return out;

  const userPayload = items.map((i) => ({
    id: i.id,
    title: (i.title ?? "").slice(0, 160),
    excerpt: (i.excerpt ?? "").slice(0, 360),
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
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ evidence: userPayload }) },
        ],
      }),
    });
    if (!res.ok) return out;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return out;
    const parsed = JSON.parse(content) as { points?: Array<{ id?: string; key_point?: string }> };
    if (!Array.isArray(parsed?.points)) return out;
    for (const p of parsed.points) {
      if (typeof p?.id !== "string") continue;
      if (typeof p.key_point === "string" && p.key_point.trim()) {
        out.set(p.id, p.key_point.trim().slice(0, 160));
      }
    }
    return out;
  } catch {
    return out;
  } finally {
    clearTimeout(timer);
  }
}
