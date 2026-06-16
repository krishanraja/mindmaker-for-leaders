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
import { ArrowLeft, ArrowRight, Check, Keyboard, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { VoiceInput } from "@/components/ui/voice-input";
import { KitPortalLayout } from "@/components/kit/KitPortalLayout";
import { OrgChartView } from "@/components/kit/OrgChartView";
import { useKitRedemption } from "@/hooks/useKitRedemption";
import { fetchLatestKitBuild } from "@/hooks/useKitBuild";
import {
  buildChartModel,
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
import type {
  IntakeAnswer,
  IntakeAnswers,
  IntakeOption,
  IntakeQuestion,
  KitPathway,
  KitPreset,
} from "@/content/kits";

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

  const submit = useCallback(async () => {
    if (!redemption) return;
    setSubmitState("submitting");
    setSubmitError(null);
    emitKitEvent("kit_intake_completed", {
      class_slug: redemption.class_slug,
      redemption_id: redemption.id,
    });
    const { payload, errorMessage } = await invokeKit<{ build_id?: string }>("kit-compose", {
      redemption_id: redemption.id,
      kind: "initial",
      intake: answersRef.current,
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
        onSubmit={() => void submit()}
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
  onSubmit: () => void;
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

  return (
    <KitPortalLayout classTitle={preset.title} passEndsAt={passEndsAt}>
      <div className="space-y-6">
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
    </KitPortalLayout>
  );
}

/* ================================================================== */
/* FORKED intake (the Agentic Org Chart cascade, per the locked mock)  */
/* ================================================================== */

/**
 * The mock's brand palette, scoped inline so the cascade + OrgChartView render
 * exactly per spec whether or not the global kit-portal stylesheet has landed.
 * The class `kit-portal` is also set so any global `--kit-*` / Gobold rules
 * apply consistently. Values are a literal port of prototypes/kit-orgchart.html.
 */
const KIT_SCOPE_VARS: CSSProperties & Record<`--${string}`, string> = {
  "--kit-bg": "#F3F5F1",
  "--kit-card": "#FFFFFF",
  "--kit-ink": "#13282C",
  "--kit-ink2": "#2B4248",
  "--kit-mut": "#697578",
  "--kit-faint": "#99A4A5",
  "--kit-line": "#E5E8E2",
  "--kit-line2": "#EEF1EB",
  "--kit-rail": "#D5DAD2",
  "--kit-acc": "#2A9E7C",
  "--kit-acc-deep": "#1E7860",
  "--kit-acc-soft": "#E6F4EE",
  "--kit-acc-line": "#BCE2D2",
  "--kit-ind": "#3E6E94",
  "--kit-ind-soft": "#E9F0F5",
  "--kit-ind-line": "#D2E0EA",
  "--kit-slate": "#5A6A6D",
  "--kit-slate-soft": "#EDF1EF",
  "--kit-slate-line": "#DBE3E0",
  "--kit-display": "'Gobold', ui-sans-serif, -apple-system, 'Segoe UI', sans-serif",
};

type ForkPhase = "fork" | "steps" | "reveal";

function ForkedIntake({ preset, passEndsAt, answers, setAnswer, onSubmit }: IntakeBodyProps) {
  const flow = useIntakeFlow(preset, answers);
  const { pathway, forkQuestion, steps } = flow;

  // Phase + position. We resume into the cascade if a draft already has the
  // fork answered.
  const [phase, setPhase] = useState<ForkPhase>(() => (pathway ? "steps" : "fork"));
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
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

  // The live preview chart, assembled from the chart-feeding answers.
  const chart = useMemo(
    () => buildChartModel(preset, pathway, answers, revealed),
    [preset, pathway, answers, revealed],
  );

  const pickPathway = (q: IntakeQuestion, option: IntakeOption) => {
    setAnswer(q.id, { optionId: option.id });
    setStepIndex(0);
    setPhase("steps");
  };

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      setPhase("reveal");
      return;
    }
    setDirection(1);
    setStepIndex(stepIndex + 1);
  }, [stepIndex, steps.length]);

  const goBack = () => {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
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

  // Progress: 5% on the fork, then evenly across the steps, 100% on reveal.
  const progress = useMemo(() => {
    if (phase === "fork") return 5;
    if (phase === "reveal") return 100;
    return 5 + ((stepIndex + 1) / (steps.length + 1)) * 95;
  }, [phase, stepIndex, steps.length]);

  const startBoxLabel = chart?.boxes.find((b) => b.isStart)?.label ?? "";

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

        {/* Cascade + reveal: two-pane on desktop, stacked on mobile. */}
        {phase !== "fork" && (
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
            {/* Chart preview. Mobile: on top (order-first), compact. Desktop: right, sticky. */}
            <aside className="order-first md:order-last md:sticky md:top-4">
              <div
                className="rounded-2xl border p-4 sm:p-5"
                style={{
                  background: "var(--kit-card)",
                  borderColor: "var(--kit-line)",
                  boxShadow: "0 1px 2px rgba(16,28,30,.05), 0 18px 40px -24px rgba(16,28,30,.20)",
                }}
              >
                {chart && <OrgChartView chart={chart} building={!revealed} />}
              </div>
            </aside>

            {/* Question column / reveal. */}
            <section className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                {revealed ? (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    <RevealCard
                      pathway={pathway}
                      businessName={chart?.businessName ?? ""}
                      startBoxLabel={startBoxLabel}
                      onStartOver={goBack}
                      onSubmit={onSubmit}
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
  const showChartHint = !!step.chartFeed && (step.chartFeed === "boxes" || step.chartFeed === "startBox");

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

      {showChartHint && (
        <p className="mt-3.5 ml-0.5 text-[12.5px]" style={{ color: "var(--kit-faint)" }}>
          Watch the chart fill in as you answer &rarr;
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
          {isLast ? "Build my chart" : "Continue"}
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
          Build my pack
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>
    </KitCard>
  );
}

/* ================================================================== */
/* Brand primitives (mock-faithful, scoped to .kit-portal vars)        */
/* ================================================================== */

function KitCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-5 sm:p-7"
      style={{
        background: "var(--kit-card)",
        borderColor: "var(--kit-line)",
        boxShadow: "0 1px 2px rgba(16,28,30,.05), 0 18px 40px -24px rgba(16,28,30,.20)",
      }}
    >
      {children}
    </div>
  );
}

function KitEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="kit-label mb-3 text-[12px] font-bold uppercase"
      style={{
        fontFamily: "var(--kit-display)",
        letterSpacing: "0.1em",
        color: "var(--kit-acc-deep)",
      }}
    >
      {children}
    </div>
  );
}

function KitHeadline({ children }: { children: React.ReactNode }) {
  // Inter, lowercase, slightly smaller so headlines do not wrap.
  return (
    <h1
      className="m-0 text-[clamp(20px,2.4vw,25px)] font-extrabold leading-[1.14] lowercase"
      style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em", color: "var(--kit-ink)" }}
    >
      {children}
    </h1>
  );
}

function KitSub({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn("mt-2 max-w-[42ch] text-[14.5px]", className)}
      style={{ color: "var(--kit-mut)" }}
    >
      {children}
    </p>
  );
}

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
