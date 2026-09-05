/**
 * send-reactivation-nudge
 *
 * Closes the cold-start / dormancy trap. decision-watch + send-daily-briefing
 * only fire for leaders who already have decision_cases AND opted into daily
 * emails, so a leader who set CTRL up but never weighed a decision - or who has
 * gone quiet - got ZERO re-engagement. This sweep brings them back.
 *
 * Two populations (one email each, state-aware copy):
 *   first_decision : has a brain (onboarded) but 0 decision_cases ever.
 *   dormant        : has decisions but none touched in DORMANT_DAYS.
 *
 * It is a LIFECYCLE email, not the marketing-style daily_briefing opt-in, so it
 * does not gate on daily_briefing_enabled. It is de-duped on
 * leader_notification_prefs.reactivation_nudge_sent_at with a re-arm window, so a
 * leader is nudged at most once per RE_ARM_DAYS. Batch-capped per run.
 *
 * Daily cron (pg_cron) posts with the service key; everything else is rejected.
 * Supports { "dry_run": true } to preview, and { "user_id": "..." } to target one
 * recipient (test mode, bypasses the age guard).
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, getDefaultSender, createEmailTemplate, createEmailButton, getAppUrl } from "../_shared/email-utils.ts";
import { createLogger } from "../_shared/logger.ts";
import { hasExactServiceCredential } from "../_shared/service-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("send-reactivation-nudge");

const DAY_MS = 24 * 60 * 60 * 1000;
// A leader idle this long (no decision touched) reads as dormant.
const DORMANT_DAYS = 14;
// Don't nudge an account younger than this - let them settle in first.
const MIN_ACCOUNT_AGE_HOURS = 24;
// At most one reactivation nudge per leader per this window (re-arm).
const RE_ARM_DAYS = 30;
// Hard cap on emails sent per run (cost + anti-spam guard, mirrors decision-watch's caps).
const MAX_SENDS = 50;
// Hard cap on candidate ids resolved per run, so a large base never blows the run.
const MAX_CANDIDATES = 300;

type NudgeKind = "first_decision" | "dormant";

interface Candidate {
  userId: string;
  kind: NudgeKind;
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Distinct user_ids that have onboarded (a current identity/business fact). */
async function loadOnboardedUserIds(sb: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  const { data } = await sb
    .from("user_memory")
    .select("user_id")
    .eq("is_current", true)
    .in("fact_category", ["identity", "business"])
    .limit(5000);
  for (const r of (data ?? []) as Array<{ user_id: string }>) if (r.user_id) ids.add(r.user_id);
  return ids;
}

/** Map of user_id -> newest decision_case timestamp (ms). Absent = no decisions. */
async function loadNewestDecisionAt(sb: SupabaseClient): Promise<Map<string, number>> {
  const newest = new Map<string, number>();
  const { data } = await sb
    .from("decision_cases")
    .select("user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  for (const r of (data ?? []) as Array<{ user_id: string; created_at: string }>) {
    if (!r.user_id) continue;
    const t = Date.parse(r.created_at);
    if (Number.isNaN(t)) continue;
    if (!newest.has(r.user_id)) newest.set(r.user_id, t); // first seen = newest (desc order)
  }
  return newest;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!hasExactServiceCredential(req.headers.get("Authorization"), [serviceRoleKey])) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const testUserId: string | null = typeof body?.user_id === "string" ? body.user_id : null;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = Date.now();

    // --- build the candidate set ---
    const [onboarded, newestDecisionAt] = await Promise.all([
      loadOnboardedUserIds(sb),
      loadNewestDecisionAt(sb),
    ]);

    let candidates: Candidate[] = [];
    if (testUserId) {
      const has = newestDecisionAt.has(testUserId);
      candidates = [{ userId: testUserId, kind: has ? "dormant" : "first_decision" }];
    } else {
      // first_decision: onboarded but never weighed a decision.
      for (const userId of onboarded) {
        if (!newestDecisionAt.has(userId)) candidates.push({ userId, kind: "first_decision" });
      }
      // dormant: has decisions, but the newest is older than DORMANT_DAYS.
      for (const [userId, ts] of newestDecisionAt) {
        if (now - ts > DORMANT_DAYS * DAY_MS) candidates.push({ userId, kind: "dormant" });
      }
    }

    if (candidates.length === 0) {
      return jsonResponse({ message: "No reactivation candidates", sent: 0 }, 200);
    }

    // --- dedup against prior nudges (re-arm window) ---
    const candidateIds = candidates.map((c) => c.userId).slice(0, MAX_CANDIDATES);
    const { data: prefRows } = await sb
      .from("leader_notification_prefs")
      .select("user_id, reactivation_nudge_sent_at")
      .in("user_id", candidateIds);
    const sentAt = new Map<string, number>();
    for (const r of (prefRows ?? []) as Array<{ user_id: string; reactivation_nudge_sent_at: string | null }>) {
      if (r.reactivation_nudge_sent_at) sentAt.set(r.user_id, Date.parse(r.reactivation_nudge_sent_at));
    }

    const reArmCutoff = now - RE_ARM_DAYS * DAY_MS;
    const eligible = candidates
      .filter((c) => candidateIds.includes(c.userId))
      .filter((c) => {
        const last = sentAt.get(c.userId);
        return testUserId ? true : last == null || last < reArmCutoff;
      });

    if (eligible.length === 0) {
      return jsonResponse({ message: "All candidates recently nudged", sent: 0 }, 200);
    }

    const appUrl = getAppUrl();
    const decisionUrl = `${appUrl}/decision`;
    const manageUrl = `${appUrl}/settings?tab=notifications`;

    const due: Array<Candidate & { email: string }> = [];
    for (const c of eligible) {
      if (due.length >= MAX_SENDS) break;
      // Resolve the canonical email + age guard from auth.
      const { data: userRes } = await sb.auth.admin.getUserById(c.userId);
      const u = userRes?.user;
      if (!u?.email) continue;
      if (!testUserId) {
        const ageMs = now - Date.parse(u.created_at ?? new Date(now).toISOString());
        if (Number.isFinite(ageMs) && ageMs < MIN_ACCOUNT_AGE_HOURS * 60 * 60 * 1000) continue;
      }
      due.push({ ...c, email: u.email });
    }

    if (dryRun) {
      return jsonResponse({
        dry_run: true,
        due: due.map((d) => ({ user_id: d.userId, kind: d.kind })),
        candidates: candidates.length,
        eligible: eligible.length,
      }, 200);
    }

    let sent = 0;
    let failed = 0;

    for (const item of due) {
      // Dedup-first: stamp the ledger (upsert the prefs row, service role bypasses
      // RLS), then send. A crash between the two costs one nudge, never a double.
      const { error: upsertErr } = await sb
        .from("leader_notification_prefs")
        .upsert(
          { user_id: item.userId, email: item.email, reactivation_nudge_sent_at: new Date(now).toISOString() },
          { onConflict: "user_id" },
        );
      if (upsertErr) {
        log.warn("ledger upsert failed", { userId: item.userId, error: upsertErr.message });
        continue;
      }

      const { subject, html } = buildEmail(item.kind, decisionUrl, manageUrl);
      const result = await sendEmail({
        from: getDefaultSender("reminder"),
        to: item.email,
        subject,
        html,
        emailType: `reactivation_${item.kind}`,
        metadata: { user_id: item.userId },
        tags: [{ name: "email_type", value: `reactivation_${item.kind}` }],
      });

      if (result.success) sent++;
      else {
        failed++;
        log.warn("reactivation send failed", { userId: item.userId, error: result.error });
      }
    }

    log.info("reactivation sweep complete", { candidates: candidates.length, eligible: eligible.length, due: due.length, sent, failed });
    return jsonResponse({ sent, failed, due: due.length }, 200);
  } catch (err) {
    log.error("send-reactivation-nudge error", { error: (err as Error).message });
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

// A real, on-topic AI-native starter call to anchor the nudge (the page itself
// tailors + lets them edit). Kept generic so no per-user role read is needed.
const STARTER = "Where should AI take work off my team first?";

function buildEmail(kind: NudgeKind, decisionUrl: string, manageUrl: string): { subject: string; html: string } {
  const linkWithPrefill = `${decisionUrl}?prefill=${encodeURIComponent(STARTER)}`;
  let subject: string;
  let lead: string;
  if (kind === "dormant") {
    subject = "It's been a while - one call worth weighing";
    lead = `
      <p>Good to see you back soon, I hope.</p>
      <p>Your decisions go stale as the ground shifts under them. Weigh a fresh call and I'll stress-test it against the latest evidence, then keep watching it for you.</p>`;
  } else {
    subject = "You set CTRL up - now put it to work";
    lead = `
      <p>You told me about your world. Let's use it.</p>
      <p>The fastest way to feel what CTRL does is to weigh a real decision. I'll decompose it, check it against the evidence, and show you where it holds and where it breaks, not just agree with you.</p>`;
  }
  const body = `
    ${lead}
    <blockquote style="border-left: 3px solid #10b981; padding-left: 12px; margin: 16px 0; color: #374151;">
      A good first one: <strong>${STARTER}</strong>
    </blockquote>
    ${createEmailButton(linkWithPrefill, "Weigh a decision", "#10b981")}
    <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
      This is a one-off nudge to help you get started.
      <a href="${manageUrl}" style="color: #64748b;">Manage email preferences</a>.
    </p>`;
  return { subject, html: createEmailTemplate(body, "CTRL") };
}
