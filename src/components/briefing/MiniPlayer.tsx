import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { useBriefingContext } from "@/contexts/BriefingContext";

export function MiniPlayer() {
  const { briefing, playback, isMiniPlayerVisible, setSheetOpen, togglePlay } =
    useBriefingContext();

  if (!isMiniPlayerVisible || !briefing) return null;

  const currentSegment = briefing.segments?.[playback.currentSegmentIndex];
  const headline = currentSegment?.headline || "Today's briefing";

  const progress = playback.duration > 0
    ? (playback.currentTime / playback.duration) * 100
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 400 }}
        className="fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border"
        style={{ bottom: "64px" }} // Above bottom nav
      >
        {/* Progress line */}
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-accent transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          className="flex items-center gap-3 px-4 h-12 cursor-pointer"
          onClick={() => setSheetOpen(true)}
        >
          {/* Playing indicator */}
          <div className="flex-shrink-0">
            {playback.isPlaying ? (
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2 h-2 rounded-full bg-accent"
              />
            ) : (
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            )}
          </div>

          {/* Headline */}
          <p className="flex-1 text-xs font-medium truncate text-foreground">
            {headline}
          </p>

          {/* Play/Pause */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            {playback.isPlaying ? (
              <Pause className="w-4 h-4 text-foreground fill-current" />
            ) : (
              <Play className="w-4 h-4 text-foreground fill-current ml-0.5" />
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
