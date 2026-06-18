import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Mic, Sparkles, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type {
  VoiceContentArchetype,
  VoiceDisagreement,
  VoiceFirstPerson,
  VoiceProfile,
  VoicePunctuation,
  VoiceSentenceLength,
  VoiceSignoff,
} from "@/types/voiceProfile";

interface VoiceStyleProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Where the capture was opened from (kit vs app). */
  source?: VoiceProfile["source"];
  /** Open straight into the paste-extract panel (the cascade's paste affordance). */
  initialPasteMode?: boolean;
  onSaved?: () => void;
}

type StepId =
  | "signoff"
  | "disagreement"
  | "archetype"
  | "rhythm"
  | "rules";

interface StepDef {
  id: StepId;
  question: string;
  helper: string;
  options: Array<{ id: string; label: string; description?: string }>;
}

const STEPS: StepDef[] = [
  {
    id: "signoff",
    question: "How do you usually close a message?",
    helper: "Pick the closest. No need to describe it.",
    options: [
      { id: "cheers", label: "Cheers,", description: "Warm, informal" },
      { id: "thanks", label: "Thanks,", description: "Professional, friendly" },
      { id: "sincerely", label: "Sincerely,", description: "Formal, measured" },
      { id: "none", label: "No signoff", description: "Ends on the last point" },
    ],
  },
  {
    id: "disagreement",
    question: "When you push back, you tend to...",
    helper: "Recognition, not introspection.",
    options: [
      { id: "direct", label: "Say it straight", description: "Lead with the counter" },
      { id: "context-first", label: "Acknowledge first", description: "Then pivot" },
      { id: "question-led", label: "Ask a sharp question", description: "Let them land on it" },
    ],
  },
  {
    id: "archetype",
    question: "Your writing usually lands as...",
    helper: "The shape readers recognise as you.",
    options: [
      { id: "argument", label: "Argument first", description: "Claim, then evidence" },
      { id: "story-lesson", label: "Story, then lesson", description: "Situation to takeaway" },
      { id: "data-take", label: "Number, then take", description: "Metric-led point of view" },
      { id: "how-to", label: "How-to", description: "Steps someone can follow" },
    ],
  },
  {
    id: "rhythm",
    question: "Sentence rhythm and perspective",
    helper: "Two quick picks on how you sound on the page.",
    options: [
      { id: "short-heavy-em", label: "Short. Direct. Lots of I.", description: "Punchy + first person" },
      { id: "medium-balanced-minimal", label: "Balanced sentences, light I", description: "Even, not self-heavy" },
      { id: "long-flowing-balanced-formal", label: "Flowing, measured, formal marks", description: "Longer lines, tidy punctuation" },
    ],
  },
  {
    id: "rules",
    question: "One rule it must never break",
    helper: "The thing you would catch if an AI got it wrong.",
    options: [
      { id: "no-bullets", label: "Never bullet-point it", description: "Narrative, not lists" },
      { id: "no-jargon", label: "Never hide behind jargon", description: "Plain words only" },
      { id: "no-pad", label: "Never pad it out", description: "Say it and stop" },
      { id: "sound-like-me", label: "Always sound like me", description: "Not generic AI tone" },
    ],
  },
];

const RULE_TEXT: Record<string, string> = {
  "no-bullets": "Never use bullet points. The audience reads narrative, not lists.",
  "no-jargon": "Never hide behind jargon. Use plain words the reader would use.",
  "no-pad": "Never pad it out. No filler, say it and stop.",
  "sound-like-me": "Always sound like me, never a generic AI tone.",
};

function rhythmToFields(id: string): Pick<
  VoiceProfile,
  "sentenceLength" | "firstPerson" | "punctuationStyle"
> {
  switch (id) {
    case "short-heavy-em":
      return {
        sentenceLength: "short-punchy",
        firstPerson: "heavy-I",
        punctuationStyle: "em-dash",
      };
    case "long-flowing-balanced-formal":
      return {
        sentenceLength: "long-flowing",
        firstPerson: "balanced",
        punctuationStyle: "formal",
      };
    default:
      return {
        sentenceLength: "medium",
        firstPerson: "minimal-I",
        punctuationStyle: "minimal",
      };
  }
}

/** Recover the rhythm step's option id from a profile's sentence length. */
function rhythmIdFromProfile(p: VoiceProfile): string {
  if (p.sentenceLength === "short-punchy") return "short-heavy-em";
  if (p.sentenceLength === "long-flowing") return "long-flowing-balanced-formal";
  return "medium-balanced-minimal";
}

/** Recover the rules step's option id from a profile's first hard rule. */
function rulesIdFromProfile(p: VoiceProfile): string {
  const first = p.hardRules[0]?.toLowerCase() ?? "";
  if (first.includes("bullet")) return "no-bullets";
  if (first.includes("jargon")) return "no-jargon";
  if (first.includes("pad")) return "no-pad";
  return "sound-like-me";
}

/** Map a full profile onto the sheet's step picks (used by load + paste-extract). */
function picksFromProfile(p: VoiceProfile): Partial<Record<StepId, string>> {
  return {
    signoff: p.signoff,
    disagreement: p.disagreement,
    archetype: p.contentArchetype,
    rhythm: rhythmIdFromProfile(p),
    rules: rulesIdFromProfile(p),
  };
}

/**
 * Self-identification voice profile capture. Recognition over recall; writes a
 * structured profile to user_memory for skill generation. The paste-extract
 * power path derives the same 8 dimensions from real writing (no picking, no
 * manual markdown). Survives kit anonymous -> full account on the same
 * auth.uid().
 */
export function VoiceStyleProfileSheet({
  isOpen,
  onClose,
  source = "context",
  initialPasteMode = false,
  onSaved,
}: VoiceStyleProfileSheetProps) {
  const isMobile = useIsMobile();
  const { profile, loading, saving, saveProfile } = useVoiceProfile();
  const [stepIndex, setStepIndex] = useState(0);
  const [picks, setPicks] = useState<Partial<Record<StepId, string>>>({});
  const [sampleVoice, setSampleVoice] = useState("");
  const [showSample, setShowSample] = useState(false);

  // Paste-extract power path state.
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [filledFromPaste, setFilledFromPaste] = useState(false);

  useEffect(() => {
    if (!isOpen || loading || !profile) return;
    setPicks(picksFromProfile(profile));
    if (profile.sampleVoice) {
      setSampleVoice(profile.sampleVoice);
      setShowSample(true);
    }
  }, [isOpen, loading, profile]);

  // Open straight into the paste panel when the caller asks for it (the
  // cascade's "Already use AI?" affordance), reset on each open.
  useEffect(() => {
    if (isOpen) {
      setPasteMode(initialPasteMode);
      setExtractError(null);
    }
  }, [isOpen, initialPasteMode]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const canNext = !!picks[step.id];

  const composed = useMemo((): VoiceProfile | null => {
    if (!picks.signoff || !picks.disagreement || !picks.archetype || !picks.rhythm || !picks.rules) {
      return null;
    }
    const rhythm = rhythmToFields(picks.rhythm);
    return {
      signoff: picks.signoff as VoiceSignoff,
      disagreement: picks.disagreement as VoiceDisagreement,
      contentArchetype: picks.archetype as VoiceContentArchetype,
      sentenceLength: rhythm.sentenceLength as VoiceSentenceLength,
      firstPerson: rhythm.firstPerson as VoiceFirstPerson,
      punctuationStyle: rhythm.punctuationStyle as VoicePunctuation,
      hardRules: [RULE_TEXT[picks.rules] ?? RULE_TEXT["sound-like-me"]],
      sampleVoice: sampleVoice.trim() || undefined,
      source,
    };
  }, [picks, sampleVoice, source]);

  const handleSave = useCallback(async () => {
    if (!composed) return;
    const result = await saveProfile(composed);
    if (result.ok) {
      onSaved?.();
      onClose();
    }
  }, [composed, saveProfile, onSaved, onClose]);

  const handleExtract = useCallback(async () => {
    const text = pasteText.trim();
    if (text.length < 40) {
      setExtractError("Paste a sentence or two so we can read your voice.");
      return;
    }
    setExtracting(true);
    setExtractError(null);
    try {
      const { data, error } = await supabase.functions.invoke("extract-voice-profile", {
        body: { text },
      });
      const extracted = (data as { profile?: VoiceProfile } | null)?.profile;
      if (error || !extracted) {
        setExtractError(
          (data as { error?: string } | null)?.error ??
            "Could not read your voice from that. Try a different sample, or pick instead.",
        );
        return;
      }
      // Prefill the picks so the leader confirms (never a silent save).
      setPicks(picksFromProfile(extracted));
      if (extracted.sampleVoice) {
        setSampleVoice(extracted.sampleVoice);
        setShowSample(true);
      }
      setFilledFromPaste(true);
      setPasteMode(false);
      setStepIndex(STEPS.length - 1);
    } catch {
      setExtractError("Something went wrong reading your voice. Try again, or pick instead.");
    } finally {
      setExtracting(false);
    }
  }, [pasteText]);

  const pastePanel = (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">Paste a few things you have written.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          An email, a Slack message, a LinkedIn post. CTRL reads your voice from it, so you never
          describe it.
        </p>
      </div>
      <Textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder="Paste a paragraph you actually sent..."
        className="min-h-[140px] resize-none font-mono text-[12.5px] leading-relaxed"
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        We extract the pattern, not the content. Nothing is stored as raw text unless you keep a sample.
      </p>
      {extractError && <p className="text-sm text-destructive">{extractError}</p>}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setPasteMode(false);
            setExtractError(null);
          }}
          disabled={extracting}
        >
          Pick instead
        </Button>
        <Button className="flex-1" onClick={() => void handleExtract()} disabled={extracting}>
          {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Extract my voice
        </Button>
      </div>
    </div>
  );

  const stepsBody = (
    <div className="flex flex-col gap-4">
      {!filledFromPaste && (
        <button
          type="button"
          onClick={() => setPasteMode(true)}
          className="flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-card/60 p-3 text-left transition-colors hover:border-accent/40"
        >
          <Upload className="h-4 w-4 shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-foreground">Already use AI?</span>
            <span className="block text-[11px] leading-snug text-muted-foreground">
              Paste a few things you have written and we set your voice automatically.
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        </button>
      )}

      {filledFromPaste && (
        <div className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs text-muted-foreground">
            Filled from your writing. Review, tweak anything, then save.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= stepIndex ? "bg-accent" : "bg-border",
            )}
          />
        ))}
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground">{step.question}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step.helper}</p>
      </div>

      <div className="space-y-2">
        {step.options.map((opt) => {
          const selected = picks[step.id] === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPicks((p) => ({ ...p, [step.id]: opt.id }))}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                selected
                  ? "border-accent/50 bg-accent/10"
                  : "border-border bg-card hover:border-accent/30",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                {selected && <Check className="h-4 w-4 text-accent shrink-0" />}
              </div>
              {opt.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
              )}
            </button>
          );
        })}
      </div>

      {isLast && (
        <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
          <button
            type="button"
            onClick={() => setShowSample((v) => !v)}
            className="flex w-full items-center gap-2 text-sm font-medium text-foreground"
          >
            <Mic className="h-4 w-4 text-accent" />
            {showSample ? "Hide optional sample" : "Add a writing sample (optional)"}
          </button>
          {showSample && (
            <Textarea
              value={sampleVoice}
              onChange={(e) => setSampleVoice(e.target.value)}
              placeholder="Paste a paragraph you actually sent - email, Slack, LinkedIn..."
              className="min-h-[88px] text-sm resize-none"
            />
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          className="flex-1"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {!isLast ? (
          <Button
            className="flex-1"
            disabled={!canNext}
            onClick={() => setStepIndex((i) => i + 1)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={!composed || saving}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save voice profile
          </Button>
        )}
      </div>

      {profile && (
        <p className="text-center text-[11px] text-muted-foreground">
          Updates your Memory Web. Every skill you build will write in this voice.
        </p>
      )}
    </div>
  );

  const body = pasteMode ? pastePanel : stepsBody;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Your writing voice</SheetTitle>
            <SheetDescription>
              Five quick picks, or paste your writing. CTRL uses this in every skill it builds for you.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 pb-6">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your writing voice</DialogTitle>
          <DialogDescription>
            Five quick picks, or paste your writing. CTRL uses this in every skill it builds for you.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
