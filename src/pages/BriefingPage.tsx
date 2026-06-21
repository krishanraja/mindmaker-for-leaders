import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radio,
  Play,
  Clock,
  ChevronDown,
  Settings2,
  Plus,
  Calendar,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BriefingSheet,
  MiniPlayer,
  CustomBriefingSheet,
  VoiceSteerBar,
  InterestChipsRow,
  SuggestedInterestsCard,
  BriefingHero,
  BriefingCategoryPicker,
  deriveBriefingRead,
} from "@/components/briefing";
import { InterestsSheet } from "@/components/briefing/InterestsSheet";
import { DesktopShell } from "@/components/layout/DesktopShell";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { useDevice } from "@/hooks/useDevice";
import {
  useTodaysBriefing,
  useGenerateBriefing,
} from "@/hooks/useBriefing";
import { useBriefingContext } from "@/contexts/BriefingContext";
import { useMemoryWeb } from "@/hooks/useMemoryWeb";
import { useBriefingInterests } from "@/hooks/useBriefingInterests";
import { useBriefingCategories } from "@/hooks/useBriefingCategories";
import { useSuggestedInterests } from "@/hooks/useSuggestedInterests";
import { useBriefingStreamPreview } from "@/hooks/useBriefingStreamPreview";
import { StreamingBriefingPreview } from "@/components/briefing/StreamingBriefingPreview";
import { FF } from "@/lib/flags";
import { BRIEFING_TYPES } from "@/types/briefing";
import type { Briefing, BriefingType } from "@/types/briefing";

function BriefingPage() {
  const { isMobile } = useDevice();
  const {
    briefing: defaultBriefing,
    briefings,
    customBriefings,
    loading,
    refetch,
  } = useTodaysBriefing();
  const { facts } = useMemoryWeb();
  const {
    all: declaredInterests,
    loading: interestsLoading,
    remove: removeInterest,
    refetch: refetchInterests,
  } = useBriefingInterests();
  // The AI-native category view over interests: the picker speaks in the nine
  // news categories; under the hood they are stored as beats so the briefing
  // pipeline reads them unchanged.
  const categories = useBriefingCategories();
  const {
    suggestions,
    loading: suggestionsLoading,
    accept: acceptSuggestion,
    dismiss: dismissSuggestion,
    acceptAll: acceptAllSuggestions,
    refetch: refetchSuggestions,
  } = useSuggestedInterests();

  // A leader is "set up" once they have picked at least three things to be
  // briefed on (categories or any declared interest).
  const hasDeclaredOrInferred = declaredInterests.length >= 3;

  const { generate, generating, phase, error: generateError, sparseProfile, clearSparseProfile } = useGenerateBriefing();
  const { setBriefing, setSheetOpen } = useBriefingContext();
  const [customSheetOpen, setCustomSheetOpen] = useState(false);
  const [interestsSheetOpen, setInterestsSheetOpen] = useState(false);
  const [presetCustomPrompt, setPresetCustomPrompt] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (defaultBriefing) setBriefing(defaultBriefing);
  }, [defaultBriefing, setBriefing]);

  // Listen for command palette "generate today's briefing"
  useEffect(() => {
    const onGen = () => handleGenerateToday();
    window.addEventListener("mm:generate-briefing", onGen);
    return () => window.removeEventListener("mm:generate-briefing", onGen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayBriefing = (b: Briefing) => {
    setBriefing(b);
    setSheetOpen(true);
  };

  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const handleRefreshBriefing = async () => {
    setRefreshingBriefing(true);
    try {
      await generate("default", undefined, { force: true });
      await refetch();
    } finally {
      setRefreshingBriefing(false);
    }
  };

  const handleCustomGenerate = async (
    briefingType: BriefingType,
    customContext?: string,
  ) => {
    const id = await generate(briefingType, customContext);
    if (id) {
      setCustomSheetOpen(false);
      setPresetCustomPrompt(null);
      await refetch();
    }
  };

  const handleGenerateToday = async () => {
    const id = await generate("default");
    if (id) {
      await refetch();
    }
  };

  // The picker's primary action: save the chosen AI-native categories, then
  // kick off the first briefing in one continuous step.
  const handleConfirmCategories = async () => {
    await categories.save();
    await refetchInterests();
    await handleGenerateToday();
  };

  const handleVoiceCustomRequest = (prompt: string) => {
    setPresetCustomPrompt(prompt);
    setCustomSheetOpen(true);
  };

  const handleNudgeApplied = async () => {
    await Promise.all([refetchInterests(), refetchSuggestions()]);
  };

  const isGenerating = generating;
  const currentPhase = phase;
  // Flag-gated (FF.briefingStream / ?ff_stream=1): live preliminary-segment preview.
  const streamPreview = useBriefingStreamPreview(isGenerating);
  const showStream = FF.briefingStream() && isGenerating && !!streamPreview?.segments?.length;

  const earlierBriefings = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return briefings.filter((b) => {
      if (b.briefing_type && b.briefing_type !== "default") return false;
      if (defaultBriefing && b.id === defaultBriefing.id) return false;
      const key = (b.created_at || "").slice(0, 10);
      return key && key !== todayKey;
    });
  }, [briefings, defaultBriefing]);

  // Honest "what just moved" read derived from the real briefing segments.
  const briefingRead = useMemo(
    () => (defaultBriefing ? deriveBriefingRead(defaultBriefing) : null),
    [defaultBriefing],
  );

  const heroHasAudio = !!defaultBriefing?.audio_url;
  const heroCtaLabel = heroHasAudio ? "Listen" : "Listen to your briefing";

  const liveStatus = (() => {
    if (loading) return "Loading...";
    if (isGenerating) {
      if (currentPhase === "scanning") return "Reading your profile";
      if (currentPhase === "personalising") return "Searching today's news";
      if (currentPhase === "preparing") return "Curating";
      return "Preparing your briefing";
    }
    if (defaultBriefing) {
      const created = new Date(defaultBriefing.created_at);
      const minutesAgo = Math.max(
        1,
        Math.round((Date.now() - created.getTime()) / 60000),
      );
      if (minutesAgo < 60) return `Updated ${minutesAgo} min ago`;
      const hours = Math.round(minutesAgo / 60);
      return `Updated ${hours}h ago`;
    }
    return "Ready when you are";
  })();

  // Which single one-ask state is this surface in right now? One source of
  // truth drives both mobile and desktop so they never diverge.
  type ColdState =
    | "loading"
    | "pick"        // choose your AI-native categories (the first ask)
    | "generating"
    | "error"
    | "sparse"      // a little more signal needed
    | "ready"       // categories chosen, briefing not generated yet
    | "play";       // a briefing exists, play it
  const coldState: ColdState = (() => {
    if (loading) return "loading";
    if (defaultBriefing && briefingRead) return "play";
    if (isGenerating) return "generating";
    if (!defaultBriefing && generateError) return "error";
    if (!defaultBriefing && sparseProfile) return "sparse";
    if (!hasDeclaredOrInferred) return "pick";
    return "ready";
  })();

  const generatingSubline =
    currentPhase === "scanning"
      ? "Reading your profile"
      : currentPhase === "personalising"
      ? "Searching today's news"
      : "Curating";

  /* ─── Mobile layout: one no-scroll viewport, one ask per state ─────── */
  if (isMobile) {
    return (
      <MobileFrame
        padding="px-4 pb-20"
        banner={
          /* One calm header: what this is + its status + a single way to adjust
             it. Everything else lives behind "Adjust" so the page stays one step. */
          <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">
                Your daily read
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block w-1.5 h-1.5 rounded-full",
                    isGenerating
                      ? "bg-amber-500 animate-pulse"
                      : defaultBriefing
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/40",
                  )}
                />
                {liveStatus}
              </p>
            </div>
            {hasDeclaredOrInferred && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInterestsSheetOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Adjust
              </Button>
            )}
          </div>
        }
        extras={
          <>
            <MiniPlayer />
            <BriefingSheet />
            <CustomBriefingSheet
              isOpen={customSheetOpen}
              onClose={() => {
                setCustomSheetOpen(false);
                setPresetCustomPrompt(null);
              }}
              onGenerate={handleCustomGenerate}
              isGenerating={generating}
              initialContext={presetCustomPrompt ?? undefined}
            />
            <InterestsSheet
              open={interestsSheetOpen}
              onOpenChange={setInterestsSheetOpen}
              onSaved={() => {
                void refetchInterests();
                void refetchSuggestions();
              }}
            />
          </>
        }
      >
        {/* The single ask for this state, fit to the viewport, no page scroll. */}
        <div className="flex h-full min-h-0 flex-col">
          {coldState === "loading" ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : coldState === "pick" ? (
            <div className="h-full min-h-0 py-2">
              <BriefingCategoryPicker
                selected={categories.selected}
                onToggle={categories.toggle}
                onConfirm={handleConfirmCategories}
                saving={categories.saving || isGenerating}
              />
            </div>
          ) : coldState === "generating" ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center">
                <Radio className="w-8 h-8 text-accent animate-pulse" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Building today's briefing
                </h2>
                <p className="text-sm text-muted-foreground">{generatingSubline}</p>
              </div>
              <div className="h-1.5 w-full max-w-xs rounded-full bg-accent/15 overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: "5%" }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 20, ease: "linear" }}
                />
              </div>
              {showStream ? (
                <div className="w-full max-w-xs rounded-2xl border border-accent/30 bg-accent/5 p-4 text-left">
                  <StreamingBriefingPreview
                    segments={streamPreview?.segments ?? []}
                    ready={!!streamPreview?.ready}
                  />
                </div>
              ) : null}
            </div>
          ) : coldState === "error" ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <AlertCircle className="w-10 h-10 text-destructive/70" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  We could not build your briefing just now
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  This is usually a brief hiccup. Give it another go in a moment.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleGenerateToday}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Try again
              </Button>
            </div>
          ) : coldState === "sparse" ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                <Settings2 className="w-7 h-7 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  A little more about you, and this lands
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {sparseProfile && sparseProfile.missing.length > 0
                    ? `Add ${sparseProfile.missing.slice(0, 2).join(" and ")} so today's briefing is really about you.`
                    : (sparseProfile?.message ?? "")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { clearSparseProfile(); setInterestsSheetOpen(true); }}>
                  Add a little more
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSparseProfile}>
                  Not now
                </Button>
              </div>
            </div>
          ) : coldState === "ready" ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center">
                <Radio className="w-8 h-8 text-accent" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">
                  Your briefing is ready to build
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  We will pull today's AI news for the topics you picked and read
                  it back in your voice. About 30 seconds.
                </p>
              </div>
              <Button onClick={handleGenerateToday} size="lg" className="w-full max-w-xs">
                Build today's briefing
              </Button>
              <button
                type="button"
                onClick={() => setInterestsSheetOpen(true)}
                className="text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                Change your topics
              </button>
            </div>
          ) : coldState === "play" && defaultBriefing && briefingRead ? (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto scrollbar-hide py-2">
              <BriefingHero
                read={briefingRead}
                ctaLabel={heroCtaLabel}
                onCta={() => handlePlayBriefing(defaultBriefing)}
                onGoDeeper={() => handlePlayBriefing(defaultBriefing)}
              />
              {/* one quiet follow-on: steer it by voice, plus earlier briefings */}
              <div className="mt-4 space-y-4">
                <VoiceSteerBar
                  briefingId={defaultBriefing?.id ?? null}
                  onCustomRequest={handleVoiceCustomRequest}
                  onApplied={handleNudgeApplied}
                />
                {customBriefings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                      Custom briefings today
                    </p>
                    {customBriefings.map((b) => {
                      const typeConfig = BRIEFING_TYPES.find((t) => t.type === b.briefing_type);
                      const durationMin = b.audio_duration_seconds
                        ? Math.ceil(b.audio_duration_seconds / 60)
                        : 3;
                      return (
                        <Card
                          key={b.id}
                          className="cursor-pointer hover:border-accent/30 transition-colors"
                          onClick={() => handlePlayBriefing(b)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <Play className="w-3.5 h-3.5 text-accent fill-accent" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {typeConfig?.label || b.briefing_type}
                                </p>
                                <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                                  {durationMin} min
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {earlierBriefings.length > 0 && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowHistory((v) => !v)}
                      className="flex items-center justify-between w-full px-1"
                    >
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Earlier this week ({earlierBriefings.length})
                      </p>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 text-muted-foreground transition-transform",
                          showHistory && "rotate-180",
                        )}
                      />
                    </button>
                    {showHistory && (
                      <div className="space-y-1.5 pb-2">
                        {earlierBriefings.map((b) => {
                          const created = new Date(b.created_at);
                          const dayLabel = created.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          });
                          return (
                            <Card
                              key={b.id}
                              className="cursor-pointer hover:border-accent/30 transition-colors"
                              onClick={() => handlePlayBriefing(b)}
                            >
                              <CardContent className="p-3 flex items-center gap-3">
                                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground">{dayLabel}</p>
                                </div>
                                <Play className="w-3.5 h-3.5 text-accent fill-accent shrink-0" />
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </MobileFrame>
    );
  }

  /* ─── Desktop layout: hero player + side rails, no page scroll ─────── */

  const rightRail = (
    <div className="flex flex-col">
      {/* Interests */}
      <div className="border-b border-border/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-accent" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your topics
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setInterestsSheetOpen(true)}
            className="text-[11px] text-accent hover:underline"
          >
            Manage
          </button>
        </div>
        <InterestChipsRow
          interests={declaredInterests}
          loading={interestsLoading}
          onRemove={removeInterest}
          onAdd={() => setInterestsSheetOpen(true)}
          emptyHint="No topics yet. Pick a few to start your briefing."
        />
      </div>

      {/* Suggested */}
      {(suggestions.length > 0 || suggestionsLoading) && (
        <div className="border-b border-border/60 p-5">
          <SuggestedInterestsCard
            suggestions={suggestions}
            loading={suggestionsLoading}
            onAccept={acceptSuggestion}
            onDismiss={dismissSuggestion}
            onAcceptAll={acceptAllSuggestions}
          />
        </div>
      )}

      {/* Earlier */}
      {earlierBriefings.length > 0 && (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Earlier this week
            </h3>
          </div>
          <div className="space-y-1.5">
            {earlierBriefings.slice(0, 6).map((b) => {
              const created = new Date(b.created_at);
              const dayLabel = created.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const minutes = b.audio_duration_seconds
                ? Math.ceil(b.audio_duration_seconds / 60)
                : 3;
              return (
                <button
                  key={b.id}
                  onClick={() => handlePlayBriefing(b)}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-secondary/50 transition-colors text-left group"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-accent flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{dayLabel}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {b.headline || `${minutes} min briefing`}
                    </p>
                  </div>
                  <Play className="w-3 h-3 text-muted-foreground/40 group-hover:text-accent fill-current flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <DesktopShell
        eyebrow="Your daily read"
        title={
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block w-1.5 h-1.5 rounded-full",
                isGenerating
                  ? "bg-amber-500 animate-pulse"
                  : defaultBriefing
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40",
              )}
            />
            <span>{liveStatus}</span>
          </span>
        }
        actions={
          hasDeclaredOrInferred ? (
            <>
              <button
                onClick={() => setCustomSheetOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Custom briefing
              </button>
              <button
                onClick={() => setInterestsSheetOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Adjust
              </button>
            </>
          ) : undefined
        }
        rightRail={hasDeclaredOrInferred ? rightRail : undefined}
      >
        {/* One bounded, non-scrolling column. Each state fits the viewport and
            presents exactly one ask. */}
        <div className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden">
          {coldState === "loading" ? (
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          ) : coldState === "pick" ? (
            <div className="flex h-full min-h-0 w-full max-w-2xl flex-col py-6">
              <BriefingCategoryPicker
                selected={categories.selected}
                onToggle={categories.toggle}
                onConfirm={handleConfirmCategories}
                saving={categories.saving || isGenerating}
                compact
              />
            </div>
          ) : coldState === "generating" ? (
            <div className="w-full max-w-md rounded-2xl border border-accent/30 bg-accent/5 p-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                  <Radio className="w-7 h-7 text-accent animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Building today's briefing
                  </h2>
                  <p className="text-sm text-muted-foreground">{generatingSubline}</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-accent/15 overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: "5%" }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 20, ease: "linear" }}
                />
              </div>
              {showStream ? (
                <div className="mt-5">
                  <StreamingBriefingPreview
                    segments={streamPreview?.segments ?? []}
                    ready={!!streamPreview?.ready}
                  />
                </div>
              ) : null}
            </div>
          ) : coldState === "error" ? (
            <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-destructive/70" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    We could not build your briefing just now
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    This is usually a brief hiccup. Give it another go in a moment.
                  </p>
                  <Button onClick={handleGenerateToday} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          ) : coldState === "sparse" ? (
            <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <Settings2 className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    A little more about you, and this lands
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    {sparseProfile && sparseProfile.missing.length > 0
                      ? `Add ${sparseProfile.missing.slice(0, 2).join(" and ")} so today's briefing is really about you.`
                      : (sparseProfile?.message ?? "")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        clearSparseProfile();
                        setInterestsSheetOpen(true);
                      }}
                    >
                      Add a little more
                    </Button>
                    <Button onClick={clearSparseProfile} variant="ghost">
                      Not now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : coldState === "ready" ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-8 shadow-xl shadow-accent/5"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-7 h-7 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Your briefing is ready to build
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We will pull today's AI news for your topics and read it back
                    in your voice. About 30 seconds.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleGenerateToday}
                  size="lg"
                  className="px-6 h-11 text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
                >
                  Build today's briefing
                </Button>
                <Button
                  onClick={() => setCustomSheetOpen(true)}
                  variant="ghost"
                  size="lg"
                  className="h-11 text-sm"
                >
                  Pick a different kind
                </Button>
              </div>
            </motion.div>
          ) : coldState === "play" && defaultBriefing && briefingRead ? (
            <div className="flex h-full min-h-0 w-full max-w-md flex-col justify-center overflow-y-auto scrollbar-hide py-6">
              <BriefingHero
                read={briefingRead}
                ctaLabel={heroCtaLabel}
                onCta={() => handlePlayBriefing(defaultBriefing)}
                onGoDeeper={() => handlePlayBriefing(defaultBriefing)}
              />
              <div className="mt-4">
                <VoiceSteerBar
                  briefingId={defaultBriefing?.id ?? null}
                  onCustomRequest={handleVoiceCustomRequest}
                  onApplied={handleNudgeApplied}
                />
              </div>
              <div className="mt-3 flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => setCustomSheetOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Custom briefing
                </button>
                <button
                  type="button"
                  onClick={handleRefreshBriefing}
                  disabled={refreshingBriefing}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3 w-3", refreshingBriefing && "animate-spin")} />
                  Rebuild today
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </DesktopShell>

      <MiniPlayer />
      <BriefingSheet />
      <CustomBriefingSheet
        isOpen={customSheetOpen}
        onClose={() => {
          setCustomSheetOpen(false);
          setPresetCustomPrompt(null);
        }}
        onGenerate={handleCustomGenerate}
        isGenerating={generating}
        initialContext={presetCustomPrompt ?? undefined}
      />
      <InterestsSheet
        open={interestsSheetOpen}
        onOpenChange={setInterestsSheetOpen}
        onSaved={() => {
          void refetchInterests();
          void refetchSuggestions();
        }}
      />
    </>
  );
}

export default BriefingPage;
