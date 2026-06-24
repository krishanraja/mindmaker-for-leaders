import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getPreset } from "@/content/kits";
import type { KitPreset } from "@/content/kits";
import {
  fetchKitBuild,
  fetchLatestKitBuild,
} from "@/hooks/useKitBuild";
import { KIT_BUILD_KEY, type KitArtifactRow, type KitBuildRow, type KitRedemptionRow } from "@/lib/kit";
import {
  buildKitPdfModel,
  type AutomationStep,
  type FirstAgent,
  type KitPdfModel,
  type OrgChartHeroBox,
} from "@/lib/kitPdf";
import type { KitPlanDay } from "@/lib/kit";
import "@/components/kit/kit-portal.css";
import "./kit-pdf.css";

// Kit tables are newer than the committed generated types (same pattern as the
// hooks): an untyped client plus the row interfaces.
const db = supabase as unknown as SupabaseClient;

/**
 * The hero PDF (spec decision 1): a print-styled, branded, deeply personalized
 * document rendered at its own unlinked route. The reveal's "Download PDF"
 * opens this; the browser's Save as PDF (or the on-screen Print button, hidden
 * in print) produces the file.
 *
 * Self-resolving so it works as a standalone tab: by `:redemptionId` when given,
 * else the session's latest redemption (RLS scopes the select to their rows).
 * Generic across all four kits via buildKitPdfModel; guarded so a non-vibe kit
 * never crashes.
 */
export default function KitPdf() {
  const { redemptionId } = useParams<{ redemptionId?: string }>();
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "empty" }
    | { phase: "ready"; preset: KitPreset; model: KitPdfModel }
  >({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // 1. Resolve the redemption: by id (RLS-scoped) or the session's latest.
      let redemption: KitRedemptionRow | null = null;
      try {
        if (redemptionId) {
          const { data } = await db
            .from("kit_redemptions")
            .select("*")
            .eq("id", redemptionId)
            .maybeSingle();
          redemption = (data as KitRedemptionRow | null) ?? null;
        } else {
          const { data } = await db
            .from("kit_redemptions")
            .select("*")
            .order("redeemed_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          redemption = (data as KitRedemptionRow | null) ?? null;
        }
      } catch {
        redemption = null;
      }
      if (cancelled) return;
      if (!redemption) {
        setState({ phase: "empty" });
        return;
      }

      const preset = getPreset(redemption.class_slug);
      if (!preset) {
        setState({ phase: "empty" });
        return;
      }

      // 2. Resolve the build (the session build id, then the latest).
      let build: KitBuildRow | null = null;
      let storedId: string | null = null;
      try {
        storedId = sessionStorage.getItem(KIT_BUILD_KEY);
      } catch {
        storedId = null;
      }
      if (storedId) {
        const row = await fetchKitBuild(storedId);
        if (row && row.redemption_id === redemption.id) build = row;
      }
      if (!build) build = await fetchLatestKitBuild(redemption.id);
      if (cancelled) return;

      // 3. The current artifacts (for the plan + map projections).
      let artifacts: KitArtifactRow[] = [];
      try {
        const { data } = await db
          .from("kit_artifacts")
          .select("*")
          .eq("redemption_id", redemption.id)
          .eq("is_current", true)
          .order("created_at", { ascending: true });
        artifacts = (data as KitArtifactRow[] | null) ?? [];
      } catch {
        artifacts = [];
      }
      if (cancelled) return;

      const model = buildKitPdfModel(preset, build?.intake ?? {}, artifacts);
      setState({ phase: "ready", preset, model });
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [redemptionId]);

  // Light mode for the print surface, whatever theme the app shell is in.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  if (state.phase === "loading") {
    return (
      <div className="kit-pdf-screen">
        <p className="kit-pdf-empty">Preparing your document...</p>
      </div>
    );
  }

  if (state.phase === "empty") {
    return (
      <div className="kit-pdf-screen">
        <p className="kit-pdf-empty">
          No kit found on this device. Open your kit first, then download the PDF from the reveal.
        </p>
      </div>
    );
  }

  return <KitPdfDocument model={state.model} />;
}

/**
 * The hero document. A shared branded shell (head, dark hero panel, footer)
 * wraps a per-kit body chosen by model.kind. Every body degrades safely on a
 * missing field: a section with no data simply does not render.
 */
function KitPdfDocument({ model }: { model: KitPdfModel }) {
  const print = () => window.print();
  const today = useMemo(
    () => new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
    [],
  );

  return (
    <div className="kit-pdf-screen kit-portal">
      {/* The print control, hidden when actually printing. */}
      <div className="kit-pdf-bar">
        <button type="button" className="kit-pdf-print" onClick={print}>
          Save as PDF
        </button>
        <span className="kit-pdf-hint">Your browser's print dialog. Choose "Save as PDF".</span>
      </div>

      {/* The A4 page. */}
      <article className="kit-pdf-page" data-testid="kit-pdf-page">
        <header className="kit-pdf-head">
          <span className="kit-pdf-wordmark">
            ctrl<span className="kit-pdf-dot">.</span>
          </span>
          <span className="kit-pdf-class">{model.classTitle}</span>
        </header>

        <section className="kit-pdf-hero">
          <p className="kit-pdf-eyebrow">{model.kitName}</p>
          <h1 className="kit-pdf-title">{model.heroTitle}</h1>
          <p className="kit-pdf-sub">{model.heroSubtitle}</p>
        </section>

        <KitPdfBody model={model} />

        <footer className="kit-pdf-foot">
          <span>{model.footer}</span>
          <span className="kit-pdf-foot-meta">CTRL by Mindmaker . {today}</span>
        </footer>
      </article>
    </div>
  );
}

/** Dispatch to the per-kit body. */
function KitPdfBody({ model }: { model: KitPdfModel }) {
  switch (model.kind) {
    case "autonomous":
      return <AutonomousBody model={model} />;
    case "orgchart":
      return <OrgChartBody model={model} />;
    case "memory":
      return <MemoryBody model={model} />;
    case "chief":
      return <ChiefBody model={model} />;
    case "vibe":
    case "generic":
    default:
      return <VibeBody model={model} />;
  }
}

/* ------------------------------------------------------------------ */
/* Vibe + generic body (unchanged content)                            */
/* ------------------------------------------------------------------ */

function VibeBody({
  model,
}: {
  model: Extract<KitPdfModel, { kind: "vibe" | "generic" }>;
}) {
  return (
    <>
      <div className="kit-pdf-grid">
        {model.whoYouAre && (
          <section className="kit-pdf-block">
            <h2 className="kit-pdf-h2">Who you are</h2>
            <p className="kit-pdf-body">{model.whoYouAre}</p>
          </section>
        )}

        {model.worksWithYou.length > 0 && (
          <section className="kit-pdf-block">
            <h2 className="kit-pdf-h2">How any AI should work with you</h2>
            <ul className="kit-pdf-list">
              {model.worksWithYou.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {model.guardrails.length > 0 && (
          <section className="kit-pdf-block">
            <h2 className="kit-pdf-h2">Your guardrails</h2>
            <ul className="kit-pdf-list kit-pdf-list-clay">
              {model.guardrails.map((line) => (
                <li key={line}>{capitalize(line)}</li>
              ))}
            </ul>
          </section>
        )}

        {model.building && (
          <section className="kit-pdf-block kit-pdf-block-wide">
            <h2 className="kit-pdf-h2">What you are building</h2>
            <p className="kit-pdf-body kit-pdf-build">{model.building}</p>
            <p className="kit-pdf-note">
              Briefed in full inside <strong>build-brief.md</strong>, ready to paste into{" "}
              {model.toolName}.
            </p>
          </section>
        )}
      </div>

      <PlanSection plan={model.plan} heading="Your path. Day 1 is tonight." />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Autonomous Business body: "Your First Automation"                  */
/* ------------------------------------------------------------------ */

const STEP_BAND_COPY: Record<AutomationStep["band"], string> = {
  owns: "AI owns it",
  assists: "AI assists",
  you: "You only",
};

function AutonomousBody({
  model,
}: {
  model: Extract<KitPdfModel, { kind: "autonomous" }>;
}) {
  return (
    <>
      <div className="kit-pdf-grid">
        {model.whoYouAre && (
          <section className="kit-pdf-block">
            <h2 className="kit-pdf-h2">Who this is for</h2>
            <p className="kit-pdf-body">{model.whoYouAre}</p>
          </section>
        )}

        {model.workflow && (
          <section className="kit-pdf-block">
            <h2 className="kit-pdf-h2">The workflow</h2>
            <p className="kit-pdf-body kit-pdf-build">{capitalize(model.workflow)}</p>
            {model.area && <p className="kit-pdf-note">In {model.area}.</p>}
            {model.verdict && <p className="kit-pdf-note">{model.verdict}</p>}
          </section>
        )}
      </div>

      {model.steps.length > 0 && (
        <section className="kit-pdf-section">
          <h2 className="kit-pdf-h2">The workflow, decomposed</h2>
          <p className="kit-pdf-lede">
            Each step carries its autonomy line: what your AI runs, what it assists with, and what
            stays with you.
          </p>
          <ol className="kit-pdf-steps">
            {model.steps.map((step, i) => (
              <li key={`${step.label}-${i}`} className="kit-pdf-step">
                <span className="kit-pdf-step-n">{i + 1}</span>
                <div className="kit-pdf-step-body">
                  <div className="kit-pdf-step-head">
                    <span className="kit-pdf-step-label">{step.label}</span>
                    <span className={`kit-pdf-tag kit-pdf-tag-${step.band}`}>
                      {STEP_BAND_COPY[step.band]}
                    </span>
                  </div>
                  <p className="kit-pdf-step-note">{step.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {model.guardrails.length > 0 && (
        <section className="kit-pdf-section">
          <h2 className="kit-pdf-h2">What never leaves without you</h2>
          <ul className="kit-pdf-list kit-pdf-list-clay">
            {model.guardrails.map((g) => (
              <li key={g}>{capitalize(g)}</li>
            ))}
          </ul>
          <p className="kit-pdf-note">
            The automation can move fast on everything else; on these it always checks with you
            first, ready to paste into {model.toolName}.
          </p>
        </section>
      )}

      <PlanSection plan={model.plan} heading="Your build path. Running by day 7." />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Agentic Org Chart body: "Your Agentic Org Chart"                   */
/* ------------------------------------------------------------------ */

const BAND_LEGEND: Array<{ band: OrgChartHeroBox["band"]; copy: string }> = [
  { band: "green", copy: "AI runs it" },
  { band: "amber", copy: "AI assists, you approve the handoff" },
  { band: "red", copy: "You only" },
];

function OrgChartBody({
  model,
}: {
  model: Extract<KitPdfModel, { kind: "orgchart" }>;
}) {
  return (
    <>
      {model.boxes.length > 0 ? (
        <section className="kit-pdf-section">
          <div className="kit-pdf-chart-head">
            <h2 className="kit-pdf-h2">Your chart</h2>
            <div className="kit-pdf-legend">
              {BAND_LEGEND.map((l) => (
                <span key={l.band} className="kit-pdf-legend-item">
                  <span className={`kit-pdf-dot-band kit-pdf-dot-${l.band}`} />
                  {l.copy}
                </span>
              ))}
            </div>
          </div>

          <p className="kit-pdf-lede">{model.leadershipLabel}</p>

          <div className="kit-pdf-chart">
            {model.boxes.map((box) => (
              <div
                key={box.label}
                className={`kit-pdf-node kit-pdf-node-${box.band}${box.isStart ? " kit-pdf-node-start" : ""}`}
              >
                <div className="kit-pdf-node-head">
                  <span className="kit-pdf-node-label">{box.label}</span>
                  {box.isStart && <span className="kit-pdf-node-flag">Start here</span>}
                </div>
                <p className="kit-pdf-node-role">{box.role}</p>
                {box.desc && <p className="kit-pdf-node-desc">{box.desc}</p>}
                {box.band !== "red" && box.humanRole && (
                  <p className="kit-pdf-node-human">You: {box.humanRole}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {model.handoffs.length > 0 && (
        <section className="kit-pdf-section">
          <h2 className="kit-pdf-h2">The handoffs</h2>
          <p className="kit-pdf-lede">
            Where work passes between you and an agent. This is the seam where trust breaks, so the
            chart names it.
          </p>
          <ul className="kit-pdf-list kit-pdf-list-amber">
            {model.handoffs.map((h) => (
              <li key={h}>
                {h}: the agent drafts it, you approve the handoff before it leaves.
              </li>
            ))}
          </ul>
        </section>
      )}

      {model.firstAgents.length > 0 && (
        <section className="kit-pdf-section">
          <h2 className="kit-pdf-h2">First agents to stand up</h2>
          <ol className="kit-pdf-ranked">
            {model.firstAgents.map((a: FirstAgent, i) => (
              <li key={a.box} className="kit-pdf-ranked-item">
                <span className="kit-pdf-rank">{i + 1}</span>
                <div>
                  <p className="kit-pdf-ranked-box">{a.box}</p>
                  <p className="kit-pdf-step-note">{a.why}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <PlanSection plan={model.plan} heading="Your first 90 days, across the chart." />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Memory & Identity body: "Your AI Identity Pack"                    */
/* ------------------------------------------------------------------ */

function MemoryBody({
  model,
}: {
  model: Extract<KitPdfModel, { kind: "memory" }>;
}) {
  const hasIdentity = Boolean(model.job || model.role || model.scope.length > 0);
  return (
    <>
      {hasIdentity && (
        <section className="kit-pdf-section">
          <h2 className="kit-pdf-h2">Who the AI is when it works with you</h2>
          {model.job && (
            <p className="kit-pdf-body kit-pdf-build">
              {capitalize(model.job)}
              {model.role ? ` (your role: ${model.role})` : ""}
            </p>
          )}
          <p className="kit-pdf-lede">
            Not your everything. One narrowed field of view, so it gets sharp instead of vague.
          </p>
          {model.scope.length > 0 && (
            <>
              <h3 className="kit-pdf-h3">Its field of view</h3>
              <ul className="kit-pdf-list">
                {model.scope.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="kit-pdf-grid">
        {model.voice && (
          <section className="kit-pdf-block">
            <h2 className="kit-pdf-h2">How you sound</h2>
            <p className="kit-pdf-body kit-pdf-quote">{model.voice}</p>
            <p className="kit-pdf-note">
              Your voice does not change when the job does, ready for {model.toolName}.
            </p>
          </section>
        )}

        {model.neverStore.length > 0 && (
          <section className="kit-pdf-block">
            <h2 className="kit-pdf-h2">What it must never store</h2>
            <ul className="kit-pdf-list kit-pdf-list-clay">
              {model.neverStore.map((n) => (
                <li key={n}>{capitalize(n)}</li>
              ))}
            </ul>
            <p className="kit-pdf-note">A hard rule, baked into your files.</p>
          </section>
        )}
      </div>

      <section className="kit-pdf-section">
        <h2 className="kit-pdf-h2">The self-correction loop</h2>
        <p className="kit-pdf-lede">
          Every correction becomes a rule the system keeps, so a mistake dies the first time you
          catch it.
        </p>
        <ol className="kit-pdf-steps">
          {model.selfCorrect.map((s, i) => (
            <li key={i} className="kit-pdf-step">
              <span className="kit-pdf-step-n">{i + 1}</span>
              <div className="kit-pdf-step-body">
                <p className="kit-pdf-step-note kit-pdf-step-note-lg">{s}</p>
              </div>
            </li>
          ))}
        </ol>
        {model.jobFile && (
          <p className="kit-pdf-note">
            It all lands in <strong>{model.jobFile}</strong>, named after the job, not memory.md.
          </p>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Build Your AI Chief of Staff body: "Your path, decided"            */
/* ------------------------------------------------------------------ */

function ChiefBody({
  model,
}: {
  model: Extract<KitPdfModel, { kind: "chief" }>;
}) {
  return (
    <>
      <section className="kit-pdf-section">
        <h2 className="kit-pdf-h2">Your recommended path</h2>
        <p className="kit-pdf-body kit-pdf-build">
          Rung {model.rung}: {model.rungName}
        </p>
        <p className="kit-pdf-lede">{model.oneLiner}</p>
        {model.whoYouAre && <p className="kit-pdf-note">Chosen for you as {model.whoYouAre.toLowerCase()}.</p>}
      </section>

      {model.fit.length > 0 && (
        <section className="kit-pdf-section">
          <h2 className="kit-pdf-h2">Why this fits you</h2>
          <ul className="kit-pdf-list">
            {model.fit.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="kit-pdf-grid">
        <section className="kit-pdf-block">
          <h2 className="kit-pdf-h2">The one wall to expect</h2>
          <p className="kit-pdf-body">{model.wall}</p>
          <p className="kit-pdf-note">Heads it off: {model.designCall}</p>
        </section>

        <section className="kit-pdf-block">
          <h2 className="kit-pdf-h2">Your first move</h2>
          <p className="kit-pdf-body">{model.firstStep}</p>
          {model.tools.length > 0 && (
            <p className="kit-pdf-note">Tools: {model.tools.join(", ")}.</p>
          )}
        </section>
      </div>

      {model.guardrails.length > 0 && (
        <section className="kit-pdf-section">
          <h2 className="kit-pdf-h2">What we held the line on</h2>
          <ul className="kit-pdf-list kit-pdf-list-clay">
            {model.guardrails.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      )}

      {model.runnersUp.length > 0 && (
        <section className="kit-pdf-section">
          <h2 className="kit-pdf-h2">Close seconds</h2>
          <p className="kit-pdf-lede">
            Climb only when you hit a real wall. These are the next rungs worth a look.
          </p>
          <ul className="kit-pdf-list">
            {model.runnersUp.map((r) => (
              <li key={r.rung}>
                Rung {r.rung}, {r.name}: {r.oneLiner}
              </li>
            ))}
          </ul>
        </section>
      )}

      <PlanSection plan={model.plan} heading="Your first week. Day 1 is tonight." />

      {model.warnings.length > 0 && (
        <section className="kit-pdf-section">
          {model.warnings.map((w) => (
            <p key={w} className="kit-pdf-note">
              {w}
            </p>
          ))}
        </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared plan section                                                 */
/* ------------------------------------------------------------------ */

function PlanSection({ plan, heading }: { plan: KitPlanDay[]; heading: string }) {
  if (plan.length === 0) return null;
  return (
    <section className="kit-pdf-plan">
      <h2 className="kit-pdf-h2">{heading}</h2>
      <ol className="kit-pdf-days">
        {plan.map((day) => (
          <li key={day.day} className="kit-pdf-day">
            <span className="kit-pdf-day-n">Day {day.day}</span>
            <span className="kit-pdf-day-t">
              <strong>{day.title}.</strong> {day.action}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
