// End-to-end smoke test for the decision-engine edge function.
// Creates a throwaway user, invokes the function with a real JWT, polls the
// case through its stages, prints the result, then deletes the user (cascades).
// Requires SUPABASE_ACCESS_TOKEN (sbp_) in env.
import { setTimeout as sleep } from "node:timers/promises";

const REF = "bkyuxvschuwngtcdhsyg";
const URL = `https://${REF}.supabase.co`;
const FN = `${URL}/functions/v1/decision-engine`;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error("Missing SUPABASE_ACCESS_TOKEN"); process.exit(1); }

const mgmt = async (path, init = {}) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`mgmt ${path} -> ${r.status}: ${await r.text()}`);
  return r.json();
};
const dbq = async (query) => mgmt(`/database/query`, { method: "POST", body: JSON.stringify({ query }) });

// 1. Get anon + service keys.
const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon")?.api_key;
const service = keys.find((k) => k.name === "service_role")?.api_key;
if (!anon || !service) throw new Error("could not resolve anon/service keys");

const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

const email = `smoke-de-${Date.now()}@example.com`;
const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);

// 2. Create + confirm user (admin).
const created = await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service);
const createdJson = await created.json();
const userId = createdJson.id;
if (!userId) throw new Error("user create failed: " + JSON.stringify(createdJson));
console.log("test user:", userId);

try {
  // 3. Sign in for a JWT.
  const signin = await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const session = await signin.json();
  const jwt = session.access_token;
  if (!jwt) throw new Error("signin failed: " + JSON.stringify(session));

  // 4. Invoke the function.
  const statement = "We should move our SaaS upmarket to mid-market enterprise next quarter, because enterprise deals have higher ACV and our SMB churn is too high to sustain.";
  const inv = await fetch(FN, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ statement, source: "advisor" }),
  });
  const invJson = await inv.json();
  console.log("invoke ->", inv.status, JSON.stringify(invJson));
  if (!inv.ok || !invJson.case_id) throw new Error("invoke failed");
  const caseId = invJson.case_id;

  // 5. Poll the case through stages (max ~90s).
  let stage = "decomposing";
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const rows = await dbq(`select stage, error_detail, confidence, recommendation, breakpoint_assumption_id from public.decision_cases where id = '${caseId}'`);
    stage = rows[0]?.stage;
    process.stdout.write(`  [${i}] stage=${stage}\n`);
    if (stage === "complete" || stage === "error") {
      console.log("CASE:", JSON.stringify(rows[0], null, 2));
      break;
    }
  }

  // 6. Dump claims + verdicts + evidence counts.
  const claims = await dbq(`select type, is_load_bearing, verdict, confidence, left(text, 80) as text from public.decision_claims where decision_case_id = '${caseId}' order by created_at`);
  console.log("CLAIMS:", JSON.stringify(claims, null, 2));
  const ev = await dbq(`select retriever, count(*) from public.decision_evidence where user_id = '${userId}' group by retriever`);
  console.log("EVIDENCE BY RETRIEVER:", JSON.stringify(ev, null, 2));
  const tens = await dbq(`select kind, severity, left(description,80) as description from public.decision_tensions where decision_case_id = '${caseId}'`);
  console.log("TENSIONS:", JSON.stringify(tens, null, 2));
} finally {
  // 7. Cleanup: delete the user (cascades to decision_* via FK).
  await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  console.log("cleaned up test user");
}
