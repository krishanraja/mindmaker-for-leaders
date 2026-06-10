/**
 * send-kit-nudges
 *
 * Daily cron sweep (pg_cron, 14:00 UTC) for day-3 and day-7 kit follow-ups.
 * Service-role only: the cron job posts with the service key; anything else
 * is rejected (same gate as decision-eval).
 *
 * Who gets nudged: active redemptions with a delivery_email, inside the
 * day-3-to-5 or day-7-to-9 window since redemption, that have not logged a
 * shipped event and have not already received that nudge type. Someone who
 * shipped gets silence, not a nag.
 *
 * Supports { "dry_run": true } to preview recipients without sending.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, getDefaultSender } from "../_shared/email-utils.ts";
import { createLogger } from "../_shared/logger.ts";
import { getPreset } from "../_shared/kit-presets/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("send-kit-nudges");

const KIT_URL = "https://ctrl.themindmaker.ai/kit/me";

function roleFromJwt(bearer: string): string | null {
  try {
    let payload = bearer.split(".")[1];
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    return JSON.parse(atob(payload)).role ?? null;
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (roleFromJwt(bearer) !== "service_role") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Candidates: anything redeemed in the last 10 days with an email.
    const { data: redemptions, error: redErr } = await serviceClient
      .from("kit_redemptions")
      .select("id, user_id, class_slug, redeemed_at, delivery_email, status")
      .eq("status", "active")
      .not("delivery_email", "is", null)
      .gte("redeemed_at", new Date(now - 10 * dayMs).toISOString());

    if (redErr) {
      log.error("redemption query failed", { error: redErr.message });
      return jsonResponse({ error: redErr.message }, 500);
    }

    const candidates = (redemptions ?? []).map((r) => {
      const ageDays = (now - new Date(r.redeemed_at).getTime()) / dayMs;
      const nudgeType = ageDays >= 7 && ageDays < 9 ? "day_7" : ageDays >= 3 && ageDays < 5 ? "day_3" : null;
      return { ...r, nudgeType };
    }).filter((r) => r.nudgeType !== null);

    if (candidates.length === 0) {
      return jsonResponse({ message: "No nudges due", sent: 0 }, 200);
    }

    const ids = candidates.map((c) => c.id);

    // Shipped students get silence.
    const { data: shippedEvents } = await serviceClient
      .from("kit_journey_events")
      .select("redemption_id")
      .in("redemption_id", ids)
      .eq("event_type", "shipped");
    const shipped = new Set((shippedEvents ?? []).map((e) => e.redemption_id));

    // Already-sent dedupe.
    const { data: priorNudges } = await serviceClient
      .from("kit_nudges")
      .select("redemption_id, nudge_type")
      .in("redemption_id", ids);
    const already = new Set((priorNudges ?? []).map((n) => `${n.redemption_id}:${n.nudge_type}`));

    const due = candidates.filter((c) =>
      !shipped.has(c.id) && !already.has(`${c.id}:${c.nudgeType}`)
    );

    if (dryRun) {
      return jsonResponse({
        dry_run: true,
        due: due.map((d) => ({ redemption_id: d.id, nudge_type: d.nudgeType, class_slug: d.class_slug })),
      }, 200);
    }

    let sent = 0;
    let failed = 0;

    for (const item of due) {
      const preset = getPreset(item.class_slug);
      if (!preset) continue;

      // Dedupe-first: insert the ledger row, then send. A crash between the
      // two costs one nudge, never a double-send.
      const { error: ledgerErr } = await serviceClient.from("kit_nudges").insert({
        user_id: item.user_id,
        redemption_id: item.id,
        nudge_type: item.nudgeType,
        email: item.delivery_email,
      });
      if (ledgerErr) {
        if (ledgerErr.code !== "23505") {
          log.warn("ledger insert failed", { redemptionId: item.id, error: ledgerErr.message });
        }
        continue;
      }

      const { data: skillArtifact } = await serviceClient
        .from("kit_artifacts")
        .select("metadata")
        .eq("redemption_id", item.id)
        .eq("artifact_id", "first-skill")
        .eq("is_current", true)
        .maybeSingle();

      const meta = (skillArtifact?.metadata ?? {}) as {
        skill?: { name?: string; test_prompts?: string[] };
      };

      const template = item.nudgeType === "day_7" ? preset.emails.day7 : preset.emails.day3;
      const ctx = {
        kitUrl: KIT_URL,
        classTitle: preset.classTitle,
        skillName: meta.skill?.name,
        testPrompt: meta.skill?.test_prompts?.[0],
      };

      const result = await sendEmail({
        from: getDefaultSender("reminder"),
        to: item.delivery_email,
        subject: template.subject(ctx),
        html: template.html(ctx),
        emailType: `kit_${item.nudgeType}`,
        metadata: { redemption_id: item.id, class_slug: item.class_slug },
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
        log.warn("nudge send failed", { redemptionId: item.id, error: result.error });
      }
    }

    log.info("nudge sweep complete", { due: due.length, sent, failed });
    return jsonResponse({ sent, failed, due: due.length }, 200);
  } catch (err) {
    log.error("send-kit-nudges error", { error: (err as Error).message });
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
