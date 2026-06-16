import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, MessageSquare, Loader2, Send, Zap, Lightbulb, AlertTriangle, X, GitBranch, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVoice } from "@/hooks/useVoice";
import { useUserPains } from "@/hooks/useUserPains";
import { TranscriptReviewPanel } from "@/components/voice/TranscriptReviewPanel";
import { cn } from "@/lib/utils";
import type { SkillSeed } from "@/types/skill";

interface SkillCaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transcript: string, seed?: SkillSeed | null) => void;
  isGenerating: boolean;
  generationError: string | null;
  /**
   * Optional seed passed from an entry point (Edge view chip, Memory blocker,
   * Briefing decision_trigger). When present, the sheet skips the picker and
   * shows the seed banner + a pre-populated text scaffold so the user only
   * has to add the steps they follow.
   */
  initialSeed?: SkillSeed | null;
}

/**
 * Curated examples for users who arrive without a seed and don't know what
 * makes a good skill candidate. Tapping pre-fills the text input.
 */
const SKILL_EXAMPLES: Array<{ label: string; scaffold: string }> = [
  {
    label: "Monday board update",
    scaffold:
      'Every Monday I take the sales team Slack updates and turn them into a board update. The format is exec summary first, then pipeline changes, then risks. My investors hate bullet points and want flowing paragraphs. The trigger is: "draft the board update".',
  },
  {
    label: "Weekly hiring sync",
    scaffold:
      'Every Friday I prep notes for my hiring sync. I pull the open roles, this week\'s candidate movement, and any offers out. The format is: role, stage, next step, blocker. I want it scannable in under 30 seconds.',
  },
  {
    label: "RFP triage",
    scaffold:
      'Whenever a new RFP comes in I need to triage it: are we a fit, what\'s the timeline, who would own it, and a go/no-go recommendation. I always check for must-have requirements we can\'t meet first.',
  },
  {
    label: "Investor update",
    scaffold:
      'Every month I write an investor update. Format: TLDR, key metrics (revenue, burn, runway), wins this month, asks. I always include one specific ask at the end.',
  },
];

type InputMode = "voice" | "text";
type CaptureState = "idle" | "recording" | "transcribing";

/**
 * Bottom sheet (mobile) / dialog (desktop) for capturing a workflow
 * description. Voice or text input. On submit, the parent calls
 * useSkillExport.generateSkill and (on success) opens SkillPreviewSheet.
 */
export function SkillCaptureSheet({
  isOpen,
  onClose,
  onSubmit,
  isGenerating,
  generationError,
  initialSeed,
}: SkillCaptureSheetProps) {
  const isMobile = useIsMobile();

  // Save the dashboard scroll container's position when the sheet opens, and
  // restore it after the sheet closes. Without this, opening the sheet on
  // mobile and dismissing it can leave the page scrolled to an unrelated spot
  // because content underneath re-rendered (e.g. data refetches).
  const savedScrollRef = useRef<number | null>(null);
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-edge-scroll]");
    if (isOpen) {
      if (scroller) savedScrollRef.current = scroller.scrollTop;
      return;
    }
    const target = savedScrollRef.current;
    if (target == null || !scroller) return;
    const raf = requestAnimationFrame(() => {
      scroller.scrollTop = target;
      savedScrollRef.current = null;
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Describe your workflow</SheetTitle>
            <SheetDescription>
              Speak or type the workflow you want to turn into an Agent Skill.
            </SheetDescription>
          </SheetHeader>
          <CaptureContent
            onClose={onClose}
            onSubmit={onSubmit}
            isGenerating={isGenerating}
            generationError={generationError}
            initialSeed={initialSeed}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Describe your workflow</DialogTitle>
          <DialogDescription>
            Speak or type the workflow you want to turn into an Agent Skill.
          </DialogDescription>
        </DialogHeader>
        <CaptureContent
          onClose={onClose}
          onSubmit={onSubmit}
          isGenerating={isGenerating}
          generationError={generationError}
          initialSeed={initialSeed}
        />
      </DialogContent>
    </Dialog>
  );
}

function CaptureContent({
  onClose,
  onSubmit,
  isGenerating,
  generationError,
  initialSeed,
}: {
  onClose: () => void;
  onSubmit: (transcript: string, seed?: SkillSeed | null) => void;
  isGenerating: boolean;
  generationError: string | null;
  initialSeed?: SkillSeed | null;
}) {
  const isMobile = useIsMobile();

  // Default modality: on mobile, voice is faster than typing - even for seeded
  // entries. On desktop with a seed, text-default (a keyboard is faster than
  // dictating in a quiet office). No seed: voice default everywhere.
  const [inputMode, setInputMode] = useState<InputMode>(
    initialSeed && !isMobile ? "text" : "voice",
  );
  // Structured text fields (replace the bracket-scaffold for seeded entries).
  // For example seeds, the scaffold IS the starter text - fall back to one
  // field by storing it in stepsInput.
  const [stepsInput, setStepsInput] = useState<string>(() =>
    initialSeed?.kind === "example" ? initialSeed.text : "",
  );
  const [outputInput, setOutputInput] = useState<string>("");
  // Legacy single textarea (used when there's no active seed - the user is
  // describing a fresh workflow with one open text field).
  const [textInput, setTextInput] = useState<string>("");
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [editReviewText, setEditReviewText] = useState("");
  const [activeSeed, setActiveSeed] = useState<SkillSeed | null>(initialSeed ?? null);

  const { pains, loading: painsLoading } = useUserPains(5);

  // If the parent re-opens the sheet with a different seed (e.g. user
  // navigates to /context twice from different entry points), refresh the
  // capture inputs to match the new anchor.
  useEffect(() => {
    if (!initialSeed) return;
    if (activeSeed?.text === initialSeed.text && activeSeed?.kind === initialSeed.kind) return;
    setActiveSeed(initialSeed);
    setInputMode(isMobile ? "voice" : "text");
    setStepsInput(initialSeed.kind === "example" ? initialSeed.text : "");
    setOutputInput("");
    setTextInput("");
    setVoiceTranscript(null);
  }, [initialSeed, activeSeed?.text, activeSeed?.kind, isMobile]);

  const visiblePains = useMemo(() => {
    // Drop the currently-anchored seed from the picker so it doesn't show up
    // as a chip the user has already accepted.
    if (!activeSeed) return pains;
    return pains.filter(
      (p) => !(p.text === activeSeed.text && p.kind === activeSeed.kind),
    );
  }, [pains, activeSeed]);

  const handlePickPain = useCallback((seed: SkillSeed) => {
    setActiveSeed(seed);
    setInputMode(isMobile ? "voice" : "text");
    setStepsInput("");
    setOutputInput("");
    setTextInput("");
    setVoiceTranscript(null);
  }, [isMobile]);

  const handleClearSeed = useCallback(() => {
    setActiveSeed(null);
    setStepsInput("");
    setOutputInput("");
    setTextInput("");
  }, []);

  const handleExample = useCallback((scaffold: string, label: string) => {
    setActiveSeed({ kind: "example", text: scaffold, label });
    setInputMode("text");
    // Examples are full starter text - drop them into the single textarea
    // path. They have no separate steps/output split.
    setStepsInput(scaffold);
    setOutputInput("");
    setTextInput("");
    setVoiceTranscript(null);
  }, []);

  const handleTranscript = useCallback((text: string) => {
    setVoiceTranscript(text);
    setCaptureState("idle");
  }, []);

  const {
    isRecording,
    isProcessing: isTranscribing,
    duration,
    browserCaptionPreview,
    pendingReview,
    confirmPendingTranscript,
    dismissPendingReview,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({
    maxDuration: 300,
    deferTranscriptCallback: true,
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    if (pendingReview) {
      setEditReviewText(pendingReview.transcript);
      setCaptureState("idle");
    }
  }, [pendingReview]);

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
      setCaptureState("transcribing");
    } else {
      setVoiceTranscript(null);
      resetRecording();
      startRecording();
      setCaptureState("recording");
    }
  }, [isRecording, startRecording, stopRecording, resetRecording]);

  const handleConfirmVoiceReview = useCallback(async () => {
    await confirmPendingTranscript(editReviewText);
  }, [confirmPendingTranscript, editReviewText]);

  // Submission text by mode:
  // - voice: whatever the leader narrated.
  // - text + seeded real pain: stitch the two structured fields together so
  //   the LLM gets the same shape it used to receive from scaffoldForSeed,
  //   but with no bracket placeholders. Only the leader's words go in.
  // - text + example seed: the example text is already a complete starter,
  //   stored in stepsInput.
  // - text + no seed: a single open textarea (existing behaviour).
  const isStructuredSeed = !!activeSeed && activeSeed.kind !== "example";
  const userCharCount = isStructuredSeed
    ? stepsInput.trim().length + outputInput.trim().length
    : (activeSeed ? stepsInput.trim().length : textInput.trim().length);

  const buildTextPayload = useCallback((): string => {
    if (isStructuredSeed && activeSeed) {
      return composeSeededPayload(activeSeed, stepsInput, outputInput);
    }
    if (activeSeed?.kind === "example") {
      return stepsInput.trim();
    }
    return textInput.trim();
  }, [activeSeed, isStructuredSeed, stepsInput, outputInput, textInput]);

  const inputText = inputMode === "voice" ? voiceTranscript : buildTextPayload();
  const canSubmit =
    !!inputText &&
    !isGenerating &&
    (inputMode === "voice"
      ? inputText.length >= 20
      : userCharCount >= 20);

  const handleSubmit = useCallback(() => {
    if (!inputText) return;
    // "example" seeds are scaffolds, not real pains from the leader's profile.
    // We forward them as-is so the LLM benefits from the anchoring, but they
    // don't carry fact_id / decision_id.
    onSubmit(inputText, activeSeed);
  }, [inputText, activeSeed, onSubmit]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      {/* Header - single calm row, emerald accent disc (matches the capture
          mock's mic/accent disc; no off-token amber gradient). */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20">
          <Zap className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">
            {activeSeed ? "Automate this pain" : "Describe your workflow"}
          </h3>
          <p className="text-xs text-muted-foreground leading-snug">
            {activeSeed
              ? "Add the steps you follow today and we'll turn it into a skill that triggers automatically."
              : "What do you do every week that you wish AI could help with?"}
          </p>
        </div>
      </div>

      {/* Active seed banner - shown when arriving from an entry point or
          after the user picked a pain from the chip row below. */}
      <AnimatePresence>
        {activeSeed && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={cn(
              "rounded-xl border p-3 space-y-2",
              seedTone(activeSeed.kind),
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 mt-0.5">
                {activeSeed.kind === "example" ? (
                  <Lightbulb className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider font-medium opacity-70">
                  {seedKindLabel(activeSeed.kind)}
                </p>
                <p className="text-sm leading-snug mt-0.5">
                  {activeSeed.text}
                </p>
              </div>
              <button
                onClick={handleClearSeed}
                aria-label="Clear seed"
                className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* "What you'll get" preview - sets expectation upfront so the
                leader knows the shape of the output before filling fields. */}
            {activeSeed.kind !== "example" && (
              <p className="text-[11px] opacity-80 leading-snug pl-6">
                We'll build a Claude skill called{" "}
                <span className="font-semibold">
                  &ldquo;{inferSkillName(activeSeed)}&rdquo;
                </span>
                {" "}that triggers when you say the trigger phrase. You can
                rename and edit before download.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pain picker - only when there's no active seed yet AND the user has
          declared blockers/decisions worth pulling from. Keeps the sheet
          focused for arrivals from an entry point. */}
      {!activeSeed && !painsLoading && visiblePains.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Pick a pain you've already told us about
          </p>
          {/* Pick-first rows (mock: pick, don't type). Each is a full-width
              selectable row with a neutral fork mark, the pain headline that
              wraps freely, and an emerald add affordance - tapping anchors the
              seed and drops the open box below to a secondary escape hatch. */}
          <div className="flex flex-col gap-2">
            {visiblePains.map((pain, i) => (
              <button
                key={`${pain.kind}-${pain.fact_id ?? pain.decision_id ?? i}`}
                onClick={() => handlePickPain(pain)}
                className={cn(
                  "group flex items-center gap-3 w-full rounded-xl border p-3 text-left transition-colors",
                  painChipTone(pain.kind),
                )}
                title={pain.text}
              >
                <span
                  aria-hidden
                  className="flex-shrink-0 grid place-items-center w-7 h-7 rounded-lg bg-secondary border border-border text-muted-foreground"
                >
                  <GitBranch className="h-4 w-4" />
                </span>
                <span className="flex-1 min-w-0 text-sm font-medium text-foreground line-clamp-2 leading-snug">
                  {pain.label ?? pain.text}
                </span>
                <span
                  aria-hidden
                  className="flex-shrink-0 grid place-items-center w-7 h-7 rounded-lg border border-accent/40 bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Curated examples - fallback anchor when the user hasn't told us
          about any blockers/decisions yet. Hidden once an active seed is set. */}
      {!activeSeed && (!visiblePains.length || painsLoading) && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Need ideas? Try one of these
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => handleExample(ex.scaffold, ex.label)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-secondary/40 text-foreground hover:bg-secondary transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add your own - the escape hatch (mock: secondary, not the default).
          A calm on-token segmented control; voice or type, equal weight. */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {activeSeed ? "Add the detail" : "Add your own"}
        </p>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-secondary border border-border">
          <button
            onClick={() => setInputMode("voice")}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              inputMode === "voice"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Mic className="w-3.5 h-3.5" />
            Voice
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              inputMode === "text"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Text
          </button>
        </div>
      </div>

      {/* Voice input */}
      <AnimatePresence mode="wait">
        {inputMode === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Tap the mic and walk us through the steps. Mention what triggers it,
              the format you want, and any rules that always apply. 2 to 5 minutes is plenty.
            </p>

            <div className="flex flex-col items-center gap-3">
              <motion.button
                onClick={handleVoiceToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isTranscribing || isGenerating}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors",
                  isRecording
                    ? "bg-destructive shadow-destructive/25"
                    : "bg-accent shadow-accent/25",
                  (isTranscribing || isGenerating) && "opacity-50 cursor-not-allowed",
                )}
              >
                {isRecording ? (
                  <MicOff className="w-7 h-7 text-white" />
                ) : (
                  <Mic className="w-7 h-7 text-white" />
                )}
              </motion.button>

              {isRecording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-lg font-bold tabular-nums text-foreground">
                    {formatTime(duration)}
                  </span>
                  <p className="text-xs text-muted-foreground/50">Tap to stop recording</p>
                </motion.div>
              )}

              {isTranscribing && (
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Transcribing...
                  </div>
                </div>
              )}

              {isRecording && browserCaptionPreview ? (
                <p className="text-xs text-muted-foreground/70 text-center italic max-w-full">
                  Live caption (approx.): {browserCaptionPreview}
                </p>
              ) : null}

              {pendingReview && !isRecording && !isTranscribing && (
                <TranscriptReviewPanel
                  transcript={pendingReview.transcript}
                  rawTranscript={pendingReview.rawTranscript}
                  refined={pendingReview.refined}
                  editedText={editReviewText}
                  onEditedTextChange={setEditReviewText}
                  onConfirm={handleConfirmVoiceReview}
                  onDismiss={() => {
                    dismissPendingReview();
                    setVoiceTranscript(null);
                  }}
                  confirmLabel="Use this transcript"
                  className="w-full"
                />
              )}

              {voiceTranscript && !isRecording && !isTranscribing && !pendingReview && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full rounded-xl bg-secondary/40 border border-border p-3"
                >
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    Your description:
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {voiceTranscript}
                  </p>
                </motion.div>
              )}

              {!isRecording && !isTranscribing && !voiceTranscript && !pendingReview && (
                <p className="text-xs text-muted-foreground/50">
                  Tap to speak (up to 5 minutes)
                </p>
              )}
            </div>

          </motion.div>
        )}

        {inputMode === "text" && (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {isStructuredSeed ? (
              // Seeded real pain: two labeled fields beat a single bracket
              // scaffold. The leader fills in their actual procedure instead
              // of editing placeholder text in brackets.
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="skill-steps"
                    className="text-xs font-medium text-foreground"
                  >
                    How you handle it today
                  </label>
                  <textarea
                    id="skill-steps"
                    value={stepsInput}
                    onChange={(e) => setStepsInput(e.target.value)}
                    placeholder="Walk me through the steps you take now"
                    autoFocus
                    rows={3}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-secondary/40 border border-border",
                      "text-foreground placeholder:text-muted-foreground/50",
                      "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40",
                      "resize-none text-sm",
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="skill-output"
                    className="text-xs font-medium text-foreground"
                  >
                    What output you want
                  </label>
                  <textarea
                    id="skill-output"
                    value={outputInput}
                    onChange={(e) => setOutputInput(e.target.value)}
                    placeholder="A 3-bullet summary, a 200-word email, a slide outline..."
                    rows={2}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-secondary/40 border border-border",
                      "text-foreground placeholder:text-muted-foreground/50",
                      "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40",
                      "resize-none text-sm",
                    )}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  {userCharCount}/20 characters minimum
                </p>
              </>
            ) : (
              // No seed (or example seed): single open textarea, same as before.
              <>
                <p className="text-sm text-muted-foreground">
                  Describe a workflow you do at least weekly. Include what triggers it,
                  the steps you follow, and the format you want the output in.
                </p>
                <textarea
                  value={activeSeed?.kind === "example" ? stepsInput : textInput}
                  onChange={(e) =>
                    activeSeed?.kind === "example"
                      ? setStepsInput(e.target.value)
                      : setTextInput(e.target.value)
                  }
                  placeholder={'e.g. "Every Monday I take my sales team Slack updates and turn them into a board update. Format is exec summary first, then pipeline, then risks. My investors hate bullet points."'}
                  autoFocus
                  rows={6}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-secondary/40 border border-border",
                    "text-foreground placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40",
                    "resize-none text-sm",
                  )}
                />
                <p className="text-[11px] text-muted-foreground/70">
                  {userCharCount}/20 characters minimum
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error / generating state */}
      {generationError && (
        <p className="text-sm text-destructive text-center">{generationError}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          onClick={onClose}
          variant="ghost"
          className="flex-1 text-muted-foreground"
          disabled={isGenerating}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Generate Skill
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function composeSeededPayload(
  seed: SkillSeed,
  steps: string,
  output: string,
): string {
  // Same shape as the old scaffoldForSeed output, but with the leader's own
  // words replacing the [bracket] placeholders. Empty sections are omitted so
  // the LLM doesn't see "Here is how I handle it: (blank)".
  const lead =
    seed.kind === "blocker"
      ? `One thing I keep getting stuck on: ${seed.text}`
      : seed.kind === "decision"
      ? `A decision I keep wrestling with: ${seed.text}`
      : seed.kind === "mission"
      ? `A priority I work on weekly: ${seed.text}`
      : seed.kind === "briefing_segment"
      ? `A briefing flagged this as a decision trigger for me: ${seed.text}`
      : seed.text;

  const parts: string[] = [lead];
  const trimmedSteps = steps.trim();
  const trimmedOutput = output.trim();
  if (trimmedSteps) {
    parts.push("", "Here is how I currently handle it:", trimmedSteps);
  }
  if (trimmedOutput) {
    parts.push("", "The format / output I want:", trimmedOutput);
  }
  return parts.join("\n");
}

/**
 * Short, human-readable name for the skill we're about to build. Shown in the
 * "What you'll get" preview - set expectation, not contract. The real name is
 * decided by the LLM during generation.
 */
function inferSkillName(seed: SkillSeed): string {
  const source = seed.label?.trim() || seed.text.trim();
  const cleaned = source.replace(/^\s*(I |we |the |a |an )/i, "");
  const words = cleaned.split(/\s+/).slice(0, 5).join(" ");
  return words.length > 0 ? words : "Your custom skill";
}

function seedKindLabel(kind: SkillSeed["kind"]): string {
  switch (kind) {
    case "blocker": return "From your blockers";
    case "decision": return "From your active decisions";
    case "mission": return "From your missions";
    case "briefing_segment": return "From a briefing decision trigger";
    case "example": return "Starter example";
    default: return "Anchored pain";
  }
}

// Seed banner tone. The dark instrument palette has one emerald accent; a
// pain (blocker/decision/mission) is a neutral card surface, while an example
// starter carries the emerald accent (it is the affordance we are offering, not
// the leader's own self-report). No off-token amber/orange/blue scales.
function seedTone(kind: SkillSeed["kind"]): string {
  switch (kind) {
    case "example":
      return "border-accent/30 bg-accent/10 text-foreground";
    case "blocker":
    case "decision":
    case "briefing_segment":
    case "mission":
    default:
      return "border-border bg-card text-foreground";
  }
}

// Pain chip tone. Neutral, on-token card surface for all pain kinds; the
// distinction between blocker/decision is carried by the seed banner copy,
// not by a hardcoded colour scale.
function painChipTone(_kind: SkillSeed["kind"]): string {
  return "border-border bg-card text-foreground hover:border-accent/30 hover:bg-secondary";
}
