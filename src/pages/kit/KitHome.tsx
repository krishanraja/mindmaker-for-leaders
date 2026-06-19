import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  Loader2,
  Mail,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KitPortalLayout } from "@/components/kit/KitPortalLayout";
import { CapsuleCard } from "@/components/kit/CapsuleCard";
import { EdgeProCard } from "@/components/kit/EdgeProCard";
import { RegenerateSheet } from "@/components/kit/RegenerateSheet";
import { KitBuildTrace } from "@/components/kit/KitBuildTrace";
import { KitRevealWizard } from "@/components/kit/KitRevealWizard";
import { filesFromArtifacts } from "@/components/kit/KitWhatsInside";
import { KIT_SCOPE_VARS } from "@/components/kit/kitPrimitives";
import { useAuth } from "@/hooks/useAuth";
import { useKitRedemption } from "@/hooks/useKitRedemption";
import { useKitBuild, fetchKitBuild, fetchLatestKitBuild } from "@/hooks/useKitBuild";
import { useKitArtifacts } from "@/hooks/useKitArtifacts";
import { emitKitEvent } from "@/lib/track";
import {
  KIT_BUILD_KEY,
  formatPassDate,
  invokeKit,
  isTerminalBuildStatus,
  parseKitMap,
  parseKitPlan,
  parseOrgChart,
  readKitHint,
  skillMetaFromArtifact,
} from "@/lib/kit";
import type { KitArtifactRow, KitJourneyEventRow } from "@/lib/kit";
import { KIT_TOOL_LABELS, toolFromIntake } from "@/content/kits";

// Kit tables are newer than the committed generated types; row interfaces in
// lib/kit.ts enforce the shapes (same pattern as useGoals / useDecisionEngine).
const db = supabase as unknown as SupabaseClient;

const FEATURED_ARTIFACT_IDS = new Set([
  "first-skill",
  "seven-day-plan",
  "personal-map",
  "pack-map",
  "agentic-org-chart",
]);

interface JourneyState {
  checkedDays: Record<number, boolean>;
  shippedAt: string | null;
}

/**
 * The kit and journey page. Three states: composing (the wait is the first
 * action), kit ready (the reveal, the plan, the artifacts), and the friendly
 * bounce when no redemption exists on this device.
 */
export default function KitHome() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const {
    redemption,
    preset,
    isLoading: redemptionLoading,
    isExpired,
    buildsRemaining,
    refresh: refreshRedemption,
  } = useKitRedemption();

  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildResolved, setBuildResolved] = useState(false);
  const { build } = useKitBuild(buildId);
  const {
    artifacts,
    byArtifactId,
    refresh: refreshArtifacts,
    download,
    copy,
  } = useKitArtifacts(redemption?.id ?? null);

  const [journey, setJourney] = useState<JourneyState>({ checkedDays: {}, shippedAt: null });
  const [edgeProForced, setEdgeProForced] = useState(false);
  const [edgeProDismissed, setEdgeProDismissed] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPrefill, setRegenPrefill] = useState<string[] | null>(null);
  // The build trace plays once per build before the reveal (spec 2.6). It is
  // still "running" until KitBuildTrace fires onComplete, even when the build is
  // already terminal, so a fast build still shows the work resolving.
  const [traceDone, setTraceDone] = useState(false);
  const onTraceComplete = useCallback(() => setTraceDone(true), []);

  const prevBuildStatus = useRef<string | null>(null);
  const hint = useMemo(readKitHint, []);

  /* ------------------------------------------------------------ */
  /* Build resolution: sessionStorage id first, then latest build.  */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    if (!redemption) return;
    let cancelled = false;
    const resolve = async () => {
      let stored: string | null = null;
      try {
        stored = sessionStorage.getItem(KIT_BUILD_KEY);
      } catch {
        stored = null;
      }
      if (stored) {
        const row = await fetchKitBuild(stored);
        if (cancelled) return;
        if (row && row.redemption_id === redemption.id) {
          setBuildId(stored);
          setBuildResolved(true);
          return;
        }
      }
      const latest = await fetchLatestKitBuild(redemption.id);
      if (cancelled) return;
      if (latest) {
        try {
          sessionStorage.setItem(KIT_BUILD_KEY, latest.id);
        } catch {
          // Best-effort cache.
        }
        setBuildId(latest.id);
      }
      setBuildResolved(true);
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [redemption]);

  // Redemption exists but intake never finished: back to the wizard.
  useEffect(() => {
    if (redemption && buildResolved && !buildId) {
      navigate("/kit/me/intake", { replace: true });
    }
  }, [redemption, buildResolved, buildId, navigate]);

  /* ------------------------------------------------------------ */
  /* Terminal transition: emit once, then pull the fresh artifacts. */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    if (!build) {
      prevBuildStatus.current = null;
      return;
    }
    const was = prevBuildStatus.current;
    prevBuildStatus.current = build.status;
    if (!isTerminalBuildStatus(build.status)) return;
    if (was === "queued" || was === "running") {
      if (build.status !== "failed" && redemption) {
        emitKitEvent("kit_composed", {
          class_slug: redemption.class_slug,
          redemption_id: redemption.id,
        });
      }
      void refreshArtifacts();
      void refreshRedemption();
    }
  }, [build, redemption, refreshArtifacts, refreshRedemption]);

  /* ------------------------------------------------------------ */
  /* Journey events: latest event per day wins; shipped sticks.     */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    if (!redemption) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await db
          .from("kit_journey_events")
          .select("event_type, day_index, note, created_at")
          .eq("redemption_id", redemption.id)
          .order("created_at", { ascending: true });
        if (cancelled || !data) return;
        const checkedDays: Record<number, boolean> = {};
        let shippedAt: string | null = null;
        for (const event of data as KitJourneyEventRow[]) {
          if (event.event_type === "day_checked" && event.day_index != null) {
            checkedDays[event.day_index] = true;
          } else if (event.event_type === "day_unchecked" && event.day_index != null) {
            checkedDays[event.day_index] = false;
          } else if (event.event_type === "shipped") {
            shippedAt = event.created_at;
          }
        }
        setJourney({ checkedDays, shippedAt });
      } catch {
        // Journey state is additive; a failed load never blocks the kit.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [redemption]);

  /* ------------------------------------------------------------ */
  /* Actions                                                        */
  /* ------------------------------------------------------------ */
  const startBuild = useCallback((id: string) => {
    try {
      sessionStorage.setItem(KIT_BUILD_KEY, id);
    } catch {
      // Best-effort cache.
    }
    prevBuildStatus.current = null;
    setTraceDone(false);
    setBuildId(id);
  }, []);

  // "Download PDF" opens the print-styled hero route in a new tab so the user
  // keeps their place in the wizard; the route self-resolves the current
  // redemption + build + artifacts.
  const openPdf = useCallback(() => {
    if (!redemption) return;
    emitKitEvent("kit_artifact_downloaded", {
      class_slug: redemption.class_slug,
      redemption_id: redemption.id,
    });
    window.open(`/kit/pdf/${redemption.id}`, "_blank", "noopener");
  }, [redemption]);

  const toggleDay = useCallback(
    async (day: number, next: boolean) => {
      if (!userId || !redemption) return;
      setJourney((prev) => ({ ...prev, checkedDays: { ...prev.checkedDays, [day]: next } }));
      const { error } = await db.from("kit_journey_events").insert({
        user_id: userId,
        redemption_id: redemption.id,
        event_type: next ? "day_checked" : "day_unchecked",
        day_index: day,
      });
      if (error) {
        setJourney((prev) => ({ ...prev, checkedDays: { ...prev.checkedDays, [day]: !next } }));
        toast.error("Could not save that. Try again.");
      }
    },
    [userId, redemption],
  );

  const logShip = useCallback(
    async (note: string): Promise<boolean> => {
      if (!userId || !redemption) return false;
      const { error } = await db.from("kit_journey_events").insert({
        user_id: userId,
        redemption_id: redemption.id,
        event_type: "shipped",
        ...(note ? { note } : {}),
      });
      if (error) {
        toast.error("Could not log that. Try again.");
        return false;
      }
      emitKitEvent("kit_shipped", {
        class_slug: redemption.class_slug,
        redemption_id: redemption.id,
      });
      setJourney((prev) => ({ ...prev, shippedAt: new Date().toISOString() }));
      return true;
    },
    [userId, redemption],
  );

  const quickRegenerate = useCallback(async () => {
    if (!redemption) return;
    const { payload, errorMessage } = await invokeKit<{ build_id?: string }>("kit-compose", {
      redemption_id: redemption.id,
      kind: "regenerate",
    });
    if (payload?.build_id) {
      startBuild(payload.build_id);
      return;
    }
    if (payload && "pass_expired" in payload && payload.pass_expired) {
      setEdgeProForced(true);
      setEdgeProDismissed(false);
      return;
    }
    toast.error(errorMessage ?? "The rebuild did not start. Try again.");
  }, [redemption, startBuild]);

  const openTune = useCallback((artifactId?: string) => {
    setRegenPrefill(artifactId ? [artifactId] : null);
    setRegenOpen(true);
  }, []);

  const downloadArtifact = useCallback(
    async (artifact: KitArtifactRow): Promise<boolean> => {
      const ok = await download(artifact);
      if (ok && redemption) {
        emitKitEvent("kit_artifact_downloaded", {
          class_slug: redemption.class_slug,
          redemption_id: redemption.id,
        });
      }
      return ok;
    },
    [download, redemption],
  );

  /* ------------------------------------------------------------ */
  /* Render                                                         */
  /* ------------------------------------------------------------ */

  if (redemptionLoading || (redemption && (!buildResolved || (buildId && !build)))) {
    return (
      <KitPortalLayout classTitle={preset?.title ?? null} passEndsAt={redemption?.expires_at}>
        <div className="flex flex-col items-center gap-3 py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Opening your kit...</p>
        </div>
      </KitPortalLayout>
    );
  }

  if (!redemption || !preset) {
    return (
      <KitPortalLayout>
        <div className="space-y-5 py-12 text-center">
          <QrCode className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <div className="space-y-2">
            <h1 className="kit-headline text-2xl">
              scan the class code to start
            </h1>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Your kit appears here the moment a class code is redeemed on this device.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate("/kit")}>
            Enter a code
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {hint && (
            <p className="text-sm text-muted-foreground">
              Had a kit here before? Enter{" "}
              <button
                type="button"
                onClick={() => navigate(`/kit?code=${encodeURIComponent(hint.code)}`)}
                className="font-semibold text-accent underline-offset-4 hover:underline"
              >
                {hint.code}
              </button>{" "}
              again to restore your kit on this device.
            </p>
          )}
        </div>
      </KitPortalLayout>
    );
  }

  if (!build) {
    // Resolution sent us to the intake wizard; render nothing in the gap.
    return (
      <KitPortalLayout classTitle={preset.title} passEndsAt={redemption.expires_at}>
        {null}
      </KitPortalLayout>
    );
  }

  const composing = build.status === "queued" || build.status === "running";
  const failedEntirely = build.status === "failed";
  const tool = toolFromIntake(preset, build.intake ?? {});
  const toolName = tool === "none" ? "your AI" : KIT_TOOL_LABELS[tool];

  const firstSkillArtifact = byArtifactId["first-skill"];
  const skillMeta = skillMetaFromArtifact(firstSkillArtifact);
  const mapArtifact = byArtifactId["personal-map"] ?? byArtifactId["pack-map"];
  const kitMap = mapArtifact ? parseKitMap(mapArtifact.body) : null;
  const orgChartArtifact = byArtifactId["agentic-org-chart"];
  const orgChart = orgChartArtifact ? parseOrgChart(orgChartArtifact.body) : null;
  const planArtifact = byArtifactId["seven-day-plan"];
  const planDays = planArtifact ? parseKitPlan(planArtifact.body) : null;
  const testPrompt = skillMeta?.test_prompts?.[0] ?? null;

  const showEdgePro = (edgeProForced || isExpired) && !edgeProDismissed;

  // The trace plays once even when the build is already terminal: while it is
  // still running we show the trace screen, then hand to the reveal.
  const traceRunning = !composing && !failedEntirely && !traceDone;

  // The hero title + subtitle: vibe leads with the built skill; the other kits
  // lead with their own title. Generic + guarded so no kit crashes.
  const heroTitle = skillMeta?.name ?? preset.title;
  const heroSubtitle = skillMeta?.description ?? preset.tagline;
  const passFooter = isExpired
    ? `Your pass ended ${formatPassDate(redemption.expires_at)}.`
    : `Pass active until ${formatPassDate(redemption.expires_at)}.`;

  // The two-button file list (Part 3): the hero PDF (download) plus the training
  // files (download/copy). Built from the REAL artifacts so it is correct for
  // every kit; the text never renders inline as a wall.
  const files = filesFromArtifacts(artifacts, {
    pdfName:
      preset.slug === "vibe-coding"
        ? "your-vibe-coding-kit.pdf"
        : `${preset.slug}-kit.pdf`,
    onDownloadPdf: openPdf,
    onDownloadArtifact: downloadArtifact,
    onCopyArtifact: copy,
  });

  return (
    <KitPortalLayout classTitle={preset.title} passEndsAt={redemption.expires_at}>
      <div className="kit-portal" style={KIT_SCOPE_VARS}>
        <AnimatePresence mode="wait">
          {composing ? (
            <motion.div
              key="composing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-8"
            >
              {/* Desktop: the trace goes cinematic in the right pane while the
                  left holds a quiet "assembling" summary. On mobile, single
                  column (the trace alone). */}
              <div className="min-w-0">
                <KitBuildTrace build={build} onComplete={onTraceComplete} />
              </div>
              <aside className="order-first hidden md:order-last md:block">
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    background: "linear-gradient(180deg,#FBFDFB,#F4F7F3)",
                    borderColor: "var(--kit-line)",
                    boxShadow: "0 1px 2px rgba(16,28,30,.05)",
                  }}
                >
                  <div
                    className="mb-2 text-[15px] font-extrabold"
                    style={{ color: "var(--kit-ink)" }}
                  >
                    Assembling your kit
                  </div>
                  <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--kit-mut)" }}>
                    Your kit is coming together from what you told us. The files land here the moment
                    it is ready, each one ready to copy straight into {toolName}.
                  </p>
                </div>
              </aside>
            </motion.div>
          ) : failedEntirely ? (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <BuildSafetyNet
                redemptionId={redemption.id}
                classSlug={redemption.class_slug}
                onRetry={() => void quickRegenerate()}
              />
            </motion.div>
          ) : traceRunning ? (
            // The build is terminal but we still play the trace once, so the
            // person sees the work resolve before the reveal (spec 2.6).
            <motion.div
              key="trace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-8"
            >
              <div className="min-w-0">
                <KitBuildTrace build={build} onComplete={onTraceComplete} />
              </div>
              <aside className="order-first hidden md:order-last md:block">
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    background: "linear-gradient(180deg,#FBFDFB,#F4F7F3)",
                    borderColor: "var(--kit-line)",
                    boxShadow: "0 1px 2px rgba(16,28,30,.05)",
                  }}
                >
                  <div className="mb-2 text-[15px] font-extrabold" style={{ color: "var(--kit-ink)" }}>
                    Assembling your kit
                  </div>
                  <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--kit-mut)" }}>
                    Almost there. Your files are about to land.
                  </p>
                </div>
              </aside>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            >
              <KitRevealWizard
                preset={preset}
                redemption={redemption}
                tool={tool}
                toolName={toolName}
                heroTitle={heroTitle}
                heroSubtitle={heroSubtitle}
                orgChart={orgChart}
                kitMap={kitMap}
                planDays={planDays}
                testPrompt={testPrompt}
                files={files}
                buildsRemaining={buildsRemaining}
                journey={journey}
                onOpenPdf={openPdf}
                onToggleDay={(day, next) => void toggleDay(day, next)}
                onLogShip={logShip}
                onNewSkillStarted={startBuild}
                onQuotaExhausted={() => {
                  setEdgeProForced(true);
                  setEdgeProDismissed(false);
                }}
                onEmailSent={() => {
                  /* The keep-it screen shows its own confirmation; nothing to
                     gate post-build now that the bridge card is retired. */
                }}
                onTune={() => openTune()}
                passFooter={passFooter}
                edgeProSlot={
                  showEdgePro ? (
                    <EdgeProCard onDismiss={() => setEdgeProDismissed(true)} />
                  ) : undefined
                }
              />

              {/* The context capsule "sharpen" stays available as a QUIET escape
                  hatch (spec: Tune is not a primary action), tucked below the
                  wizard, not competing as a card up top. */}
              <details className="mt-6 rounded-2xl border" style={{ borderColor: "var(--kit-line)" }}>
                <summary
                  className="cursor-pointer list-none px-5 py-3.5 text-[13px] font-semibold"
                  style={{ color: "var(--kit-mut)" }}
                >
                  Sharpen your kit with what your AI knows about you
                </summary>
                <div className="px-2 pb-2">
                  <CapsuleCard redemption={redemption} onRegenerate={() => void quickRegenerate()} />
                </div>
              </details>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RegenerateSheet
        open={regenOpen}
        onOpenChange={setRegenOpen}
        preset={preset}
        redemption={redemption}
        prefillIds={regenPrefill}
        onStarted={startBuild}
        onPassExpired={() => {
          setEdgeProForced(true);
          setEdgeProDismissed(false);
        }}
      />
    </KitPortalLayout>
  );
}

/** Shown only when a build fails outright: an email safety net plus retry. */
function BuildSafetyNet({
  redemptionId,
  classSlug,
  onRetry,
}: {
  redemptionId: string;
  classSlug: string;
  onRetry: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSending(true);
    const { payload, errorMessage } = await invokeKit<{ ok?: boolean }>("send-kit-pack", {
      redemption_id: redemptionId,
      email: trimmed,
    });
    setSending(false);
    if (payload?.ok) {
      setSent(true);
      emitKitEvent("kit_email_captured", { class_slug: classSlug, redemption_id: redemptionId });
      toast.success("Got it. Your kit lands in your inbox once it is ready.");
      return;
    }
    toast.error(errorMessage ?? "That did not send. Try again.");
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center kit-shadow-sm">
      <h2 className="kit-headline text-xl">the build hit a snag</h2>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        Rare, but it happens. Retry now, or leave your email and the kit lands in your inbox the
        moment it is ready.
      </p>
      <Button size="lg" className="w-full" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry the build
      </Button>
      {!sent ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="you@company.com"
            aria-label="Email"
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => void send()}
            disabled={sending}
            className="sm:w-auto"
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send my kit when it is ready
          </Button>
        </div>
      ) : (
        <p className="text-sm text-accent">Email saved. You can close this tab.</p>
      )}
    </div>
  );
}

