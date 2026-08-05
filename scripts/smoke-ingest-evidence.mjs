// Phase 1 acceptance: INGEST + the provenance baseline.
//
// Verifies the stage-1 contract on a real transcript:
//   every candidate carries a verbatim quote that is a REAL substring of the
//   source (checked by offset slice, not by trusting the function), no
//   candidate has a contrast pole, every evidence row is situated with a
//   situation string, and no candidate body is phrased as a rule.
// Then generates a skill and records baseline_unresolved_claims, the number
// the whole project exists to move.
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
const dbq = async (query) => mgmt(`/database/query`, { method: "POST", body: JSON.stringify({ query }) });
const q = (s) => String(s).replace(/'/g, "''");

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon")?.api_key;
const service = keys.find((k) => k.name === "service_role")?.api_key;

const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

const email = `smoke-ingest-${Date.now()}@example.com`;
const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);
const created = await (await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service)).json();
const userId = created.id;
if (!userId) throw new Error("user create failed: " + JSON.stringify(created));
console.log("test user:", userId);

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// A real-shaped call transcript. Deliberately includes the james-harrabin
// shape: a situated statement about ONE engagement that a naive pipeline
// would flatten into a standing rule about all output.
const TRANSCRIPT = `Krish: Thanks for making the time. I wanted to walk you through where we are on the pilot.

James: Sure. Before you start, one thing. We're very uncorporate as a client, so we don't want a deck or, you know, any. We don't need a deck or any detailed notes of what you've done. Just tell me what you found and what you'd do next.

Krish: Understood. So the headline is the onboarding flow is losing about forty percent of signups between step two and step three.

James: Right. And what's your read on why?

Krish: Two things. The form asks for company size before it's earned any trust, and the confirmation email takes about nine minutes to arrive.

James: The email thing is the one that annoys me. I've said before, if something takes longer than a minute the user assumes it's broken. That's the bit I care about. The form I can live with.

Krish: Agreed. I'd fix the email first.

James: And look, when you write this up for the wider team, keep it to what changed and what it moved. I don't want to read three pages of context I already have. Everyone here writes like they're being paid by the word and it drives me mad.

Krish: Noted. What about the board pack for next month?

James: That's different. The board needs the full picture, they haven't been living in this. Give them the context, give them the numbers, give them the recommendation. Don't make them guess what you think.

Krish: Got it. Last thing, do you want the weekly check-ins to continue?

James: Yes, keep those. Short though. Fifteen minutes, and only if there's a decision I need to make. If it's just status, put it in a message.`;

try {
  const signin = await (await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })).json();
  const jwt = signin.access_token;
  if (!jwt) throw new Error("signin failed: " + JSON.stringify(signin));

  const inv = await fetch(`${URL}/functions/v1/ingest-evidence`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source_kind: "transcript", label: "Pilot review call", body: TRANSCRIPT, surface: "client updates" }),
  });
  const out = await inv.json();
  if (!inv.ok) throw new Error(`ingest -> ${inv.status}: ${JSON.stringify(out).slice(0, 400)}`);
  console.log(`\ningest: ${out.counts?.evidence} evidence, ${out.counts?.candidates} candidates, ${out.counts?.rejected} rejected\n`);

  check("candidates produced", (out.counts?.candidates ?? 0) > 0, `${out.counts?.candidates}`);

  // Verify against the DB, not the response: every quote must be the exact
  // slice its own offsets point at, inside the stored source.
  const rows = await dbq(`
    SELECT e.id, e.quote, e.quote_start, e.quote_end, e.situated, e.situation,
           substring(s.body from e.quote_start + 1 for e.quote_end - e.quote_start) AS slice
    FROM public.evidence e JOIN public.evidence_sources s ON s.id = e.source_id
    WHERE e.user_id = '${userId}'`);
  const badSlice = rows.filter((r) => r.quote !== r.slice);
  check("every quote is the exact slice at its own offsets", rows.length > 0 && badSlice.length === 0,
    `${rows.length} rows, ${badSlice.length} mismatched`);

  const unsituated = rows.filter((r) => r.situated !== true || !r.situation || !String(r.situation).trim());
  check("every evidence row is situated with a situation string", unsituated.length === 0, `${unsituated.length} bad`);

  const cons = await dbq(`SELECT emergent_pole, contrast_pole, status, array_length(evidence_ids,1) AS n FROM public.constructs WHERE user_id = '${userId}'`);
  check("no candidate has a contrast pole", cons.length > 0 && cons.every((c) => c.contrast_pole === null), `${cons.length} candidates`);
  check("all candidates are status candidate", cons.every((c) => c.status === "candidate"));
  check("every candidate carries evidence", cons.every((c) => (c.n ?? 0) >= 1));

  const ruleish = cons.filter((c) => /\b(always|never|must|forbidden)\b/i.test(c.emergent_pole || ""));
  check("no candidate is phrased as a rule", ruleish.length === 0,
    ruleish.length ? ruleish[0].emergent_pole : "");

  // The james-harrabin case: the deck statement must survive as SITUATED.
  const deck = rows.find((r) => /deck/i.test(r.quote || ""));
  check("the deck statement is captured situated, not as a standing rule",
    !deck || (deck.situated === true && !!deck.situation),
    deck ? `situation: ${String(deck.situation).slice(0, 70)}` : "not extracted (acceptable)");

  // Baseline: generate a skill and record how many imperatives carry no pointer.
  const gen = await fetch(`${URL}/functions/v1/generate-skill-export`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: "Every week I write the client update for the pilot engagement. I lead with what changed and what it moved, then the one decision I need from them. I keep it short. I would kick it off by saying draft my client update." }),
  });
  const genOut = await gen.json();
  const baseline = genOut?.baseline_unresolved_claims;
  check("generate returns the provenance number", typeof baseline === "number", `baseline_unresolved_claims=${baseline}`);
  const provChecks = (genOut?.quality_gate?.checks || []).filter((c) => c.id.startsWith("prov."));
  check("all three prov.* checks run", provChecks.length === 3,
    provChecks.map((c) => `${c.id}=${c.passed}`).join(" "));

  // Phase 3b acceptance. Both halves matter and neither alone is a pass: zero
  // unpointed rules in a package that still says something. A package that
  // reached zero by emptying itself has failed, which is why the leaf content is
  // asserted beside the number.
  check("no rule in the package is unpointed", baseline === 0, `unpointed=${baseline}`);

  // The second half of the same contract, asserted rather than printed. A leaf
  // that scopes itself at the top clears this honestly; a leaf that turns one
  // client's remark into a standing rule still fails it, which is the finding
  // the whole james-harrabin transcript above exists to provoke.
  const situated = provChecks.find((c) => c.id === "prov.noSituatedGeneralisation");
  check("no rule generalises a situated quote", situated?.passed === true,
    situated?.detail || "check missing");

  const files = genOut?.package_files || [];
  check("the package is a router plus leaves", files.includes("SKILL.md") &&
    files.some((f) => f.startsWith("rubric/")) && files.includes("rubric/general.md"),
    files.join(", "));

  const bodyLines = String(genOut?.skill?.body || "").split("\n").filter((l) => l.trim()).length;
  check("the skill still says something", bodyLines >= 15, `${bodyLines} non-blank body lines`);

  const passes = genOut?.provenance?.passes;
  check("the gate settled inside the one allowed regeneration", passes >= 1 && passes <= 2,
    `passes=${passes}, blocked=${genOut?.provenance?.blocked}`);

  console.log(`\n=== PHASE 3b ===`);
  console.log(`unpointed imperatives in a generated skill: ${baseline}  (was 6 at the Phase 1 baseline)`);
  console.log(`situated generalisations: ${situated?.passed ? 0 : "see detail"}  (${situated?.detail || "n/a"})`);
  console.log(`package: ${files.join(", ")}`);
  console.log(`passes: ${passes}, blocked: ${genOut?.provenance?.blocked}`);
  if (genOut?.provenance?.violations?.length) {
    console.log(`violations still standing:`);
    for (const v of genOut.provenance.violations) console.log(`  - ${v}`);
  }
  console.log("");
} finally {
  const del = await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  check("cleanup: account deleted (new tables in the sweep)", del.ok, `status=${del.status}`);
  const left = await dbq(`SELECT
    (SELECT count(*) FROM public.evidence WHERE user_id = '${userId}') AS evidence,
    (SELECT count(*) FROM public.constructs WHERE user_id = '${userId}') AS constructs,
    (SELECT count(*) FROM public.evidence_sources WHERE user_id = '${userId}') AS sources`);
  const r0 = left?.[0] || {};
  check("no chain rows survive deletion", Number(r0.evidence) === 0 && Number(r0.constructs) === 0 && Number(r0.sources) === 0,
    `evidence=${r0.evidence} constructs=${r0.constructs} sources=${r0.sources}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
