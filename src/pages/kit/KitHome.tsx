import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
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
import { ArtifactProgressList } from "@/components/kit/ArtifactProgressList";
import { HomeworkCard } from "@/components/kit/HomeworkCard";
import { PersonalMapCard } from "@/components/kit/PersonalMapCard";
import { SendPackCard } from "@/components/kit/SendPackCard";
import { SevenDayPlan } from "@/components/kit/SevenDayPlan";
import { ShipSection } from "@/components/kit/ShipSection";
import { ArtifactCard } from "@/components/kit/ArtifactCard";
import { OrgChartView } from "@/components/kit/OrgChartView";
import { CapsuleCard } from "@/components/kit/CapsuleCard";
import { EdgeProCard } from "@/components/kit/EdgeProCard";
import { RegenerateSheet } from "@/components/kit/RegenerateSheet";
import { SkillInstallGuide } from "@/components/edge/SkillInstallGuide";
import { useAuth } from "@/hooks/useAuth";
import { useKitRedemption } from "@/hooks/useKitRedemption";
import { useKitBuild, fetchKitBuild, fetchLatestKitBuild } from "@/hooks/useKitBuild";
import { useKitArtifacts } from "@/hooks/useKitArtifacts";
import { emitKitEvent } from "@/lib/track";
import {
  KIT_BUILD_KEY,
  formatPassDate,
  invokeKit,
  isPackSent,
  isTerminalBuildStatus,
  parseKitMap,
  parseKitPlan,
  parseOrgChart,
  readKitHint,
  skillMetaFromArtifact,
} from "@/lib/kit";
import type { KitArtifactRow, KitJourneyEventRow } from "@/lib/kit";
import { toolFromIntake } from "@/content/kits";
import type { ArtifactSpec } from "@/content/kits";

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
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [showSendPack, setShowSendPack] = useState<boolean | null>(null);
  const [edgeProForced, setEdgeProForced] = useState(false);
  const [edgeProDismissed, setEdgeProDismissed] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPrefill, setRegenPrefill] = useState<string[] | null>(null);

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

  // Email-captured state and whether the capture card shows at all this visit.
  useEffect(() => {
    if (!redemption) return;
    const alreadyCaptured = isPackSent() || !!redemption.delivery_email;
    if (alreadyCaptured) setEmailCaptured(true);
    setShowSendPack((prev) => (prev === null ? !alreadyCaptured : prev));
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
    setBuildId(id);
  }, []);

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

  const firstSkillArtifact = byArtifactId["first-skill"];
  const skillMeta = skillMetaFromArtifact(firstSkillArtifact);
  const mapArtifact = byArtifactId["personal-map"] ?? byArtifactId["pack-map"];
  const kitMap = mapArtifact ? parseKitMap(mapArtifact.body) : null;
  const orgChartArtifact = byArtifactId["agentic-org-chart"];
  const orgChart = orgChartArtifact ? parseOrgChart(orgChartArtifact.body) : null;
  const expectsSkill = preset.artifacts.some((spec) => spec.id === "first-skill");
  const planArtifact = byArtifactId["seven-day-plan"];
  const planDays = planArtifact ? parseKitPlan(planArtifact.body) : null;
  const testPrompt = skillMeta?.test_prompts?.[0] ?? null;

  const showEdgePro = (edgeProForced || isExpired) && !edgeProDismissed;

  return (
    <KitPortalLayout classTitle={preset.title} passEndsAt={redemption.expires_at}>
      <AnimatePresence mode="wait">
        {composing ? (
          <motion.div
            key="composing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            <ArtifactProgressList preset={preset} build={build} />
            <HomeworkCard preset={preset} intake={build.intake ?? {}} />
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
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="space-y-6"
          >
            {/* 0. The reveal */}
            <motion.div
              data-testid="kit-reveal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-4 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10"
              >
                <CheckCircle2 className="h-8 w-8 text-accent" />
              </motion.div>
              <p className="kit-eyebrow">Built from what you said in class</p>
              <h1 className="kit-headline text-3xl sm:text-[2.35rem]">
                {skillMeta?.name ?? preset.title}
              </h1>
              <p className="mx-auto max-w-md text-muted-foreground">
                {skillMeta?.description ?? preset.tagline}
              </p>
              {firstSkillArtifact?.zip_base64 && (
                <Button
                  size="xl"
                  className="w-full"
                  onClick={() => {
                    void downloadArtifact(firstSkillArtifact).then((ok) => {
                      if (!ok) toast.error("The download did not start. Try again.");
                    });
                  }}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download your skill (ZIP)
                </Button>
              )}
              {!firstSkillArtifact && expectsSkill && (
                <p className="text-sm text-muted-foreground">
                  Your first skill needs another pass.{" "}
                  <button
                    type="button"
                    onClick={() => openTune("first-skill")}
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Tune and rebuild it
                  </button>
                  .
                </p>
              )}
            </motion.div>

            {skillMeta && (
              <SkillInstallGuide skillName={skillMeta.name} preferredTool={tool} />
            )}

            {/* 0. The hero: the agentic org chart */}
            {orgChart && <OrgChartView chart={orgChart} />}

            {/* 1. The capstone map */}
            {kitMap && <PersonalMapCard map={kitMap} />}

            {/* 2. Email capture at the moment of value */}
            {showSendPack && (
              <SendPackCard
                redemption={redemption}
                tool={tool}
                onSent={() => setEmailCaptured(true)}
              />
            )}

            {/* 3. The seven-day plan */}
            {planDays && (
              <SevenDayPlan
                days={planDays}
                checkedDays={journey.checkedDays}
                onToggle={(day, next) => void toggleDay(day, next)}
                testPrompt={testPrompt}
              />
            )}

            {/* 4. The standing shipped affordance */}
            <ShipSection
              redemption={redemption}
              shippedAt={journey.shippedAt}
              buildsRemaining={buildsRemaining}
              onLogShip={logShip}
              onNewSkillStarted={startBuild}
              onQuotaExhausted={() => {
                setEdgeProForced(true);
                setEdgeProDismissed(false);
              }}
            />

            {showEdgePro && <EdgeProCard onDismiss={() => setEdgeProDismissed(true)} />}

            {/* 5. The full kit, grouped the way the class taught it */}
            <ArtifactGroups
              preset={preset}
              build={build}
              byArtifactId={byArtifactId}
              artifacts={artifacts}
              tool={tool}
              onCopy={copy}
              onDownload={downloadArtifact}
              onTune={openTune}
            />

            {/* 6. Context capsule */}
            <CapsuleCard redemption={redemption} onRegenerate={() => void quickRegenerate()} />

            {/* 7. The bridge to CTRL */}
            {emailCaptured && <BridgeCard />}

            {/* Class reading, when the preset ships any */}
            {(preset.reading?.length ?? 0) > 0 && (
              <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <BookOpen className="h-4 w-4 text-accent" />
                  Class reading
                </h3>
                <ul className="space-y-1">
                  {preset.reading?.map((page) => (
                    <li key={page.id}>
                      <Link
                        to={`/kit/reading/${page.id}`}
                        className="text-sm text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 8. Pass footer */}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              {isExpired
                ? `Your pass ended ${formatPassDate(redemption.expires_at)}.`
                : `Pass active until ${formatPassDate(redemption.expires_at)}.`}{" "}
              Your kit stays viewable and downloadable forever.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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

/* ------------------------------------------------------------------ */
/* Pieces local to this page                                           */
/* ------------------------------------------------------------------ */

/**
 * Artifact cards grouped under their preset `part` headings, in manifest
 * order. Static artifacts render client-side from the preset; extra skills
 * built on the pass get their own group at the end.
 */
function ArtifactGroups({
  preset,
  build,
  byArtifactId,
  artifacts,
  tool,
  onCopy,
  onDownload,
  onTune,
}: {
  preset: NonNullable<ReturnType<typeof useKitRedemption>["preset"]>;
  build: NonNullable<ReturnType<typeof useKitBuild>["build"]>;
  byArtifactId: Record<string, KitArtifactRow>;
  artifacts: KitArtifactRow[];
  tool: ReturnType<typeof toolFromIntake>;
  onCopy: (artifact: KitArtifactRow) => Promise<boolean>;
  onDownload: (artifact: KitArtifactRow) => Promise<boolean>;
  onTune: (artifactId: string) => void;
}) {
  const groups = useMemo(() => {
    const specs = preset.artifacts
      .filter((spec) => !FEATURED_ARTIFACT_IDS.has(spec.id))
      .sort((a, b) => a.order - b.order);
    const ordered: { part: string; specs: ArtifactSpec[] }[] = [];
    for (const spec of specs) {
      const part = spec.part ?? "Your kit";
      const existing = ordered.find((g) => g.part === part);
      if (existing) existing.specs.push(spec);
      else ordered.push({ part, specs: [spec] });
    }
    return ordered;
  }, [preset]);

  const presetIds = useMemo(
    () => new Set(preset.artifacts.map((spec) => spec.id)),
    [preset],
  );
  const extraSkills = artifacts.filter(
    (artifact) => !presetIds.has(artifact.artifact_id) && artifact.content_type === "zip",
  );

  const staticCtx = useMemo(
    () => ({ intake: build.intake ?? {}, tool, memoryContext: "" }),
    [build, tool],
  );

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.part} className="space-y-3">
          <h3 className="kit-label text-[11px] text-[color:var(--kit-mut)]">
            {group.part}
          </h3>
          {group.specs.map((spec) => {
            let staticBody: string | null = null;
            if (spec.strategy === "static" && spec.render) {
              try {
                staticBody = spec.render(staticCtx);
              } catch {
                staticBody = null;
              }
            }
            return (
              <ArtifactCard
                key={spec.id}
                spec={spec}
                artifact={byArtifactId[spec.id]}
                buildStatus={build.artifact_statuses?.[spec.id]}
                staticBody={staticBody}
                onCopy={onCopy}
                onDownload={onDownload}
                onTune={onTune}
              />
            );
          })}
        </section>
      ))}

      {extraSkills.length > 0 && (
        <section className="space-y-3">
          <h3 className="kit-label text-[11px] text-[color:var(--kit-mut)]">
            Built on your pass
          </h3>
          {extraSkills.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              spec={{
                id: artifact.artifact_id,
                title: skillMetaFromArtifact(artifact)?.name ?? artifact.title,
                description:
                  skillMetaFromArtifact(artifact)?.description ??
                  "A net-new skill built on your pass.",
                contentType: "zip",
                strategy: "skill_pipeline",
              }}
              artifact={artifact}
              buildStatus={undefined}
              onCopy={onCopy}
              onDownload={onDownload}
            />
          ))}
        </section>
      )}
    </div>
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

/** After the email lands: show how much CTRL already knows and bridge over. */
function BridgeCard() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { count: rows } = await db
          .from("user_memory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_current", true);
        if (!cancelled) setCount(rows ?? 0);
      } catch {
        if (!cancelled) setCount(0);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!count) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">
        CTRL already knows {count} thing{count === 1 ? "" : "s"} about you
      </h3>
      <p className="text-sm text-muted-foreground">
        Your Memory Web, daily briefing, and Edge profile are one step away.
      </p>
      <Button variant="outline" size="lg" className="w-full" onClick={() => navigate("/dashboard")}>
        Open CTRL
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
