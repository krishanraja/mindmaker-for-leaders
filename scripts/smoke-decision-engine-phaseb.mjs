// Phase B smoke test: verifies (1) the Edge Pro path runs cross-examination and
// completes, and (2) the free monthly cap returns upgrade_required.
// Requires SUPABASE_ACCESS_TOKEN (sbp_).
import { setTimeout as sleep } from "node:timers/promises";

const REF = "bkyuxvschuwngtcdhsyg";
const URL = `https://${REF}.supabase.co`;
const FN = `${URL}/functions/v1/decision-engine`;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error("Missing SUPABASE_ACCESS_TOKEN"); process.exit(1); }

const mgmt = async (path, init = {}) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`mgmt ${path} -> ${r.status}: ${await r.text()}`);
  return r.json();
};
const dbq = (query) => mgmt(`/database/query`, { method: "POST", body: JSON.stringify({ query }) });

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon").api_key;
const service = keys.find((k) => k.name === "service_role").api_key;
const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

async function makeUser(tag) {
  const email = `smoke-${tag}-${Date.now()}@example.com`;
  const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);
  const r = await (await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service)).json();
  const signin = await (await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })).json();
  return { id: r.id, jwt: signin.access_token };
}
async function delUser(id) {
  await dbq(`delete from public.edge_subscriptions where user_id = '${id}';`);
  await auth(`admin/users/${id}`, { method: "DELETE" }, service);
}

// ---- 1. PRO PATH: cross-examination runs ----
const pro = await makeUser("pro");
console.log("pro user:", pro.id);
try {
  await dbq(`insert into public.edge_subscriptions (user_id, status) values ('${pro.id}', 'active');`);
  const inv = await (await fetch(FN, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${pro.jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ statement: "We should switch our primary AI vendor to cut inference costs by 40 percent, because our margins are too thin and a competitor already did it.", source: "advisor" }),
  })).json();
  console.log("pro invoke ->", JSON.stringify(inv));
  const caseId = inv.case_id;
  const stagesSeen = new Set();
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const rows = await dbq(`select stage, confidence from public.decision_cases where id = '${caseId}'`);
    const stage = rows[0]?.stage;
    stagesSeen.add(stage);
    process.stdout.write(`  [${i}] ${stage}\n`);
    if (stage === "complete" || stage === "error") { console.log("final:", JSON.stringify(rows[0])); break; }
  }
  console.log("stages seen:", [...stagesSeen].join(" -> "));
  console.log("cross_examining ran:", stagesSeen.has("cross_examining"));
  const tens = await dbq(`select kind, left(description,90) as description from public.decision_tensions where decision_case_id = '${caseId}'`);
  console.log("tensions:", JSON.stringify(tens, null, 2));
} finally {
  await delUser(pro.id);
  console.log("cleaned pro user");
}

// ---- 2. FREE CAP: upgrade_required after 3 cases ----
const free = await makeUser("free");
console.log("\nfree user:", free.id);
try {
  // Seed 3 dummy cases this month (no LLM cost).
  await dbq(`insert into public.decision_cases (user_id, statement, stage, status) values
    ('${free.id}', 'dummy 1', 'complete', 'active'),
    ('${free.id}', 'dummy 2', 'complete', 'active'),
    ('${free.id}', 'dummy 3', 'complete', 'active');`);
  const inv = await (await fetch(FN, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${free.jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ statement: "Should we hire a VP of Sales now or promote from within?", source: "advisor" }),
  })).json();
  console.log("free invoke ->", JSON.stringify(inv));
  console.log("upgrade gate fired:", inv.upgrade_required === true);
} finally {
  await delUser(free.id);
  console.log("cleaned free user");
}
