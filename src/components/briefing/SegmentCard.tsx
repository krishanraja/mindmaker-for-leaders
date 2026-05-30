import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Eye, EyeOff, Check, Anchor, Bookmark, BookmarkCheck, Ban, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FRAMEWORK_TAG_CONFIG } from "@/types/briefing";
import { haptics } from "@/lib/haptics";
import { useBriefingInterests } from "@/hooks/useBriefingInterests";
import { useKillLensItem } from "@/hooks/useKillLensItem";
import type { BriefingSegment, FrameworkTag } from "@/types/briefing";

interface FeedbackPayload {
  reaction: "useful" | "not_useful";
  lens_item_id?: string | null;
  dwell_ms?: number;
}

interface SegmentCardProps {
  segment: BriefingSegment;
  index: number;
  isActive: boolean;
  onFeedback: (payload: FeedbackPayload) => void;
  onWatchCompany?: (company: string) => void;
  watchedCompanies?: string[];
  /** v2: briefing id used by the kill action. Omit on v1 briefings. */
  briefingId?: string;
}

// Extract likely company names from headline + source
function extractCompanyNames(segment: BriefingSegment): string[] {
  const companies: string[] = [];

  // Known AI/tech company patterns
  const knownCompanies = [
    "OpenAI", "Anthropic", "Google", "Microsoft", "Meta", "Apple", "Amazon", "AWS",
    "Nvidia", "AMD", "Intel", "Cohere", "Mistral", "Perplexity", "Databricks",
    "Snowflake", "Palantir", "Salesforce", "HubSpot", "Stripe", "Vercel", "Supabase",
    "Notion", "Figma", "Canva", "Slack", "Zoom", "Atlassian", "Shopify",
    "Tesla", "SpaceX", "xAI", "DeepMind", "Stability AI", "Midjourney", "Runway",
    "Hugging Face", "Scale AI", "Anyscale", "Modal", "Replicate", "Together AI",
    "Groq", "Cerebras", "SambaNova", "Inflection", "Character AI", "Jasper",
    "Writer", "Copy.ai", "Otter", "BetterUp", "Ezra", "Gong", "Clari",
    "Bloomberg", "Reuters", "McKinsey", "Bain", "BCG", "Deloitte", "Accenture",
  ];

  const text = `${segment.headline} ${segment.analysis} ${segment.source}`;

  for (const company of knownCompanies) {
    if (text.includes(company)) {
      companies.push(company);
    }
  }

  return [...new Set(companies)];
}

export function SegmentCard({
  segment,
  index,
  isActive,
  onFeedback,
  onWatchCompany,
  watchedCompanies = [],
  briefingId,
}: SegmentCardProps) {
  const [feedback, setFeedback] = useState<"useful" | "not_useful" | null>(null);
  const [justWatched, setJustWatched] = useState<string | null>(null);
  const tagConfig = FRAMEWORK_TAG_CONFIG[segment.framework_tag as FrameworkTag];

  // Fire haptics.light() once when this segment transitions to active.
  // Guarded by prefers-reduced-motion to avoid triggering on motion-sensitive setups.
  const prevIsActiveRef = useRef(false);
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isActive && !prevIsActiveRef.current && !prefersReduced) {
      haptics.light();
    }
    prevIsActiveRef.current = isActive;
  }, [isActive]);

  // v2: user can pin the story's anchor as a persistent beat. Only meaningful
  // when matched_profile_fact is present (schema_version 2 rows).
  const { beats: existingBeats, add: addInterest } = useBriefingInterests();
  const pinnable = (segment.matched_profile_fact ?? "").trim();
  const alreadyPinned = pinnable.length > 0 && existingBeats.some(
    (b) => b.text.toLowerCase() === pinnable.toLowerCase(),
  );
  const [pinning, setPinning] = useState(false);

  const handlePin = async () => {
    if (!pinnable || alreadyPinned || pinning) return;
    setPinning(true);
    try {
      await addInterest("beat", pinnable, { source: "manual" });
      haptics.light();
    } finally {
      setPinning(false);
    }
  };

  // v2: persistent kill - "don't show me stories like this". Only offered
  // when we have a lens anchor to kill and we're not killing an interest the
  // user themselves added (interest_* kills are done by removing from the
  // Interests tab instead).
  const { killByBriefing, killing } = useKillLensItem();
  const canKill = Boolean(
    briefingId &&
      segment.lens_item_id &&
      !segment.lens_item_id.startsWith("interest_"),
  );
  const [killed, setKilled] = useState(false);
  const isKilling = killing === (segment.lens_item_id ?? "");

  const handleKill = async () => {
    if (!canKill || !briefingId || !segment.lens_item_id || killed || isKilling) return;
    const ok = await killByBriefing({ briefingId, lensItemId: segment.lens_item_id });
    if (ok) {
      setKilled(true);
      haptics.light();
    }
  };

  // Track dwell: ms the card was the active segment before the user reacted.
  const activeSinceRef = useRef<number | null>(null);
  const dwellAccumMsRef = useRef(0);
  useEffect(() => {
    if (isActive) {
      activeSinceRef.current = Date.now();
    } else if (activeSinceRef.current !== null) {
      dwellAccumMsRef.current += Date.now() - activeSinceRef.current;
      activeSinceRef.current = null;
    }
  }, [isActive]);

  const detectedCompanies = extractCompanyNames(segment);
  const unwatchedCompanies = detectedCompanies.filter(
    (c) => !watchedCompanies.includes(c.toLowerCase())
  );

  const handleFeedback = (reaction: "useful" | "not_useful") => {
    if (feedback) return;
    setFeedback(reaction);
    const currentActive = activeSinceRef.current !== null
      ? Date.now() - activeSinceRef.current
      : 0;
    const dwellMs = dwellAccumMsRef.current + currentActive;
    onFeedback({
      reaction,
      lens_item_id: segment.lens_item_id ?? null,
      dwell_ms: dwellMs,
    });
    haptics.light();
  };

  const handleWatch = (company: string) => {
    onWatchCompany?.(company);
    setJustWatched(company);
    haptics.light();
    setTimeout(() => setJustWatched(null), 2000);
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isActive && "border-l-2 border-l-accent shadow-sm"
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Framework tag */}
        {tagConfig && (
          <Badge
            variant="outline"
            className={cn("text-[10px] font-medium border", tagConfig.className)}
          >
            {tagConfig.label}
          </Badge>
        )}

        {/* Headline */}
        <p className="text-sm font-semibold leading-snug">{segment.headline}</p>

        {/* Analysis */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {segment.analysis}
        </p>

        {/* Relevance reason */}
        {segment.relevance_reason && (
          <p className="text-[11px] text-accent/80 italic leading-relaxed">
            {segment.relevance_reason}
          </p>
        )}

        {/* v2: matched profile fact - shows the specific profile item that */}
        {/* anchored this story. Only rendered on schema_version 2 rows. */}
        {segment.matched_profile_fact && (
          <div
            className="flex items-start gap-1.5 pt-0.5"
            title="Why this story is in your briefing"
          >
            <Anchor className="w-3 h-3 mt-[2px] text-accent/70 shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Anchored to: <span className="text-foreground/80">{segment.matched_profile_fact}</span>
            </p>
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto">
          {/* Feedback buttons */}
          <button
            onClick={() => handleFeedback("useful")}
            disabled={feedback !== null}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              feedback === "useful"
                ? "text-accent bg-accent/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleFeedback("not_useful")}
            disabled={feedback !== null}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              feedback === "not_useful"
                ? "text-muted-foreground bg-muted"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>

          {/* v2: pin the lens anchor as a persistent beat. */}
          {pinnable.length > 0 && (
            <button
              onClick={handlePin}
              disabled={alreadyPinned || pinning}
              title={alreadyPinned ? `Already a beat: ${pinnable}` : `Keep beat: ${pinnable}`}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                alreadyPinned
                  ? "text-accent bg-accent/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {alreadyPinned ? (
                <BookmarkCheck className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* v2: persistent kill - "don't show me stories like this". */}
          {canKill && (
            <button
              onClick={handleKill}
              disabled={killed || isKilling}
              title={
                killed
                  ? "Killed - this lens item won't appear in future briefings"
                  : `Don't show me stories like this (${pinnable || "this topic"})`
              }
              className={cn(
                "p-1.5 rounded-md transition-colors",
                killed
                  ? "text-red-500 bg-red-500/10"
                  : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10",
              )}
            >
              {isKilling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Ban className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Watch company buttons */}
          {unwatchedCompanies.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <div className="w-px h-3.5 bg-border" />
              {unwatchedCompanies.slice(0, 2).map((company) => (
                <button
                  key={company}
                  onClick={() => handleWatch(company)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all",
                    justWatched === company
                      ? "text-accent bg-accent/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {justWatched === company ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                  {justWatched === company ? `Watching ${company}` : company}
                </button>
              ))}
            </div>
          )}

          {/* Source */}
          {segment.source && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {segment.source}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
