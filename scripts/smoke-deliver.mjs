// Phase 6 acceptance: DELIVER.
//
// The claim under test is the one CH-02 said does not survive contact with
// the code: that a skill pulled over MCP is the whole package and is never
// silently stale. Both halves are checked against the deployed function.
//
// Also: one mcp_pulls row per pull call (the only honest observable of use,
// replacing a single last_used_at overwritten on every call), and that
// install state is derived from those rows rather than from a build.
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

const email = `smoke-deliver-${Date.now()}@example.com`;
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
const SKILL = "drafting-client-updates";
// A flattened router-plus-leaves package, the shape Phase 3b writes.
const FLAT = [
  "## file: SKILL.md",
  "---",
  `name: ${SKILL}`,
  "---",
  "# Drafting client updates",
  "Read rubric/core.md before drafting.",
  "",
  "## file: rubric/core.md",
  "# Core rules",
  "Lead with the decision needed [C1].",
  "",
  "## file: rubric/general.md",
  "# Fallback",
  "When no surface rule fits, say so rather than guessing.",
].join("\n");

try {
  // Edge Pro is required for MCP pull (pricing position 2, locked by CH-19).
  await dbq(`INSERT INTO public.edge_subscriptions (user_id, status) VALUES ('${userId}', 'active')
    ON CONFLICT (user_id) DO UPDATE SET status = 'active'`);

  // One criterion at version 1, and an artefact compiled against version 1.
  await dbq(`INSERT INTO public.criteria (user_id, surface, name, check_text, observable, weight, provenance, disc_verdict, disposition, version)
    VALUES ('${userId}','${q(SURFACE)}','Leads with the decision','States the decision needed.','contains:decision','essential','{"source":"smoke"}'::jsonb,'keep','advisory',1)`);
  const artifactId = (await dbq(`INSERT INTO public.generated_artifacts (user_id, kind, name, body, metadata)
    VALUES ('${userId}','skill','${q(SKILL)}','${q(FLAT)}',
    '{"criteria_version":1,"surface":"${q(SURFACE)}","rendered_at":"2026-08-05T00:00:00Z"}'::jsonb)
    RETURNING id`))[0].id;

  // mint_mcp_token is SECURITY DEFINER off auth.uid(), so it cannot mint for a
  // user we are not signed in as. The row is written directly instead, hashed
  // exactly as mcp-context hashes the bearer token (sha256 hex).
  const mcpToken = `ctrl_mcp_smoke_${Date.now()}`;
  const hashHex = [...new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(mcpToken)),
  )].map((b) => b.toString(16).padStart(2, "0")).join("");
  await dbq(`INSERT INTO public.mcp_tokens (user_id, token_hash, token_prefix, label, scopes)
    VALUES ('${userId}', '${hashHex}', '${mcpToken.slice(0, 12)}', 'smoke deliver', ARRAY['read']::text[])`);

  const mcp = async (name, args = {}) => {
    const r = await fetch(`${URL}/functions/v1/mcp-context`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${mcpToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    });
    const j = await r.json();
    const text = j?.result?.content?.[0]?.text ?? JSON.stringify(j);
    return { status: r.status, text, raw: j };
  };

  const tools = await fetch(`${URL}/functions/v1/mcp-context`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${mcpToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  }).then((r) => r.json());
  const toolNames = (tools?.result?.tools ?? []).map((t) => t.name);
  check("list_skill_files is offered under the read scope", toolNames.includes("list_skill_files"),
    toolNames.join(", "));

  // CH-02 half one: the pull returns the WHOLE package, not just a router.
  const whole = await mcp("get_skill", { name: SKILL });
  const hasRouter = whole.text.includes("SKILL.md");
  const hasLeaves = whole.text.includes("rubric/core.md") && whole.text.includes("rubric/general.md");
  check("get_skill returns the whole package, not a router whose leaves cannot be fetched",
    hasRouter && hasLeaves, `router=${hasRouter} leaves=${hasLeaves}`);

  const files = await mcp("list_skill_files", { name: SKILL });
  check("list_skill_files names the leaves", /rubric\/core\.md/.test(files.text), files.text.slice(0, 90));

  const oneLeaf = await mcp("get_skill", { name: SKILL, file: "rubric/core.md" });
  check("get_skill can fetch a single leaf",
    oneLeaf.text.includes("Lead with the decision") && !oneLeaf.text.includes("rubric/general.md"),
    oneLeaf.text.slice(0, 60).replace(/\n/g, " "));

  // Current version: no staleness line.
  check("a current package carries no staleness line",
    !/may be out of date/i.test(whole.text));

  // CH-02 half two: bump the standard, the pull must SAY it is behind.
  await dbq(`UPDATE public.criteria SET version = 2 WHERE user_id = '${userId}'`);
  const stale = await mcp("get_skill", { name: SKILL });
  check("a stale package is never served silently",
    /may be out of date/i.test(stale.text), (stale.text.match(/This was compiled[^\n]*/) || ["none"])[0].slice(0, 110));
  check("the staleness line names both versions and claims no auto-update",
    /version 1/.test(stale.text) && /version 2/.test(stale.text) && !/updated automatically|auto-update/i.test(stale.text));

  const listed = await mcp("list_skills");
  check("list_skills carries a stale flag", /"stale"\s*:\s*true/.test(listed.text) || /stale/i.test(listed.text),
    listed.text.slice(0, 100).replace(/\n/g, " "));

  // CH-01b: one row per pull call, which is what Type C drift can read.
  const pulls = await dbq(`SELECT tool, count(*) AS n FROM public.mcp_pulls WHERE user_id = '${userId}' GROUP BY tool ORDER BY tool`);
  const total = pulls.reduce((a, r) => a + Number(r.n), 0);
  check("every pull call writes a row", total >= 5, JSON.stringify(pulls));
  check("get_skill pulls are attributed to the artefact",
    (await dbq(`SELECT count(*) AS n FROM public.mcp_pulls WHERE user_id='${userId}' AND artifact_id = '${artifactId}'`))[0].n > 0);

  // A client must not be able to manufacture evidence of its own use.
  const policies = await dbq(`SELECT polcmd FROM pg_policy WHERE polrelid = 'public.mcp_pulls'::regclass`);
  check("a client cannot insert its own pull rows", !policies.some((p) => p.polcmd === "a"),
    policies.map((p) => p.polcmd).join(",") || "none");

  console.log(`\n=== PHASE 6 ===`);
  console.log(`package over MCP : ${hasRouter && hasLeaves ? "whole package" : "INCOMPLETE"}`);
  console.log(`staleness        : ${/may be out of date/i.test(stale.text) ? "declared" : "SILENT"}`);
  console.log(`pull rows        : ${total}\n`);
} finally {
  const del = await auth(`admin/users/${userId}`, { method: "DELETE" }, service);
  check("cleanup: account deleted", del.ok, `status=${del.status}`);
  const left = (await dbq(`SELECT (SELECT count(*) FROM public.mcp_pulls WHERE user_id='${userId}') AS pulls,
    (SELECT count(*) FROM public.generated_artifacts WHERE user_id='${userId}') AS artifacts`))[0];
  check("no delivery rows survive deletion", Number(left.pulls) === 0 && Number(left.artifacts) === 0,
    `pulls=${left.pulls} artifacts=${left.artifacts}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
