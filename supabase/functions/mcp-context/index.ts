// CTRL Memory Web as a read-only MCP server (Streamable HTTP, spec 2025-06-18).
// A leader's own agent connects with a per-leader API key and pulls LIVE, brain-
// ranked context on every call - no stale paste. Read-only; Edge-Pro gated.
//
// One honesty note about "live" (CH-02). The CONTEXT tools are live in the full
// sense: they read the leader's current rows on every call. A SKILL is a
// rendered artefact, so what is live about get_skill is the fetch, not the
// content: the body was written when the package was built. Rather than imply
// otherwise, get_skill compares the criteria version that body was rendered
// from against where the leader's standard is now, and appends one line saying
// so when the two differ. Nothing here regenerates itself and nothing here
// claims to.
//
// Stateless: we reply to each JSON-RPC request with a single application/json
// response (the spec permits this; no SSE/session needed for a read-only server).
// Auth is our own bearer token (sha256 -> mcp_tokens), so deploy --no-verify-jwt.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserContext } from "../_shared/user-context.ts";
import { parseFlattenedPackage } from "../_shared/skill-package.ts";
import { isStale, maxCriteriaVersion, withStalenessNote } from "../_shared/staleness.ts";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER = { name: "CTRL Memory Web", version: "1.2.0" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
};

function rpc(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Resolve a bearer token -> the owning leader, enforcing not-revoked + active Edge Pro.
async function authLeader(admin: SupabaseClient, authHeader: string | null): Promise<
  { ok: true; userId: string; scopes: string[] } | { ok: false; status: number; message: string }
> {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("ctrl_mcp_")) return { ok: false, status: 401, message: "Missing or malformed MCP token" };
  const hash = await sha256Hex(token);
  const { data: row } = await admin
    .from("mcp_tokens")
    .select("id, user_id, revoked_at, scopes")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!row || row.revoked_at) return { ok: false, status: 401, message: "Invalid or revoked MCP token" };
  // Edge Pro is the security boundary (frontend only hides the UI).
  const { data: sub } = await admin
    .from("edge_subscriptions")
    .select("status")
    .eq("user_id", row.user_id)
    .eq("status", "active")
    .maybeSingle();
  if (!sub) return { ok: false, status: 403, message: "This Memory Web requires an active Edge Pro subscription" };
  // Best-effort last-used stamp. Kept because the Settings key list reads it,
  // but it is no longer the usage record: one timestamp overwritten per call
  // cannot say which skill was pulled or how often, so the read tools write a
  // row to mcp_pulls as well (CH-01b).
  void admin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  return { ok: true, userId: row.user_id, scopes: (row.scopes as string[]) ?? ["read"] };
}

const CONTEXT_TOOL = {
  name: "get_leader_context",
  description:
    "The leader's LIVE operating context from CTRL's Memory Web - identity, company, current objectives, blockers, confirmed patterns, and recent decisions, ranked by importance. Pull this at the start of a task so you act on who they are right now, not a stale snapshot.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};
const BRIEFING_TOOL = {
  name: "get_todays_briefing",
  description:
    "The leader's latest CTRL Daily Briefing as text - today's macro read and priorities. Use it so your actions align with what matters to the leader today (e.g. a scheduling agent knows the priorities, an email agent knows the macro view).",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};

const LIST_SKILLS_TOOL = {
  name: "list_skills",
  description:
    "List the skills (reusable agent workflows) the leader has built in CTRL - each one a bounded, repeatable task written in the leader's own voice and grounded in their Memory Web. Call this to discover what the leader has already codified, then pull one with get_skill before doing that kind of work.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
};
const GET_SKILL_TOOL = {
  name: "get_skill",
  description:
    "Fetch one of the leader's CTRL skills by name (as returned by list_skills) - the whole package the leader built for a recurring task: the router (SKILL.md) plus every file it routes to, each under a '## file: <path>' heading. Load it and follow it verbatim so the output matches how the leader actually does this work, in their voice. Pass 'file' to fetch a single file from the package instead of all of it.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The skill name from list_skills." },
      file: {
        type: "string",
        description:
          "Optional. One path from list_skill_files, e.g. 'rubric/core.md'. Omit to get the whole package.",
      },
    },
    required: ["name"],
    additionalProperties: false,
  },
};
const LIST_SKILL_FILES_TOOL = {
  name: "list_skill_files",
  description:
    "List the files inside one of the leader's CTRL skills (the router plus its rubric, references, exemplars and evals). Call this when you want one part of a package rather than the whole thing, then pass a path to get_skill's 'file' argument.",
  inputSchema: {
    type: "object",
    properties: { name: { type: "string", description: "The skill name from list_skills." } },
    required: ["name"],
    additionalProperties: false,
  },
};

// Scopes decide WHICH tools a token may call: 'briefing' is opt-in at mint
// time, skills ride the base read scope. Access itself is a separate gate -
// authLeader requires an active Edge Pro subscription before any dispatch, so
// every tool here is paid. Per docs/PRICING.md the live MCP pull is the paid
// feature; building skills in CTRL stays free.
function toolsFor(scopes: string[]) {
  const t = [CONTEXT_TOOL, LIST_SKILLS_TOOL, GET_SKILL_TOOL, LIST_SKILL_FILES_TOOL];
  if (scopes.includes("briefing")) t.push(BRIEFING_TOOL);
  return t;
}

interface SkillRow {
  id: string;
  name: string;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** The leader's built skills (newest first), from the unified artifact store. */
async function fetchSkills(admin: SupabaseClient, userId: string): Promise<SkillRow[]> {
  const { data } = await admin
    .from("generated_artifacts")
    .select("id, name, body, metadata, created_at")
    .eq("user_id", userId)
    .eq("kind", "skill")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as SkillRow[]) ?? [];
}

/**
 * Where the leader's standard is NOW. One query, read once per request.
 *
 * Per surface, because that is the unit the writer records against: a package
 * built for client updates is not out of date because a criterion moved on a
 * different surface. An artefact that recorded no surface is compared against
 * the overall max, which is the same predicate its writer used.
 *
 * Best effort: a failed read returns zeroes, which read as "no standard to
 * diverge from" and therefore claim nothing. Inventing a version here would
 * produce a staleness warning about a comparison that never happened.
 */
interface CriteriaVersions {
  bySurface: Map<string, number>;
  overall: number;
}

async function loadCriteriaVersions(
  admin: SupabaseClient,
  userId: string,
): Promise<CriteriaVersions> {
  const empty: CriteriaVersions = { bySurface: new Map(), overall: 0 };
  try {
    const { data } = await admin
      .from("criteria")
      .select("version, surface")
      .eq("user_id", userId)
      .eq("is_current", true);
    const rows = (data as Array<{ version?: unknown; surface?: unknown }>) ?? [];
    const bySurface = new Map<string, number>();
    for (const row of rows) {
      const surface = typeof row.surface === "string" ? row.surface.trim() : "";
      if (!surface) continue;
      const next = maxCriteriaVersion([row]);
      if (next > (bySurface.get(surface) ?? 0)) bySurface.set(surface, next);
    }
    return { bySurface, overall: maxCriteriaVersion(rows) };
  } catch {
    return empty;
  }
}

/** The version this one artefact should be compared against. */
function versionFor(versions: CriteriaVersions, surface: string | null): number {
  if (!surface) return versions.overall;
  return versions.bySurface.get(surface) ?? 0;
}

/** What the artefact says it was compiled from. Null when it never recorded one. */
function artifactCriteriaVersion(row: SkillRow): number | null {
  const raw = (row.metadata ?? {})["criteria_version"];
  return typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : null;
}

function artifactSurface(row: SkillRow): string | null {
  const raw = (row.metadata ?? {})["surface"];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/**
 * The package's files, from the flat form `get_skill` serves.
 *
 * A skill built before the router-plus-leaves package (and every /build skill,
 * which stores a single body) carries no '## file:' delimiters at all. That is
 * one file, and saying so is more useful than an empty list that reads like a
 * broken package.
 */
function packageFiles(row: SkillRow): Array<{ path: string; content: string }> {
  const parsed = parseFlattenedPackage(row.body ?? "");
  if (parsed.length > 0) return parsed;
  return [{ path: "SKILL.md", content: (row.body ?? "").trim() }];
}

/**
 * One row per read call (CH-01b).
 *
 * Fire-and-forget on purpose: an agent waiting on a live context pull should
 * never wait on our bookkeeping, and a failed insert must never turn a good
 * pull into an error. Async so a rejection is caught here rather than surfacing
 * as an unhandled rejection in the isolate.
 */
async function logPull(
  admin: SupabaseClient,
  userId: string,
  tool: string,
  skill?: { name: string; id: string } | null,
): Promise<void> {
  try {
    await admin.from("mcp_pulls").insert({
      user_id: userId,
      tool,
      skill_name: skill?.name ?? null,
      artifact_id: skill?.id ?? null,
    });
  } catch {
    // Observability is not worth a failed pull.
  }
}

/** First prose line of a SKILL.md body (skipping headings), for the summary. */
function skillSummary(body: string): string {
  const line = (body || "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  return line ? line.slice(0, 120) : "";
}

function formatContext(c: Awaited<ReturnType<typeof getUserContext>>): string {
  const lines: string[] = [];
  const list = (label: string, items: string[]) => {
    if (items?.length) lines.push(`\n## ${label}\n` + items.map((i) => `- ${i}`).join("\n"));
  };
  lines.push(`# ${c.name}${c.role ? ` - ${c.role}` : ""}${c.company ? ` at ${c.company}` : ""}`);
  if (c.industry || c.teamSize) lines.push(`${[c.industry, c.teamSize].filter(Boolean).join(" - ")}`);
  list("Current objectives", c.objectives ?? []);
  list("Blockers", c.blockers ?? []);
  list("Confirmed patterns", c.confirmedPatterns ?? []);
  list("Strengths", c.strengths ?? []);
  list("Watching", c.watchingCompanies ?? []);
  if (c.recentDecisions?.length) {
    lines.push(`\n## Recent decisions\n` + c.recentDecisions.map((d) => `- ${typeof d === "string" ? d : JSON.stringify(d)}`).join("\n"));
  }
  if (c.preferences?.length) list("Preferences", c.preferences);
  return lines.join("\n").trim() || "No context on record yet.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  // Read-only server: GET offers no SSE stream.
  if (req.method === "GET") return new Response("Method Not Allowed", { status: 405, headers: cors });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  let msg: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    msg = await req.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }

  const { id, method } = msg;

  // Notifications (no id) - acknowledge with 202, no body (per spec).
  if (method?.startsWith("notifications/")) return new Response(null, { status: 202, headers: cors });

  // initialize is allowed without our token (handshake); everything else needs auth.
  if (method === "initialize") {
    return json(rpc(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER,
      instructions: "Read-only access to a CTRL leader's live Memory Web and the skills they have built. Call get_leader_context at the start of a task; call list_skills then get_skill to run a task the way the leader has codified it. get_skill returns the whole package (router plus every file it routes to, each under a '## file:' heading); list_skill_files plus get_skill's 'file' argument fetch one file at a time.",
    }));
  }
  if (method === "ping") return json(rpc(id, {}));

  const auth = await authLeader(admin, req.headers.get("Authorization"));
  if (!auth.ok) return json(rpcError(id, -32001, auth.message), auth.status);

  if (method === "tools/list") return json(rpc(id, { tools: toolsFor(auth.scopes) }));

  if (method === "tools/call") {
    const name = (msg.params?.name as string) ?? "";
    const ok = (text: string) => json(rpc(id, { content: [{ type: "text", text }] }));
    const err = (text: string) => json(rpc(id, { content: [{ type: "text", text }], isError: true }));
    try {
      if (name === "get_leader_context") {
        const ctx = await getUserContext(admin, auth.userId);
        return ok(formatContext(ctx));
      }
      if (name === "list_skills") {
        const skills = await fetchSkills(admin, auth.userId);
        void logPull(admin, auth.userId, "list_skills");
        if (skills.length === 0) {
          return ok("This leader has not built any CTRL skills yet.");
        }
        // One read for the whole list, not one per row.
        const versions = await loadCriteriaVersions(admin, auth.userId);
        const list = skills
          .map((s) => {
            const summary = skillSummary(s.body);
            const date = (s.created_at || "").slice(0, 10);
            const stale = isStale({
              artifactCriteriaVersion: artifactCriteriaVersion(s),
              currentCriteriaVersion: versionFor(versions, artifactSurface(s)),
            });
            const meta = [date ? `built ${date}` : null, `stale: ${stale}`]
              .filter(Boolean)
              .join(", ");
            return `- ${s.name} (${meta})${summary ? `: ${summary}` : ""}`;
          })
          .join("\n");
        return ok(
          `# The leader's CTRL skills\n${list}\n\nCall get_skill with a name to load the whole ` +
            `package, or list_skill_files to see what is in one. A skill marked stale: true was ` +
            `compiled against an older version of the leader's standard, and get_skill says so ` +
            `when it serves it.`,
        );
      }
      if (name === "get_skill" || name === "list_skill_files") {
        const args = (msg.params?.arguments as Record<string, unknown>) ?? {};
        const wanted = String(args.name ?? "").trim();
        if (!wanted) return err(`${name} requires a 'name' argument (use a name from list_skills).`);
        const skills = await fetchSkills(admin, auth.userId);
        const hit =
          skills.find((s) => s.name.toLowerCase() === wanted.toLowerCase()) ??
          skills.find((s) => s.name.toLowerCase().includes(wanted.toLowerCase()));
        if (!hit) {
          const names = skills.map((s) => s.name).join(", ") || "(none yet)";
          return err(`No skill named "${wanted}". Available: ${names}.`);
        }
        void logPull(admin, auth.userId, name, { name: hit.name, id: hit.id });

        const files = packageFiles(hit);
        if (name === "list_skill_files") {
          const rows = files.map((f) => `- ${f.path}`).join("\n");
          return ok(
            `# Files in skill: ${hit.name}\n${rows}\n\nPass one of these paths to get_skill's ` +
              `'file' argument, or call get_skill without it for the whole package.`,
          );
        }

        // The staleness comparison is the same for the whole package and for one
        // leaf out of it: a leaf served from a stale package is stale too.
        const staleness = {
          artifactCriteriaVersion: artifactCriteriaVersion(hit),
          currentCriteriaVersion: versionFor(
            await loadCriteriaVersions(admin, auth.userId),
            artifactSurface(hit),
          ),
        };

        const wantedFile = String(args.file ?? "").trim();
        if (wantedFile) {
          const file = files.find((f) => f.path === wantedFile) ??
            files.find((f) => f.path.toLowerCase() === wantedFile.toLowerCase());
          if (!file) {
            return err(
              `No file "${wantedFile}" in skill "${hit.name}". Files: ${files.map((f) => f.path).join(", ")}.`,
            );
          }
          return ok(
            withStalenessNote(`# Skill: ${hit.name}\n## file: ${file.path}\n\n${file.content}`, staleness),
          );
        }

        // The WHOLE package, router first, every leaf inlined beneath it. A
        // router whose leaves cannot be fetched resolves to nothing on the far
        // side, which is why the stored body is the flat form (CH-02).
        return ok(withStalenessNote(`# Skill: ${hit.name}\n\n${hit.body}`, staleness));
      }
      if (name === "get_todays_briefing") {
        if (!auth.scopes.includes("briefing")) return err("This key is not authorized for the briefing. Mint a key with the briefing scope enabled.");
        const { data: b } = await admin
          .from("briefings")
          .select("script_text, briefing_date")
          .eq("user_id", auth.userId)
          .order("briefing_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!b?.script_text) return ok("No briefing has been generated yet.");
        return ok(`# CTRL Daily Briefing - ${b.briefing_date}\n\n${b.script_text}`);
      }
      return err(`Unknown tool: ${name}`);
    } catch (e) {
      return err(`Tool failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  return json(rpcError(id, -32601, `Method not found: ${method}`), 200);
});
