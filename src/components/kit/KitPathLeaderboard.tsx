import { useMemo } from "react";
import type { IntakeAnswers } from "@/content/kits";
// The leaderboard runs the SAME deterministic engine the kit composes from, so
// the live preview and the final recommendation can never disagree. Plain TS,
// bundled by Vite (same import path style as kitPdf.ts).
import { scoreChief } from "../../../supabase/functions/_shared/kit-presets/chief-of-staff/scoring";
import { RUNG_DETAIL } from "../../../supabase/functions/_shared/kit-presets/chief-of-staff/templates";

/**
 * The live path leaderboard (spec 2.7, the desktop right pane for the
 * chief-of-staff decision kit). As each answer lands it re-runs the scoring
 * engine and re-ranks the seven rungs, so the person watches their
 * recommendation form instead of waiting for a verdict at the end. It is the
 * signature moment of a decision kit: honest (the same engine), and alive.
 *
 * Desktop-only by placement (the parent hides it below md); on mobile the quiz
 * stays single-column and the reveal carries the recommendation.
 */

/** The eight scored inputs; the leaderboard "forms" as these are answered. */
const DECISION_KEYS = ["tech", "time", "budget", "privacy", "job", "autonomy", "now", "maintain"] as const;
const ALL_RUNGS = [1, 2, 3, 4, 5, 6, 7];

export function KitPathLeaderboard({ answers }: { answers: IntakeAnswers }) {
  const answered = DECISION_KEYS.filter((k) => answers[k]?.optionId).length;

  const { ranked, recommended, ruledOut } = useMemo(() => {
    const s = scoreChief(answers);
    const eligible = new Set(s.ranked.map((r) => r.rung));
    return {
      ranked: s.ranked,
      recommended: s.recommended,
      ruledOut: ALL_RUNGS.filter((r) => !eligible.has(r)).length,
    };
  }, [answers]);

  const scores = ranked.map((r) => r.score);
  const max = Math.max(...scores, 1);
  const min = Math.min(...scores, 0);
  const widthFor = (score: number) => {
    if (max === min) return 100;
    const pct = ((score - min) / (max - min)) * 100;
    return Math.max(14, Math.round(pct)); // floor so even the lowest reads
  };

  const firm = answered >= DECISION_KEYS.length;
  const heading = answered === 0 ? "Your best-fit path" : firm ? "Your best-fit path" : "Forming your match";

  return (
    <div
      className="flex flex-col gap-3.5 rounded-2xl border p-5"
      style={{
        background: "linear-gradient(180deg,#FBFDFB,#F4F7F3)",
        borderColor: "var(--kit-line)",
        boxShadow: "0 1px 2px rgba(16,28,30,.05)",
      }}
    >
      <div className="flex items-center gap-2 text-[15px] font-extrabold" style={{ color: "var(--kit-ink)" }}>
        {heading}
        {answered > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
            style={{
              fontFamily: "var(--kit-display)",
              letterSpacing: "0.08em",
              color: "var(--kit-acc-deep)",
              background: "var(--kit-acc-soft)",
              border: "1px solid var(--kit-acc-line)",
            }}
          >
            live
          </span>
        )}
      </div>

      {answered === 0 ? (
        <div className="my-auto px-4 text-center text-[13px] leading-relaxed" style={{ color: "var(--kit-faint)" }}>
          <div className="mx-auto mb-3.5 h-[54px] w-[54px] rounded-full" style={{ border: "2px dashed var(--kit-rail)" }} />
          Seven ways to build a chief of staff. Answer along, and the one that fits you rises to the top here.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {ranked.map((r, i) => {
              const isTop = r.rung === recommended.rung;
              return (
                <div
                  key={r.rung}
                  className="rounded-xl border p-2.5 transition-all"
                  style={{
                    background: isTop ? "var(--kit-acc-soft)" : "var(--kit-card)",
                    borderColor: isTop ? "var(--kit-acc)" : "var(--kit-line)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-[22px] w-[22px] flex-none place-items-center rounded-md text-[11px] font-bold"
                      style={{
                        background: isTop ? "var(--kit-acc)" : "var(--kit-line2)",
                        color: isTop ? "#fff" : "var(--kit-mut)",
                      }}
                    >
                      {r.rung}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-[13px] font-bold"
                      style={{ color: isTop ? "var(--kit-acc-deep)" : "var(--kit-ink2)" }}
                    >
                      {RUNG_DETAIL[r.rung].name}
                    </span>
                    {isTop && (
                      <span
                        className="flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                        style={{
                          fontFamily: "var(--kit-display)",
                          letterSpacing: "0.06em",
                          color: "#fff",
                          background: "var(--kit-acc)",
                        }}
                      >
                        {firm ? "your match" : "leading"}
                      </span>
                    )}
                  </div>
                  {/* The score bar: relative fit within your eligible options. */}
                  <div className="mt-2 h-[5px] w-full overflow-hidden rounded-full" style={{ background: "var(--kit-line2)" }}>
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${widthFor(r.score)}%`,
                        background: isTop ? "linear-gradient(90deg, var(--kit-acc), #15c4a4)" : "var(--kit-rail)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* The leading rung's one-liner, so the panel teaches as it ranks. */}
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--kit-mut)" }}>
            {RUNG_DETAIL[recommended.rung].oneLiner}
          </p>

          {ruledOut > 0 && (
            <p className="text-[11px]" style={{ color: "var(--kit-faint)" }}>
              {ruledOut} {ruledOut === 1 ? "path" : "paths"} ruled out to keep this realistic for you.
            </p>
          )}

          {!firm && (
            <p className="text-[11px]" style={{ color: "var(--kit-faint)" }}>
              Keep going. {DECISION_KEYS.length - answered} more {DECISION_KEYS.length - answered === 1 ? "answer" : "answers"} and it locks in.
            </p>
          )}
        </>
      )}
    </div>
  );
}
