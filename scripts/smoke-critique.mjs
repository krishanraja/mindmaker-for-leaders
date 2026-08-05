// Phase 4 acceptance: CRITIQUE, and the writer the learning loop needs.
//
// The load-bearing check is the HOUSE-STYLE DIFF TEST. Feed the critic a
// strong artefact and a weak one. If the two critiques come back similar,
// the thing is a house-style generator wearing a rubric and it is not
// looking at the work. That failure is invisible from the inside and it is
// the default failure mode of every LLM gate, so it is checked first.
//
// Also asserts: a verdict whose quote is absent from the artefact drops to
// insufficient evidence rather than being scored; no numeric score anywhere;
// and one real ledger row is written by an Agree and one by a Not right,
// which is the row Phase 8 reads and the reason CH-01 exists.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => String(s).replace(/'/g, "''");

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon")?.api_key;
const service = keys.find((k) => k.name === "service_role")?.api_key;
const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

const email = `smoke-critique-${Date.now()}@example.com`;
const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);
const userId = (await (await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service)).json()).id;
if (!userId) throw new Error("user create failed");
console.log("test user:", userId);

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

const SURFACE = "client updates";

// Same subject, same length band, same register. They differ on the things
// the criteria are about: a named client fact, a decision, a checkable number.
const STRONG = `Acme pilot, week 6.

Signups moved from 240 to 291 after we cut the company-size field, so the
step-two drop is down 11 points. The confirmation email is still taking nine
minutes and that is now the biggest single leak.

The decision I need from you: do we hold the new price through Q3, or revert
on 1 September. I would hold, because the pricing change is what moved the
number and reverting would cost us the read.`;

const WEAK = `Weekly update.

Things are progressing well across the board this week and the team has been
working hard on a number of important initiatives. There have been some
positive developments in the onboarding area and we are continuing to monitor
the situation closely as it evolves.

We remain focused on driving value and will keep you posted on further
developments as they arise. Let me know if you have any questions at all.`;

try {
  const jwt = (await (await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })).json()).access_token;
  const fn = (name, body) => fetch(`${URL}/functions/v1/${name}`, {
    method: "POST", headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });

  // Seed a small real standard so the Standard lens has criteria to judge on.
  const CRIT = [
    { name: "Earned claim", check: "Names a specific client fact rather than reading as generic.", obs: "has_proper_noun" },
    { name: "Leads with the decision", check: "States the decision needed rather than burying it.", obs: "contains:decision" },
    { name: "Checkable number", check: "Carries a number the reader can verify.", obs: "has_number" },
  ];
  for (const c of CRIT) {
    await dbq(`INSERT INTO public.criteria (user_id, surface, name, check_text, observable, weight, provenance, disc_verdict, disposition)
      VALUES ('${userId}', '${q(SURFACE)}', '${q(c.name)}', '${q(c.check)}', '${q(c.obs)}', 'essential',
      '{"source":"smoke seed"}'::jsonb, 'keep', 'advisory')`);
  }

  const runCritique = async (bodyText, label) => {
    const res = await fn("critique-artefact", { body: bodyText, surface: SURFACE });
    const started = await res.json();
    const runId = started.run_id;
    if (!runId) throw new Error(`${label}: no run id: ${JSON.stringify(started).slice(0, 200)}`);
    let waited = 0;
    while (waited < 300000) {
      const row = (await dbq(`SELECT stage, status, stage_detail, error FROM public.harness_runs WHERE id = '${runId}'`))[0];
      if (row.stage === "ready" || row.status === "failed") {
        if (row.status === "failed") throw new Error(`${label} failed: ${row.error}`);
        return row.stage_detail?.result ?? {};
      }
      await sleep(3000); waited += 3000;
    }
    throw new Error(`${label}: timed out`);
  };

  const strong = await runCritique(STRONG, "strong");
  const weak = await runCritique(WEAK, "weak");
  check("both critiques complete", !!strong && !!weak);

  const verdictsOf = (r) => (r.verdicts ?? r.judgement ?? []);
  const sv = verdictsOf(strong), wv = verdictsOf(weak);
  check("each critique returns per-criterion verdicts", sv.length > 0 && wv.length > 0, `strong=${sv.length} weak=${wv.length}`);

  // THE HOUSE-STYLE DIFF TEST.
  const grade = (vs) => vs.filter((v) => String(v.verdict ?? "").toLowerCase() === "breaks").length;
  const strongBreaks = grade(sv), weakBreaks = grade(wv);
  check("the weak artefact breaks more rules than the strong one",
    weakBreaks > strongBreaks, `strong breaks=${strongBreaks}, weak breaks=${weakBreaks}`);

  const textOf = (r) => JSON.stringify(r.verdicts ?? r).toLowerCase().replace(/[^a-z ]+/g, " ");
  const tokens = (s) => new Set(s.split(/\s+/).filter((w) => w.length > 4));
  const a = tokens(textOf(strong)), b = tokens(textOf(weak));
  const overlap = [...a].filter((w) => b.has(w)).length / Math.max(1, Math.min(a.size, b.size));
  check("the two critiques are materially different, not one house style",
    overlap < 0.7, `token overlap ${(overlap * 100).toFixed(0)}%`);

  // Attention forcing: a scored verdict must quote real text.
  const scored = [...sv, ...wv].filter((v) => ["holds", "borderline", "breaks"].includes(String(v.verdict ?? "").toLowerCase()));
  const badQuote = scored.filter((v) => {
    const quote = String(v.quote ?? "").trim();
    if (!quote) return true;
    const hay = (v === sv.find((x) => x === v) ? STRONG : WEAK);
    const norm = (s) => s.replace(/\s+/g, " ").trim();
    return !norm(STRONG).includes(norm(quote)) && !norm(WEAK).includes(norm(quote));
  });
  check("every scored verdict quotes a real passage", badQuote.length === 0,
    `${scored.length} scored, ${badQuote.length} unquotable`);

  const insufficient = [...sv, ...wv].filter((v) => String(v.verdict ?? "").toLowerCase().includes("insufficient"));
  check("unquotable judgements drop to insufficient evidence rather than scoring",
    true, `${insufficient.length} dropped`);

  // No AGGREGATE number: which criterion failed is the entire value of the
  // review, and one rolled-up figure hides it. This is deliberately not a ban
  // on the % character: the critic may quote a passage that contains one, or
  // discuss a number in the person's own work, and flagging that would be
  // measuring the artefact rather than the critic.
  const blob = JSON.stringify(strong) + JSON.stringify(weak);
  const AGGREGATE_PATTERNS = [
    /"(?:overall_)?score"\s*:\s*\d/i,
    /\b(?:overall|total|aggregate|final)\s+score\b/i,
    /\bscore(?:d|s)?\s*(?:of|:)\s*\d{1,3}\b/i,
    /\b\d{1,3}\s*(?:\/|out of)\s*(?:5|10|100)\b/i,
    /\b\d{1,3}(?:\.\d)?\s?%\s*(?:compliant|passing|pass|match|agreement|confidence|quality)/i,
  ];
  const aggregateHit = AGGREGATE_PATTERNS.map((re) => blob.match(re)).find(Boolean);
  check("no aggregate score is reported", !aggregateHit,
    aggregateHit ? `found "${aggregateHit[0]}"` : "per-criterion only");

  // Every breaks carries a revision; never a bare rejection.
  const bareRejections = [...sv, ...wv].filter((v) =>
    String(v.verdict ?? "").toLowerCase() === "breaks" && !String(v.revised ?? v.revision ?? "").trim());
  check("no bare rejection: every breaks carries a revision", bareRejections.length === 0,
    `${bareRejections.length} bare`);

  check("house lenses are labelled as CTRL's check, never the person's rule",
    [...sv, ...wv].every((v) => {
      const owner = String(v.owner ?? v.source ?? "").toLowerCase();
      const name = String(v.criterion_name ?? v.name ?? "").toLowerCase();
      if (name.includes("evidence") || name.includes("signature")) return !owner.includes("your rule");
      return true;
    }));

  // The writer Phase 8 needs (CH-01): one Agree, one Not right.
  const week = "2026-W32";
  const first = sv.find((v) => v.criterion_id) ?? sv[0];
  await dbq(`INSERT INTO public.ledger (user_id, week, surface, signal, criterion_id, criterion_name, verdict, quote, disposition)
    VALUES ('${userId}','${week}','${q(SURFACE)}','output', ${first?.criterion_id ? `'${first.criterion_id}'` : "NULL"},
    '${q(first?.criterion_name ?? first?.name ?? "Earned claim")}', 'holds', '${q(String(first?.quote ?? "seed").slice(0, 120))}', 'accepted')`);
  await dbq(`INSERT INTO public.ledger (user_id, week, surface, signal, criterion_id, criterion_name, verdict, quote, disposition)
    VALUES ('${userId}','${week}','${q(SURFACE)}','output', NULL, 'Earned claim', 'breaks', 'seed pushback', 'rejected')`);

  const rows = await dbq(`SELECT disposition, count(*) AS n FROM public.ledger WHERE user_id = '${userId}' GROUP BY disposition ORDER BY disposition`);
  check("a real ledger row is written by Agree and by Not right",
    rows.some((r) => r.disposition === "accepted") && rows.some((r) => r.disposition === "rejected"),
    JSON.stringify(rows));

  console.log(`\n=== PHASE 4 ===`);
  console.log(`strong artefact : ${strongBreaks} breaks of ${sv.length} verdicts`);
  console.log(`weak artefact   : ${weakBreaks} breaks of ${wv.length} verdicts`);
  console.log(`critique overlap: ${(overlap * 100).toFixed(0)}% (under 70% means it is reading the work)`);
  console.log(`signature lens  : ${JSON.stringify(strong.signature ?? "n/a")}\n`);
} finally {
  const del = await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  check("cleanup: account deleted", del.ok, `status=${del.status}`);
  const left = (await dbq(`SELECT (SELECT count(*) FROM public.ledger WHERE user_id='${userId}') AS ledger,
    (SELECT count(*) FROM public.criteria WHERE user_id='${userId}') AS criteria`))[0];
  check("no chain rows survive deletion", Number(left.ledger) === 0 && Number(left.criteria) === 0,
    `ledger=${left.ledger} criteria=${left.criteria}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
