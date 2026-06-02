// Phase C smoke test: WATCH loop creates an alert on a flipped claim, and the
// Daily Briefing leads with it (audio preamble + leading segment).
// Requires SUPABASE_ACCESS_TOKEN (sbp_).
import { setTimeout as sleep } from "node:timers/promises";

const REF = "bkyuxvschuwngtcdhsyg";
const URL = `https://${REF}.supabase.co`;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error("Missing SUPABASE_ACCESS_TOKEN"); process.exit(1); }

const mgmt = async (path, init = {}) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`mgmt ${path} -> ${r.status}: ${await r.text()}`);
  return r.json();
};
const dbq = (q) => mgmt(`/database/query`, { method: "POST", body: JSON.stringify({ query: q }) });

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon").api_key;
const service = keys.find((k) => k.name === "service_role").api_key;
const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

const email = `smoke-watch-${Date.now()}@example.com`;
const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);
const created = await (await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service)).json();
const userId = created.id;
const jwt = (await (await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })).json()).access_token;
console.log("user:", userId);

try {
  // Seed a completed decision with a load-bearing factual claim stored as
  // "supported" but which re-verification will flip (the Moon myth).
  const caseRows = await dbq(`insert into public.decision_cases (user_id, statement, title, stage, status, last_verified_at)
    values ('${userId}', 'We can rely on the Great Wall being visible from the Moon for our brand campaign.', 'Great Wall campaign', 'complete', 'active', null)
    returning id;`);
  const caseId = caseRows[0].id;
  await dbq(`insert into public.decision_claims (decision_case_id, user_id, text, type, is_load_bearing, verdict, confidence)
    values ('${caseId}', '${userId}', 'The Great Wall of China is visible from the Moon with the naked eye.', 'factual', true, 'supported', 0.85);`);

  // 1. Run the WATCH loop.
  const watch = await (await fetch(`${URL}/functions/v1/decision-watch`, {
    method: "POST", headers: { Authorization: `Bearer ${service}`, "Content-Type": "application/json" }, body: "{}",
  })).json();
  console.log("watch ->", JSON.stringify(watch));

  const alerts = await dbq(`select kind, status, left(headline,70) as headline from public.decision_alerts where user_id = '${userId}'`);
  console.log("alerts:", JSON.stringify(alerts, null, 2));
  console.log("ALERT CREATED:", alerts.length >= 1);

  // Seed a profile past the sparse-profile guard (depth = interests + missions + decisions >= 5).
  await dbq(`insert into public.user_memory (user_id, fact_key, fact_category, fact_label, fact_value, confidence_score, verification_status, source_type, is_current) values
    ('${userId}','role','identity','Role','CEO',0.95,'verified','form',true),
    ('${userId}','industry','business','Industry','artificial intelligence',0.95,'verified','form',true);`);
  await dbq(`insert into public.briefing_interests (user_id, kind, text, weight, source, is_active) values
    ('${userId}','beat','AI model releases',1.0,'manual',true),
    ('${userId}','beat','enterprise software pricing',1.0,'manual',true),
    ('${userId}','beat','AI regulation',1.0,'manual',true),
    ('${userId}','entity','OpenAI',1.0,'manual',true),
    ('${userId}','entity','Anthropic',1.0,'manual',true);`);

  // 2. Generate a briefing and confirm it leads with the alert.
  console.log("generating briefing (this can take ~30-60s)...");
  const inv = await fetch(`${URL}/functions/v1/generate-briefing`, {
    method: "POST", headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }, body: JSON.stringify({ briefing_type: "default", force: true }),
  });
  console.log("generate-briefing status:", inv.status, "body:", (await inv.text()).slice(0, 200));

  let leads = false, preamble = false;
  for (let i = 0; i < 25; i++) {
    await sleep(3000);
    const rows = await dbq(`select script_text, segments from public.briefings where user_id = '${userId}' order by created_at desc limit 1`);
    const b = rows[0];
    if (b && b.script_text) {
      const seg0 = Array.isArray(b.segments) ? b.segments[0] : null;
      leads = seg0?.framework_tag === "DECISION ALERT";
      preamble = typeof b.script_text === "string" && b.script_text.startsWith("Before today's news");
      console.log(`  [${i}] script ready. leadSegment=DECISION ALERT? ${leads}. preamble? ${preamble}`);
      console.log("  script opens:", String(b.script_text).slice(0, 160));
      break;
    }
    process.stdout.write(`  [${i}] waiting for script...\n`);
  }

  const surfaced = await dbq(`select (surfaced_in_briefing_id is not null) as surfaced from public.decision_alerts where user_id = '${userId}'`);
  console.log("alert surfaced_in_briefing set:", JSON.stringify(surfaced));
  console.log("\nRESULT: alertCreated=" + (alerts.length >= 1) + " briefingLeadsWithAlert=" + leads + " audioPreamble=" + preamble);
} finally {
  await dbq(`delete from public.briefings where user_id = '${userId}';`);
  await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  console.log("cleaned up");
}
