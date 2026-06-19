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
import { buildKitPdfModel, type KitPdfModel } from "@/lib/kitPdf";
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
                  <li key={line}>
                    {line.charAt(0).toUpperCase() + line.slice(1)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {model.building && (
            <section className="kit-pdf-block kit-pdf-block-wide">
              <h2 className="kit-pdf-h2">What you are building</h2>
              <p className="kit-pdf-body kit-pdf-build">{model.building}</p>
              <p className="kit-pdf-note">
                Briefed in full inside <strong>build-brief.md</strong>, ready to paste into {model.toolName}.
              </p>
            </section>
          )}
        </div>

        {model.plan.length > 0 && (
          <section className="kit-pdf-plan">
            <h2 className="kit-pdf-h2">Your path. Day 1 is tonight.</h2>
            <ol className="kit-pdf-days">
              {model.plan.map((day) => (
                <li key={day.day} className="kit-pdf-day">
                  <span className="kit-pdf-day-n">Day {day.day}</span>
                  <span className="kit-pdf-day-t">
                    <strong>{day.title}.</strong> {day.action}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="kit-pdf-foot">
          <span>{model.footer}</span>
          <span className="kit-pdf-foot-meta">CTRL by Mindmaker . {today}</span>
        </footer>
      </article>
    </div>
  );
}
