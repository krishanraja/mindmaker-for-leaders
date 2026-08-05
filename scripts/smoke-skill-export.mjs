// End-to-end smoke test for generate-skill-export after the Phase 0 fixes.
// Verifies: (1) a skill generates end to end for a throwaway user, (2) the
// voice-lock gate check actually evaluates when a voice profile exists (it was
// vacuously passing for every skill ever generated), (3) the ZIP lands in the
// skill-packages bucket with zip_path written, (4) the user can re-download
// their own package via a signed URL under their own JWT (the Library path),
// (5) account deletion still works with the new FK rules.
// Requires SUPABASE_ACCESS_TOKEN (sbp_) in env.

const REF = "bkyuxvschuwngtcdhsyg";
const URL = `https://${REF}.supabase.co`;
const FN = `${URL}/functions/v1/generate-skill-export`;
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

const keys = await mgmt(`/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === "anon")?.api_key;
const service = keys.find((k) => k.name === "service_role")?.api_key;
if (!anon || !service) throw new Error("could not resolve anon/service keys");

const auth = (path, init = {}, key = anon) =>
  fetch(`${URL}/auth/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) } });

const email = `smoke-skill-${Date.now()}@example.com`;
const password = "Test-Passw0rd-" + Math.floor(Date.now() / 1000);

const created = await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }, service);
const createdJson = await created.json();
const userId = createdJson.id;
if (!userId) throw new Error("user create failed: " + JSON.stringify(createdJson));
console.log("test user:", userId);

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

try {
  // Seed a voice profile so voice_profile_present rides into the gate.
  const profile = JSON.stringify({
    signoff: "none", disagreement: "direct", contentArchetype: "argument",
    sentenceLength: "short-punchy", firstPerson: "minimal-I", punctuationStyle: "minimal",
    hardRules: ["Short sentences. No filler."], sampleVoice: "Pipeline is down 12%. Here is what I am doing about it and the one decision I need from you.",
    source: "context",
  }).replace(/'/g, "''");
  await dbq(`INSERT INTO public.user_memory (user_id, fact_key, fact_category, fact_subtype, fact_label, fact_value, source_type, confidence_score, verification_status, importance, temperature, is_current)
    VALUES ('${userId}', 'ctrl_voice_profile', 'preference', 'communication_style', 'Voice and style profile', '${profile}', 'form', 1, 'verified', 8, 'hot', true)`);

  const signin = await auth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const session = await signin.json();
  const jwt = session.access_token;
  if (!jwt) throw new Error("signin failed: " + JSON.stringify(session));

  const transcript = "Every Monday I write my board update. I pull the pipeline numbers from HubSpot, the cash position from the finance sheet, and write a one-page narrative: wins, risks, asks. It always opens with the single decision I need from the board, because a board that reads a page without a decision gives you nothing back. Keep it under a page. No bullet points; the board reads it as one continuous argument. Written in my voice: direct, short sentences. I would kick it off by saying draft my board update.";

  const inv = await fetch(FN, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  const out = await inv.json();
  if (!inv.ok) throw new Error(`invoke -> ${inv.status}: ${JSON.stringify(out).slice(0, 300)}`);

  check("triage passed and skill generated", !!out.skill?.name && !!out.zip_base64, out.skill?.name);

  const vl = (out.quality_gate?.checks || []).find((c) => c.id === "body.voiceLockSurfaced");
  check(
    "voice-lock check evaluates (not vacuous)",
    !!vl && !/not required/i.test(vl.detail || ""),
    vl ? `passed=${vl.passed} detail=${vl.detail}` : "check missing",
  );

  const rows = await dbq(`SELECT zip_path FROM public.skill_exports WHERE user_id = '${userId}' AND triage_result = 'skill' ORDER BY created_at DESC LIMIT 1`);
  const zipPath = rows?.[0]?.zip_path;
  check("skill_exports.zip_path written", typeof zipPath === "string" && zipPath.length > 0, zipPath || "null");

  const art = await dbq(`SELECT metadata->>'zip_path' AS zip_path, metadata->>'provider' AS provider FROM public.generated_artifacts WHERE user_id = '${userId}' AND kind = 'skill' ORDER BY created_at DESC LIMIT 1`);
  check("generated_artifacts carries zip_path + provider", !!art?.[0]?.zip_path && !!art?.[0]?.provider, `provider=${art?.[0]?.provider}`);

  const obj = await dbq(`SELECT name FROM storage.objects WHERE bucket_id = 'skill-packages' AND name LIKE '${userId}/%' LIMIT 1`);
  check("ZIP object exists in skill-packages bucket", !!obj?.[0]?.name);

  // The Library path: the USER signs their own package URL and downloads it.
  if (zipPath) {
    const signRes = await fetch(`${URL}/storage/v1/object/sign/skill-packages/${zipPath}`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 300 }),
    });
    const signJson = await signRes.json();
    let gotZip = false;
    if (signJson?.signedURL) {
      const dl = await fetch(`${URL}/storage/v1${signJson.signedURL}`);
      const buf = new Uint8Array(await dl.arrayBuffer());
      gotZip = dl.ok && buf[0] === 0x50 && buf[1] === 0x4b; // "PK"
    }
    check("user re-downloads own ZIP via signed URL", gotZip, signRes.status.toString());
  } else {
    check("user re-downloads own ZIP via signed URL", false, "no zip_path");
  }
} finally {
  // Cleanup: storage object then the user. deleteUser doubles as the FK test:
  // this user holds rows in skill_exports, generated_artifacts, user_memory
  // and ai_usage_audit, so a NO ACTION FK would fail it.
  await dbq(`DELETE FROM storage.objects WHERE bucket_id = 'skill-packages' AND name LIKE '${userId}/%'`).catch(() => {});
  const del = await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  check("account deletion succeeds with new FK rules", del.ok, `status=${del.status}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
