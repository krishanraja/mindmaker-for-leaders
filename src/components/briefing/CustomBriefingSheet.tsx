import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVoice } from "@/hooks/useVoice";
import { useEdgeSubscription } from "@/hooks/useEdgeSubscription";
import { EdgePaywall } from "@/components/edge/EdgePaywall";
import { BriefingTypePicker } from "./BriefingTypePicker";
import { TranscriptReviewPanel } from "@/components/voice/TranscriptReviewPanel";
import type { BriefingType } from "@/types/briefing";

interface CustomBriefingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (briefingType: BriefingType, customContext?: string) => void;
  isGenerating: boolean;
  /** Pre-fill the prompt textarea (used by voice nudges that route here). */
  initialContext?: string;
}

function CustomBriefingContent({
  onClose,
  onGenerate,
  isGenerating,
  initialContext,
}: Omit<CustomBriefingSheetProps, "isOpen">) {
  const [selectedType, setSelectedType] = useState<BriefingType | null>(
    initialContext ? "deep_dive" : null,
  );
  const [inputMode, setInputMode] = useState<"voice" | "text">(
    initialContext ? "text" : "text",
  );
  const [textInput, setTextInput] = useState(initialContext ?? "");
  const [showPaywall, setShowPaywall] = useState(false);
  const [editReviewText, setEditReviewText] = useState("");
  const { hasAccess } = useEdgeSubscription();

  const handleTranscript = useCallback((transcript: string) => {
    setTextInput(transcript);
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
    maxDuration: 60,
    deferTranscriptCallback: true,
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    if (pendingReview) {
      setEditReviewText(pendingReview.transcript);
    }
  }, [pendingReview]);

  const handleConfirmBriefingReview = useCallback(async () => {
    await confirmPendingTranscript(editReviewText);
  }, [confirmPendingTranscript, editReviewText]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      resetRecording();
      startRecording();
      setInputMode("voice");
    }
  };

  const handleGenerate = () => {
    if (!selectedType) return;
    const context =
      selectedType === "custom_voice" || textInput.trim()
        ? textInput.trim() || undefined
        : undefined;
    onGenerate(selectedType, context);
  };

  const canGenerate =
    selectedType &&
    !isGenerating &&
    !isRecording &&
    !isTranscribing &&
    !pendingReview &&
    (selectedType !== "custom_voice" || textInput.trim());

  // Show context input for custom_voice, or optionally for other types
  const showContextInput = selectedType === "custom_voice" || selectedType !== null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Custom Briefing
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose a briefing type or describe what you need
        </p>
      </div>

      {/* Type picker */}
      <BriefingTypePicker
        selected={selectedType}
        onSelect={setSelectedType}
        hasProAccess={hasAccess}
        onProGated={() => setShowPaywall(true)}
      />

      {/* Context input */}
      <AnimatePresence>
        {showContextInput && selectedType && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {selectedType === "custom_voice"
                  ? "Describe what you need (required)"
                  : "Add context to tailor this briefing (optional)"}
              </p>

              {/* Voice / Text segmented control - equal weight. */}
              <div className="grid grid-cols-2 gap-1 p-1 mb-2 rounded-lg bg-foreground/5 border border-foreground/10">
                <button
                  onClick={() => setInputMode("voice")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                    inputMode === "voice"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Mic className="w-3 h-3" />
                  Voice
                </button>
                <button
                  onClick={() => setInputMode("text")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                    inputMode === "text"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Type
                </button>
              </div>

              {inputMode === "text" ? (
                <div className="relative">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="e.g., I have a board meeting tomorrow about AI investment priorities..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-accent/30 resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleVoiceToggle}
                      disabled={isTranscribing || !!pendingReview}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        isRecording
                          ? "bg-red-500 text-white"
                          : isTranscribing
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent text-accent-foreground"
                      )}
                    >
                      {isTranscribing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isRecording ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </motion.button>
                    <div className="flex-1 min-w-0">
                      {isRecording ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs text-foreground font-medium">
                              Recording {formatTime(duration)}
                            </span>
                          </div>
                          {browserCaptionPreview ? (
                            <p className="text-[10px] text-muted-foreground italic line-clamp-2">
                              {browserCaptionPreview}
                            </p>
                          ) : null}
                        </div>
                      ) : isTranscribing ? (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">
                            Transcribing...
                          </span>
                          {browserCaptionPreview ? (
                            <p className="text-[10px] text-muted-foreground italic line-clamp-2">
                              Preview: {browserCaptionPreview}
                            </p>
                          ) : null}
                        </div>
                      ) : textInput && !pendingReview ? (
                        <p className="text-xs text-foreground line-clamp-2">
                          {textInput}
                        </p>
                      ) : !pendingReview ? (
                        <span className="text-xs text-muted-foreground">
                          Tap to record your context
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Review transcript below
                        </span>
                      )}
                    </div>
                  </div>
                  {pendingReview && !isRecording && !isTranscribing && (
                    <TranscriptReviewPanel
                      transcript={pendingReview.transcript}
                      rawTranscript={pendingReview.rawTranscript}
                      refined={pendingReview.refined}
                      editedText={editReviewText}
                      onEditedTextChange={setEditReviewText}
                      onConfirm={handleConfirmBriefingReview}
                      onDismiss={() => dismissPendingReview()}
                      confirmLabel="Use transcript"
                      className="border-border"
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Generate Briefing
          </>
        )}
      </Button>

      {/* Paywall */}
      <EdgePaywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        capability="Custom briefings"
      />
    </div>
  );
}

export function CustomBriefingSheet({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  initialContext,
}: CustomBriefingSheetProps) {
  const isMobile = useIsMobile();

  // Close when generation completes
  useEffect(() => {
    if (!isGenerating && isOpen) {
      // Don't auto-close - let the user see the result
    }
  }, [isGenerating, isOpen]);

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-5 max-h-[92svh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Custom Briefing</SheetTitle>
            <SheetDescription>Choose a briefing type or describe what you need</SheetDescription>
          </SheetHeader>
          <CustomBriefingContent
            onClose={onClose}
            onGenerate={onGenerate}
            isGenerating={isGenerating}
            initialContext={initialContext}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Custom Briefing</DialogTitle>
          <DialogDescription>Choose a briefing type or describe what you need</DialogDescription>
        </DialogHeader>
        <CustomBriefingContent
          onClose={onClose}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          initialContext={initialContext}
        />
      </DialogContent>
    </Dialog>
  );
}
