import { Brain, Check, PenLine, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { voiceProfileSummary, type VoiceProfile } from "@/types/voiceProfile";
import {
  CASCADE_STEP_ORDER,
  type CascadePicks,
  type CascadeStep,
  type CascadeStepId,
  type DeliverableCandidate,
} from "./automatorModel";

/**
 * AutomatorScaffold - the DESKTOP right-hand panel (lg+ only).
 *
 * Desktop is where most leaders do this work, so the builder is a two-pane: the
 * recognition flow on the left, and this live "your skill is taking shape"
 * scaffold on the right. It fills in as the leader picks, making the invisible
 * structure visible without adding a single tap. Hidden on mobile, where the
 * single-column flow already owns the screen.
 */

const DIM_LABEL: Record<CascadeStepId, string> = {
  how: "Built from",
  inputs: "Works on",
  structure: "Shaped as",
  tone: "In the voice of",
  guardrails: "Never breaks",
};

interface AutomatorScaffoldProps {
  phase: "suggestions" | "cascade" | "ready";
  candidate: DeliverableCandidate | null;
  steps: CascadeStep[];
  picks: CascadePicks;
  voiceProfile?: VoiceProfile | null;
}

export function AutomatorScaffold({
  phase,
  candidate,
  steps,
  picks,
  voiceProfile,
}: AutomatorScaffoldProps) {
  if (phase === "suggestions" || !candidate) {
    return <HowItWorks />;
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg border border-accent/30 bg-accent/[0.08] text-accent">
          <Wand2 className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-[13px] font-semibold text-foreground">Your skill is taking shape</h3>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          The deliverable
        </p>
        <p className="mt-1 text-[15px] font-bold leading-snug tracking-[-0.01em] text-foreground">
          {candidate.title}
        </p>
      </div>

      <div className="h-px bg-border" />

      <ul className="flex flex-col gap-2.5">
        {CASCADE_STEP_ORDER.map((id) => {
          const step = steps.find((s) => s.id === id);
          const pickedId = picks[id];
          const value = resolveValue(id, step, pickedId, voiceProfile);
          const done = !!value;
          return (
            <li key={id} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
                  done ? "border-accent bg-accent text-accent-foreground" : "border-border",
                )}
              >
                {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  {DIM_LABEL[id]}
                </p>
                <p
                  className={cn(
                    "text-[12.5px] leading-snug",
                    done ? "font-medium text-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {value ?? "pending"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {voiceProfile && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/25 bg-accent/[0.06] px-2.5 py-1.5">
          <PenLine className="h-3.5 w-3.5 shrink-0 text-accent" />
          <p className="truncate text-[11px] text-muted-foreground">
            Voice locked: <span className="text-foreground/80">{voiceProfileSummary(voiceProfile)}</span>
          </p>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground/70">
        We build this from what your AI already knows about you, and write a skill that runs
        whenever you say the trigger.
      </p>
    </div>
  );
}

/** The picked option's label for a step, or the voice summary for the tone row. */
function resolveValue(
  id: CascadeStepId,
  step: CascadeStep | undefined,
  pickedId: string | undefined,
  voiceProfile?: VoiceProfile | null,
): string | null {
  if (id === "tone") {
    // Unanswered until the tone step is actually reached: the flow pre-fills
    // picks.tone from the saved profile at that step, so pickedId doubles as
    // the "has been asked" signal. Showing the saved summary earlier marked
    // the row complete the moment the panel mounted.
    if (!pickedId) return null;
    if (voiceProfile) return voiceProfileSummary(voiceProfile);
    const label = step?.options.find((o) => o.id === pickedId)?.label;
    return label ? label.toLowerCase() : null;
  }
  if (!step || !pickedId) return null;
  return step.options.find((o) => o.id === pickedId)?.label ?? null;
}

/** Pre-flow panel: a calm three-beat explanation of what is about to happen. */
function HowItWorks() {
  const beats = [
    { icon: Brain, title: "Pick something you do often", body: "Something you do every week. We will find it in what you have already told us." },
    { icon: Check, title: "Answer a few quick prompts", body: "Just pick the option that sounds like you. Never a blank box, never a long form." },
    { icon: Sparkles, title: "Get your agent", body: "An AI skill written in your voice that runs whenever you say the trigger." },
  ];
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-5">
      <h3 className="text-[13px] font-semibold text-foreground">How CTRL builds your skill</h3>
      <ol className="flex flex-col gap-4">
        {beats.map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
              <b.icon className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{b.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{b.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
