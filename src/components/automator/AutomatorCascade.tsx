import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { voiceProfileSummary, type VoiceProfile } from "@/types/voiceProfile";
import {
  CASCADE_STEP_ORDER,
  toneIdFromProfile,
  type CascadePicks,
  type CascadeStep,
  type DeliverableCandidate,
} from "./automatorModel";

/**
 * AutomatorCascade - screen 2 of the Build-a-skill flow.
 *
 * A 5-step RECOGNITION pick-cascade. Every step shows options to SELECT, never
 * a blank "describe it" box. Step 4 (tone) is the unified VOICE step:
 *   - No saved voice yet: shows the same output three ways and asks you to pick
 *     the one that sounds like you. Picking one SAVES it as your voice profile
 *     (via onAdoptTone) so every future skill and kit inherits it.
 *   - Voice already saved: no cold re-ask. It renders this deliverable in your
 *     saved voice and asks only "still sound like you?" - Keep (Next) or Adjust.
 *   - A paste-extract shortcut (onOpenVoiceSheet) is one tap away in both modes.
 *
 * A progress bar (step N of 5) and a fixed bottom Next / Build CTA. Mocks:
 * prototypes/capture-v1.html, capture-tone.html, voice-unified.html.
 *
 * Stateless on the cascade picks (the parent owns stepIndex + picks); the only
 * local state is the ephemeral "adjusting" toggle on the voice step.
 */

interface AutomatorCascadeProps {
  candidate: DeliverableCandidate;
  steps: CascadeStep[];
  stepIndex: number;
  picks: CascadePicks;
  /** -1 / 1 for the slide direction (back / forward). */
  direction: number;
  isGenerating: boolean;
  generationError?: string | null;
  /** The leader's saved voice profile, when one exists (drives the voice step). */
  voiceProfile?: VoiceProfile | null;
  onSelect: (stepId: CascadeStep["id"], optionId: string) => void;
  /** Called when a tone sample is picked, to persist the mapped voice profile. */
  onAdoptTone?: (toneId: string) => void;
  /** Open the full voice sheet (paste-extract / fine edit). */
  onOpenVoiceSheet?: () => void;
  onBack: () => void;
  onNext: () => void;
  animated?: boolean;
}

export function AutomatorCascade({
  candidate,
  steps,
  stepIndex,
  picks,
  direction,
  isGenerating,
  generationError,
  voiceProfile,
  onSelect,
  onAdoptTone,
  onOpenVoiceSheet,
  onBack,
  onNext,
  animated = true,
}: AutomatorCascadeProps) {
  const total = steps.length;
  const step = steps[stepIndex];
  const isLast = stepIndex === total - 1;
  const selectedId = step ? picks[step.id] : undefined;
  const canAdvance = !!selectedId && !isGenerating;

  // The voice step is the "samples" step. When the leader already has a saved
  // voice we render a confirmation instead of a cold re-ask, unless they tap
  // Adjust. The toggle is ephemeral and resets whenever the step changes.
  const isVoiceStep = step?.kind === "samples";
  const [adjusting, setAdjusting] = useState(false);
  // Once the leader picks a tone in cold mode, adopting it saves a profile.
  // This flag keeps us in pick mode for the rest of this step visit so the
  // samples do not vanish out from under the tap.
  const [pickedColdThisVisit, setPickedColdThisVisit] = useState(false);
  useEffect(() => {
    setAdjusting(false);
    setPickedColdThisVisit(false);
  }, [stepIndex]);
  const savedMode =
    isVoiceStep && !!voiceProfile && !adjusting && !pickedColdThisVisit;

  if (!step) return null;

  const nextLabel = isLast ? "Build my skill" : savedMode ? "Keep this voice" : "Next";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Skill chip + step counter */}
      <div className="flex items-center gap-2.5 pb-1.5">
        <span className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-foreground/90">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="truncate">{candidate.title}</span>
        </span>
        <span className="ml-auto shrink-0 text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground">
          Step {stepIndex + 1} of {total}
        </span>
      </div>

      {/* Progress bar - one segment per locked step */}
      <div className="flex gap-1.5 pb-3">
        {CASCADE_STEP_ORDER.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= stepIndex ? "bg-accent" : "bg-muted",
            )}
          />
        ))}
      </div>

      {/* Question + options (scrolls; CTA stays pinned) */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide pb-3">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={`${step.id}-${savedMode ? "saved" : "pick"}`}
            custom={direction}
            initial={animated ? { opacity: 0, x: direction * 28 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={animated ? { opacity: 0, x: direction * -28 } : undefined}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {savedMode && voiceProfile ? (
              /* ── Voice step, returning: confirm, do not re-ask ──────── */
              <SavedVoice
                step={step}
                profile={voiceProfile}
                onAdjust={() => setAdjusting(true)}
                onOpenVoiceSheet={onOpenVoiceSheet}
              />
            ) : (
              <>
                <div className="pb-1">
                  <h1 className="text-balance text-[21px] font-bold leading-tight tracking-[-0.02em] text-foreground">
                    {step.question}
                  </h1>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {step.helper}
                  </p>
                </div>

                {isVoiceStep && onOpenVoiceSheet && (
                  <button
                    type="button"
                    onClick={onOpenVoiceSheet}
                    className="mt-3.5 flex w-full items-center gap-2.5 rounded-[13px] border border-dashed border-border bg-card/60 p-3 text-left transition-colors hover:border-accent/40"
                  >
                    <Upload className="h-[17px] w-[17px] shrink-0 text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold text-foreground">Already use AI?</span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        Paste a few things you have written and we set your voice automatically.
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  </button>
                )}

                {step.kind === "samples" ? (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {step.options.map((opt) => {
                      const on = selectedId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setPickedColdThisVisit(true);
                            onSelect(step.id, opt.id);
                            onAdoptTone?.(opt.id);
                          }}
                          aria-pressed={on}
                          className={cn(
                            "rounded-[16px] border p-[14px] text-left transition-colors",
                            on
                              ? "border-accent bg-[linear-gradient(180deg,#0e1a17,#0a0f12)] shadow-[0_0_0_1px_hsl(var(--accent))_inset]"
                              : "border-border bg-card hover:border-accent/30",
                          )}
                        >
                          <span className="mb-2 flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-[0.06em]",
                                on ? "text-accent" : "text-muted-foreground",
                              )}
                            >
                              {opt.label}
                            </span>
                            <Radio on={on} className="ml-auto" />
                          </span>
                          <p
                            className={cn(
                              "m-0 text-[13px] italic leading-relaxed",
                              on ? "text-foreground" : "text-foreground/70",
                            )}
                          >
                            &ldquo;{opt.sample}&rdquo;
                          </p>
                        </button>
                      );
                    })}
                    <p className="px-2 pt-1.5 text-center text-[11.5px] leading-relaxed text-muted-foreground/70">
                      CTRL saves this as your voice. Every skill and kit you build
                      sounds like this. Change it anytime.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {step.options.map((opt) => {
                      const on = selectedId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onSelect(step.id, opt.id)}
                          aria-pressed={on}
                          className={cn(
                            "flex items-start gap-3 rounded-[16px] border p-[15px] text-left transition-colors",
                            on
                              ? "border-accent bg-[linear-gradient(180deg,#0e1a17,#0a0f12)] shadow-[0_0_0_1px_hsl(var(--accent))_inset]"
                              : "border-border bg-card hover:border-accent/30",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold leading-snug text-foreground">
                              {opt.label}
                            </span>
                            {opt.description && (
                              <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                                {opt.description}
                              </span>
                            )}
                          </span>
                          <Radio on={on} className="mt-0.5" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {generationError && (
          <p className="mt-3 text-center text-[13px] text-destructive">
            {generationError}
          </p>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border pt-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className="inline-flex h-[50px] items-center gap-1.5 rounded-[13px] px-3 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className="inline-flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[13px] bg-accent text-[15px] font-bold text-accent-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isGenerating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
              Building...
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="h-[17px] w-[17px]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * The returning-user voice step: render this deliverable in the saved voice and
 * ask only "still sound like you?". Confirmation, not introspection.
 */
function SavedVoice({
  step,
  profile,
  onAdjust,
  onOpenVoiceSheet,
}: {
  step: CascadeStep;
  profile: VoiceProfile;
  onAdjust: () => void;
  onOpenVoiceSheet?: () => void;
}) {
  const toneId = toneIdFromProfile(profile);
  const sample =
    step.options.find((o) => o.id === toneId)?.sample ?? step.options[0]?.sample ?? "";

  return (
    <div>
      <h1 className="text-balance text-[21px] font-bold leading-tight tracking-[-0.02em] text-foreground">
        We will write this in your voice.
      </h1>

      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
        <Sparkles className="h-3 w-3" />
        {voiceProfileSummary(profile)}
      </span>

      <div className="mt-3 rounded-[16px] border border-accent bg-[linear-gradient(180deg,#0e1a17,#0a0f12)] p-[15px] shadow-[0_0_0_1px_hsl(var(--accent))_inset]">
        <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
          Your opener, in your voice
        </p>
        <p className="m-0 text-[14px] italic leading-relaxed text-foreground">&ldquo;{sample}&rdquo;</p>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        Still sound like you? Keep it and we move on. Or adjust it - your call.
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onAdjust}
          className="text-[12.5px] font-semibold text-accent underline-offset-2 hover:underline"
        >
          Adjust the voice
        </button>
        {onOpenVoiceSheet && (
          <button
            type="button"
            onClick={onOpenVoiceSheet}
            className="text-[12.5px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Paste writing to refine
          </button>
        )}
      </div>
    </div>
  );
}

function Radio({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.6px] transition-colors",
        on ? "border-accent bg-accent" : "border-muted-foreground/40",
        className,
      )}
    >
      {on && <Check className="h-3 w-3 text-accent-foreground" strokeWidth={3} />}
    </span>
  );
}
