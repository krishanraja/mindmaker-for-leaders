// Phase 1b/1c acceptance: THE SHORT DECK, and the chained compile.
//
// The short budget either clears the chain's own floors or silently produces
// nothing, and "nothing" looks exactly like a healthy run until you notice the
// standard is empty. So this runs the whole path on a real user against
// deployed functions and asserts in SQL, never by reading a screen.
//
// WHAT IS A GATE HERE AND WHAT IS NOT, because the distinction is the point:
//
//   GATE      the SUFFICIENCY counts. Every parseable probe must see at least
//             KILL_MIN_EACH_SIDE accepted and rejected training items, or
//             discriminationVerdict returns 'untested' for everything and the
//             sort produces no standard. That is what the budget controls and
//             it is deterministic given the deck shape.
//
//   NOT a gate the KEEPER count. Whether a criterion keeps depends on whether
//             the model wrote an observable whose regex actually separates the
//             graded work, and 'delete' is the CORRECT answer for one that does
//             not. Measured head to head, the full deck produces zero keepers
//             about as readily as the short one does, so a keeper assertion
//             would be a coin flip wearing a green tick. It is reported and the
//             gap distribution is printed; it does not fail the run.
//
// The peer shelf ships empty (peer-corpus.ts), so both decks legitimately run
// lighter than their target and say so rather than padding. Assertions are
// against achievable supply, with the TARGET asserted separately.
//
// Requires SUPABASE_ACCESS_TOKEN (sbp_) in env. Cleans up scoped by user id.

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

const email = `verify-shortsort-${Date.now()}@example.com`;
const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);
const userId = (await (await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service)).json()).id;
if (!userId) throw new Error("user create failed");
console.log("test user:", userId, "\n");

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function buildAndGrade(fn, depth, label) {
  const res = await fn("build-sort", { surface: "client updates", depth, request_id: `${depth}-${userId}` });
  const runId = (await res.json()).run_id;
  let waited = 0;
  while (waited < 300000) {
    const row = (await dbq(`SELECT stage, status, error FROM public.harness_runs WHERE id = '${runId}'`))[0];
    if (row.stage === "ready") break;
    if (row.status === "failed") throw new Error(`${label} build failed: ${row.error}`);
    await sleep(3000); waited += 3000;
  }
  const detail = (await dbq(`SELECT stage_detail FROM public.harness_runs WHERE id = '${runId}'`))[0].stage_detail;
  const items = await dbq(`SELECT id, position, body, origin, pair_id, pair_role, held_out, repeat_of
    FROM public.sort_items WHERE session_id = '${runId}' ORDER BY position`);
  return { runId, detail, items };
}

/** A discerning grader: keeps own work and the satisfying halves, drops the rest. */
async function gradeDeck(fn, runId, items) {
  const verdictForBody = new Map();
  for (const it of items) {
    if (verdictForBody.has(it.body)) continue;
    verdictForBody.set(
      it.body,
      it.pair_role === "violates" ? "would_not_send"
        : it.pair_role === "satisfies" ? "send"
        : it.origin === "own" ? "send"
        : "would_not_send",
    );
  }
  for (const it of items) {
    const v = verdictForBody.get(it.body);
    await fn("grade-sort", {
      run_id: runId, item_id: it.id, verdict: v, ms_to_grade: 7000,
      why: v === "send"
        ? "it names the client and leads with the decision I need"
        : "it could be for anyone, there is nothing checkable in it",
    });
  }
}

try {
  const jwt = (await (await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })).json()).access_token;
  const fn = (name, body) => fetch(`${URL}/functions/v1/${name}`, {
    method: "POST", headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });

  // --- 1. seed a brain, and mine it (the phase-1a regression) ---------------
  const FACTS = [
    ["How they open an update", "I lead with the decision I need, never with a status recap"],
    ["What they refuse to send", "Anything that could have been written for any other client"],
    ["How long an update runs", "Short enough to read in under a minute"],
    ["What they always include", "A number the client can check against their own dashboard"],
    ["Their standing rule on tone", "Plain, direct, no throat clearing before the point"],
  ];
  for (const [i, [label, value]] of FACTS.entries()) {
    await dbq(`INSERT INTO public.user_memory (user_id, fact_key, fact_label, fact_value, fact_category, importance, confidence_score, verification_status, source_type, is_current)
      VALUES ('${userId}', 'verify_fact_${i}', '${q(label)}', '${q(value)}', 'preference', 8, 0.9, 'verified', 'voice', true)`);
  }
  // One the leader already ruled out. It must never be mined back in.
  await dbq(`INSERT INTO public.user_memory (user_id, fact_key, fact_label, fact_value, fact_category, importance, confidence_score, verification_status, source_type, is_current)
    VALUES ('${userId}', 'verify_fact_rejected', 'A thing they rejected', 'Never true about them', 'preference', 9, 0.9, 'rejected', 'voice', true)`);

  const ingest = await (await fn("ingest-brain", {})).json();
  check("ingest-brain mines the brain and skips the rejected fact",
    ingest.facts_used === FACTS.length && ingest.constructs === FACTS.length,
    `used=${ingest.facts_used} constructs=${ingest.constructs}`);

  const offsets = (await dbq(`SELECT count(*)::int AS bad FROM public.evidence e
    JOIN public.evidence_sources s ON s.id = e.source_id
    WHERE e.user_id = '${userId}'
      AND substring(s.body from e.quote_start + 1 for e.quote_end - e.quote_start) IS DISTINCT FROM e.quote`))[0].bad;
  check("every mined quote is the exact offset slice of its source", offsets === 0, `${offsets} broken`);

  // The person's own past work: build-sort reads kind='artefact', and this is
  // the accept side the whole discrimination test stands on.
  for (let i = 0; i < 6; i++) {
    const body = `Own artefact ${i}. Acme moved from 12 to 15 this week after the pricing change. The decision I need from you is whether we hold the new price through Q3.`;
    await dbq(`INSERT INTO public.evidence (user_id, kind, body, quote, source_label, situated, situation, speaker_is_owner)
      VALUES ('${userId}','artefact','${q(body)}','${q(body)}','My own past update', true, 'past client update', true)`);
  }

  // --- 2. the short deck ----------------------------------------------------
  const short = await buildAndGrade(fn, "short", "short");
  const unique = short.items.filter((i) => !i.repeat_of);
  const repeats = short.items.filter((i) => i.repeat_of);
  const heldOut = short.items.filter((i) => i.held_out);

  // The peer shelf ships empty (peer-corpus.ts, a documented open item), so
  // BOTH decks legitimately run lighter than their target and say so rather
  // than padding. Assert against achievable supply, and assert the target
  // separately, or this script measures the empty shelf instead of the change.
  const d = short.detail;
  console.log(`   short detail: own ${d.own_available}/${d.own_expected}, peer ${d.peer_available}/${d.peer_expected}, awaiting_curation=${d.peer_awaiting_curation}`);
  

  check("short deck lays out every item its supply allows, never padded",
    unique.length === d.pairs * 2 + d.own_available + d.peer_available && repeats.length === 3,
    `${unique.length} unique = ${d.pairs} pairs x2 + ${d.own_available} own + ${d.peer_available} peer, +${repeats.length} repeats`);
  check("short deck asked for and got its three constructs at two pairs each",
    d.constructs === 3 && d.pairs === 6, `constructs=${d.constructs} pairs=${d.pairs}`);
  // One whole pair (2) + one own + one peer, each capped by what exists.
  const expectedHeldOut = 2 + Math.min(1, d.own_available) + Math.min(1, d.peer_available);
  check("short deck holds out one whole pair plus one of each class it has",
    heldOut.length === expectedHeldOut, `${heldOut.length}, expected ${expectedHeldOut}`);
  check("stage_detail carries depth=short", d.depth === "short", String(d.depth));
  check("stage_detail says Verified is unreachable", d.can_reach_verified === false,
    String(d.can_reach_verified));
  // The actual change: every _expected is the SHORT budget's target, not the
  // full deck's. Left at 30, shortfallNotes would tell a short-sort user their
  // deck ran 13 screens short of a target they never chose.
  check("every expected count comes from the short budget, not the full one",
    d.items_expected === 19 && d.own_expected === 5 && d.peer_expected === 2 &&
    d.constructs_expected === 3 && d.pairs_expected === 6 && d.held_out_expected === 4,
    `items=${d.items_expected} own=${d.own_expected} peer=${d.peer_expected} constructs=${d.constructs_expected} pairs=${d.pairs_expected} heldOut=${d.held_out_expected}`);

  const byPair = new Map();
  for (const it of unique) {
    if (!it.pair_id) continue;
    byPair.set(it.pair_id, [...(byPair.get(it.pair_id) ?? []), it]);
  }
  const splitPairs = [...byPair.values()].filter((m) => m.length === 2 && m[0].held_out !== m[1].held_out);
  check("no pair is split across the hold-out boundary", splitPairs.length === 0, `${splitPairs.length} split`);
  check("six pairs, so the split rate has a real denominator", byPair.size === 6, `${byPair.size}`);
  check("repeat probes are never held out and never pair halves",
    repeats.every((r) => !r.held_out && !r.pair_id));

  const trainingPairs = new Set(unique.filter((i) => i.pair_id && !i.held_out).map((i) => i.pair_id));
  const trainingOwn = unique.filter((i) => i.origin === "own" && !i.held_out).length;
  check("five pairs and four own items train, clearing the 4-and-4 floor",
    trainingPairs.size === 5 && trainingOwn === 4, `pairs=${trainingPairs.size} own=${trainingOwn}`);

  await gradeDeck(fn, short.runId, short.items);

  // --- 3. the compile, which is what this phase is actually for -------------
  const compileRes = await fn("compile-standard", { run_id: short.runId });
  const compileRunId = (await compileRes.json()).run_id;
  check("compile-standard accepts the short run", compileRes.status === 202, `status=${compileRes.status}`);

  let cstage = "", cdetail = {}, cwaited = 0;
  while (cwaited < 300000) {
    const row = (await dbq(`SELECT stage, status, stage_detail, error FROM public.harness_runs WHERE id = '${compileRunId}'`))[0];
    cstage = row.stage; cdetail = row.stage_detail ?? {};
    if (["ready", "halted", "template_and_voice", "failed"].includes(cstage)) {
      if (cstage === "failed") console.log("   compile error:", row.error);
      break;
    }
    await sleep(3000); cwaited += 3000;
  }
  check("the compile reached a terminal stage", ["ready", "halted", "template_and_voice"].includes(cstage), cstage);
  console.log(`   compile outcome: stage=${cstage} kept=${cdetail.kept} untested=${cdetail.untested} label=${cdetail.label}`);

  // Reported, deliberately not asserted. See the header: keeper count tracks
  // probe quality, not deck size, and asserting it would make this script pass
  // or fail on a coin flip.
  const kept = (await dbq(`SELECT count(*)::int AS n FROM public.criteria
    WHERE user_id = '${userId}' AND is_current = true AND disc_verdict = 'keep'`))[0].n;
  console.log(`   criteria that separate: ${kept}`);

  const advisory = (await dbq(`SELECT count(*)::int AS n FROM public.criteria
    WHERE user_id = '${userId}' AND disposition <> 'advisory'`))[0].n;
  check("every criterion arrives advisory, never blocking", advisory === 0, `${advisory} non-advisory`);

  const artefact = (await dbq(`SELECT metadata->>'label' AS label, metadata->>'surface' AS surface
    FROM public.generated_artifacts WHERE user_id = '${userId}' AND kind = 'standard'`))[0];
  check("my-standard.md was written, labelled Draft (no measurement has run)",
    artefact?.label === "draft", `label=${artefact?.label}`);

  // --- 4. the full deck is byte-for-byte what it always was -----------------
  const full = await buildAndGrade(fn, "full", "full");
  const fullUnique = full.items.filter((i) => !i.repeat_of);
  const fd = full.detail;
  console.log(`   full detail: pairs ${fd.pairs}/${fd.pairs_expected}, own ${fd.own_available}/${fd.own_expected}, peer ${fd.peer_available}/${fd.peer_expected}, rejects=${JSON.stringify(fd.pair_rejects ?? [])}`);
  // The deck is whatever supply allowed, never padded. How many usable pairs
  // one generation call yields varies run to run (temperature 0.7, rejects
  // counted and reported); that is the model, not the budget, so the invariant
  // is asserted rather than the yield.
  check("full deck is exactly its own parts, never padded",
    fullUnique.length === fd.pairs * 2 + fd.own_available + fd.peer_available &&
    full.items.length === fullUnique.length + 3,
    `${fullUnique.length} unique = ${fd.pairs} pairs x2 + ${fd.own_available} own + ${fd.peer_available} peer`);
  check("full deck still targets the full budget",
    fd.items_expected === 30 && fd.own_expected === 6 && fd.peer_expected === 4 &&
    fd.constructs_expected === 5 && fd.pairs_expected === 10 && fd.held_out_expected === 12,
    `items=${fd.items_expected} own=${fd.own_expected} heldOut=${fd.held_out_expected}`);
  check("full deck holds out four whole pairs, the shape that survives a skip",
    full.items.filter((i) => i.held_out).length === 8 + Math.min(2, fd.own_available) + Math.min(2, fd.peer_available),
    `${full.items.filter((i) => i.held_out).length}`);
  check("full deck can still reach Verified", fd.can_reach_verified === true,
    String(fd.can_reach_verified));

  // --- 5. head to head: is a thin keeper count the SHORT deck, or the compile
  // stage generally? Same grader, same constructs, same surface, both depths.
  await gradeDeck(fn, full.runId, full.items);
  const fullCompileId = (await (await fn("compile-standard", { run_id: full.runId })).json()).run_id;
  let fstage = "", fdetail = {}, fwaited = 0;
  while (fwaited < 300000) {
    const row = (await dbq(`SELECT stage, status, stage_detail FROM public.harness_runs WHERE id = '${fullCompileId}'`))[0];
    fstage = row.stage; fdetail = row.stage_detail ?? {};
    if (["ready", "halted", "template_and_voice", "failed"].includes(fstage)) break;
    await sleep(3000); fwaited += 3000;
  }
  const gaps = (dist) => (dist ?? []).map((g) => `${g.verdict}:${g.gap}`).join(" ");
  console.log(`\n   SHORT compile: stage=${cstage} kept=${cdetail.kept} untested=${cdetail.untested} deleted=${cdetail.deleted}`);
  console.log(`     gaps: ${gaps(cdetail.gap_distribution)}`);
  console.log(`   FULL  compile: stage=${fstage} kept=${fdetail.kept} untested=${fdetail.untested} deleted=${fdetail.deleted}`);
  console.log(`     gaps: ${gaps(fdetail.gap_distribution)}`);

  // THE gate. Below 4 on either side every criterion compiles 'untested',
  // whatever the model wrote, and the sort yields nothing at all.
  const shortGaps = cdetail.gap_distribution ?? [];
  const shortHadEnough = shortGaps.length > 0 &&
    shortGaps.every((g) => !g.probe_parsed || (g.n_rejected >= 4 && g.n_accepted >= 4));
  check("every parseable probe saw 4+ on each side, so no criterion died untested for want of items",
    shortHadEnough, shortGaps.map((g) => `${g.n_accepted}a/${g.n_rejected}r`).join(" "));
} finally {
  // Scoped by user id, never by timestamp.
  for (const t of ["sort_grades", "criteria", "constructs", "evidence", "evidence_sources",
                   "generated_artifacts", "user_memory", "ai_usage"]) {
    await dbq(`DELETE FROM public.${t} WHERE user_id = '${userId}'`).catch(() => {});
  }
  await dbq(`DELETE FROM public.sort_items WHERE user_id = '${userId}'`).catch(() => {});
  await dbq(`DELETE FROM public.harness_runs WHERE user_id = '${userId}'`).catch(() => {});
  await auth(`admin/users/${userId}`, { method: "DELETE" }, service);

  const residue = await dbq(`SELECT
    (SELECT count(*) FROM public.sort_items WHERE user_id = '${userId}') AS items,
    (SELECT count(*) FROM public.criteria WHERE user_id = '${userId}') AS criteria,
    (SELECT count(*) FROM public.evidence WHERE user_id = '${userId}') AS evidence,
    (SELECT count(*) FROM public.harness_runs WHERE user_id = '${userId}') AS runs`);
  console.log("\ncleanup residue:", JSON.stringify(residue[0]));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log("FAILED:", failed.map((f) => f.label).join(" | ")); process.exit(1); }
}
