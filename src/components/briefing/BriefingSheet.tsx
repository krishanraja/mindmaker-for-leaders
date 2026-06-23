import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { X, Play, Pause, RefreshCw, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBriefingContext } from "@/contexts/BriefingContext";
import { useSubmitFeedback, useGenerateBriefing } from "@/hooks/useBriefing";
import { supabase } from "@/integrations/supabase/client";
import { useWatchlist } from "@/hooks/useWatchlist";
import { FRAMEWORK_TAG_CONFIG, BRIEFING_TYPES } from "@/types/briefing";
import type { PlaybackSpeed, FrameworkTag } from "@/types/briefing";
import { haptics } from "@/lib/haptics";
import { SegmentCard } from "./SegmentCard";
import { SeedBeatsPrompt } from "./SeedBeatsPrompt";
import { BriefingVoiceButton } from "./BriefingVoiceButton";

const SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BriefingSheet() {
  const {
    briefing,
    setBriefing,
    playback,
    isSheetOpen,
    setSheetOpen,
    togglePlay,
    seek,
    setSpeed,
  } = useBriefingContext();

  const { submitFeedback } = useSubmitFeedback();
  const { regenerate, generating: regenerating } = useGenerateBriefing();
  const { watchedCompanies, watchCompany } = useWatchlist();
  const { keyboardHeight } = useVisualViewport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Voice-commands hint: shown once on first sheet open, dismissable. A busy
  // CEO would never discover the playback voice commands (pause / next /
  // faster / slower) from an unlabeled mic icon.
  const [voiceHintDismissed, setVoiceHintDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("briefing.voice.hint.seen") === "1";
  });
  const dismissVoiceHint = () => {
    setVoiceHintDismissed(true);
    try {
      window.localStorage.setItem("briefing.voice.hint.seen", "1");
    } catch {
      /* localStorage unavailable */
    }
  };

  // Auto-scroll to current segment
  useEffect(() => {
    const el = segmentRefs.current[playback.currentSegmentIndex];
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [playback.currentSegmentIndex]);

  // No auto-play: opening the sheet shows the player in paused state so the
  // user decides when to start. Tap the play button (togglePlay) to begin.

  const handleSpeedToggle = () => {
    const currentIdx = SPEEDS.indexOf(playback.speed);
    const next = SPEEDS[(currentIdx + 1) % SPEEDS.length];
    setSpeed(next);
    haptics.light();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * playback.duration);
  };

  const handleRegenerate = async () => {
    const newId = await regenerate();
    if (newId) {
      // Fetch the fresh briefing and update context
      const { data } = await supabase
        .from("briefings")
        .select("*")
        .eq("id", newId)
        .maybeSingle();
      if (data) setBriefing(data);
    }
  };

  const handleFeedback = (
    segmentIndex: number,
    payload: { reaction: "useful" | "not_useful"; lens_item_id?: string | null; dwell_ms?: number },
  ) => {
    if (briefing) {
      submitFeedback(briefing.id, segmentIndex, payload.reaction, {
        lensItemId: payload.lens_item_id ?? null,
        dwellMs: payload.dwell_ms,
      });
      haptics.light();
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const progress = playback.duration > 0
    ? (playback.currentTime / playback.duration) * 100
    : 0;

  return (
    <AnimatePresence>
      {isSheetOpen && briefing && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheetOpen(false)}
            className="fixed inset-0 z-40 bg-black/50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: keyboardHeight > 0 ? -keyboardHeight : 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 35, stiffness: 400, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 z-50 h-[85svh] bg-background rounded-t-2xl border-t border-border shadow-2xl flex flex-col"
          >
            {/* Handle */}
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {today}
                </p>
                <h2 className="text-lg font-semibold text-foreground">
                  {(() => {
                    const typeConfig = BRIEFING_TYPES.find(t => t.type === (briefing.briefing_type || 'default'));
                    return typeConfig?.type === 'default' ? "Today's briefing" : typeConfig?.label || "Today's briefing";
                  })()}
                </h2>
                {briefing.custom_context && (
                  <p className="text-[10px] text-muted-foreground/70 italic mt-0.5 line-clamp-1">
                    {briefing.custom_context}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  title="Regenerate briefing"
                >
                  <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSheetOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Player controls (fixed) */}
            <div className="px-4 py-4 border-b border-border flex-shrink-0">
              {!voiceHintDismissed && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Mic className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <p className="text-[11px] text-foreground leading-snug">
                      Try saying &ldquo;pause&rdquo;, &ldquo;next&rdquo;, or &ldquo;faster&rdquo;.
                    </p>
                  </div>
                  <button
                    onClick={dismissVoiceHint}
                    aria-label="Dismiss voice hint"
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
              {/* Play button + speed */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <button
                  onClick={handleSpeedToggle}
                  className="px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors min-w-[40px]"
                >
                  {playback.speed}x
                </button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg shadow-accent/25"
                >
                  {playback.isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </motion.button>

                <BriefingVoiceButton />
              </div>

              {/* Progress bar */}
              <div
                className="w-full h-2 bg-muted rounded-full cursor-pointer relative group"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-accent rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Timestamp */}
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatTime(playback.currentTime)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(playback.duration)}
                </span>
              </div>
            </div>

            {/* Segment cards (scrollable) */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain px-2 py-4 space-y-3"
            >
              {/* Cold-start seed prompt: only renders for users without enough */}
              {/* declared interests. Self-manages dismissal via localStorage. */}
              <SeedBeatsPrompt hidden={!isSheetOpen} />

              {briefing.segments.map((segment, index) => (
                <div
                  key={index}
                  ref={(el) => { segmentRefs.current[index] = el; }}
                >
                  <SegmentCard
                    segment={segment}
                    index={index}
                    isActive={index === playback.currentSegmentIndex}
                    onFeedback={(payload) => handleFeedback(index, payload)}
                    onWatchCompany={watchCompany}
                    watchedCompanies={watchedCompanies}
                    briefingId={briefing.id}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
