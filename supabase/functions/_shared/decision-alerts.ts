// Surfaces open Decision Engine alerts inside the Daily Briefing.
//
// When the WATCH loop (decision-watch) finds that an assumption behind a
// pressure-tested decision has weakened, it writes a decision_alert. This helper
// prepends those open alerts to the briefing: as a leading DECISION ALERT
// segment AND as a spoken preamble on the script, so the morning audio opens
// with "heads up, an assumption behind your decision just weakened" before the
// news. Deterministic: it does not re-prompt the script model.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BriefingSegmentLike {
  headline: string;
  analysis: string;
  framework_tag: string;
  source: string;
  relevance_reason: string;
  // Decision linkage, stamped only on real decision-alert segments below.
  decision_case_id?: string;
  decision_statement?: string;
  [key: string]: unknown;
}

interface OpenAlert {
  id: string;
  headline: string;
  detail: string | null;
  decision_case_id: string | null;
  decision_cases: { title: string | null } | null;
}

/**
 * Returns the briefing script + segments with any open decision alerts
 * prepended, and marks those alerts as surfaced in this briefing. If there are
 * no open alerts, returns the inputs unchanged. Never throws into the caller:
 * a failure here must not break briefing generation.
 */
export async function prependDecisionAlerts<T extends BriefingSegmentLike>(
  supabase: SupabaseClient,
  userId: string,
  briefingId: string,
  script: string,
  segments: T[],
): Promise<{ script: string; segments: T[] }> {
  try {
    const { data } = await supabase
      .from("decision_alerts")
      .select("id, headline, detail, decision_case_id, decision_cases(title)")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(3);

    const alerts = (data ?? []) as unknown as OpenAlert[];
    if (alerts.length === 0) return { script, segments };

    const alertSegments = alerts.map((a) => {
      // The decision statement that grounds this alert: the real case title.
      // Only stamp the linkage when we genuinely have it (both the FK and a
      // title); never fabricate a bet for an alert that lacks a linked case.
      const caseTitle = a.decision_cases?.title?.trim() ?? "";
      const seg: BriefingSegmentLike = {
        headline: a.headline,
        analysis: a.detail ?? "",
        framework_tag: "decision_alert",
        source: "CTRL Decision Engine",
        relevance_reason: `You asked CTRL to pressure-test "${a.decision_cases?.title ?? "a decision"}". An assumption behind it has shifted, so this leads your briefing.`,
      };
      if (a.decision_case_id && caseTitle.length > 0) {
        seg.decision_case_id = a.decision_case_id;
        seg.decision_statement = caseTitle;
      }
      return seg;
    }) as unknown as T[];

    const spoken = alerts
      .map((a) => `${a.headline}. ${a.detail ?? ""}`.trim())
      .join(" ");
    const newScript = `Before today's news, a heads up from your decision watch. ${spoken} You may want to re-run that decision in CTRL. Now, your briefing. ${script}`;

    await supabase
      .from("decision_alerts")
      .update({ surfaced_in_briefing_id: briefingId })
      .in("id", alerts.map((a) => a.id));

    return { script: newScript, segments: [...alertSegments, ...segments] };
  } catch (_e) {
    return { script, segments };
  }
}
