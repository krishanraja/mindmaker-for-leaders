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
import { ONBOARDING_LANE_LABELS, strongestOnboardingLane } from "../_shared/onboarding-lens.ts";

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
      const lane = strongestOnboardingLane({ q5: String((row as { q5_decision?: string }).q5_decision ?? "") });
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
      label: ONBOARDING_LANE_LABELS[lane] ?? lane,
      count,
      share: total ? Math.round((count / total) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return json({ ok: true, since, total, lanes });
});
