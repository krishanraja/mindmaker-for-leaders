// Stage 5: MEASURE. Does the gate agree with the person on work it never
// trained on?
//
// This is the script that decides whether the product may use the word
// "verified". It runs the Standard lens ONLY over each held-out item, compares
// the verdict to what the person actually said, and prints precision, recall
// and TNR SEPARATELY, beside the person's own self-agreement, which is the
// ceiling on all three.
//
// Same shape as scripts/eval-decision-engine.mjs: SUPABASE_ACCESS_TOKEN, a
// mgmt() helper, the live service key, bounded concurrency, metrics computed
// client-side, a report at the end. Manual and on demand, like that one: the
// automated half of this gate is the fixture test at
// supabase/functions/_shared/confusion.test.ts, which CI runs on every PR.
//
// The arithmetic lives in supabase/functions/_shared/confusion.ts and is
// imported rather than reimplemented. A second copy of the matrix here is how
// the number a person is shown drifts from the number the tests pin.
//
// USAGE
//   node scripts/eval-skill.mjs --run <sort_run_id> [--expect verified]
//   node scripts/eval-skill.mjs --user <user_id>            (most recent sort)
//
//   --expect <draft|provisional|verified>  exit non-zero unless the release
//                                          verdict matches
//   --jwt <token>        act as this user (else CTRL_EVAL_JWT, else a magic
//                        link is minted with the service key)
//   --concurrency <n>    default 3, to stay gentle on provider rate limits
//   --timeout <seconds>  per item, default 300
//
// WHAT IT REFUSES TO DO
//   - print a number computed from a zero denominator (0/0 is NaN, and NaN
//     defaulted to 0 reads as "measured and terrible" when the truth is "not
//     measured"). Those come back null and print as "not measurable";
//   - roll the three numbers into one agreement figure;
//   - hide the excluded rows. Skips, unscoreable gate verdicts and ungraded
//     held-out items are all printed, because a shrinking denominator flatters
//     every number above it and is invisible unless it is said out loud;
//   - continue if a held-out item reached the gate as an exemplar. That is the
//     one bug that would silently inflate every number here, so it is asserted
//     per item against the ids the function actually used, and it is fatal.

import {
  confusionMatrix,
  formatNumbersForPeople,
  metricsFrom,
  releaseVerdict,
} from "../supabase/functions/_shared/confusion.ts";
import { selfAgreement } from "../supabase/functions/_shared/sort-composition.ts";
import { VERIFIED_MIN_HELD_OUT } from "../supabase/functions/_shared/discrimination.ts";

const REF = "bkyuxvschuwngtcdhsyg";
const URL_BASE = `https://${REF}.supabase.co`;

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(2);
}

// -- args -------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};
const RUN_ARG = arg("run");
const USER_ARG = arg("user");
const EXPECT = arg("expect");
const JWT_ARG = arg("jwt") ?? process.env.CTRL_EVAL_JWT ?? null;
const CONCURRENCY = Number(arg("concurrency") ?? 3);
const TIMEOUT_MS = Number(arg("timeout") ?? 300) * 1000;

if (!RUN_ARG && !USER_ARG) {
  console.error("Give me a sort to measure: --run <sort_run_id> or --user <user_id>");
  process.exit(2);
}
if (EXPECT && !["draft", "provisional", "verified"].includes(EXPECT)) {
  console.error(`--expect must be draft, provisional or verified (got ${EXPECT})`);
  process.exit(2);
}

// -- plumbing ---------------------------------------------------------------

const mgmt = async (path, init = {}) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`mgmt ${path} -> ${r.status}: ${await r.text()}`);
  return r.json();
};
const dbq = (query) => mgmt(`/database/query`, { method: "POST", body: JSON.stringify({ query }) });
const q = (s) => String(s).replace(/'/g, "''");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon")?.api_key;
const service = keys.find((k) => k.name === "service_role")?.api_key;
if (!anon || !service) throw new Error("could not read the project keys");

const authFetch = (path, init = {}, key = anon) =>
  fetch(`${URL_BASE}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

/**
 * A user JWT for the person whose sort this is.
 *
 * critique-artefact is owner-scoped and reads through the caller's own JWT, so
 * the measurement has to run AS the person, not as the service role. Pass
 * --jwt to supply one; otherwise a single-use magic link is minted with the
 * service key and exchanged for a session. Nothing is written to their account
 * either way, and the run rows this creates are their own review rows.
 */
async function userJwtFor(userId) {
  if (JWT_ARG) return JWT_ARG;
  const rows = await dbq(`SELECT email FROM auth.users WHERE id = '${q(userId)}'`);
  const email = rows?.[0]?.email;
  if (!email) throw new Error(`no email on file for ${userId}; pass --jwt instead`);

  const linkRes = await authFetch(
    "admin/generate_link",
    { method: "POST", body: JSON.stringify({ type: "magiclink", email }) },
    service,
  );
  const link = await linkRes.json();
  const hashed = link?.hashed_token ?? link?.properties?.hashed_token;
  if (!hashed) throw new Error(`could not mint a session for ${email}; pass --jwt instead`);

  const verifyRes = await authFetch("verify", {
    method: "POST",
    body: JSON.stringify({ type: "magiclink", token_hash: hashed }),
  });
  const session = await verifyRes.json();
  if (!session?.access_token) {
    throw new Error(`magic link exchange failed: ${JSON.stringify(session).slice(0, 200)}`);
  }
  return session.access_token;
}

// -- 1. find the sort -------------------------------------------------------

let runId = RUN_ARG;
let userId = USER_ARG;

if (!runId) {
  const rows = await dbq(
    `SELECT id, surface, created_at FROM public.harness_runs
     WHERE user_id = '${q(userId)}' AND kind = 'sort' AND status = 'done'
     ORDER BY created_at DESC LIMIT 1`,
  );
  if (!rows?.length) throw new Error(`no completed sort run for ${userId}`);
  runId = rows[0].id;
  console.log(`discovered sort run ${runId} (${rows[0].created_at})`);
}

const runRows = await dbq(
  `SELECT id, user_id, kind, status, surface FROM public.harness_runs WHERE id = '${q(runId)}'`,
);
const run = runRows?.[0];
if (!run) throw new Error(`no harness run ${runId}`);
if (run.kind !== "sort") throw new Error(`${runId} is a ${run.kind} run, not a sort`);
userId = run.user_id;

// -- 2. the held-out set, and their grades ----------------------------------

const heldOut = await dbq(
  `SELECT i.id, i.position, i.origin, i.body, COALESCE(g.verdict, '') AS verdict
   FROM public.sort_items i
   LEFT JOIN public.sort_grades g ON g.item_id = i.id
   WHERE i.session_id = '${q(runId)}' AND i.held_out = true AND i.repeat_of IS NULL
   ORDER BY i.position`,
);

const scoreable = heldOut.filter((it) => it.verdict === "send" || it.verdict === "would_not_send");
const skippedByPerson = heldOut.filter((it) => it.verdict === "skip");
const ungraded = heldOut.filter((it) => !it.verdict);
const heldOutGraded = scoreable.length;

// The surface the sort was run on, which is the surface whose criteria load.
const surfaceRows = await dbq(
  `SELECT DISTINCT surface FROM public.sort_items WHERE session_id = '${q(runId)}' LIMIT 1`,
);
const surface = run.surface || surfaceRows?.[0]?.surface || "";

// -- 3. self-agreement: the ceiling on precision (CH-12) --------------------

const repeatGrades = await dbq(
  `SELECT g.item_id, i.repeat_of, g.verdict
   FROM public.sort_grades g
   JOIN public.sort_items i ON i.id = g.item_id
   WHERE i.session_id = '${q(runId)}'`,
);
const agreement = selfAgreement(
  repeatGrades.map((r) => ({
    itemId: r.item_id,
    repeatOfItemId: r.repeat_of ?? null,
    verdict: r.verdict,
  })),
);

// -- 4. the exemplar pool, checked before anything runs ---------------------

const heldOutIds = new Set(heldOut.map((it) => it.id));
const poolRows = await dbq(
  `SELECT i.id, i.held_out
   FROM public.sort_grades g
   JOIN public.sort_items i ON i.id = g.item_id
   WHERE g.user_id = '${q(userId)}' AND g.verdict <> 'skip'
     AND i.held_out = false AND i.repeat_of IS NULL`,
);
const poolLeak = poolRows.filter((r) => r.held_out === true || heldOutIds.has(r.id));
if (poolLeak.length > 0) {
  console.error(
    `FATAL: ${poolLeak.length} held-out items are inside the exemplar pool. ` +
      "Every number this script would print is inflated by an unknowable amount. Stopping.",
  );
  process.exit(1);
}

// -- 5. run the gate, Standard lens only ------------------------------------

// No graded held-out work is a real answer, not an error, and it needs no
// session, no gate run and no LLM spend to reach.
const jwt = scoreable.length > 0 ? await userJwtFor(userId) : null;
const callFn = (name, body) =>
  fetch(`${URL_BASE}/functions/v1/${name}`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const leaks = [];
const notes = [];
let criteriaLoaded = null;

/**
 * One item through the gate.
 *
 * The mapping to a gate verdict is stated here rather than buried:
 *   breaks       -> any standard-lens verdict of 'breaks'
 *   holds        -> at least one scored verdict, none of them breaks
 *   insufficient -> nothing scoreable came back, or the run failed, or there
 *                   was no rubric to apply. Never silently a 'holds': a check
 *                   that could not run has not agreed with anybody.
 * A 'borderline' is not a break. The gate did not stop the work, and counting
 * a soft note as a flag would credit the gate with catches it never made.
 */
async function gateOne(item) {
  const started = await (await callFn("critique-artefact", {
    body: item.body,
    surface,
    lenses: ["standard"],
  })).json().catch(() => ({}));

  if (!started?.run_id) {
    return {
      item,
      gate: "insufficient",
      why: `the review did not start: ${String(started?.error ?? "unknown").slice(0, 120)}`,
    };
  }

  let waited = 0;
  while (waited < TIMEOUT_MS) {
    const rows = await dbq(
      `SELECT stage, status, stage_detail, error FROM public.harness_runs WHERE id = '${q(started.run_id)}'`,
    );
    const row = rows?.[0];
    if (row?.status === "failed") {
      return { item, gate: "insufficient", why: `the review failed: ${String(row.error ?? "").slice(0, 120)}` };
    }
    if (row?.stage === "ready") {
      const detail = row.stage_detail ?? {};
      const result = detail.result ?? {};
      if (criteriaLoaded === null && typeof detail.criteria_loaded === "number") {
        criteriaLoaded = detail.criteria_loaded;
      }

      // THE LEAK CHECK. The ids the function actually retrieved, against the
      // hold-out. Asserted rather than assumed, every single item.
      const usedIds = Array.isArray(result?.exemplars?.ids) ? result.exemplars.ids : [];
      for (const id of usedIds) if (heldOutIds.has(id)) leaks.push({ item: item.id, exemplar: id });

      const ran = result?.lenses?.ran ?? [];
      if (ran.some((lens) => lens !== "standard")) {
        notes.push(`item ${item.position}: a lens other than Standard ran (${ran.join(", ")})`);
      }
      if (result?.lenses?.metaRan) {
        notes.push(`item ${item.position}: the meta judge ran, so this verdict is not the lens's own`);
      }

      const verdicts = (result.judgement ?? []).filter((v) => v.lens === "standard");
      const scored = verdicts.filter((v) => ["breaks", "borderline", "holds"].includes(v.verdict));
      if (verdicts.some((v) => v.verdict === "breaks")) return { item, gate: "breaks", verdicts: verdicts.length };
      if (scored.length > 0) return { item, gate: "holds", verdicts: verdicts.length };
      return {
        item,
        gate: "insufficient",
        why: verdicts.length === 0
          ? "the check returned nothing scoreable for this piece"
          : "every judgement dropped to insufficient evidence",
      };
    }
    await sleep(3000);
    waited += 3000;
  }
  return { item, gate: "insufficient", why: "the review timed out" };
}

const outcomes = [];
for (let i = 0; i < scoreable.length; i += CONCURRENCY) {
  const batch = scoreable.slice(i, i + CONCURRENCY);
  outcomes.push(...(await Promise.all(batch.map(gateOne))));
  process.stdout.write(`  checked ${Math.min(i + CONCURRENCY, scoreable.length)}/${scoreable.length}\n`);
}

if (leaks.length > 0) {
  console.error(
    `\nFATAL: ${leaks.length} held-out items were retrieved as exemplars by the gate. ` +
      "The measurement was scored against its own answer key. Nothing below is usable.",
  );
  console.error(JSON.stringify(leaks.slice(0, 10), null, 2));
  process.exit(1);
}

// -- 6. the matrix, the metrics, the verdict --------------------------------

// Skips are carried into the matrix builder rather than dropped here, so the
// excluded counts it prints are the real ones.
const pairs = [
  ...outcomes.map((o) => ({ human: o.item.verdict, gate: o.gate, itemId: o.item.id })),
  ...skippedByPerson.map((it) => ({ human: "skip", gate: "insufficient", itemId: it.id })),
];
const matrix = confusionMatrix(pairs);
const metrics = metricsFrom(matrix);
const release = releaseVerdict({ metrics, heldOutGraded, selfAgreement: agreement });

// -- 7. the report ----------------------------------------------------------

const rate = (v) => (v === null ? "not measurable" : v.toFixed(2));
const line = (label, value, gloss) =>
  `${label.padEnd(16)}: ${String(value).padEnd(15)} ${gloss ?? ""}`.trimEnd();

/** The gloss beside a rate. Never "0 of 0", which reads as a measured zero. */
const over = (numerator, denominator, had, lacked) =>
  denominator > 0 ? `${numerator} of ${denominator} ${had}` : lacked;

console.log(`\n=== STAGE 5: MEASURE ===`);
console.log(line("sort run", runId));
console.log(line("person", userId));
console.log(line("surface", surface || "(none recorded)"));
console.log(
  line(
    "held-out",
    `${heldOut.length} items`,
    `${heldOutGraded} graded, ${skippedByPerson.length} skipped, ${ungraded.length} never graded`,
  ),
);
console.log(line("exemplar pool", `${poolRows.length} items`, "training only, 0 held out (asserted per item)"));
console.log(line("lenses", "standard only", "meta judge off: one lens has nothing to arbitrate"));
console.log(line("criteria loaded", criteriaLoaded === null ? "unknown" : criteriaLoaded));

if (criteriaLoaded === 0) {
  console.log(
    `\n!! ZERO CRITERIA LOADED. There is no rubric to measure, so this is baseline: none, ` +
      `not a score of zero (CH-03).`,
  );
}

console.log(`\nmatrix, positive class = would not send (catching what you reject is the job)`);
console.log(`  TP ${matrix.tp}   FP ${matrix.fp}`);
console.log(`  FN ${matrix.fn}   TN ${matrix.tn}`);
console.log(
  `  excluded: ${matrix.excluded.skipped} skipped by you, ` +
    `${matrix.excluded.insufficient} the check could not score, ` +
    `${ungraded.length} never graded (not sent to the check at all)`,
);

const thin = heldOutGraded < VERIFIED_MIN_HELD_OUT;
if (thin) {
  console.log(
    `\n!! FEWER THAN ${VERIFIED_MIN_HELD_OUT} GRADED HELD-OUT ITEMS (${heldOutGraded}). ` +
      `NO MEASUREMENT EXISTS at release strength: Verified is unavailable at any precision, and the ` +
      `three figures below are a diagnostic for whoever is tuning this, not a number to show anyone.`,
  );
}

console.log(`\n${thin ? "diagnostic only" : "measured"}, all three reported separately:`);
console.log(line(
  "  precision",
  rate(metrics.precision),
  over(matrix.tp, matrix.tp + matrix.fp, "flags were right", "it flagged nothing, so there is no precision"),
));
console.log(line(
  "  recall",
  rate(metrics.recall),
  over(matrix.tp, matrix.tp + matrix.fn, "of your rejects were caught", "none of the scored pieces were rejects"),
));
console.log(line(
  "  TNR",
  rate(metrics.tnr),
  over(matrix.tn, matrix.tn + matrix.fp, "of your sends were left alone", "none of the scored pieces were sends"),
));
console.log(line("  scored", metrics.n, "items that landed in a cell"));
console.log(
  line(
    "  self-agreement",
    `${agreement.matched} of ${agreement.total}`,
    "the ceiling on precision: a check cannot beat the grader (CH-12)",
  ),
);

console.log(`\nin plain words:`);
for (const l of formatNumbersForPeople(metrics)) console.log(`  ${l}`);

if (notes.length > 0) {
  console.log(`\nnotes:`);
  for (const n of notes) console.log(`  ${n}`);
}
const unscored = outcomes.filter((o) => o.gate === "insufficient");
if (unscored.length > 0) {
  console.log(`\nnot scored (${unscored.length}):`);
  for (const o of unscored) console.log(`  item ${o.item.position}: ${o.why}`);
}

console.log(`\nrelease: ${release.label.toUpperCase()}`);
console.log(`  ${release.reason}`);

if (EXPECT && release.label !== EXPECT) {
  console.error(`\nFAIL: expected ${EXPECT}, got ${release.label}`);
  process.exit(1);
}
process.exit(0);
