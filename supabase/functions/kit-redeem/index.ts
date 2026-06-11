/**
 * kit-redeem
 *
 * Redeems a class session code for the Kit Engine. The caller is any session
 * holder (anonymous sessions included; verify_jwt = true accepts anon JWTs).
 * Validation and insertion happen atomically inside the redeem_kit_code()
 * SECURITY DEFINER RPC, which row-locks the code while checking the window
 * and max_redemptions, so a class full of simultaneous redemptions cannot
 * oversubscribe a code. Re-redeeming the same code is idempotent and returns
 * the existing pass.
 *
 * Failure copy is deliberately generic (no code-existence oracle); the one
 * distinguished case is 'expired' so the UI can show the dead-code screen
 * with the Maven exit instead of an error.
 *
 * Rate limited per user id, never per IP: a venue full of students shares
 * one network.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";
import { getPreset, isValidSlug } from "../_shared/kit-presets/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("kit-redeem");

const INVALID_MESSAGE = "That code is not valid. Check the spelling and try again.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "A session is required to redeem a code." }, 401);
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) {
      return jsonResponse({ error: "A session is required to redeem a code." }, 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rl = await checkRateLimit(
      { maxRequests: 10, windowMs: 60 * 60 * 1000, identifier: "kit-redeem" },
      user.id,
      serviceClient,
    );
    if (!rl.allowed) {
      return jsonResponse({
        error: "Too many attempts. Wait a few minutes and try again.",
        rate_limited: true,
      }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!rawCode || rawCode.length < 4 || rawCode.length > 64) {
      return jsonResponse({ error: INVALID_MESSAGE, result: "invalid" }, 400);
    }

    // Resolve the preset version before the atomic redeem. The RPC re-validates
    // everything under a row lock; this read just supplies preset_version.
    const { data: codeRow } = await serviceClient
      .from("kit_codes")
      .select("class_slug")
      .eq("code", rawCode)
      .maybeSingle();

    if (!codeRow || !isValidSlug(codeRow.class_slug)) {
      log.info("redeem miss", { userId: user.id });
      return jsonResponse({ error: INVALID_MESSAGE, result: "invalid" }, 404);
    }

    const preset = getPreset(codeRow.class_slug)!;

    const { data: rows, error: rpcError } = await serviceClient.rpc("redeem_kit_code", {
      p_code: rawCode,
      p_user_id: user.id,
      p_preset_version: preset.version,
    });

    if (rpcError) {
      log.error("redeem_kit_code rpc failed", { userId: user.id, error: rpcError.message });
      return jsonResponse({ error: "Something went wrong. Try again." }, 500);
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row || row.result === "invalid") {
      return jsonResponse({ error: INVALID_MESSAGE, result: "invalid" }, 404);
    }
    if (row.result === "expired") {
      return jsonResponse({
        error: "This class code has ended. Codes live for a few weeks after each session.",
        result: "expired",
        class_slug: codeRow.class_slug,
        maven_url: preset.mavenUrl,
      }, 410);
    }

    log.info("redeemed", { userId: user.id, classSlug: row.class_slug });

    return jsonResponse({
      result: "ok",
      redemption: {
        id: row.redemption_id,
        class_slug: row.class_slug,
        preset_version: row.preset_version,
        expires_at: row.expires_at,
        skill_quota: row.skill_quota,
        skills_used: row.skills_used,
      },
    }, 200);
  } catch (err) {
    log.error("kit-redeem error", { error: (err as Error).message });
    return jsonResponse({ error: "Something went wrong. Try again." }, 500);
  }
});

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
