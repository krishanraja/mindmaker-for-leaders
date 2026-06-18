import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";
import type {
  ContentArchetype,
  DisagreementSetting,
  FirstPersonSetting,
  PunctuationSetting,
  SentenceLengthSetting,
  VoiceProfile,
} from "@/lib/voiceProfile";

interface ChipOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

const ARCHETYPE_OPTIONS: ChipOption<ContentArchetype>[] = [
  { value: "warm-direct", label: "Warm-direct", hint: "Friendly but says it straight." },
  { value: "crisp-no-fluff", label: "Crisp, no fluff", hint: "Cut every spare word." },
  { value: "considered-formal", label: "Considered, formal", hint: "Polished, deliberate." },
  { value: "playful-sharp", label: "Playful but sharp", hint: "Wit on the surface, edge underneath." },
  { value: "story-lesson", label: "Story-then-lesson", hint: "A story, then the takeaway." },
];

const SENTENCE_LENGTH_OPTIONS: ChipOption<SentenceLengthSetting>[] = [
  { value: "short-punchy", label: "Short and punchy", hint: "8-12 words. One idea per line." },
  { value: "medium", label: "Medium and even", hint: "Most sentences read on one breath." },
  { value: "long-flowing", label: "Long and flowing", hint: "Subordinate clauses welcome." },
];

const FIRST_PERSON_OPTIONS: ChipOption<FirstPersonSetting>[] = [
  { value: "heavy-I", label: "Lots of 'I'", hint: "First-person is the anchor." },
  { value: "we-mode", label: "Mostly 'we'", hint: "Team voice." },
  { value: "neutral", label: "Neither", hint: "Subject-led, no first person." },
];

const PUNCTUATION_OPTIONS: ChipOption<PunctuationSetting>[] = [
  { value: "em-dash", label: "Em-dashes", hint: "The signature mark - use deliberately." },
  { value: "ellipsis", label: "Ellipses", hint: "Trailing thought... letting it land." },
  { value: "minimal", label: "Minimal", hint: "Periods, commas, nothing fancy." },
  { value: "standard", label: "Standard", hint: "Whatever the sentence needs." },
];

const DISAGREEMENT_OPTIONS: ChipOption<DisagreementSetting>[] = [
  { value: "direct", label: "Direct", hint: "Say the counter-claim first." },
  { value: "context-first", label: "Context-first", hint: "Acknowledge, then pivot." },
  { value: "ask-first", label: "Ask first", hint: "Surface the disagreement as a question." },
];

const SIGNOFF_SUGGESTIONS = [
  "Cheers, [first name]",
  "Best, [first name]",
  "Thanks, [first name]",
  "[first name]",
];

type Step = 1 | 2 | 3;

export function VoiceStyleProfileSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const { profile, save } = useVoiceProfile();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<VoiceProfile>(profile);
  const [hardRulesText, setHardRulesText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraft(profile);
    setHardRulesText((profile.hardRules ?? []).join("\n"));
  }, [open, profile]);

  const canAdvanceFromStep1 = useMemo(() => {
    return Boolean(draft.archetype && draft.sentenceLength && draft.firstPerson);
  }, [draft.archetype, draft.sentenceLength, draft.firstPerson]);

  const canAdvanceFromStep2 = useMemo(() => {
    return Boolean(draft.signoff && draft.signoff.trim() && draft.punctuation);
  }, [draft.signoff, draft.punctuation]);

  const submit = async () => {
    setSubmitting(true);
    const hardRules = hardRulesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const next: VoiceProfile = {
      ...draft,
      hardRules,
    };
    const result = await save(next, "form");
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not save your voice profile. Try again.");
      return;
    }
    toast.success("Voice profile saved. Every skill we build now sounds like you.");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Lock in how you sound
          </SheetTitle>
          <SheetDescription>
            Three short steps - 90 seconds. Recognition only, no essay questions.
          </SheetDescription>
          <p className="text-xs text-muted-foreground">Step {step} of 3</p>
        </SheetHeader>

        <div className="space-y-6 pt-4">
          {step === 1 && (
            <Step1Shape
              draft={draft}
              setDraft={setDraft}
            />
          )}
          {step === 2 && (
            <Step2Signature
              draft={draft}
              setDraft={setDraft}
            />
          )}
          {step === 3 && (
            <Step3Rules
              draft={draft}
              setDraft={setDraft}
              hardRulesText={hardRulesText}
              setHardRulesText={setHardRulesText}
            />
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                disabled={submitting}
              >
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
                disabled={step === 1 ? !canAdvanceFromStep1 : !canAdvanceFromStep2}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => void submit()} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save voice profile
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Step1Shape({
  draft,
  setDraft,
}: {
  draft: VoiceProfile;
  setDraft: (next: VoiceProfile) => void;
}) {
  return (
    <div className="space-y-5">
      <DimensionBlock
        label="Which one is closest to how you write?"
        sub="Pick the one that resonates - you can refine later."
        options={ARCHETYPE_OPTIONS}
        value={draft.archetype}
        onChange={(value) => setDraft({ ...draft, archetype: value })}
      />
      <DimensionBlock
        label="Sentence length"
        sub="How your sentences usually land."
        options={SENTENCE_LENGTH_OPTIONS}
        value={draft.sentenceLength}
        onChange={(value) => setDraft({ ...draft, sentenceLength: value })}
      />
      <DimensionBlock
        label="First-person preference"
        sub="Who's the subject of the sentences?"
        options={FIRST_PERSON_OPTIONS}
        value={draft.firstPerson}
        onChange={(value) => setDraft({ ...draft, firstPerson: value })}
      />
    </div>
  );
}

function Step2Signature({
  draft,
  setDraft,
}: {
  draft: VoiceProfile;
  setDraft: (next: VoiceProfile) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">How do you sign off?</p>
        <p className="text-xs text-muted-foreground">Type yours, or tap a starter.</p>
        <Input
          value={draft.signoff ?? ""}
          onChange={(e) => setDraft({ ...draft, signoff: e.target.value })}
          placeholder="Cheers, Krish"
          aria-label="Sign-off"
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SIGNOFF_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setDraft({ ...draft, signoff: suggestion })}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      <DimensionBlock
        label="Punctuation signature"
        sub="One micropattern that signals you wrote it."
        options={PUNCTUATION_OPTIONS}
        value={draft.punctuation}
        onChange={(value) => setDraft({ ...draft, punctuation: value })}
      />
      <DimensionBlock
        label="When the answer disagrees with the ask"
        sub="How a piece of writing handles pushback."
        options={DISAGREEMENT_OPTIONS}
        value={draft.disagreement}
        onChange={(value) => setDraft({ ...draft, disagreement: value })}
      />
    </div>
  );
}

function Step3Rules({
  draft,
  setDraft,
  hardRulesText,
  setHardRulesText,
}: {
  draft: VoiceProfile;
  setDraft: (next: VoiceProfile) => void;
  hardRulesText: string;
  setHardRulesText: (next: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Never-say rules</p>
        <p className="text-xs text-muted-foreground">
          One per line. Anything the output should never do. Skip if nothing comes to mind.
        </p>
        <Textarea
          value={hardRulesText}
          onChange={(e) => setHardRulesText(e.target.value)}
          placeholder={'never start with "I hope this finds you well"\nnever use em-dashes\nnever use the word "leverage"'}
          className="min-h-[120px] resize-none text-sm"
          aria-label="Hard rules, one per line"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Sample voice (optional)</p>
        <p className="text-xs text-muted-foreground">
          Paste 2-3 sentences you actually wrote. Ground truth beats every other dimension.
        </p>
        <Textarea
          value={draft.sampleVoice ?? ""}
          onChange={(e) => setDraft({ ...draft, sampleVoice: e.target.value })}
          placeholder="Paste a paragraph that sounds exactly like you on a good day."
          className="min-h-[100px] resize-none text-sm"
          aria-label="Sample voice"
        />
      </div>
    </div>
  );
}

function DimensionBlock<T extends string>({
  label,
  sub,
  options,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  options: ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const on = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={on}
              className={cn(
                "inline-flex flex-col items-start gap-0.5 rounded-2xl border px-3 py-2 text-left text-xs font-medium transition-colors",
                on
                  ? "border-accent bg-accent/[0.08] text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="inline-flex items-center gap-1">
                {on && <Check className="h-3 w-3 text-accent" />}
                {option.label}
              </span>
              {option.hint && <span className="text-[10px] text-muted-foreground">{option.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
