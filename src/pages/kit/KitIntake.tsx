import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Copy, Keyboard, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { VoiceInput } from "@/components/ui/voice-input";
import { KitPortalLayout } from "@/components/kit/KitPortalLayout";
import { OrgChartView } from "@/components/kit/OrgChartView";
import { KitPicksBoard } from "@/components/kit/KitPicksBoard";
import { KitPathLeaderboard } from "@/components/kit/KitPathLeaderboard";
import {
  KIT_SCOPE_VARS,
  KitCard,
  KitEyebrow,
  KitHeadline,
  KitPrimaryButton,
  KitSub,
} from "@/components/kit/kitPrimitives";
import { useKitRedemption } from "@/hooks/useKitRedemption";
import { fetchLatestKitBuild } from "@/hooks/useKitBuild";
import {
  buildChartModel,
  buildPicksModel,
  helperFor,
  isAnswered,
  promptFor,
  resolveOptions,
  useIntakeFlow,
} from "@/hooks/useIntakeFlow";
import { emitKitEvent } from "@/lib/track";
import {
  KIT_BUILD_KEY,
  KIT_INTAKE_KEY,
  invokeKit,
  readIntakeDraft,
  writeIntakeDraft,
} from "@/lib/kit";
import { cn } from "@/lib/utils";
import { KIT_TOOL_LABELS, toolFromIntake } from "@/content/kits";
import type {
  IntakeAnswer,
  IntakeAnswers,
  IntakeOption,
  IntakeQuestion,
  KitPathway,
  KitPreset,
} from "@/content/kits";
// The pain -> guardrail / -> reflect-back maps and the preference labels live in
// the Vibe Coding preset (single source). The living panel and the pains
// reflect-back reuse them so the copy never drifts from what the kit installs.
import {
  PAIN_GUARD,
  PAIN_REFLECT,
  PREF_LABEL,
} from "../../../supabase/functions/_shared/kit-presets/vibe-coding/templates.ts";
// Each kit's vulnerable step gets a warm reflect-back (the humanity moment):
// Vibe Coding's pains, the Org Chart guardrails, and Memory & Identity's
// never-store privacy line. Each map is single-sourced in its own preset so the
// copy never drifts from what the kit installs. The option ids are disjoint
// across presets, so the maps merge cleanly into one generic reflect lookup.
import { GUARDRAIL_REFLECT } from "../../../supabase/functions/_shared/kit-presets/orgchart/templates.ts";
import { NEVER_STORE_REFLECT } from "../../../supabase/functions/_shared/kit-presets/memory-identity/templates.ts";

/** The reflect-back lines across kits, keyed by option id. */
const REFLECT_LINES: Record<string, string> = {
  ...PAIN_REFLECT,
  ...GUARDRAIL_REFLECT,
  ...NEVER_STORE_REFLECT,
};

const MIN_TEXT_LENGTH = 10;
const ADVANCE_BEAT_MS = 350;

/* ================================================================== */
/* Orchestrator                                                        */
/* ================================================================== */

/**
 * The intake wizard. Two shapes, decided purely by the preset's data:
 *
 * - LINEAR (the three existing presets, which set none of the org-chart
 *   fields): one question per screen, the original thumb-sized flow.
 * - FORKED (the org-chart preset, whose first question sets `pathwayFork`):
 *   the pathway splash, then a coherent adaptive pick-cascade with a live
 *   OrgChartView preview that assembles as the student answers, per the
 *   locked mock (prototypes/kit-orgchart.html).
 *
 * Both finish by POSTing the answers (keyed by question id) to kit-compose
 * and handing off to /kit/me, exactly as before.
 */
export default function KitIntake() {
  const navigate = useNavigate();
  const { redemption, preset, isLoading } = useKitRedemption();

  const [answers, setAnswers] = useState<IntakeAnswers>(() => readIntakeDraft());
  const answersRef = useRef(answers);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const guardChecked = useRef(false);

  const flow = useIntakeFlow(preset, answers);

  useEffect(() => {
    answersRef.current = answers;
    writeIntakeDraft(answers);
  }, [answers]);

  // No redemption: back to the front door. Build already exists: this intake
  // is done, the kit page owns everything from here.
  useEffect(() => {
    if (isLoading) return;
    if (!redemption || !preset) {
      navigate("/kit", { replace: true });
      return;
    }
    if (guardChecked.current) return;
    guardChecked.current = true;
    void fetchLatestKitBuild(redemption.id).then((existing) => {
      if (existing) navigate("/kit/me", { replace: true });
    });
  }, [isLoading, redemption, preset, navigate]);

  // The homework paste is carried separately from the typed intake answers so
  // it can flow into the initial compose's context (the same channel the
  // post-build sharpen path enriches), without polluting the structured bank.
  const submit = useCallback(async (homework?: string) => {
    if (!redemption) return;
    setSubmitState("submitting");
    setSubmitError(null);
    emitKitEvent("kit_intake_completed", {
      class_slug: redemption.class_slug,
      redemption_id: redemption.id,
    });
    const trimmedHomework = homework?.trim();
    const { payload, errorMessage } = await invokeKit<{ build_id?: string }>("kit-compose", {
      redemption_id: redemption.id,
      kind: "initial",
      intake: answersRef.current,
      ...(trimmedHomework ? { homework: trimmedHomework } : {}),
    });
    if (payload?.build_id) {
      try {
        sessionStorage.setItem(KIT_BUILD_KEY, payload.build_id);
        sessionStorage.removeItem(KIT_INTAKE_KEY);
      } catch {
        // Best-effort; the kit page falls back to a latest-build lookup.
      }
      navigate("/kit/me");
      return;
    }
    setSubmitError(errorMessage ?? "The build did not start. Try again.");
    setSubmitState("error");
  }, [redemption, navigate]);

  const setAnswer = useCallback((questionId: string, patch: Partial<IntakeAnswer>) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  }, []);

  if (isLoading || !redemption || !preset) {
    return (
      <KitPortalLayout classTitle={preset?.title ?? null} passEndsAt={redemption?.expires_at}>
        <div className="flex flex-col items-center gap-3 py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </KitPortalLayout>
    );
  }

  if (submitState !== "idle") {
    return (
      <KitPortalLayout classTitle={preset.title} passEndsAt={redemption.expires_at}>
        {submitState === "submitting" ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="font-medium">Starting your build...</p>
            <p className="text-sm text-muted-foreground">A few seconds, then the fun part.</p>
          </div>
        ) : (
          <div className="space-y-4 py-16 text-center">
            <p className="text-destructive">{submitError}</p>
            <Button size="lg" onClick={() => void submit()}>
              Try again
            </Button>
          </div>
        )}
      </KitPortalLayout>
    );
  }

  // FORKED preset: the org-chart cascade with the live preview.
  if (flow.isForked) {
    return (
      <ForkedIntake
        preset={preset}
        passEndsAt={redemption.expires_at}
        answers={answers}
        setAnswer={setAnswer}
        onSubmit={(homework) => void submit(homework)}
      />
    );
  }

  // LINEAR preset: the original one-question-per-screen flow, unchanged.
  return (
    <LinearIntake
      preset={preset}
      passEndsAt={redemption.expires_at}
      answers={answers}
      setAnswer={setAnswer}
      onSubmit={() => void submit()}
    />
  );
}

/* ================================================================== */
/* LINEAR intake (the existing flow, preserved for the 3 presets)      */
/* ================================================================== */

interface IntakeBodyProps {
  preset: KitPreset;
  passEndsAt: string | null;
  answers: IntakeAnswers;
  setAnswer: (questionId: string, patch: Partial<IntakeAnswer>) => void;
  /** Finish intake and compose. Forked flow may pass the homework paste. */
  onSubmit: (homework?: string) => void;
}

function LinearIntake({ preset, passEndsAt, answers, setAnswer, onSubmit }: IntakeBodyProps) {
  const questions = useMemo(() => preset.intake, [preset]);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [resumed, setResumed] = useState(false);
  const answersRef = useRef(answers);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Resume a half-finished draft at the first unanswered question.
  useEffect(() => {
    if (resumed || questions.length === 0) return;
    setResumed(true);
    const firstOpen = questions.findIndex((q) => !isAnswered(q, answersRef.current[q.id]));
    if (firstOpen > 0) setStepIndex(firstOpen);
  }, [resumed, questions]);

  const question: IntakeQuestion | undefined = questions[stepIndex];

  const goNext = useCallback(() => {
    if (stepIndex >= questions.length - 1) {
      onSubmit();
      return;
    }
    setDirection(1);
    setStepIndex(stepIndex + 1);
  }, [stepIndex, questions.length, onSubmit]);

  const goBack = () => {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex(stepIndex - 1);
  };

  const scheduleAdvance = () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      goNext();
    }, ADVANCE_BEAT_MS);
  };

  if (!question) {
    return (
      <KitPortalLayout classTitle={preset.title} passEndsAt={passEndsAt}>
        <div className="flex flex-col items-center gap-3 py-24">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      </KitPortalLayout>
    );
  }

  const answer = answers[question.id];
  // Decision kits (chief-of-staff) carry a live leaderboard in a desktop right
  // pane; the quiz column stays single-column on mobile (the no-scroll law).
  const showLeaderboard = preset.previewKind === "leaderboard";

  return (
    <KitPortalLayout classTitle={preset.title} passEndsAt={passEndsAt}>
      <div
        className={cn(
          "grid grid-cols-1 items-start gap-5",
          showLeaderboard ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8" : "",
        )}
      >
        <div className="min-w-0 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {stepIndex + 1} of {questions.length}
            </span>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
          </div>
          <Progress value={((stepIndex + 1) / questions.length) * 100} className="h-1.5" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: direction * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -36 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {question.prompt}
              </h1>
              {question.helper && (
                <p className="text-sm text-muted-foreground">{question.helper}</p>
              )}
            </div>

            {question.type === "chips" && (
              <ChipsQuestion
                question={question}
                options={question.options ?? []}
                answer={answer}
                onSelect={(optionId) => {
                  setAnswer(question.id, { optionId });
                  scheduleAdvance();
                }}
                onText={(text) => setAnswer(question.id, { text })}
              />
            )}

            {question.type === "chips_multi" && (
              <MultiQuestion
                question={question}
                options={question.options ?? []}
                answer={answer}
                onToggle={(optionId) => toggleOption(answer, optionId, (next) => setAnswer(question.id, { optionIds: next }))}
                onText={(text) => setAnswer(question.id, { text })}
                onContinue={goNext}
              />
            )}

            {question.type === "voice_text" && (
              <VoiceTextQuestion
                question={question}
                answer={answer}
                onText={(text) => setAnswer(question.id, { text })}
                onContinue={goNext}
              />
            )}
          </motion.div>
        </AnimatePresence>
        </div>

        {showLeaderboard && (
          <aside className="order-first hidden md:order-last md:sticky md:top-4 md:block">
            <KitPathLeaderboard answers={answers} />
          </aside>
        )}
      </div>
    </KitPortalLayout>
  );
}

/* ================================================================== */
/* FORKED intake (the Agentic Org Chart cascade, per the locked mock)  */
/* ================================================================== */

type ForkPhase = "fork" | "steps" | "homework" | "reveal";

function ForkedIntake({ preset, passEndsAt, answers, setAnswer, onSubmit }: IntakeBodyProps) {
  const flow = useIntakeFlow(preset, answers);
  const { pathway, forkQuestion, steps } = flow;

  // Phase + position. We resume into the cascade if a draft already has the
  // fork answered.
  const [phase, setPhase] = useState<ForkPhase>(() => (pathway ? "steps" : "fork"));
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  // The pre-build homework paste (optional). Carried into the initial compose.
  const [homework, setHomework] = useState("");
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Clamp the step index when the visible step set shrinks (e.g. de-selecting
  // boxes removes the time-sink's source, or switching pathways).
  useEffect(() => {
    if (phase === "steps" && stepIndex > steps.length - 1) {
      setStepIndex(Math.max(0, steps.length - 1));
    }
  }, [phase, stepIndex, steps.length]);

  const step = steps[stepIndex];
  const revealed = phase === "reveal";
  const onHomework = phase === "homework";

  // Live mirrors of the position + visible-step count. The cascade GROWS as the
  // student answers (each step's showIf chains off the prior answer), so a
  // single-select's deferred auto-advance (scheduleAdvance, ADVANCE_BEAT_MS)
  // must read the step count AT FIRE TIME, not the stale value captured when the
  // option was tapped. Without this, selecting the time-sink (which unlocks the
  // next step) reveals early and silently drops grind / involves / maturity /
  // guardrails from the intake.
  const stepIndexRef = useRef(stepIndex);
  const stepsLenRef = useRef(steps.length);
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);
  useEffect(() => {
    stepsLenRef.current = steps.length;
  }, [steps.length]);

  // Which live-preview component this forked preset shows (the SHARED field).
  // "orgchart" -> the bespoke OrgChartView; "picks" -> the generic
  // KitPicksBoard; absent -> no preview pane (single column cascade).
  const previewKind = preset.previewKind;

  // The live preview chart, assembled from the chart-feeding answers. Only the
  // org-chart preset builds the full chart model; the picks board builds the
  // lighter picks model. Both are deterministic in-intake previews.
  const chart = useMemo(
    () => (previewKind === "orgchart" ? buildChartModel(preset, pathway, answers, revealed) : null),
    [previewKind, preset, pathway, answers, revealed],
  );
  const picks = useMemo(
    () => (previewKind === "picks" ? buildPicksModel(preset, pathway, answers) : null),
    [previewKind, preset, pathway, answers],
  );

  const pickPathway = (q: IntakeQuestion, option: IntakeOption) => {
    setAnswer(q.id, { optionId: option.id });
    setStepIndex(0);
    setPhase("steps");
  };

  // Live mirror of whether a preview model exists, read at advance-fire time.
  // Preview kits (org-chart, picks) end the cascade on the RevealCard; the
  // no-preview kit (Vibe Coding) goes straight from the last step to the
  // homework screen, since its reveal is the post-build hero on KitHome.
  const hasPreviewRef = useRef(false);

  const goNext = useCallback(() => {
    // Cancel any pending single-select auto-advance so a fast "tap option then
    // click Continue" can never fire goNext twice and skip a step.
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    const idx = stepIndexRef.current;
    if (idx >= stepsLenRef.current - 1) {
      // Last step: preview kits show their RevealCard; no-preview kits go to
      // the homework screen (the final intake step before compose).
      setPhase(hasPreviewRef.current ? "reveal" : "homework");
      return;
    }
    setDirection(1);
    setStepIndex(idx + 1);
  }, []);

  const goBack = () => {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (onHomework) {
      // Back from homework: to the reveal (preview kits) or the last step.
      if (hasPreviewRef.current) {
        setPhase("reveal");
      } else {
        setPhase("steps");
        setStepIndex(Math.max(0, steps.length - 1));
      }
      return;
    }
    if (revealed) {
      setPhase("steps");
      setStepIndex(Math.max(0, steps.length - 1));
      return;
    }
    if (stepIndex === 0) {
      setPhase("fork");
      return;
    }
    setDirection(-1);
    setStepIndex(stepIndex - 1);
  };

  const scheduleAdvance = () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      goNext();
    }, ADVANCE_BEAT_MS);
  };

  // Progress: 5% on the fork, evenly across the steps, then the homework screen
  // sits near the end, 100% only when the reveal card shows (preview kits).
  const progress = useMemo(() => {
    if (phase === "fork") return 5;
    if (phase === "reveal") return 100;
    if (phase === "homework") return 95;
    return 5 + ((stepIndex + 1) / (steps.length + 1)) * 90;
  }, [phase, stepIndex, steps.length]);

  // The start label + title, read from whichever preview model is active so the
  // RevealCard copy is correct for every previewKind (and for none).
  const startBoxLabel =
    chart?.boxes.find((b) => b.isStart)?.label ??
    picks?.items.find((it) => it.isStart)?.label ??
    "";
  const previewTitle = chart?.businessName ?? picks?.title ?? "";

  // Whether a live preview model exists (org-chart / picks). When it does, the
  // right pane is that preview. When it does NOT (the re-centered Vibe Coding
  // flow, which has no chartFeed questions), the right pane becomes the living
  // panel "your kit is taking shape", so the horizontal space is never blank.
  const hasPreview = !!chart || !!picks;
  useEffect(() => {
    hasPreviewRef.current = hasPreview;
  }, [hasPreview]);

  // The living panel only makes sense with no preview, and only on desktop (the
  // mobile flow conveys the same via the inline reflect-back). It is the desktop
  // right pane for the cascade, the homework screen, and never for the fork.
  const showLivingPanel = !hasPreview && phase !== "fork";
  // The right pane exists when there is either a preview or the living panel.
  const twoPane = hasPreview || showLivingPanel;

  return (
    <KitPortalLayout classTitle={preset.title} passEndsAt={passEndsAt}>
      <div className="kit-portal" style={KIT_SCOPE_VARS}>
        {/* Progress rail */}
        <div className="mb-6 h-[5px] w-full overflow-hidden rounded-full" style={{ background: "var(--kit-line2)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--kit-acc), #15c4a4)",
            }}
          />
        </div>

        {/* Fork splash: full-width, no preview pane yet. */}
        {phase === "fork" && forkQuestion && (
          <ForkSplash question={forkQuestion} onPick={pickPathway} />
        )}

        {/* Cascade + reveal. Two-pane on desktop (a live preview OR the living
            panel), stacked on mobile. The living panel is desktop-only; below
            md the question column carries everything (the inline reflect-back
            conveys the panel's content). */}
        {phase !== "fork" && (
          <div
            className={cn(
              "grid grid-cols-1 items-start gap-5",
              twoPane
                ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8"
                : "mx-auto max-w-xl",
            )}
          >
            {/* Right pane. Preview model -> the live preview (mobile on top).
                No preview -> the living panel (desktop only, md:block). */}
            {hasPreview ? (
              <aside className="order-first md:order-last md:sticky md:top-4">
                <div
                  className="rounded-2xl border p-4 sm:p-5"
                  style={{
                    background: "var(--kit-card)",
                    borderColor: "var(--kit-line)",
                    boxShadow: "0 1px 2px rgba(16,28,30,.05), 0 18px 40px -24px rgba(16,28,30,.20)",
                  }}
                >
                  {previewKind === "orgchart" && chart && (
                    <OrgChartView chart={chart} building={!revealed} />
                  )}
                  {previewKind === "picks" && picks && (
                    <KitPicksBoard model={picks} building={!revealed} />
                  )}
                </div>
              </aside>
            ) : showLivingPanel ? (
              <aside className="order-last hidden md:sticky md:top-4 md:block">
                <KitLivingPanel
                  preset={preset}
                  answers={answers}
                  assembling={onHomework}
                />
              </aside>
            ) : null}

            {/* Question column / reveal / homework. */}
            <section className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                {onHomework ? (
                  <motion.div
                    key="homework"
                    initial={{ opacity: 0, x: direction * 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -28 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    <HomeworkStep
                      preset={preset}
                      answers={answers}
                      homework={homework}
                      onHomeworkChange={setHomework}
                      onBuild={() => onSubmit(homework)}
                      onBack={goBack}
                    />
                  </motion.div>
                ) : revealed ? (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    <RevealCard
                      pathway={pathway}
                      businessName={previewTitle}
                      startBoxLabel={startBoxLabel}
                      onStartOver={goBack}
                      onSubmit={() => {
                        setDirection(1);
                        setPhase("homework");
                      }}
                    />
                  </motion.div>
                ) : step ? (
                  <motion.div
                    key={`${step.id}-${stepIndex}`}
                    initial={{ opacity: 0, x: direction * 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -28 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    <StepCard
                      preset={preset}
                      pathway={pathway}
                      step={step}
                      answers={answers}
                      answer={answers[step.id]}
                      isLast={stepIndex === steps.length - 1}
                      hasPreview={hasPreview}
                      previewKind={previewKind}
                      setAnswer={setAnswer}
                      onSelectAdvance={scheduleAdvance}
                      onNext={goNext}
                      onBack={goBack}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
          </div>
        )}
      </div>
    </KitPortalLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Fork splash                                                          */
/* ------------------------------------------------------------------ */

function ForkSplash({
  question,
  onPick,
}: {
  question: IntakeQuestion;
  onPick: (q: IntakeQuestion, option: IntakeOption) => void;
}) {
  return (
    <KitCard>
      {question.eyebrow && <KitEyebrow>{question.eyebrow}</KitEyebrow>}
      <KitHeadline>{question.prompt}</KitHeadline>
      {question.helper && <KitSub>{question.helper}</KitSub>}
      <div className="mt-4 flex flex-col gap-3">
        {(question.options ?? []).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onPick(question, option)}
            className="group flex items-center gap-4 rounded-[15px] border p-4 text-left transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--kit-card)",
              borderColor: "var(--kit-line)",
              boxShadow: "0 1px 2px rgba(16,28,30,.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--kit-acc)";
              e.currentTarget.style.boxShadow = "0 0 0 1px var(--kit-acc-line), 0 18px 40px -24px rgba(16,28,30,.20)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--kit-line)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(16,28,30,.05)";
            }}
          >
            <span
              className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[13px]"
              style={{
                color: "var(--kit-acc-deep)",
                background: "var(--kit-acc-soft)",
                border: "1px solid var(--kit-acc-line)",
              }}
            >
              <ForkGlyph pathway={option.pathway} />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-extrabold tracking-tight" style={{ color: "var(--kit-ink)" }}>
                {option.label}
              </span>
              {option.description && (
                <span className="mt-1 block text-[13px] leading-snug" style={{ color: "var(--kit-mut)" }}>
                  {option.description}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </KitCard>
  );
}

function ForkGlyph({ pathway }: { pathway?: KitPathway }) {
  if (pathway === "biz") {
    return (
      <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <rect x="4.5" y="4" width="9" height="16" rx="1.2" />
        <path d="M13.5 9h5.5v11h-5.5M7.5 8h3M7.5 12h3M7.5 16h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5.7 19.2c0-3.2 2.8-5.4 6.3-5.4s6.3 2.2 6.3 5.4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Step card (one adaptive question)                                   */
/* ------------------------------------------------------------------ */

function StepCard({
  preset,
  pathway,
  step,
  answers,
  answer,
  isLast,
  hasPreview,
  previewKind,
  setAnswer,
  onSelectAdvance,
  onNext,
  onBack,
}: {
  preset: KitPreset;
  pathway: KitPathway | null;
  step: IntakeQuestion;
  answers: IntakeAnswers;
  answer: IntakeAnswer | undefined;
  isLast: boolean;
  hasPreview: boolean;
  previewKind: KitPreset["previewKind"];
  setAnswer: (questionId: string, patch: Partial<IntakeAnswer>) => void;
  onSelectAdvance: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options = useMemo(
    () => resolveOptions(preset, step, pathway, answers),
    [preset, step, pathway, answers],
  );
  const prompt = promptFor(step, pathway);
  const helper = helperFor(step, pathway);
  const ok = isAnswered(step, answer);
  // "Watch it fill in" only makes sense when there is a live preview to watch.
  const feedsPreview = !!step.chartFeed && (step.chartFeed === "boxes" || step.chartFeed === "startBox");
  const showChartHint = hasPreview && feedsPreview;
  const previewWord = previewKind === "picks" ? "board" : "chart";

  // The reflect-back (the humanity moment). Keyed off the most-recently
  // selected option that has a reflect line: the Vibe Coding pains step
  // (PAIN_REFLECT) or the Org Chart guardrails step (GUARDRAIL_REFLECT), merged
  // into REFLECT_LINES. Single source with the presets so the copy never
  // drifts. Shows on mobile and desktop.
  const selectedMulti = answer?.optionIds ?? [];
  const lastReflectId = [...selectedMulti].reverse().find((id) => id in REFLECT_LINES);
  const reflectLine = lastReflectId ? REFLECT_LINES[lastReflectId] : "";
  // The last step's primary label: preview kits build their chart here; the
  // no-preview Vibe Coding flow advances to the homework screen first.
  const lastLabel = hasPreview ? "Build my chart" : "Continue";

  return (
    <KitCard>
      {step.eyebrow && <KitEyebrow>{step.eyebrow}</KitEyebrow>}
      <KitHeadline>{prompt}</KitHeadline>
      {helper && <KitSub>{helper}</KitSub>}

      {/* Optional identity field on the name-carrying question. */}
      {step.nameField && (
        <div className="mb-4">
          <label className="mb-1.5 ml-0.5 block text-[12.5px] font-bold" style={{ color: "var(--kit-ink2)" }}>
            {step.nameField.label}
          </label>
          <KitTextInput
            value={answer?.text ?? ""}
            placeholder={step.nameField.placeholder}
            onChange={(text) => setAnswer(step.id, { text })}
          />
        </div>
      )}

      {step.type === "voice_text" ? (
        <KitVoiceText
          question={step}
          answer={answer}
          onText={(text) => setAnswer(step.id, { text })}
        />
      ) : step.type === "chips" ? (
        <KitPillCloud
          options={options}
          selectedIds={answer?.optionId ? [answer.optionId] : []}
          onPick={(opt) => {
            setAnswer(step.id, { optionId: opt.id });
            // Single-select pills auto-advance, like the mock's pickOne.
            onSelectAdvance();
          }}
        />
      ) : (
        <KitPillCloud
          options={options}
          multi
          selectedIds={answer?.optionIds ?? []}
          onPick={(opt) =>
            toggleOption(answer, opt.id, (next) => setAnswer(step.id, { optionIds: next }))
          }
        />
      )}

      {/* The warm clay reflect-back: one calm sentence acknowledging the most
          recent pain and how the kit handles it. Single source via PAIN_REFLECT. */}
      {reflectLine && (
        <div
          className="mt-3.5 rounded-[13px] p-3.5 text-[13.5px] leading-relaxed"
          style={{
            background: "var(--kit-clay-soft)",
            border: "1px solid #E9CABF",
            color: "var(--kit-ink)",
          }}
        >
          {reflectLine}
        </div>
      )}

      {showChartHint && (
        <p className="mt-3.5 ml-0.5 text-[12.5px]" style={{ color: "var(--kit-faint)" }}>
          Watch the {previewWord} fill in as you answer &rarr;
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-[13px] px-1.5 py-3.5 text-[15px] font-medium transition-colors"
          style={{ color: "var(--kit-mut)" }}
        >
          &larr; Back
        </button>
        <KitPrimaryButton disabled={!ok} onClick={onNext}>
          {isLast ? lastLabel : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>
    </KitCard>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal card                                                         */
/* ------------------------------------------------------------------ */

function RevealCard({
  pathway,
  businessName,
  startBoxLabel,
  onStartOver,
  onSubmit,
}: {
  pathway: KitPathway | null;
  businessName: string;
  startBoxLabel: string;
  onStartOver: () => void;
  onSubmit: () => void;
}) {
  const name = businessName.trim() || (pathway === "self" ? "you" : "your business");
  const modelWord = pathway === "self" ? "operating model" : "org chart";
  return (
    <KitCard>
      <KitEyebrow>Your agentic {modelWord}</KitEyebrow>
      <KitHeadline>Here's where {name} starts.</KitHeadline>
      <div
        className="mt-1.5 rounded-[13px] p-4 text-[14px] leading-relaxed"
        style={{
          background: "var(--kit-acc-soft)",
          border: "1px solid var(--kit-acc-line)",
          color: "var(--kit-ink)",
        }}
      >
        Stand up your first agent on{" "}
        <b style={{ color: "var(--kit-acc-deep)" }}>{startBoxLabel || "your biggest time-sink"}</b>{" "}
        first. Painful, repeatable, low-risk: the right place to learn to ship one agent. Everything
        else waits its turn.
      </div>
      <KitSub className="mt-4">
        On the right is your real chart - every box tagged agent-led, assisted, or you-only, with
        the agent to add and the new human role beside it. Your take-home pack builds it out in
        full: the chart, your first build, the roles worth adding, and your first 90 days.
      </KitSub>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-[13px] px-1.5 py-3.5 text-[15px] font-medium transition-colors"
          style={{ color: "var(--kit-mut)" }}
        >
          &larr; Back
        </button>
        <KitPrimaryButton onClick={onSubmit}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>
    </KitCard>
  );
}

/* ------------------------------------------------------------------ */
/* Homework step (the final intake screen, before compose)             */
/* ------------------------------------------------------------------ */

/**
 * The homework, promoted from a card behind the loading spinner to a real,
 * do-able intake screen. It shows the context-pull prompt named to the chosen
 * tool, a Copy button, and an OPTIONAL paste field. There is no separate skip
 * button: pressing "Build my kit" with nothing pasted IS the skip (per the
 * mock). The paste flows into the initial compose (onBuild(homework)).
 */
function HomeworkStep({
  preset,
  answers,
  homework,
  onHomeworkChange,
  onBuild,
  onBack,
}: {
  preset: KitPreset;
  answers: IntakeAnswers;
  homework: string;
  onHomeworkChange: (text: string) => void;
  onBuild: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const tool = toolFromIntake(preset, answers);
  // "your AI" fallback when they picked "Not sure yet" (tool === "none").
  const toolName = tool === "none" ? "your AI" : KIT_TOOL_LABELS[tool];
  const prompt = preset.contextPullPrompt(tool, { intake: answers });

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success(`Copied. Paste it into ${toolName}.`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <KitCard>
      <KitEyebrow>One last thing, optional</KitEyebrow>
      <KitHeadline>Let's catch {toolName} up.</KitHeadline>
      <KitSub>
        Paste this into {toolName}, run it, and bring the answer back. It makes your kit far
        sharper. Take your time, this screen waits for you.
      </KitSub>

      {/* The context-pull prompt, clamped so the screen fits the mobile frame. */}
      <div
        className="mt-3.5 max-h-[120px] overflow-hidden rounded-[13px] p-3.5 font-mono text-[11.5px] leading-relaxed"
        style={{
          background: "#FBFCFB",
          border: "1px solid var(--kit-line)",
          color: "var(--kit-ink2)",
          maskImage: "linear-gradient(180deg, #000 70%, transparent)",
          WebkitMaskImage: "linear-gradient(180deg, #000 70%, transparent)",
        }}
      >
        <div className="whitespace-pre-wrap">{prompt}</div>
      </div>

      <button
        type="button"
        onClick={() => void copyPrompt()}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[13px] border px-4 py-3 text-[14px] font-bold transition-colors"
        style={{ background: "var(--kit-card)", borderColor: "var(--kit-line)", color: "var(--kit-ink)" }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy the prompt"}
      </button>

      <div className="mt-3">
        <label className="mb-1.5 ml-0.5 block text-[12.5px] font-bold" style={{ color: "var(--kit-ink2)" }}>
          Paste what it said (optional)
        </label>
        <Textarea
          value={homework}
          onChange={(e) => onHomeworkChange(e.target.value)}
          placeholder="Paste here, or skip. Your call."
          className="min-h-[88px] resize-none text-sm"
          aria-label="Paste your AI's homework answer"
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-[13px] px-1.5 py-3.5 text-[15px] font-medium transition-colors"
          style={{ color: "var(--kit-mut)" }}
        >
          &larr; Back
        </button>
        <KitPrimaryButton onClick={onBuild}>
          Build my kit
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>
    </KitCard>
  );
}

/* ------------------------------------------------------------------ */
/* Living panel (desktop right pane when there is no chart and no picks) */
/* ------------------------------------------------------------------ */

/**
 * "Your kit is taking shape": the desktop right pane that accretes the knowledge
 * bank as the person answers, exactly per the mock's renderAside(). Rendered
 * only when the preset has NO chart and NO picks model (the re-centered Vibe
 * Coding flow). Desktop-only; the mobile flow conveys the same inline (the
 * reflect-back). Empty until the first answer lands, then fills row by row. The
 * preference labels and the pains-as-guardrails reuse PREF_LABEL / PAIN_GUARD
 * (single source with the preset) so the chips never drift from what ships.
 */
function KitLivingPanel({
  preset,
  answers,
  assembling,
}: {
  preset: KitPreset;
  answers: IntakeAnswers;
  assembling: boolean;
}) {
  // Read the bank the same deterministic way the preset and compose do, off the
  // typed answers, so the panel mirrors what the kit will actually build.
  const name = answers["profile"]?.text?.trim() ?? "";
  const roleId = answers["profile"]?.optionId ?? "";
  const roleOpt = preset.intake
    .find((q) => q.id === "profile")
    ?.options?.find((o) => o.id === roleId);
  const roleLabel = roleOpt?.label ?? "";

  const prefIds = answers["preferences"]?.optionIds ?? [];
  const prefChips = prefIds.map((id) => PREF_LABEL[id]).filter((l): l is string => Boolean(l));

  const painIds = answers["pains"]?.optionIds ?? [];
  // Guardrails read naturally after "we add ..."; the panel shows the guardrail
  // phrase, capitalised, as a chip. Single source via PAIN_GUARD.
  const guardChips = painIds
    .map((id) => PAIN_GUARD[id])
    .filter((g): g is string => Boolean(g))
    .map((g) => g.charAt(0).toUpperCase() + g.slice(1));

  const build = answers["build"]?.text?.trim() ?? "";
  const toolId = answers["tool"]?.optionId ?? "";
  const toolLabel = preset.intake
    .find((q) => q.id === "tool")
    ?.options?.find((o) => o.id === toolId)?.label ?? "";

  const rows: { label: string; node: React.ReactNode }[] = [];
  if (name || roleLabel) {
    rows.push({
      label: "You",
      node: <span>{[name, roleLabel].filter(Boolean).join(" . ")}</span>,
    });
  }
  if (prefChips.length) rows.push({ label: "How it works with you", node: <PanelChips items={prefChips} /> });
  if (guardChips.length) rows.push({ label: "Guardrails from your pains", node: <PanelChips items={guardChips} clay /> });
  if (build) rows.push({ label: "Your build", node: <span>{build}</span> });
  if (toolLabel) rows.push({ label: "Tool", node: <span>{toolLabel}</span> });

  const heading = assembling ? "Assembling your kit" : "Your kit is taking shape";

  return (
    <div
      className="flex flex-col gap-3.5 rounded-2xl border p-5"
      style={{
        background: "linear-gradient(180deg,#FBFDFB,#F4F7F3)",
        borderColor: "var(--kit-line)",
        boxShadow: "0 1px 2px rgba(16,28,30,.05)",
      }}
    >
      <div className="flex items-center gap-2 text-[15px] font-extrabold" style={{ color: "var(--kit-ink)" }}>
        {heading}
        {rows.length > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
            style={{
              fontFamily: "var(--kit-display)",
              letterSpacing: "0.08em",
              color: "var(--kit-acc-deep)",
              background: "var(--kit-acc-soft)",
              border: "1px solid var(--kit-acc-line)",
            }}
          >
            live
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="my-auto px-4 text-center text-[13px] leading-relaxed" style={{ color: "var(--kit-faint)" }}>
          <div
            className="mx-auto mb-3.5 h-[54px] w-[54px] rounded-full"
            style={{ border: "2px dashed var(--kit-rail)" }}
          />
          Answer along, and your kit assembles here. Built around you, as you go.
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.label}>
            <div
              className="mb-1.5 text-[9.5px] font-bold uppercase"
              style={{ fontFamily: "var(--kit-display)", letterSpacing: "0.1em", color: "var(--kit-faint)" }}
            >
              {r.label}
            </div>
            <div className="text-[14px] font-semibold leading-snug" style={{ color: "var(--kit-ink2)" }}>
              {r.node}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PanelChips({ items, clay }: { items: string[]; clay?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
          style={
            clay
              ? { color: "var(--kit-clay)", background: "var(--kit-clay-soft)", border: "1px solid #E9CABF" }
              : { color: "var(--kit-acc-deep)", background: "var(--kit-acc-soft)", border: "1px solid var(--kit-acc-line)" }
          }
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/* ================================================================== */
/* Brand primitives (mock-faithful, scoped to .kit-portal vars)        */
/* ================================================================== */

function KitTextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (text: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none transition-all"
      style={{
        background: "#FCFCFB",
        borderColor: "var(--kit-line)",
        color: "var(--kit-ink)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--kit-acc)";
        e.currentTarget.style.boxShadow = "0 0 0 3px var(--kit-acc-soft)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--kit-line)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function KitPillCloud({
  options,
  selectedIds,
  multi = false,
  onPick,
}: {
  options: IntakeOption[];
  selectedIds: string[];
  multi?: boolean;
  onPick: (option: IntakeOption) => void;
}) {
  const selected = new Set(selectedIds);
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const on = selected.has(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(option)}
            className="rounded-full border px-4 py-2.5 text-[14px] font-semibold transition-all"
            style={{
              background: on ? "var(--kit-acc-soft)" : "var(--kit-card)",
              borderColor: on ? "var(--kit-acc)" : "var(--kit-line)",
              color: on ? "var(--kit-acc-deep)" : "var(--kit-ink2)",
              boxShadow: "0 1px 2px rgba(16,28,30,.05)",
            }}
            onMouseEnter={(e) => {
              if (!on) e.currentTarget.style.borderColor = "#CBCEC8";
            }}
            onMouseLeave={(e) => {
              if (!on) e.currentTarget.style.borderColor = "var(--kit-line)";
            }}
          >
            {option.label}
            {multi && on && <Check className="ml-1.5 inline h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}

function KitPrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex flex-1 items-center justify-center rounded-[13px] px-4 py-3.5 text-[15px] font-extrabold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: "linear-gradient(180deg, var(--kit-acc), var(--kit-acc-deep))",
        boxShadow: disabled ? "none" : "0 12px 26px -14px rgba(10,158,132,.85)",
        letterSpacing: "-0.005em",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Voice/text input for the forked cascade's voice_text steps (e.g. the grind),
 * styled to the kit brand. Reuses the shared VoiceInput recorder.
 */
function KitVoiceText({
  question,
  answer,
  onText,
}: {
  question: IntakeQuestion;
  answer: IntakeAnswer | undefined;
  onText: (text: string) => void;
}) {
  const [mode, setMode] = useState<"voice" | "type">("voice");
  const text = answer?.text ?? "";

  const tabStyle = (active: boolean): CSSProperties => ({
    background: active ? "var(--kit-acc-soft)" : "var(--kit-card)",
    borderColor: active ? "var(--kit-acc)" : "var(--kit-line)",
    color: active ? "var(--kit-ink)" : "var(--kit-mut)",
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("voice")}
          className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          style={tabStyle(mode === "voice")}
        >
          <Mic className="h-4 w-4" />
          Say it
        </button>
        <button
          type="button"
          onClick={() => setMode("type")}
          className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          style={tabStyle(mode === "type")}
        >
          <Keyboard className="h-4 w-4" />
          Type instead
        </button>
      </div>

      {mode === "voice" ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border px-5 py-8 text-center"
          style={{ background: "var(--kit-card)", borderColor: "var(--kit-line)" }}
        >
          <VoiceInput
            placeholder="Tap to record"
            maxDuration={90}
            onTranscript={(transcript) => {
              onText(text ? `${text}\n\n${transcript}` : transcript);
              setMode("type");
            }}
          />
          <p className="text-xs" style={{ color: "var(--kit-mut)" }}>
            Talk it through like you would to a colleague. You can tidy it up after.
          </p>
          {text && (
            <p className="w-full whitespace-pre-wrap rounded-lg p-3 text-left text-sm" style={{ background: "var(--kit-line2)" }}>
              {text}
            </p>
          )}
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Describe it step by step..."
          className="min-h-[120px] resize-none text-base"
          aria-label={question.prompt}
          autoFocus
        />
      )}

      {(question.examples?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {question.examples?.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onText(example);
                setMode("type");
              }}
              className="rounded-full border px-3 py-1 text-left text-xs transition-colors"
              style={{ borderColor: "var(--kit-line)", color: "var(--kit-mut)" }}
            >
              {example.length > 52 ? `${example.slice(0, 52)}...` : example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Shared helpers                                                      */
/* ================================================================== */

function toggleOption(
  answer: IntakeAnswer | undefined,
  optionId: string,
  commit: (next: string[]) => void,
) {
  const current = answer?.optionIds ?? [];
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId];
  commit(next);
}

/* ================================================================== */
/* LINEAR question renderers (unchanged from the original intake)      */
/* ================================================================== */

function OptionCard({
  selected,
  onClick,
  label,
  description,
  showCheck,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  showCheck?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid="intake-option"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-2xl border bg-card px-5 py-4 text-left transition-all min-h-[56px]",
        "active:scale-[0.99]",
        selected
          ? "border-accent bg-accent/[0.06] ring-1 ring-accent"
          : "border-border hover:border-accent/40",
      )}
    >
      <span className="flex items-center gap-2.5">
        {showCheck && (
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
              selected ? "border-accent bg-accent text-accent-foreground" : "border-border",
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" />}
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-medium leading-snug">{label}</span>
          {description && (
            <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
          )}
        </span>
      </span>
    </button>
  );
}

function OptionalTextField({
  question,
  value,
  onText,
}: {
  question: IntakeQuestion;
  value: string;
  onText: (text: string) => void;
}) {
  if (!question.optionalText) return null;
  return (
    <div className="space-y-1.5 pt-1">
      <label htmlFor={`${question.id}-optional`} className="text-sm text-muted-foreground">
        {question.optionalText.prompt} <span className="text-muted-foreground/70">(optional)</span>
      </label>
      <Input
        id={`${question.id}-optional`}
        value={value}
        onChange={(e) => onText(e.target.value)}
        placeholder={question.optionalText.placeholder}
      />
    </div>
  );
}

function ChipsQuestion({
  question,
  options,
  answer,
  onSelect,
  onText,
}: {
  question: IntakeQuestion;
  options: IntakeOption[];
  answer: IntakeAnswer | undefined;
  onSelect: (optionId: string) => void;
  onText: (text: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((option) => (
        <OptionCard
          key={option.id}
          selected={answer?.optionId === option.id}
          onClick={() => onSelect(option.id)}
          label={option.label}
          description={option.description}
        />
      ))}
      <OptionalTextField question={question} value={answer?.text ?? ""} onText={onText} />
    </div>
  );
}

function MultiQuestion({
  question,
  options,
  answer,
  onToggle,
  onText,
  onContinue,
}: {
  question: IntakeQuestion;
  options: IntakeOption[];
  answer: IntakeAnswer | undefined;
  onToggle: (optionId: string) => void;
  onText: (text: string) => void;
  onContinue: () => void;
}) {
  const selected = answer?.optionIds ?? [];
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted-foreground">Pick as many as fit.</p>
      {options.map((option) => (
        <OptionCard
          key={option.id}
          selected={selected.includes(option.id)}
          onClick={() => onToggle(option.id)}
          label={option.label}
          description={option.description}
          showCheck
        />
      ))}
      <OptionalTextField question={question} value={answer?.text ?? ""} onText={onText} />
      <Button size="lg" className="w-full" disabled={selected.length === 0} onClick={onContinue}>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function VoiceTextQuestion({
  question,
  answer,
  onText,
  onContinue,
}: {
  question: IntakeQuestion;
  answer: IntakeAnswer | undefined;
  onText: (text: string) => void;
  onContinue: () => void;
}) {
  const [mode, setMode] = useState<"voice" | "type">("voice");
  const text = answer?.text ?? "";
  const ready = text.trim().length >= MIN_TEXT_LENGTH;

  const tabClass = (active: boolean) =>
    cn(
      "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
      active
        ? "border-accent bg-accent/[0.06] text-foreground ring-1 ring-accent"
        : "border-border bg-card text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={tabClass(mode === "voice")} onClick={() => setMode("voice")}>
          <Mic className="h-4 w-4" />
          Say it
        </button>
        <button type="button" className={tabClass(mode === "type")} onClick={() => setMode("type")}>
          <Keyboard className="h-4 w-4" />
          Type instead
        </button>
      </div>

      {mode === "voice" ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-5 py-8 text-center">
          <VoiceInput
            placeholder="Tap to record"
            maxDuration={90}
            onTranscript={(transcript) => {
              onText(text ? `${text}\n\n${transcript}` : transcript);
              setMode("type");
            }}
          />
          <p className="text-xs text-muted-foreground">
            Talk it through like you would to a colleague. You can tidy it up after.
          </p>
          {text && (
            <p className="w-full whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-left text-sm">
              {text}
            </p>
          )}
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Describe it step by step..."
          className="min-h-[140px] resize-none text-base"
          aria-label={question.prompt}
          autoFocus
        />
      )}

      {(question.examples?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {question.examples?.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onText(example);
                setMode("type");
              }}
              className="rounded-full border border-border px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              {example.length > 52 ? `${example.slice(0, 52)}...` : example}
            </button>
          ))}
        </div>
      )}

      <Button size="lg" className="w-full" disabled={!ready} onClick={onContinue}>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
