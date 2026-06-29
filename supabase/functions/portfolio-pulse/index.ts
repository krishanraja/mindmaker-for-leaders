// The "State of the AI-Native Leader" - the portfolio hive mind's aggregate.
//
// Reads the anxieties leaders have admitted at the top of the funnel (Make Your
// Mind Up's q5, "the decision you keep not making") and the consented handoffs,
// CATEGORISES each into one of the nine AI-native lanes SERVER-SIDE, and returns
// only the anonymised distribution - counts and shares, never a name, a company,
// or the raw q5 text. This is the cross-surface signal that no single product
// can see: what this cohort of leaders is actually grappling with right now.
//
// Internal-first (decision: build it to tilt curation now, expose it as a
// Mindmaker LIVE / Substack signal later). verify_jwt off: the payload carries
// no PII, and curation backends + a future public widget both consume it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=900" },
  });
}

// q5 keyword -> the AI-native lane(s) it implicates. Mirrors the MYMU reads
// ranker so the whole portfolio categorises anxiety the same way.
const KEYWORD_CATEGORY: Array<[RegExp, string[]]> = [
  [/\b(team|people|hire|hiring|headcount|staff|replace|replacing|layoff|reorg|restructure)\b/i, ["org", "orchestration"]],
  [/\b(tool|tools|stack|consolidat|software|platform)\b/i, ["tools"]],
  [/\b(build|buy|vendor|lock[- ]?in|cost|costs|price|pricing|budget|spend|roi|cheaper|expensive)\b/i, ["economics"]],
  [/\b(agent|agents|automat|workflow|autonomous|orchestrat|pipeline)\b/i, ["orchestration"]],
  [/\b(board|investor|positioning|narrative|fundrais|raise)\b/i, ["product", "proof"]],
  [/\b(supervis|govern|regulat|compliance|risk|safe|safety|legal|policy)\b/i, ["governance", "security"]],
  [/\b(breach|leak|attack|secur|jailbreak|injection)\b/i, ["security"]],
  [/\b(product|gtm|go[- ]?to[- ]?market|launch|market|customer|sales|growth)\b/i, ["product"]],
  [/\b(model|models|gpt|claude|gemini|llm|capabilit|benchmark)\b/i, ["model"]],
  [/\b(deploy|production|proof|case stud|outcome)\b/i, ["proof"]],
];

const LANE_LABEL: Record<string, string> = {
  model: "Which models to bet on",
  economics: "Build-vs-buy and AI cost",
  tools: "Which AI tools to standardise on",
  orchestration: "Wiring agents into the work",
  product: "Rebuilding go-to-market with AI",
  governance: "Policy and guardrails",
  security: "AI security exposure",
  org: "Team and headcount under AI",
  proof: "Proving AI pays off",
};

function laneFor(q5: string): string | null {
  for (const [re, lanes] of KEYWORD_CATEGORY) if (re.test(q5)) return lanes[0];
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const counts: Record<string, number> = {};
  let total = 0;

  try {
    // Raw q5 is read server-side and categorised in memory; only counts leave.
    const { data } = await supabase
      .from("cannes_responses")
      .select("q5_decision")
      .gte("created_at", since)
      .not("q5_decision", "is", null)
      .limit(5000);
    for (const row of data ?? []) {
      const lane = laneFor(String((row as { q5_decision?: string }).q5_decision ?? ""));
      if (!lane) continue;
      counts[lane] = (counts[lane] ?? 0) + 1;
      total++;
    }
  } catch {
    /* fall through with whatever we have */
  }

  const lanes = Object.entries(counts)
    .map(([lane, count]) => ({
      lane,
      label: LANE_LABEL[lane] ?? lane,
      count,
      share: total ? Math.round((count / total) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return json({ ok: true, since, total, lanes });
});
