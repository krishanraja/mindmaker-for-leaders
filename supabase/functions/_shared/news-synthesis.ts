/**
 * news-synthesis - the optional "why it matters to an AI-native operator" layer.
 *
 * After clustering picks the final stories, ONE batched OpenAI call writes a
 * single grounded operator read per story. This is best-effort: on any failure
 * (no key, timeout, bad JSON) the caller falls back to the article's own snippet,
 * so the feed never depends on the LLM and never blocks.
 *
 * Honesty rule (baked into the prompt): ground every line in the supplied
 * headline + snippet; never invent facts, numbers, or quotes. If unsure, restate
 * the headline plainly. This keeps CTRL's chief-of-staff voice without
 * fabrication.
 */

export interface SynthInput {
  id: string;
  headline: string;
  snippet: string;
  category: string;
  sourceCount: number;
}

const OPENAI_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT =
  "You are CTRL, an AI-native chief of staff for a busy business leader who may " +
  "have forgotten the context. For each AI news story, write ONE line (MAX 16 " +
  "words) that delivers the value in under two seconds of reading. " +
  "RULES: " +
  "1. Lead with the SO-WHAT for an operator, not a recap of the headline. Start " +
  "with the concrete takeaway (e.g. 'You can now...', 'Cheaper to...', 'Watch: " +
  "...', 'New option for...'). " +
  "2. Be specific and practical - name the concrete thing that changed and what " +
  "they could DO about it. No vague phrases like 'highlights the importance of' " +
  "or 'underscores the need to'. " +
  "3. Plain words, no hype, no jargon, no em dashes. " +
  "4. GROUND it strictly in the headline and snippet: never invent facts, " +
  "numbers, dates, names, or quotes. If the snippet is thin, state plainly what " +
  "the headline means for them. " +
  'Reply ONLY with JSON: {"reads":[{"id":"<id>","say":"<one line>"}]}.';

/**
 * Returns a map of story id -> one-line operator read. Empty map on any failure;
 * the caller should fall back to the snippet for missing ids.
 */
export async function synthesizeReads(
  apiKey: string | undefined,
  items: SynthInput[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
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
    const parsed = JSON.parse(content) as { reads?: Array<{ id?: string; say?: string }> };
    if (!Array.isArray(parsed?.reads)) return out;
    for (const r of parsed.reads) {
      if (typeof r?.id === "string" && typeof r?.say === "string" && r.say.trim()) {
        out.set(r.id, r.say.trim());
      }
    }
    return out;
  } catch {
    return out;
  } finally {
    clearTimeout(timer);
  }
}
