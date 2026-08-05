// Phase 3a acceptance: COMPILE.
//
// Runs a real sort to completion, compiles it, and checks the mechanics that
// decide whether a rubric is worth anything:
//   a criterion is never scored on an observable that cannot be parsed,
//   under-evidenced criteria are untested rather than kept or deleted,
//   the gap distribution is reported (it tunes the [U] 0.30 threshold),
//   every criterion arrives advisory (blocking is earned, never granted),
//   AWAITING survives into my-standard.md,
//   and the label is never better than the evidence supports.
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

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon")?.api_key;
const service = keys.find((k) => k.name === "service_role")?.api_key;
const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

const email = `smoke-compile-${Date.now()}@example.com`;
const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);
const userId = (await (await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service)).json()).id;
if (!userId) throw new Error("user create failed");
console.log("test user:", userId);

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

try {
  const jwt = (await (await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })).json()).access_token;
  const fn = (name, body) => fetch(`${URL}/functions/v1/${name}`, {
    method: "POST", headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });

  // Seed constructs + own work, same shape ingest-evidence produces.
  const src = (await dbq(`INSERT INTO public.evidence_sources (user_id, kind, label, body)
    VALUES ('${userId}','transcript','Seed call','seed') RETURNING id`))[0].id;
  const POLES = [
    "it names a specific client fact",
    "it leads with the decision I need",
    "it says what changed and what it moved",
    "it is short enough to read in a minute",
    "it names a number I can check",
  ];
  for (const pole of POLES) {
    const ev = [];
    for (let i = 0; i < 2; i++) {
      const q = `${pole} example ${i}`;
      ev.push((await dbq(`INSERT INTO public.evidence (user_id, kind, body, quote, source_id, source_label, situated, situation, speaker_is_owner)
        VALUES ('${userId}','utterance','${q}','${q}','${src}','Seed call', true, 'seed situation', true) RETURNING id`))[0].id);
    }
    await dbq(`INSERT INTO public.constructs (user_id, emergent_pole, status, evidence_ids)
      VALUES ('${userId}', '${pole.replace(/'/g, "''")}', 'candidate', ARRAY['${ev[0]}','${ev[1]}']::uuid[])`);
  }
  for (let i = 0; i < 6; i++) {
    const body = `Own artefact ${i}. Acme moved from 12 to 15 this week after the pricing change. The decision I need is whether we hold the new price through Q3.`;
    await dbq(`INSERT INTO public.evidence (user_id, kind, body, quote, source_id, source_label, situated, situation, speaker_is_owner)
      VALUES ('${userId}','artefact','${body}','${body}','${src}','My own past update', true, 'past client update', true)`);
  }

  // Build and grade a full deck consistently, by body.
  const runId = (await (await fn("build-sort", { surface: "client updates", request_id: `cmp-${userId}` })).json()).run_id;
  let stage = "", waited = 0;
  while (waited < 240000) {
    const row = (await dbq(`SELECT stage, status, error FROM public.harness_runs WHERE id = '${runId}'`))[0];
    stage = row.stage;
    if (stage === "ready" || row.status === "failed") { if (row.status === "failed") throw new Error("build failed: " + row.error); break; }
    await sleep(3000); waited += 3000;
  }
  const items = await dbq(`SELECT id, body, origin, pair_role, held_out FROM public.sort_items WHERE session_id = '${runId}' ORDER BY position`);
  const verdictForBody = new Map();
  for (const it of items) {
    if (verdictForBody.has(it.body)) continue;
    verdictForBody.set(it.body,
      it.pair_role === "violates" ? "would_not_send" : it.pair_role === "satisfies" ? "send" : it.origin === "own" ? "send" : "would_not_send");
  }
  for (const it of items) {
    const v = verdictForBody.get(it.body);
    await fn("grade-sort", { run_id: runId, item_id: it.id, verdict: v,
      why: v === "send" ? "it names the client and leads with the decision" : "it could be for anyone, nothing checkable in it", ms_to_grade: 7000 });
  }
  check("deck built and fully graded", items.length >= 20, `${items.length} items`);

  // Compile.
  const compileRes = await fn("compile-standard", { run_id: runId });
  const compileJson = await compileRes.json();
  const compileRunId = compileJson.run_id ?? compileJson.compile_run_id;
  check("compile-standard accepts and returns a run", compileRes.status === 202 || compileRes.ok, `status=${compileRes.status}`);

  let cstage = "", cdetail = {}, cwaited = 0;
  while (cwaited < 240000) {
    const row = (await dbq(`SELECT stage, status, stage_detail, error FROM public.harness_runs WHERE id = '${compileRunId}'`))[0];
    cstage = row.stage; cdetail = row.stage_detail || {};
    if (["ready", "halted", "template_and_voice"].includes(cstage) || row.status === "failed") {
      if (row.status === "failed") throw new Error("compile failed: " + row.error);
      break;
    }
    await sleep(3000); cwaited += 3000;
  }
  check("compile reaches a terminal stage", ["ready", "halted", "template_and_voice"].includes(cstage), `stage=${cstage}`);

  const crit = await dbq(`SELECT name, observable, disc_verdict, disposition, n_rejected, n_accepted, n_rejected_failing, n_accepted_failing, provenance
    FROM public.criteria WHERE user_id = '${userId}' AND is_current`);
  console.log(`\ncompiled ${crit.length} criteria: ${JSON.stringify(crit.map((c) => ({ v: c.disc_verdict, obs: !!c.observable })))}\n`);

  check("every criterion arrives advisory, never blocking",
    crit.length === 0 || crit.every((c) => c.disposition === "advisory"), `${crit.length} criteria`);

  const scoredWithoutProbe = crit.filter((c) => !c.observable && c.disc_verdict !== "untested");
  check("a criterion with no parseable probe is never scored",
    scoredWithoutProbe.length === 0, `${scoredWithoutProbe.length} scored without a probe`);

  const underEvidenced = crit.filter((c) =>
    ((c.n_rejected ?? 0) < 4 || (c.n_accepted ?? 0) < 4) && c.disc_verdict === "keep");
  check("an under-evidenced criterion is never kept", underEvidenced.length === 0, `${underEvidenced.length} kept on thin data`);

  check("every criterion names where it came from",
    crit.length === 0 || crit.every((c) => c.provenance && Object.keys(c.provenance).length > 0));

  const gaps = cdetail.gap_distribution ?? cdetail.gaps ?? cdetail.summary?.gap_distribution;
  check("the gap distribution is reported for threshold tuning", Array.isArray(gaps) || (gaps && typeof gaps === "object"),
    `gaps=${JSON.stringify(gaps)?.slice(0, 120)}`);

  const art = await dbq(`SELECT name, body, metadata FROM public.generated_artifacts WHERE user_id = '${userId}' AND kind = 'standard' ORDER BY created_at DESC LIMIT 1`);
  if (cstage === "ready") {
    check("my-standard.md written as a first-class artefact", art.length === 1, art[0]?.name ?? "none");
    const body = art[0]?.body ?? "";
    check("AWAITING survives into the standard", /AWAITING/.test(body),
      `${(body.match(/AWAITING/g) || []).length} AWAITING sections`);
    check("no fabricated number where nothing was measured",
      !/NaN/.test(body) && (art[0]?.metadata?.precision ?? null) === null,
      `precision=${JSON.stringify(art[0]?.metadata?.precision ?? null)}`);
    check("the label is not better than the evidence supports",
      ["draft", "provisional"].includes(String(art[0]?.metadata?.label ?? "").toLowerCase()),
      `label=${art[0]?.metadata?.label}`);
    check("no em dashes in the rendered standard", !body.includes(String.fromCharCode(0x2014)));
  } else {
    check("a refusing compile writes no standard and says why",
      art.length === 0 && !!(cdetail.outcome || cdetail.reason), `stage=${cstage} detail=${JSON.stringify(cdetail).slice(0, 100)}`);
  }
} finally {
  const del = await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  check("cleanup: account deleted", del.ok, `status=${del.status}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
