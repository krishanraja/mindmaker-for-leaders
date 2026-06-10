/**
 * send-kit-pack
 *
 * The "send my pack" moment. Stores the delivery email on the redemption
 * (the address nudges go to, independent of auth email confirmation), then
 * sends the pack email rendered from the class preset. Deduped via the
 * kit_nudges (redemption_id, 'pack') unique constraint, so the button is
 * safe to tap twice.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, getDefaultSender } from "../_shared/email-utils.ts";
import { createLogger } from "../_shared/logger.ts";
import { getPreset, KIT_TOOL_LABELS, type KitTool } from "../_shared/kit-presets/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("send-kit-pack");

const KIT_URL = "https://ctrl.themindmaker.ai/kit/me";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Session required." }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) return jsonResponse({ error: "Session required." }, 401);

    const body = await req.json().catch(() => ({}));
    const redemptionId = typeof body?.redemption_id === "string" ? body.redemption_id : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!redemptionId) return jsonResponse({ error: "redemption_id is required." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return jsonResponse({ error: "Enter a valid email address." }, 400);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: redemption } = await serviceClient
      .from("kit_redemptions")
      .select("id, user_id, class_slug")
      .eq("id", redemptionId)
      .maybeSingle();

    if (!redemption || redemption.user_id !== user.id) {
      return jsonResponse({ error: "Redemption not found." }, 404);
    }

    const preset = getPreset(redemption.class_slug);
    if (!preset) return jsonResponse({ error: "This class kit is not available." }, 500);

    await serviceClient
      .from("kit_redemptions")
      .update({ delivery_email: email })
      .eq("id", redemptionId);

    // Dedupe: the unique constraint makes a second tap a no-op.
    const { error: dedupeErr } = await serviceClient.from("kit_nudges").insert({
      user_id: user.id,
      redemption_id: redemptionId,
      nudge_type: "pack",
      email,
    });
    if (dedupeErr) {
      if (dedupeErr.code === "23505") {
        return jsonResponse({ ok: true, already_sent: true }, 200);
      }
      log.error("kit_nudges insert failed", { error: dedupeErr.message });
      return jsonResponse({ error: "Could not send right now. Try again." }, 500);
    }

    // Pull the first skill's name and first test prompt for the email body.
    const { data: skillArtifact } = await serviceClient
      .from("kit_artifacts")
      .select("metadata")
      .eq("redemption_id", redemptionId)
      .eq("artifact_id", "first-skill")
      .eq("is_current", true)
      .maybeSingle();

    const meta = (skillArtifact?.metadata ?? {}) as {
      skill?: { name?: string; test_prompts?: string[] };
    };

    const ctx = {
      kitUrl: KIT_URL,
      classTitle: preset.classTitle,
      skillName: meta.skill?.name,
      testPrompt: meta.skill?.test_prompts?.[0],
      toolLabel: KIT_TOOL_LABELS[(body?.tool as KitTool) ?? "claude"] ?? "your AI tool",
    };

    const result = await sendEmail({
      from: getDefaultSender("notification"),
      to: email,
      subject: preset.emails.pack.subject(ctx),
      html: preset.emails.pack.html(ctx),
      emailType: "kit_pack",
      metadata: { redemption_id: redemptionId, class_slug: redemption.class_slug },
    });

    if (!result.success) {
      // Roll back the dedupe row so a retry can actually send.
      await serviceClient
        .from("kit_nudges")
        .delete()
        .eq("redemption_id", redemptionId)
        .eq("nudge_type", "pack");
      log.error("pack email send failed", { error: result.error });
      return jsonResponse({ error: "Could not send right now. Try again." }, 502);
    }

    log.info("pack sent", { redemptionId });
    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    log.error("send-kit-pack error", { error: (err as Error).message });
    return jsonResponse({ error: "Something went wrong. Try again." }, 500);
  }
});

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
