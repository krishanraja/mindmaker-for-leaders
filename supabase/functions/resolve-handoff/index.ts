// Portfolio hive mind - the warm-handoff CONSUMER (CTRL side).
//
// When a leader arrives from Make Your Mind Up with `?h=<token>`, CTRL resolves
// the consented `portfolio_handoff` row into the CATEGORISED signal it can use
// to start warm: stage a "here's what I already know - confirm?" onboarding and
// seed an inferred blocker fact from the anxiety lane. The raw q5 never existed
// in the handoff, so it cannot leak here. One-time-ish: the row is marked
// consumed on read. Called from CTRL's authed onboarding, so verify_jwt stays on.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const token = body?.token?.trim();
  if (!token) return json({ error: "missing token" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: row, error } = await supabase
    .from("portfolio_handoff")
    .select(
      "entry_variant, q2, q4, anxiety_lane, company_domain, archetype_title, source, consumed_at, expires_at, person_name, role_title, linkedin_url, company_name, company_summary, company_logo_url, company_signals, dossier_strength, dossier_confirmed_at",
    )
    .eq("id", token)
    .single();

  if (error || !row) return json({ ok: false, reason: "not_found" });
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return json({ ok: false, reason: "expired" });
  }

  // Best-effort mark-consumed (read is idempotent; the UI stages a confirmation
  // either way, so a double-read is harmless).
  await supabase
    .from("portfolio_handoff")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", token);

  return json({
    ok: true,
    signal: {
      entryVariant: row.entry_variant,
      q2: row.q2,
      q4: row.q4,
      anxietyLane: row.anxiety_lane,
      companyDomain: row.company_domain,
      archetypeTitle: row.archetype_title,
      source: row.source,
      personName: row.person_name,
      roleTitle: row.role_title,
      linkedinUrl: row.linkedin_url,
      companyName: row.company_name,
      companySummary: row.company_summary,
      companyLogoUrl: row.company_logo_url,
      companySignals: row.company_signals,
      dossierStrength: row.dossier_strength,
      dossierConfirmedAt: row.dossier_confirmed_at,
    },
  });
});
