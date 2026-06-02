// Calibration harness for the decision-engine verification core.
// Seeds a labelled claim set, runs the real verifyClaim() once per claim via
// the decision-eval function, then computes accuracy + a coarse confidence
// calibration (expected calibration error) client-side.
// Requires SUPABASE_ACCESS_TOKEN (sbp_).
//
// NOTE: this is a STARTER set (~16 cases) to wire the gate and catch gross
// miscalibration. The spec target is ~150 labelled claims across the five
// types. Grow CASES before treating ECE as definitive.

const REF = "bkyuxvschuwngtcdhsyg";
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

const CASES = [
  ["The Eiffel Tower is located in Paris, France.", "factual", "supported"],
  ["Python is a widely used programming language.", "factual", "supported"],
  ["Amazon operates a large online retail marketplace.", "market", "supported"],
  ["The United States dollar is a global reserve currency.", "factual", "supported"],
  ["Global cloud computing spending has grown year over year over the last decade.", "market", "supported"],
  ["Electric vehicle sales have increased globally since 2015.", "market", "supported"],
  ["The Great Wall of China is visible from the Moon with the naked eye.", "factual", "contested"],
  ["Humans only use ten percent of their brains.", "factual", "contested"],
  ["A company called Acme Widget Corp of Toledo had exactly 47 employees in 2019.", "factual", "unverified"],
  ["A mid-market SaaS vendor named Brightloop grew revenue 38 percent last quarter.", "market", "unverified"],
  ["Remote work always increases software engineering productivity.", "causal", "contested"],
  ["Our sales team has the capacity to run enterprise deal cycles.", "assumption", "unverifiable"],
  ["Customers will tolerate a price increase without churning.", "assumption", "unverifiable"],
  ["We will reach two million dollars in ARR by the fourth quarter.", "forecast", "unverifiable"],
  ["The fractional executive market will double in size within three years.", "forecast", "unverifiable"],
  ["Our competitor will exit the SMB segment next year.", "forecast", "unverifiable"],
];

// Persist the labelled set for the record (idempotent).
await mgmt(`/database/query`, { method: "POST", body: JSON.stringify({ query: "delete from public.decision_eval_cases;" }) });
const values = CASES.map(([t, ty, g]) => `('${t.replace(/'/g, "''")}', '${ty}', '${g}')`).join(",\n");
await mgmt(`/database/query`, { method: "POST", body: JSON.stringify({ query: `insert into public.decision_eval_cases (claim_text, claim_type, gold_verdict) values\n${values};` }) });
console.log(`seeded ${CASES.length} eval cases`);

const keys = await mgmt(`/api-keys?reveal=true`);
const service = keys.find((k) => k.name === "service_role")?.api_key;
if (!service) throw new Error("no service key");
const FN = `https://${REF}.supabase.co/functions/v1/decision-eval`;

async function verifyOne([claim_text, claim_type, gold]) {
  const r = await fetch(FN, {
    method: "POST",
    headers: { Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
    body: JSON.stringify({ claim_text, claim_type }),
  });
  const out = await r.json().catch(() => ({ error: "bad json" }));
  return { claim_text, claim_type, gold, predicted: out.predicted ?? "error", confidence: out.confidence ?? null, evidence_count: out.evidence_count ?? 0, error: out.error };
}

// Run with small concurrency to stay gentle on provider rate limits.
const results = [];
const CONCURRENCY = 3;
for (let i = 0; i < CASES.length; i += CONCURRENCY) {
  const batch = CASES.slice(i, i + CONCURRENCY);
  results.push(...(await Promise.all(batch.map(verifyOne))));
  process.stdout.write(`  verified ${Math.min(i + CONCURRENCY, CASES.length)}/${CASES.length}\n`);
}

for (const r of results) r.correct = r.predicted === r.gold;
const correct = results.filter((r) => r.correct).length;

const byType = {};
for (const r of results) {
  byType[r.claim_type] ??= { n: 0, correct: 0 };
  byType[r.claim_type].n++;
  if (r.correct) byType[r.claim_type].correct++;
}

const buckets = [
  { label: "0.00-0.33", lo: 0, hi: 0.34, n: 0, correct: 0, confSum: 0 },
  { label: "0.34-0.66", lo: 0.34, hi: 0.67, n: 0, correct: 0, confSum: 0 },
  { label: "0.67-1.00", lo: 0.67, hi: 1.01, n: 0, correct: 0, confSum: 0 },
];
for (const r of results) {
  if (r.confidence == null) continue;
  const b = buckets.find((x) => r.confidence >= x.lo && r.confidence < x.hi);
  if (b) { b.n++; b.confSum += r.confidence; if (r.correct) b.correct++; }
}
let ece = 0, eceN = 0;
const calibration = buckets.map((b) => {
  const acc = b.n ? b.correct / b.n : null;
  const avgConf = b.n ? b.confSum / b.n : null;
  if (b.n) { ece += b.n * Math.abs(acc - avgConf); eceN += b.n; }
  return { bucket: b.label, n: b.n, accuracy: acc, avg_confidence: avgConf };
});

console.log("\n=== EVAL RESULT ===");
console.log("overall_accuracy:", (correct / results.length).toFixed(3), `(${correct}/${results.length})`);
console.log("expected_calibration_error:", eceN ? (ece / eceN).toFixed(3) : "n/a");
console.log("by_type:", JSON.stringify(Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, +(v.correct / v.n).toFixed(2)]))));
console.log("calibration:", JSON.stringify(calibration));
const misses = results.filter((r) => !r.correct).map((r) => ({ claim: r.claim_text.slice(0, 50), gold: r.gold, predicted: r.predicted, confidence: r.confidence, evidence: r.evidence_count, error: r.error }));
console.log(`\nmisses (${misses.length}):`, JSON.stringify(misses, null, 2));
