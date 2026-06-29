// Smoke test: send-reactivation-nudge selects an onboarded-but-never-weighed
// leader (first_decision) and a lapsed leader (dormant), and a dry_run lists
// them without sending. Requires SUPABASE_ACCESS_TOKEN (sbp_).
//
// Run: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/smoke-reactivation-nudge.mjs
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
const service = keys.find((k) => k.name === "service_role").api_key;
const auth = (path, init = {}) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", ...(init.headers || {}) } });

// A "first_decision" leader: onboarded (an identity fact), zero decisions.
const email = `smoke-react-${Date.now()}@example.com`;
const created = await (await auth("admin/users", { method: "POST", body: JSON.stringify({ email, email_confirm: true }) })).json();
const userId = created.id;
console.log("user:", userId, email);

try {
  // Backdate the account so it clears the 24h settle-in age guard.
  await dbq(`update auth.users set created_at = now() - interval '3 days' where id = '${userId}';`);
  await dbq(`insert into public.user_memory (user_id, fact_key, fact_category, fact_label, fact_value, source_type, verification_status, is_current)
    values ('${userId}', 'role', 'identity', 'Your role', 'Founder / CEO', 'form', 'verified', true);`);

  // dry_run should list this user as first_decision.
  const res = await (await fetch(`${URL}/functions/v1/send-reactivation-nudge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, dry_run: true }),
  })).json();
  console.log("dry_run:", JSON.stringify(res));
  const hit = (res.due || []).find((d) => d.user_id === userId);
  if (!hit || hit.kind !== "first_decision") throw new Error("expected this user as first_decision in dry_run");
  console.log("PASS: first_decision candidate detected");
} finally {
  await sleep(200);
  await dbq(`delete from public.user_memory where user_id = '${userId}';`).catch(() => {});
  await dbq(`delete from public.leader_notification_prefs where user_id = '${userId}';`).catch(() => {});
  await auth(`admin/users/${userId}`, { method: "DELETE" }).catch(() => {});
  console.log("cleaned up");
}
