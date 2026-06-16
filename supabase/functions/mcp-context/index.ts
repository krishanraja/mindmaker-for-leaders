// CTRL Memory Web as a read-only MCP server (Streamable HTTP, spec 2025-06-18).
// A leader's own agent connects with a per-leader API key and pulls LIVE, brain-
// ranked context on every call - no stale paste. Read-only; Edge-Pro gated.
//
// Stateless: we reply to each JSON-RPC request with a single application/json
// response (the spec permits this; no SSE/session needed for a read-only server).
// Auth is our own bearer token (sha256 -> mcp_tokens), so deploy --no-verify-jwt.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserContext } from "../_shared/user-context.ts";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER = { name: "CTRL Memory Web", version: "1.0.0" };

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
  // best-effort last-used stamp
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

// The tools a token may use, by scope. 'briefing' is opt-in at mint time.
function toolsFor(scopes: string[]) {
  const t = [CONTEXT_TOOL];
  if (scopes.includes("briefing")) t.push(BRIEFING_TOOL);
  return t;
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
      instructions: "Read-only access to a CTRL leader's live Memory Web. Call get_leader_context at the start of a task.",
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
