import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Keyboard, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { VoiceInput } from "@/components/ui/voice-input";
import { KitPortalLayout } from "@/components/kit/KitPortalLayout";
import { useKitRedemption } from "@/hooks/useKitRedemption";
import { fetchLatestKitBuild } from "@/hooks/useKitBuild";
import { emitKitEvent } from "@/lib/track";
import {
  KIT_BUILD_KEY,
  KIT_INTAKE_KEY,
  invokeKit,
  readIntakeDraft,
  writeIntakeDraft,
} from "@/lib/kit";
import { cn } from "@/lib/utils";
import type { IntakeAnswer, IntakeAnswers, IntakeQuestion } from "@/content/kits";

const MIN_TEXT_LENGTH = 10;
const ADVANCE_BEAT_MS = 350;

function isAnswered(question: IntakeQuestion, answer: IntakeAnswer | undefined): boolean {
  if (!answer) return false;
  if (question.type === "chips") return !!answer.optionId;
  if (question.type === "chips_multi") return (answer.optionIds?.length ?? 0) > 0;
  return (answer.text?.trim().length ?? 0) >= MIN_TEXT_LENGTH;
}

/**
 * The intake wizard: one question per screen, thumb-sized answers, voice
 * first where it matters. Finishing starts the compose build and hands off
 * to the kit page, where the wait becomes the student's first action.
 */
export default function KitIntake() {
  const navigate = useNavigate();
  const { redemption, preset, isLoading } = useKitRedemption();

  const [answers, setAnswers] = useState<IntakeAnswers>(() => readIntakeDraft());
  const answersRef = useRef(answers);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [resumed, setResumed] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const guardChecked = useRef(false);
  const advanceTimer = useRef<number | null>(null);

  const questions = useMemo(() => preset?.intake ?? [], [preset]);
  const question: IntakeQuestion | undefined = questions[stepIndex];

  useEffect(() => {
    answersRef.current = answers;
    writeIntakeDraft(answers);
  }, [answers]);

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

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

  // Resume a half-finished draft at the first unanswered question.
  useEffect(() => {
    if (resumed || questions.length === 0) return;
    setResumed(true);
    const firstOpen = questions.findIndex((q) => !isAnswered(q, answersRef.current[q.id]));
    if (firstOpen > 0) setStepIndex(firstOpen);
  }, [resumed, questions]);

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

  const goNext = useCallback(() => {
    if (stepIndex >= questions.length - 1) {
      void submit();
      return;
    }
    setDirection(1);
    setStepIndex(stepIndex + 1);
  }, [stepIndex, questions.length, submit]);

  const goBack = () => {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex(stepIndex - 1);
  };

  const setAnswer = (questionId: string, patch: Partial<IntakeAnswer>) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  };

  const scheduleAdvance = () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      goNext();
    }, ADVANCE_BEAT_MS);
  };

  if (isLoading || !redemption || !preset || !question) {
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

  const answer = answers[question.id];

  return (
    <KitPortalLayout classTitle={preset.title} passEndsAt={redemption.expires_at}>
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
                answer={answer}
                onToggle={(optionId) => {
                  const current = answer?.optionIds ?? [];
                  const next = current.includes(optionId)
                    ? current.filter((id) => id !== optionId)
                    : [...current, optionId];
                  setAnswer(question.id, { optionIds: next });
                }}
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

/* ------------------------------------------------------------------ */
/* Question renderers                                                   */
/* ------------------------------------------------------------------ */

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
      <label
        htmlFor={`${question.id}-optional`}
        className="text-sm text-muted-foreground"
      >
        {question.optionalText.prompt}{" "}
        <span className="text-muted-foreground/70">(optional)</span>
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
  answer,
  onSelect,
  onText,
}: {
  question: IntakeQuestion;
  answer: IntakeAnswer | undefined;
  onSelect: (optionId: string) => void;
  onText: (text: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {question.options?.map((option) => (
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
  answer,
  onToggle,
  onText,
  onContinue,
}: {
  question: IntakeQuestion;
  answer: IntakeAnswer | undefined;
  onToggle: (optionId: string) => void;
  onText: (text: string) => void;
  onContinue: () => void;
}) {
  const selected = answer?.optionIds ?? [];
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted-foreground">Pick as many as fit.</p>
      {question.options?.map((option) => (
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
