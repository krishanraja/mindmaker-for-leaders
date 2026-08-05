// Phase 8 acceptance: LEARN, the only stage that changes a standard, and it
// never changes one itself.
//
// The checks are all refusals, because that is what makes a weekly pass
// survivable: one occurrence proposes nothing, a drift question carries no
// delta, nothing writes to criteria, and every proposal states what breaks if
// it is wrong. A pass that proposes eagerly gets ignored within a fortnight.
//
// Requires SUPABASE_ACCESS_TOKEN (sbp_) in env.

const REF = "bkyuxvschuwngtcdhsyg";
const URL = `https://${REF}.supabase.co`;
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
const dbq = (query) => mgmt(`/database/query`, { method: "POST", body: JSON.stringify({ query }) });
const q = (s) => String(s).replace(/'/g, "''");

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon")?.api_key;
const service = keys.find((k) => k.name === "service_role")?.api_key;
const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

const email = `smoke-capture-${Date.now()}@example.com`;
const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);
const userId = (await (await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service)).json()).id;
if (!userId) throw new Error("user create failed");
console.log("test user:", userId);

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// ISO week arithmetic that matches the writer's stamp.
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};
const weeksAgo = (n) => isoWeek(new Date(Date.now() - n * 7 * 86400000));
const NOW = weeksAgo(0);

const SURFACE = "client updates";

try {
  // Two criteria: one that will be pushed back on twice, one that goes quiet.
  const critA = (await dbq(`INSERT INTO public.criteria (user_id, surface, name, check_text, observable, weight, provenance, disc_verdict, disposition)
    VALUES ('${userId}','${q(SURFACE)}','Earned claim','Names a specific client fact.','has_proper_noun','essential','{"source":"smoke"}'::jsonb,'keep','advisory')
    RETURNING id`))[0].id;
  await dbq(`INSERT INTO public.criteria (user_id, surface, name, check_text, observable, weight, provenance, disc_verdict, disposition)
    VALUES ('${userId}','${q(SURFACE)}','Named owner','Names who owns the next step.','contains:owner','essential','{"source":"smoke"}'::jsonb,'keep','advisory')`);

  const ledger = (week, name, verdict, disposition, critId, quote, signal = "output") =>
    `INSERT INTO public.ledger (user_id, week, surface, signal, criterion_id, criterion_name, verdict, quote, disposition)
     VALUES ('${userId}','${week}','${q(SURFACE)}','${signal}', ${critId ? `'${critId}'` : "NULL"}, '${q(name)}','${verdict}','${q(quote)}','${disposition}')`;

  // A single lonely occurrence: must propose nothing.
  await dbq(ledger(weeksAgo(1), "Single blip", "uncovered", "unknown", null, "one off note nobody repeated"));
  // Two pushbacks on one criterion inside the window: a Type B false positive.
  await dbq(ledger(weeksAgo(2), "Earned claim", "breaks", "rejected", critA, "Acme is named right there"));
  await dbq(ledger(weeksAgo(1), "Earned claim", "breaks", "rejected", critA, "Northwind is named in line one"));
  // Two rewordings of one uncovered note: a Type A.
  await dbq(ledger(weeksAgo(3), "uncovered", "uncovered", "unknown", null, "second half repeats the first half"));
  await dbq(ledger(weeksAgo(1), "uncovered", "uncovered", "unknown", null, "the second half repeats the first half"));

  const before = (await dbq(`SELECT count(*) AS n, max(version) AS v FROM public.criteria WHERE user_id = '${userId}'`))[0];

  const res = await fetch(`${URL}/functions/v1/capture-week`, {
    method: "POST",
    headers: { Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
    body: JSON.stringify({ now_week: NOW }),
  });
  const out = await res.json();
  check("the weekly pass runs under the cron secret gate", res.ok, `status=${res.status}`);

  const props = await dbq(`SELECT type, headline, delta_text, if_wrong, evidence, status, user_id
    FROM public.proposals WHERE user_id = '${userId}' ORDER BY created_at`);
  console.log(`\nproposed ${props.length}: ${props.map((p) => p.type).join(", ")}\n`);

  check("a single occurrence proposes nothing",
    !props.some((p) => /single blip/i.test(p.headline || "") || /one off note/i.test(JSON.stringify(p.evidence))),
    props.map((p) => p.headline).join(" | ").slice(0, 110));

  check("two pushbacks on one criterion become a false positive",
    props.some((p) => p.type === "false_positive"), props.map((p) => p.type).join(","));

  check("two rewordings of one note become an uncovered proposal",
    props.some((p) => p.type === "uncovered"));

  const drift = props.filter((p) => p.type === "drift");
  check("a drift question carries no delta",
    drift.every((p) => p.delta_text === null), `${drift.length} drift`);

  check("every proposal states what breaks if it is wrong",
    props.length > 0 && props.every((p) => (p.if_wrong ?? "").trim().length > 0));

  check("every proposal states its size delta",
    props.every((p) => {
      const e = p.evidence || {};
      return e.size && typeof e.size.delta === "number" && String(e.size.paired_obligation ?? "").length > 0;
    }));

  check("proposals route to the person, never a platform owner",
    props.every((p) => p.user_id === userId));

  check("every proposal arrives awaiting a human yes or no",
    props.every((p) => p.status === "awaiting"));

  // The rule that matters most: the pass proposes, it never edits.
  const after = (await dbq(`SELECT count(*) AS n, max(version) AS v FROM public.criteria WHERE user_id = '${userId}'`))[0];
  check("nothing was written to criteria: it proposes, it never edits",
    Number(after.n) === Number(before.n) && String(after.v) === String(before.v),
    `criteria ${before.n}->${after.n}, version ${before.v}->${after.v}`);

  // Running twice must not duplicate an awaiting proposal.
  await fetch(`${URL}/functions/v1/capture-week`, {
    method: "POST", headers: { Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
    body: JSON.stringify({ now_week: NOW }),
  });
  const twice = (await dbq(`SELECT count(*) AS n FROM public.proposals WHERE user_id = '${userId}'`))[0].n;
  check("a second run does not re-propose what is already awaiting",
    Number(twice) === props.length, `${props.length} then ${twice}`);

  // An unauthenticated caller gets nothing.
  const naked = await fetch(`${URL}/functions/v1/capture-week`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  check("an unauthenticated caller is refused", naked.status === 403 || naked.status === 401,
    `status=${naked.status}`);

  console.log(`=== PHASE 8 ===`);
  console.log(`proposals   : ${props.map((p) => `${p.type}`).join(", ") || "none"}`);
  console.log(`criteria    : untouched (${after.n} rows, version ${after.v})`);
  console.log(`cron        : Sunday 20:00 UTC\n`);
} finally {
  const del = await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  check("cleanup: account deleted", del.ok, `status=${del.status}`);
  const left = (await dbq(`SELECT (SELECT count(*) FROM public.proposals WHERE user_id='${userId}') AS proposals,
    (SELECT count(*) FROM public.ledger WHERE user_id='${userId}') AS ledger`))[0];
  check("no loop rows survive deletion", Number(left.proposals) === 0 && Number(left.ledger) === 0,
    `proposals=${left.proposals} ledger=${left.ledger}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
