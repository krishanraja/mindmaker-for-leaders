import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Play, Check, ChevronDown, Sparkles, RefreshCw, Bookmark, BookmarkCheck, Ban, Loader2, Info, Volume2, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Briefing, BriefingSegment } from "@/types/briefing";
import { FRAMEWORK_TAG_CONFIG, BRIEFING_TYPES } from "@/types/briefing";
import { usePollAudio, useGenerateBriefing } from "@/hooks/useBriefing";
import { useBriefingInterests } from "@/hooks/useBriefingInterests";
import { useKillLensItem } from "@/hooks/useKillLensItem";
import { haptics } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { useBriefingContext } from "@/contexts/BriefingContext";
import type { SkillSeed } from "@/types/skill";

/**
 * Inline segment row used in the expanded dashboard briefing card.
 * Compact by design - matches the surrounding card density - but surfaces
 * the v2 anchor + quick actions so the user sees the new loop without
 * opening the full sheet.
 */
function InlineSegmentRow({
  segment,
  briefingId,
}: {
  segment: BriefingSegment;
  briefingId: string;
}) {
  const tagConfig = FRAMEWORK_TAG_CONFIG[segment.framework_tag];
  const anchor = (segment.matched_profile_fact ?? "").trim();
  const hasV2 = anchor.length > 0 && !!segment.lens_item_id;
  const canKill = hasV2 && !segment.lens_item_id!.startsWith("interest_");

  const { beats, add } = useBriefingInterests();
  const { killByBriefing, killing } = useKillLensItem();
  const navigate = useNavigate();
  const alreadyPinned =
    anchor.length > 0 &&
    beats.some((b) => b.text.toLowerCase() === anchor.toLowerCase());
  const [pinning, setPinning] = useState(false);
  const [killed, setKilled] = useState(false);
  const isKilling = killing === (segment.lens_item_id ?? "");

  // Decision-trigger segments are exactly the kind of "this changes something
  // for me" beat that warrants a skill - they tie a news event to an active
  // decision on the leader's desk. Show an inline automate affordance only
  // for that framework tag so we don't clutter every story.
  const isDecisionTrigger =
    (segment.framework_tag || "").toLowerCase() === "decision_trigger";
  const handleAutomate = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    // Prefer the anchor (matched_profile_fact - the leader's actual decision
    // text from their profile) over the rewritten headline. Falls back to
    // headline so the seed is never empty.
    const seedText = anchor || segment.headline;
    const seed: SkillSeed = {
      kind: "briefing_segment",
      text: seedText,
      label: anchor ? anchor : segment.headline,
    };
    navigate("/context", { state: { seed } });
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!anchor || alreadyPinned || pinning) return;
    setPinning(true);
    try {
      await add("beat", anchor, { source: "manual" });
      haptics.light();
    } finally {
      setPinning(false);
    }
  };

  const handleKill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canKill || killed || isKilling || !segment.lens_item_id) return;
    const ok = await killByBriefing({ briefingId, lensItemId: segment.lens_item_id });
    if (ok) {
      setKilled(true);
      haptics.light();
    }
  };

  const whyReason =
    anchor.length > 0
      ? `Matched to your interest in ${anchor}.`
      : `This segment fits the ${tagConfig?.label || segment.framework_tag} lens for your role.`;

  return (
    <div className="leading-snug group">
      <div className="flex items-start gap-1.5">
        <span
          className={cn(
            "text-[8px] font-bold uppercase px-1 py-0.5 rounded border inline-block align-middle mt-[2px] shrink-0",
            tagConfig?.className || "bg-muted text-muted-foreground border-border",
          )}
        >
          {tagConfig?.label || segment.framework_tag}
        </span>
        <span className="text-xs text-muted-foreground flex-1 min-w-0">
          {segment.headline}
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label="Why this segment?"
              className="shrink-0 mt-[2px] p-0.5 rounded text-muted-foreground/40 hover:text-accent hover:bg-accent/10 transition-colors"
            >
              <Info className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-64 text-[11px] p-2.5 leading-snug"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-foreground mb-1">Why this?</p>
            <p className="text-muted-foreground">{whyReason}</p>
          </PopoverContent>
        </Popover>
      </div>

      {/* v2 anchor + quick actions. Hidden on v1 rows (anchor empty). */}
      {hasV2 && (
        <div className="flex items-center gap-2 mt-0.5 pl-1">
          <span className="text-[10px] text-muted-foreground/70 italic truncate">
            Anchored to: <span className="text-foreground/80">{anchor}</span>
          </span>
          <div className="flex items-center gap-0.5 ml-auto">
            {isDecisionTrigger && (
              <button
                onClick={handleAutomate}
                title={`Build a skill for "${anchor || segment.headline}"`}
                className="p-1 rounded transition-colors text-muted-foreground/50 hover:text-amber-500 hover:bg-amber-500/10"
              >
                <Zap className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={handlePin}
              disabled={alreadyPinned || pinning}
              title={alreadyPinned ? `Already a beat: ${anchor}` : `Keep beat: ${anchor}`}
              className={cn(
                "p-1 rounded transition-colors",
                alreadyPinned
                  ? "text-accent bg-accent/10"
                  : "text-muted-foreground/50 hover:text-accent hover:bg-accent/10",
              )}
            >
              {pinning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : alreadyPinned ? (
                <BookmarkCheck className="w-3 h-3" />
              ) : (
                <Bookmark className="w-3 h-3" />
              )}
            </button>
            {canKill && (
              <button
                onClick={handleKill}
                disabled={killed || isKilling}
                title={
                  killed
                    ? "Killed - won't appear in future briefings"
                    : `Don't show me stories like this`
                }
                className={cn(
                  "p-1 rounded transition-colors",
                  killed
                    ? "text-red-500 bg-red-500/10"
                    : "text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10",
                )}
              >
                {isKilling ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Ban className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* When v1 (no anchor) AND the tag is decision_trigger, surface a
          standalone automate row so we don't miss the most-relevant signal
          just because v2 wasn't enabled for this user/briefing yet. */}
      {!hasV2 && isDecisionTrigger && (
        <div className="flex items-center justify-end mt-0.5 pl-1">
          <button
            onClick={handleAutomate}
            title={`Build a skill for "${segment.headline}"`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-amber-600 hover:bg-amber-500/10 transition-colors"
          >
            <Zap className="w-3 h-3" />
            Automate
          </button>
        </div>
      )}
    </div>
  );
}

function RotatingHeadlines({ segments }: { segments: BriefingSegment[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (segments.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % segments.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [segments.length]);

  const headline = segments[index]?.headline;
  if (!headline) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25 }}
        className="text-xs leading-relaxed line-clamp-1 text-muted-foreground/80"
      >
        {headline}
      </motion.p>
    </AnimatePresence>
  );
}

interface BriefingCardProps {
  briefing: Briefing;
  hasListened: boolean;
  onPlay: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onCustomBriefing?: () => void;
  customBriefingCount?: number;
  onExpandChange?: (expanded: boolean) => void;
}

export function BriefingCard({
  briefing,
  hasListened,
  onPlay,
  onRefresh,
  refreshing = false,
  onCustomBriefing,
  customBriefingCount = 0,
  onExpandChange,
}: BriefingCardProps) {
  const { audioUrl, polling, exhausted, synthError, start, clearError } = usePollAudio();
  const { setBriefing } = useBriefingContext();
  const { regenerate, generating: regenerating } = useGenerateBriefing();
  const [expanded, setExpanded] = useState(false);

  const handleGenerateAudio = () => {
    if (!briefing.audio_url) {
      clearError();
      start(briefing.id);
    }
  };

  const handleRegenerate = async () => {
    const newId = await regenerate();
    if (newId) {
      const { data } = await supabase
        .from("briefings")
        .select("*")
        .eq("id", newId)
        .maybeSingle();
      if (data) setBriefing(data);
    }
  };

  useEffect(() => {
    if (audioUrl && !briefing.audio_url) {
      setBriefing({ ...briefing, audio_url: audioUrl });
    }
  }, [audioUrl, briefing, setBriefing]);

  const hasAudio = !!(briefing.audio_url || audioUrl);
  const hasScript = !!briefing.script_text;
  const waitingForAudio = !hasAudio && polling;

  const segmentCount = briefing.segments?.length || 0;
  const durationMin = briefing.audio_duration_seconds
    ? Math.ceil(briefing.audio_duration_seconds / 60)
    : 3;

  // How many of the user's distinct profile anchors surfaced stories today.
  // A tangible "this was actually about you" signal - replaces the opaque
  // generic "personalised" claim with a count tied to their own inputs.
  const anchorCount = React.useMemo(() => {
    const anchors = new Set<string>();
    for (const seg of briefing.segments ?? []) {
      const anchor = (seg.matched_profile_fact ?? "").trim().toLowerCase();
      if (anchor.length > 0) anchors.add(anchor);
    }
    return anchors.size;
  }, [briefing.segments]);

  const briefingTypeConfig = BRIEFING_TYPES.find(t => t.type === (briefing.briefing_type || 'default'));
  const briefingLabel = briefingTypeConfig?.label || "Your Briefing";

  const teaser = briefing.segments?.[0]?.headline || "Your personalised news briefing is ready";

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  };

  return (
    <div className="relative">
      <Card className="overflow-hidden">
        <CardContent className="p-2.5">
          {/* Header row: icon + title + badge on left, listen button on right */}
          <div className="flex items-start justify-between gap-2">
            <div
              className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
              onClick={toggleExpanded}
            >
              <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Radio className="w-3 h-3 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-semibold whitespace-nowrap">{briefingLabel}</p>
                  <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0.5 whitespace-nowrap">
                    {durationMin} min
                  </Badge>
                  {hasListened && (
                    <Check className="w-3 h-3 text-emerald-500" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRegenerate(); }}
                    disabled={regenerating}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Regenerate briefing"
                  >
                    <RefreshCw className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`} />
                  </button>
                  <motion.div
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {segmentCount} {segmentCount === 1 ? "story" : "stories"}
                  {anchorCount > 0 && (
                    <>
                      {" · drawn from "}
                      <span className="text-foreground/80">
                        {anchorCount} of your {anchorCount === 1 ? "inputs" : "inputs"}
                      </span>
                    </>
                  )}
                </p>
                {/* Teaser / rotating headline when collapsed */}
                {!expanded && (
                  <AnimatePresence mode="wait">
                    <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {waitingForAudio && briefing.segments?.length > 0 ? (
                        <RotatingHeadlines segments={briefing.segments} />
                      ) : (
                        <p className="text-xs leading-relaxed line-clamp-1 text-muted-foreground/80">{teaser}</p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {hasAudio ? (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 px-3"
                  onClick={onPlay}
                >
                  <Play className="w-3 h-3 fill-current mr-1" />
                  Listen
                </Button>
              ) : polling ? (
                <Button
                  variant="default"
                  size="sm"
                  disabled
                  className="relative bg-accent text-accent-foreground h-8 w-[72px] overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-foreground/15 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                  <span className="relative z-10 text-xs">Audio...</span>
                </Button>
              ) : exhausted ? (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-[11px]"
                    onClick={(e) => { e.stopPropagation(); handleGenerateAudio(); }}
                  >
                    Retry audio
                  </Button>
                  {synthError && (
                    <span
                      className={`text-[10px] max-w-[160px] text-right ${
                        synthError.kind === 'rate_limited' ? 'text-amber-500' : 'text-muted-foreground'
                      }`}
                      title={synthError.message}
                    >
                      {synthError.kind === 'rate_limited' && 'Rate limited'}
                      {synthError.kind === 'provider_unavailable' && 'TTS unavailable'}
                      {synthError.kind === 'unknown' && 'Audio failed'}
                    </span>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 gap-1"
                  onClick={(e) => { e.stopPropagation(); handleGenerateAudio(); }}
                  disabled={!hasScript}
                  title={hasScript ? "Generate audio for this briefing" : "Waiting for script"}
                >
                  <Volume2 className="w-3 h-3" />
                  <span className="text-xs">Generate audio</span>
                </Button>
              )}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Expanded stories - absolutely positioned overlay below the card */}
      <AnimatePresence mode="wait">
        {expanded && (
          <motion.div
            key="expanded-stories"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute top-full left-0 right-0 z-30 overflow-hidden"
          >
            <Card className="mt-1 overflow-hidden shadow-xl">
              <CardContent className="p-2.5">
                <div className="space-y-2">
                  {briefing.segments?.map((seg, i) => (
                    <InlineSegmentRow key={i} segment={seg} briefingId={briefing.id} />
                  ))}
                </div>
                {/* Refresh button in expanded view */}
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-2.5 h-2.5", refreshing && "animate-spin")} />
                    {refreshing ? "Refreshing..." : "Refresh stories"}
                  </button>
                )}
                {/* Custom Briefing button */}
                {onCustomBriefing && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <button
                      onClick={onCustomBriefing}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Custom Briefing
                    </button>
                    {customBriefingCount > 0 && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        +{customBriefingCount} custom
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
