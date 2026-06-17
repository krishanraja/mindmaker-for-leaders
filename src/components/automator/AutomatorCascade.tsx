import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CASCADE_STEP_ORDER,
  type CascadePicks,
  type CascadeStep,
  type DeliverableCandidate,
} from "./automatorModel";

/**
 * AutomatorCascade - screen 2 of the Build-a-skill flow.
 *
 * A 5-step RECOGNITION pick-cascade. Every step shows options to SELECT, never
 * a blank "describe it" box. Step 4 (tone) shows worked SAMPLES - the same
 * output written three ways - and asks you to pick the one that sounds like
 * you (it never asks "what is your tone").
 *
 * A progress bar (step N of 5) and a fixed bottom Next / Build CTA. Mocks:
 * prototypes/capture-v1.html (step 1) + capture-tone.html (the voice step).
 *
 * Stateless: the parent owns `stepIndex` + `picks` and drives selection. This
 * keeps the QC harness able to render any step at its final state.
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
  onSelect: (stepId: CascadeStep["id"], optionId: string) => void;
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
  onSelect,
  onBack,
  onNext,
  animated = true,
}: AutomatorCascadeProps) {
  const total = steps.length;
  const step = steps[stepIndex];
  const isLast = stepIndex === total - 1;
  const selectedId = step ? picks[step.id] : undefined;
  const canAdvance = !!selectedId && !isGenerating;

  if (!step) return null;

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
            key={step.id}
            custom={direction}
            initial={animated ? { opacity: 0, x: direction * 28 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={animated ? { opacity: 0, x: direction * -28 } : undefined}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="pb-1">
              <h1 className="text-balance text-[21px] font-bold leading-tight tracking-[-0.02em] text-foreground">
                {step.question}
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {step.helper}
              </p>
            </div>

            {step.kind === "samples" ? (
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
                  CTRL learns your voice from the one you pick. You can fine-tune
                  any line once it writes the first draft.
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
              {isLast ? "Build my skill" : "Next"}
              <ArrowRight className="h-[17px] w-[17px]" />
            </>
          )}
        </button>
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
