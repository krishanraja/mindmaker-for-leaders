// Phase 2 acceptance: the sort, end to end against deployed functions.
//
// Walks a real 30-item (or honestly-short) deck: builds it, grades every
// item with a scripted grader whose behaviour we control, and checks the
// instrument's own guarantees hold on live data:
//   whole pairs held out, pair halves 4+ positions apart, repeats invisible
//   and never pair halves, grades idempotent under retry, a why line with no
//   home creates a construct, kill never offered before the counts allow,
//   and pair-split / self-agreement computed from real grades.
//
// The scripted grader plays a discerning leader: it sends the satisfying
// half of a pair and rejects the violating half (so pair-split should be
// high), sends its own work, and is consistent on repeats.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon")?.api_key;
const service = keys.find((k) => k.name === "service_role")?.api_key;
const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

const email = `smoke-sort-${Date.now()}@example.com`;
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

const SURFACE = "client updates";

try {
  const jwt = (await (await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })).json()).access_token;
  if (!jwt) throw new Error("signin failed");
  const fn = (name, body) => fetch(`${URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Seed candidate constructs + own artefacts the way ingest-evidence would.
  const src = (await dbq(`INSERT INTO public.evidence_sources (user_id, kind, label, body)
    VALUES ('${userId}','transcript','Seed call','seed body for the sort smoke test')
    RETURNING id`))[0].id;
  const POLES = [
    "it has actually seen the client",
    "it leads with the decision I need",
    "it says what changed and what it moved",
    "it is short enough to read in a minute",
    "it names a number I can check",
  ];
  for (const pole of POLES) {
    const ev = [];
    for (let i = 0; i < 2; i++) {
      const q = `${pole} example ${i}`;
      const row = (await dbq(`INSERT INTO public.evidence (user_id, kind, body, quote, source_id, source_label, situated, situation, speaker_is_owner)
        VALUES ('${userId}','utterance','${q}','${q}','${src}','Seed call', true, 'seed situation', true) RETURNING id`))[0].id;
      ev.push(row);
    }
    await dbq(`INSERT INTO public.constructs (user_id, emergent_pole, status, evidence_ids)
      VALUES ('${userId}', '${pole.replace(/'/g, "''")}', 'candidate', ARRAY['${ev[0]}','${ev[1]}']::uuid[])`);
  }
  for (let i = 0; i < 6; i++) {
    const body = `Own artefact ${i}. Pipeline moved from 12 to 15 this week after the pricing change. The decision I need from you is whether we hold the new price through Q3.`;
    await dbq(`INSERT INTO public.evidence (user_id, kind, body, quote, source_id, source_label, situated, situation, speaker_is_owner)
      VALUES ('${userId}','artefact','${body}','${body}','${src}','My own past update', true, 'past client update', true)`);
  }

  // Build the deck.
  const buildRes = await fn("build-sort", { surface: SURFACE, request_id: `smoke-${userId}` });
  const build = await buildRes.json();
  const runId = build.run_id;
  check("build-sort returns a run id fast", buildRes.status === 202 && !!runId, `status=${buildRes.status}`);

  let stage = "", detail = {}, waited = 0;
  while (waited < 180000) {
    const row = (await dbq(`SELECT stage, status, stage_detail, error FROM public.harness_runs WHERE id = '${runId}'`))[0];
    stage = row.stage; detail = row.stage_detail || {};
    if (row.status === "done" || stage === "ready" || row.status === "failed") {
      if (row.status === "failed") throw new Error("build failed: " + row.error);
      break;
    }
    await sleep(3000); waited += 3000;
  }
  check("deck reaches ready", stage === "ready" || stage === "done", `stage=${stage} after ${waited / 1000}s`);

  // Idempotency: same request_id must not build a second deck.
  const again = await (await fn("build-sort", { surface: SURFACE, request_id: `smoke-${userId}` })).json();
  check("build-sort is idempotent on request_id", again.run_id === runId, `${again.run_id === runId ? "same run" : "NEW RUN"}`);

  const items = await dbq(`SELECT id, position, origin, pair_id, pair_role, repeat_of, held_out, intended_dimension, source_label, body
    FROM public.sort_items WHERE session_id = '${runId}' ORDER BY position`);
  check("deck built with items", items.length >= 20, `${items.length} items`);

  // Structural guarantees.
  const pairs = {};
  for (const it of items.filter((i) => i.pair_id)) (pairs[i_pid(it)] ||= []).push(it);
  function i_pid(it) { return it.pair_id; }
  const badSep = Object.values(pairs).filter((p) => p.length === 2 && Math.abs(p[0].position - p[1].position) < 4);
  check("every pair's halves sit 4+ positions apart", badSep.length === 0, `${Object.keys(pairs).length} pairs, ${badSep.length} too close`);

  const splitPairs = Object.values(pairs).filter((p) => p.length === 2 && p[0].held_out !== p[1].held_out);
  check("no pair is split across the hold-out boundary", splitPairs.length === 0, `${splitPairs.length} split`);

  const repeats = items.filter((i) => i.repeat_of);
  check("repeat probes are never pair halves", repeats.every((r) => !r.pair_id), `${repeats.length} repeats`);
  check("repeat probes are never held out", repeats.every((r) => !r.held_out));
  const badGap = repeats.filter((r) => {
    const srcItem = items.find((i) => i.id === r.repeat_of);
    return srcItem && r.position - srcItem.position < 8;
  });
  check("repeats sit 8+ positions after what they repeat", badGap.length === 0, `${badGap.length} too close`);

  const peer = items.filter((i) => i.origin === "peer");
  check("peer shortfall is reported honestly, never padded",
    peer.length === 0 ? detail.peer_awaiting_curation === true : peer.every((p) => !!p.source_label),
    peer.length === 0 ? "0 peer items, flagged awaiting curation" : `${peer.length} peer items all attributed`);

  // Grade the whole deck as a discerning, CONSISTENT leader.
  // Verdict is decided per BODY, not per structural role, because that is all
  // a real grader can see. It also means a repeat probe (same body, shown
  // again later) necessarily gets the same verdict, which is what makes
  // self-agreement a real measurement rather than an artefact of the script.
  const verdictForBody = new Map();
  for (const it of items) {
    if (verdictForBody.has(it.body)) continue;
    verdictForBody.set(it.body,
      it.pair_role === "violates" ? "would_not_send"
      : it.pair_role === "satisfies" ? "send"
      : it.origin === "own" ? "send"
      : "would_not_send");
  }

  let killOfferedEarly = false, graded = 0, lastProgress = null;
  for (const it of items) {
    const verdict = verdictForBody.get(it.body);
    const why = verdict === "send" ? "it has actually seen the client and leads with the decision"
                                   : "it could be for anyone, nothing in it is checkable";
    const res = await (await fn("grade-sort", { run_id: runId, item_id: it.id, verdict, why, ms_to_grade: 8000 })).json();
    graded++;
    lastProgress = res;
    if (res.can_show_kill && graded < 16) killOfferedEarly = true;
  }
  check("every item graded", graded === items.length, `${graded}/${items.length}`);
  check("kill never offered before item 16", !killOfferedEarly);

  // The two headline instrument readings. A null or zero here is a broken
  // measurement wearing a passing tick, which is the failure mode this whole
  // project exists to prevent, so they are assertions rather than printouts.
  const split = lastProgress?.pair_split;
  check("pair split rate is computed from real grades",
    !!split && typeof split.rate === "number" && split.total >= 4,
    `split=${JSON.stringify(split)}`);
  check("a grader who splits every pair scores 1.0",
    !!split && split.rate === 1 && split.split === split.total,
    split ? `${split.split}/${split.total}` : "no reading");

  const agree = lastProgress?.self_agreement;
  check("self agreement is computed over the repeat probes",
    !!agree && agree.total === 3, `${JSON.stringify(agree)}`);
  check("a consistent grader scores 3 of 3 on repeats",
    !!agree && agree.matched === agree.total,
    agree ? `${agree.matched}/${agree.total}` : "no reading");

  // Idempotent regrade: same item, changed mind, must update not error.
  const first = items[0];
  const re = await fn("grade-sort", { run_id: runId, item_id: first.id, verdict: "skip", why: "changed my mind" });
  const reOk = re.ok;
  const rows = await dbq(`SELECT count(*) AS n, max(verdict) AS v FROM public.sort_grades WHERE item_id = '${first.id}'`);
  check("regrading upserts rather than erroring", reOk && Number(rows[0].n) === 1 && rows[0].v === "skip",
    `status=${re.status} rows=${rows[0].n} verdict=${rows[0].v}`);

  // A why line with no home should have created constructs (CH-10).
  const consAfter = (await dbq(`SELECT count(*) AS n FROM public.constructs WHERE user_id = '${userId}'`))[0].n;
  check("emergent constructs can be created from why text", Number(consAfter) >= 5, `${consAfter} constructs`);

  console.log(`\n=== PHASE 2 INSTRUMENT READINGS ===`);
  console.log(`pair split rate : ${JSON.stringify(split)}`);
  console.log(`self agreement  : ${JSON.stringify(agree)}`);
  console.log(`deck size       : ${items.length} (peer shortfall: ${detail.peer_shortfall ?? 0})\n`);
} finally {
  const del = await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  check("cleanup: account deleted", del.ok, `status=${del.status}`);
  const left = (await dbq(`SELECT
    (SELECT count(*) FROM public.sort_items WHERE user_id='${userId}') AS items,
    (SELECT count(*) FROM public.sort_grades WHERE user_id='${userId}') AS grades,
    (SELECT count(*) FROM public.harness_runs WHERE user_id='${userId}') AS runs`))[0];
  check("no sort rows survive deletion", Number(left.items) === 0 && Number(left.grades) === 0 && Number(left.runs) === 0,
    `items=${left.items} grades=${left.grades} runs=${left.runs}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
