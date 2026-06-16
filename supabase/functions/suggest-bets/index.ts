// suggest-bets: propose the candidate DECISIONS a leader likely faces, grounded
// strictly in their own captured facts (user_memory / Memory Web projection).
//
// POST {}  ->  { bets: [{ statement, rationale }] }   (0 to 5 items)
//
// Used by the onboarding "draft cockpit" step: after the Memory Web blooms, the
// leader is shown a chip-rail of proposed bets they can Keep / Swap / Not mine.
// HONESTY: every bet must trace to something the leader actually told us. If we
// have no real signal to ground a decision on, we return an empty list rather
// than invent plausible-sounding bets. Fewer is fine; fabricated is not.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { getUserContext, type UserContext } from "../_shared/user-context.ts";
import { reason, parseLLMJson } from "./llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

interface SuggestedBet {
  statement: string;
  rationale: string;
}

const SYSTEM = `You help senior leaders name the real decisions they are weighing right now.
You are given ONLY the facts a specific leader has told us about themselves: their role, company, industry, stated objectives, known blockers, recent decisions, and behavioural patterns. Nothing else is known about them.

Your job: propose 3 to 5 candidate DECISIONS (open bets) this leader most likely faces, each drawn directly from the facts provided.

Hard rules:
- Ground every bet in a specific fact above. If a bet does not trace to a stated objective, blocker, recent decision, or their role/company/industry, do not include it.
- A bet is a real, weighable decision the leader could act on, phrased as a first-person call they are deciding (for example "Whether to move our top engineer onto the new product line" or "Whether to raise now or wait two quarters"). Not a task, not a goal, not generic advice.
- The rationale is one short sentence naming the exact fact the bet is drawn from. Be specific; quote or paraphrase the fact.
- If the facts are too thin to ground even one honest bet, return an empty array. Fewer is always better than invented. Never pad to reach a count.
- No em dashes anywhere. Use hyphens, semicolons, or parentheses.
- Return ONLY valid JSON. No commentary, no markdown.`;

/** Build the honest, facts-only context block. Returns null if there is not
 *  enough real signal to ground any decision (no objectives, blockers, recent
 *  decisions, and no usable identity beyond defaults). */
function buildFactsBlock(ctx: UserContext): string | null {
  const lines: string[] = [];
  const hasRole = ctx.role && ctx.role !== "executive";
  if (hasRole) lines.push(`Role: ${ctx.role}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.industry) lines.push(`Industry: ${ctx.industry}`);
  if (ctx.teamSize) lines.push(`Team size: ${ctx.teamSize}`);
  if (ctx.objectives.length) lines.push(`Stated objectives: ${ctx.objectives.join("; ")}`);
  if (ctx.blockers.length) lines.push(`Known blockers: ${ctx.blockers.join("; ")}`);
  if (ctx.recentDecisions.length) lines.push(`Recent decisions: ${ctx.recentDecisions.join("; ")}`);
  if (ctx.activeMissions.length) lines.push(`Active missions: ${ctx.activeMissions.join("; ")}`);
  if (ctx.confirmedPatterns.length) lines.push(`Behavioural patterns: ${ctx.confirmedPatterns.join("; ")}`);
  if (ctx.watchingCompanies.length) lines.push(`Watching: ${ctx.watchingCompanies.join("; ")}`);

  // The decision-bearing signals. Without at least one of these (or a concrete
  // role+company/industry), there is nothing honest to draw a bet from.
  const hasDecisionSignal =
    ctx.objectives.length > 0 ||
    ctx.blockers.length > 0 ||
    ctx.recentDecisions.length > 0 ||
    ctx.activeMissions.length > 0 ||
    (hasRole && (Boolean(ctx.company) || Boolean(ctx.industry)));

  if (!hasDecisionSignal) return null;
  return lines.join("\n");
}

function normaliseBets(raw: unknown): SuggestedBet[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { bets?: unknown })?.bets)
      ? (raw as { bets: unknown[] }).bets
      : [];
  return arr
    .map((b) => {
      const o = b as { statement?: unknown; rationale?: unknown };
      const statement = typeof o.statement === "string" ? o.statement.trim() : "";
      const rationale = typeof o.rationale === "string" ? o.rationale.trim() : "";
      return { statement: statement.slice(0, 280), rationale: rationale.slice(0, 280) };
    })
    .filter((b) => b.statement.length >= 8)
    .slice(0, 5);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("suggest-bets");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      throw new Error("Database configuration error (unexpected project).");
    }

    // Auth via the caller's JWT.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    // Service-role client to load the full Memory Web projection (the same
    // six-table context the briefing/decision engine grounds on).
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const ctx = await getUserContext(admin, userId);

    const factsBlock = buildFactsBlock(ctx);
    // Honest empty state: not enough captured signal to ground a single bet.
    if (!factsBlock) {
      log.info("no decision signal in facts; returning empty bets", { userId });
      return json({ bets: [] });
    }

    const user = `Here are the only facts this leader has told us:
${factsBlock}

Return JSON exactly in this shape:
{
  "bets": [
    { "statement": "Whether to ... (a real decision drawn from a fact above)", "rationale": "one sentence naming the exact fact this is drawn from" }
  ]
}
Propose 3 to 5 bets if the facts support them; fewer (even zero) is correct if they do not. Never invent a bet that does not trace to a fact above.`;

    let bets: SuggestedBet[] = [];
    try {
      const rawText = await reason(SYSTEM, user, 1500);
      bets = normaliseBets(parseLLMJson<unknown>(rawText));
    } catch (e) {
      // A model failure is not a reason to fabricate. Surface an honest empty
      // set so the UI can show the words-led state rather than fake bets.
      log.warn("reason() failed; returning empty bets", { error: e instanceof Error ? e.message : String(e) });
      return json({ bets: [] });
    }

    log.info("suggested bets", { userId, count: bets.length });
    return json({ bets });
  } catch (e) {
    log.error("suggest-bets handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
