import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radio,
  ListChecks,
  Lightbulb,
  Play,
  Clock,
  ChevronDown,
  Settings2,
  Plus,
  Calendar,
  RefreshCw,
  PauseCircle,
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
  deriveBriefingRead,
} from "@/components/briefing";
import { InterestsSheet } from "@/components/briefing/InterestsSheet";
import { BottomNav } from "@/components/memory-web/BottomNav";
import { AppHeader } from "@/components/memory-web/AppHeader";
import { DesktopShell } from "@/components/layout/DesktopShell";
import { useDevice } from "@/hooks/useDevice";
import {
  useTodaysBriefing,
  useGenerateBriefing,
} from "@/hooks/useBriefing";
import { useBriefingContext } from "@/contexts/BriefingContext";
import { useMemoryWeb } from "@/hooks/useMemoryWeb";
import { useBriefingInterests } from "@/hooks/useBriefingInterests";
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
  const hasData = facts.length > 0;
  const {
    all: declaredInterests,
    loading: interestsLoading,
    remove: removeInterest,
    refetch: refetchInterests,
  } = useBriefingInterests();
  const {
    suggestions,
    loading: suggestionsLoading,
    accept: acceptSuggestion,
    dismiss: dismissSuggestion,
    acceptAll: acceptAllSuggestions,
    refetch: refetchSuggestions,
  } = useSuggestedInterests();

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
  // Leads with a kind-marked number ONLY where one is genuinely present;
  // otherwise the words read leads (clearest-unit-first, never fabricated).
  const briefingRead = useMemo(
    () => (defaultBriefing ? deriveBriefingRead(defaultBriefing) : null),
    [defaultBriefing],
  );

  // The hero's primary affordance reuses the existing play flow (opening the
  // sheet, which owns synthesis + the streaming/preparing states). When audio
  // already exists it reads "Listen"; otherwise it kicks the synth-on-open.
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

  /* ─── Mobile layout (unchanged) ──────────────────────────────── */
  if (isMobile) {
    return (
      <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
        <AppHeader />

        <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 scrollbar-hide">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 py-4"
          >
            {/* One calm header: what this is + its status + a single way to
                adjust it. Interests, tuning and steering all live behind this
                one "Adjust" control so the page itself stays a single step. */}
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  Briefing
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInterestsSheetOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Adjust
              </Button>
            </div>

            {showStream ? (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
                <StreamingBriefingPreview
                  segments={streamPreview?.segments ?? []}
                  ready={!!streamPreview?.ready}
                />
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : !hasData ? (
              <div className="flex flex-col items-center text-center py-10 gap-3">
                <Radio className="w-10 h-10 text-muted-foreground/30" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Tell us about yourself first
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Pick 3 topics and we'll build a briefing in your voice.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setInterestsSheetOpen(true)}
                >
                  Pick 3 interests now
                </Button>
              </div>
            ) : !hasDeclaredOrInferred && !defaultBriefing && !suggestionsLoading && suggestions.length === 0 ? (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <ListChecks className="w-5 h-5 text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pick a few topics first</p>
                    <p className="text-xs text-muted-foreground">We need 3+ interests to make this feel like yours.</p>
                  </div>
                </div>
                <Button onClick={() => setInterestsSheetOpen(true)} size="sm" className="w-full">
                  Choose what you want briefed on
                </Button>
              </div>
            ) : !defaultBriefing && !!generateError && !isGenerating ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive/70 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Could not generate your briefing just now.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This is usually a temporary hiccup - try again in a moment.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateToday}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retry
                </Button>
              </motion.div>
            ) : !defaultBriefing && hasDeclaredOrInferred ? (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Radio className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Today's briefing is ready to generate</p>
                    <p className="text-xs text-muted-foreground">
                      Drawn from {declaredInterests.length} interests, {facts.length} memories - ~30s
                    </p>
                  </div>
                </div>
                <Button onClick={handleGenerateToday} size="sm" className="w-full">
                  Generate today's briefing
                </Button>
              </div>
            ) : defaultBriefing && briefingRead ? (
              <BriefingHero
                read={briefingRead}
                ctaLabel={heroCtaLabel}
                onCta={() => handlePlayBriefing(defaultBriefing)}
                onGoDeeper={() => handlePlayBriefing(defaultBriefing)}
              />
            ) : null}

            {/* Secondary, one quiet action: once a briefing exists, the only
                follow-on offered is steering it by voice - the learn-and-refine
                loop. Topic management lives behind "Adjust", not stacked here. */}
            {defaultBriefing && (
              <VoiceSteerBar
                briefingId={defaultBriefing?.id ?? null}
                onCustomRequest={handleVoiceCustomRequest}
                onApplied={handleNudgeApplied}
              />
            )}

            {/* Suggestions only help before there is a briefing to listen to. */}
            {!defaultBriefing && (
              <SuggestedInterestsCard
                suggestions={suggestions}
                loading={suggestionsLoading}
                onAccept={acceptSuggestion}
                onDismiss={dismissSuggestion}
                onAcceptAll={acceptAllSuggestions}
              />
            )}

            {customBriefings.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                  Custom Briefings Today
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
                  <div className="space-y-1.5">
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
          </motion.div>
        </main>

        <MiniPlayer />
        <BottomNav />
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
      </div>
    );
  }

  /* ─── Desktop layout: hero player + side rails ─────────────── */

  const rightRail = (
    <div className="flex flex-col">
      {/* Interests */}
      <div className="border-b border-border/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-accent" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your interests
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
          emptyHint="No interests yet - voice steer or tap Manage."
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
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-secondary/60 transition-colors text-left group"
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
        eyebrow="Briefing"
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
          <>
            <button
              onClick={() => setCustomSheetOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Custom briefing
            </button>
            <button
              onClick={() => setInterestsSheetOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Adjust
            </button>
          </>
        }
        rightRail={rightRail}
      >
        <div className="max-w-3xl mx-auto w-full flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-6">
          {/* Hero state - exactly one thing at a time */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : !hasData ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/30 py-16 text-center">
              <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-2">
                Tell us about yourself first
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                Pick 3 topics and we'll build a briefing in your voice.
              </p>
              <Button onClick={() => setInterestsSheetOpen(true)}>
                Pick 3 interests now
              </Button>
            </div>
          ) : !hasDeclaredOrInferred && !defaultBriefing && !suggestionsLoading && suggestions.length === 0 ? (
            <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <ListChecks className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Pick a few topics first
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    We need 3+ interests to make this feel like your briefing,
                    not a generic news feed.
                  </p>
                  <Button onClick={() => setInterestsSheetOpen(true)}>
                    Choose what you want briefed on
                  </Button>
                </div>
              </div>
            </div>
          ) : !defaultBriefing && isGenerating ? (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                  <Radio className="w-7 h-7 text-accent animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Generating today's briefing
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {currentPhase === "scanning"
                      ? "Reading your profile"
                      : currentPhase === "personalising"
                      ? "Searching today's news"
                      : "Curating"}
                  </p>
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
          ) : !defaultBriefing && !!generateError && !isGenerating ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-destructive/70" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Could not generate your briefing just now.
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    This is usually a temporary hiccup - try again in a moment.
                  </p>
                  <Button
                    onClick={handleGenerateToday}
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : !defaultBriefing && sparseProfile ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    A little more signal, and your briefing lands
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    {sparseProfile.missing.length > 0
                      ? `Add ${sparseProfile.missing.slice(0, 2).join(" and ")} so today's briefing is actually about you.`
                      : sparseProfile.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        clearSparseProfile();
                        setInterestsSheetOpen(true);
                      }}
                    >
                      Add interests
                    </Button>
                    <Button onClick={clearSparseProfile} variant="ghost">
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : !defaultBriefing && hasDeclaredOrInferred ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-8 shadow-xl shadow-accent/5"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-7 h-7 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Today's briefing is ready to generate
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Drawn from{" "}
                    <span className="text-foreground font-medium">
                      {declaredInterests.length}{" "}
                      {declaredInterests.length === 1 ? "interest" : "interests"}
                    </span>
                    {facts.length > 0 && (
                      <>
                        {" and "}
                        <span className="text-foreground font-medium">
                          {facts.length} {facts.length === 1 ? "memory" : "memories"}
                        </span>
                      </>
                    )}
                    {" - takes ~30 seconds"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleGenerateToday}
                  size="lg"
                  className="px-6 h-11 text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
                >
                  Generate today's briefing
                </Button>
                <Button
                  onClick={() => setCustomSheetOpen(true)}
                  variant="ghost"
                  size="lg"
                  className="h-11 text-sm"
                >
                  Pick a different type
                </Button>
              </div>
            </motion.div>
          ) : defaultBriefing && briefingRead ? (
            <div className="max-w-md mx-auto w-full">
              <BriefingHero
                read={briefingRead}
                ctaLabel={heroCtaLabel}
                onCta={() => handlePlayBriefing(defaultBriefing)}
                onGoDeeper={() => handlePlayBriefing(defaultBriefing)}
              />
            </div>
          ) : null}

          {/* Voice steer - hero CTA */}
          {hasData && (
            <VoiceSteerBar
              briefingId={defaultBriefing?.id ?? null}
              onCustomRequest={handleVoiceCustomRequest}
              onApplied={handleNudgeApplied}
            />
          )}

          {/* Today's custom briefings */}
          {customBriefings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Custom briefings today
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {customBriefings.map((b) => {
                  const typeConfig = BRIEFING_TYPES.find((t) => t.type === b.briefing_type);
                  const durationMin = b.audio_duration_seconds
                    ? Math.ceil(b.audio_duration_seconds / 60)
                    : 3;
                  return (
                    <motion.button
                      key={b.id}
                      onClick={() => handlePlayBriefing(b)}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-accent/30 hover:bg-card/80 transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Play className="w-3.5 h-3.5 text-accent fill-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {typeConfig?.label || b.briefing_type}
                          </p>
                          <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                            {durationMin} min
                          </Badge>
                        </div>
                        {b.custom_context && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                            {b.custom_context}
                          </p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* More actions */}
          {hasData && (
            <div className="flex items-center justify-center gap-6 pt-2">
              <button
                type="button"
                onClick={() => setCustomSheetOpen(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                <Plus className="h-3 w-3" />
                Custom briefing type
              </button>
              {defaultBriefing && (
                <button
                  type="button"
                  onClick={handleRefreshBriefing}
                  disabled={refreshingBriefing}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3 w-3", refreshingBriefing && "animate-spin")} />
                  Regenerate today
                </button>
              )}
              <span className="text-xs text-muted-foreground/60">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[10px] font-mono">
                  ⌘K
                </kbd>{" "}
                to jump anywhere
              </span>
            </div>
          )}
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
