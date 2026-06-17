import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSkillSuggestions } from "@/hooks/useSkillSuggestions";
import { useSkillExport } from "@/hooks/useSkillExport";
import { useGeneratedArtifacts } from "@/hooks/useGeneratedArtifacts";
import { isSkillSuccess, type SkillData, type SkillSeed } from "@/types/skill";
import { AutomatorSuggestions } from "./AutomatorSuggestions";
import { AutomatorCascade } from "./AutomatorCascade";
import { AutomatorSkillReady, type LibraryPeekItem } from "./AutomatorSkillReady";
import {
  builtYourWayChips,
  cascadeFor,
  composeTranscript,
  type CascadePicks,
  type CascadeStep,
  type DeliverableCandidate,
} from "./automatorModel";

/**
 * AutomatorFlow - the redesigned "Build a skill" experience (3 screens):
 *
 *   1. SUGGESTIONS - pick a recurring deliverable CTRL mined from your brain.
 *   2. CASCADE     - a 5-step recognition pick-cascade (never a blank box).
 *   3. SKILL READY - the payoff + library peek + export.
 *
 * Owns the flow state and the wiring: it composes the cascade picks into a
 * well-formed transcript and feeds it to useSkillExport (the existing
 * generate-skill-export backend - unchanged). On success it shows the payoff;
 * on a triage reroute it hands the transcript + reason up to the parent so the
 * old context-blob fallback still works.
 */

interface AutomatorFlowProps {
  /**
   * Optional pre-anchored seed from an entry point (Edge card, Memory blocker,
   * Briefing decision trigger). When present we skip the Suggestions screen and
   * open the cascade on a candidate built from the seed.
   */
  initialSeed?: SkillSeed | null;
  /**
   * Called when triage reroutes the input away from a skill (one-off task,
   * preference, memory fact). The parent rescues it via generate-custom-export.
   */
  onTriageReroute?: (transcript: string, result: string, reasoning?: string) => void;
  /** Called when the leader exports the generated skill (download .zip). */
  onExported?: () => void;
}

type Phase = "suggestions" | "cascade" | "ready";

/** Build a one-off custom candidate from a free-typed deliverable name. */
function customCandidate(title: string): DeliverableCandidate {
  return {
    id: `custom-${Date.now()}`,
    title: title.trim() || "Your repeated task",
    reasonLead: "You named this one",
    reasonRest: " - we will build it around how you do it.",
    effortChip: "your call",
    frequencyChip: "repeats",
    archetype: "custom",
    mined: false,
  };
}

/** Build a candidate from an entry-point seed (blocker / decision pain). */
function candidateFromSeed(seed: SkillSeed): DeliverableCandidate {
  const title = (seed.label || seed.text).trim();
  return {
    id: `seed-${seed.fact_id ?? seed.decision_id ?? "x"}`,
    title: title.length > 48 ? `${title.slice(0, 47)}...` : title,
    reasonLead: "From a pain you flagged",
    reasonRest: ` - ${seed.text.slice(0, 80)}.`,
    effortChip: "recurring",
    frequencyChip: "repeats",
    archetype: "custom",
    mined: true,
    seedText: seed.text,
    seedKind: seed.kind === "decision" ? "decision" : "blocker",
  };
}

export function AutomatorFlow({
  initialSeed,
  onTriageReroute,
  onExported,
}: AutomatorFlowProps) {
  const { toast } = useToast();
  const suggestions = useSkillSuggestions(3);
  const skillExport = useSkillExport();
  const { artifacts } = useGeneratedArtifacts("skill", 6);

  // If we arrived with a seed, start in the cascade on a seed candidate.
  const seedCandidate = useMemo(
    () => (initialSeed && initialSeed.text ? candidateFromSeed(initialSeed) : null),
    [initialSeed],
  );

  const [phase, setPhase] = useState<Phase>(seedCandidate ? "cascade" : "suggestions");
  const [candidate, setCandidate] = useState<DeliverableCandidate | null>(seedCandidate);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [picks, setPicks] = useState<CascadePicks>({});
  const [readySkill, setReadySkill] = useState<SkillData | null>(null);
  const [readyChips, setReadyChips] = useState(() => builtYourWayChips([], {}));

  const steps: CascadeStep[] = useMemo(
    () => (candidate ? cascadeFor(candidate) : []),
    [candidate],
  );

  const resetCascade = useCallback(() => {
    setStepIndex(0);
    setDirection(1);
    setPicks({});
    skillExport.reset();
  }, [skillExport]);

  // ─── Suggestions handlers ───────────────────────────────────────
  const handlePick = useCallback(
    (c: DeliverableCandidate) => {
      setCandidate(c);
      resetCascade();
      setPhase("cascade");
    },
    [resetCascade],
  );

  const handleCustomDeliverable = useCallback(
    (name: string) => {
      if (!name || name.trim().length < 3) return;
      handlePick(customCandidate(name.trim()));
    },
    [handlePick],
  );

  // ─── Cascade handlers ───────────────────────────────────────────
  const handleSelect = useCallback((stepId: CascadeStep["id"], optionId: string) => {
    setPicks((prev) => ({ ...prev, [stepId]: optionId }));
  }, []);

  const handleBack = useCallback(() => {
    if (stepIndex === 0) {
      // Leave the cascade. With a seed there is no Suggestions screen to return
      // to, so we rebuild it as a custom-name flow instead.
      setPhase("suggestions");
      setCandidate(null);
      return;
    }
    setDirection(-1);
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const handleNext = useCallback(async () => {
    if (!candidate) return;
    if (stepIndex < steps.length - 1) {
      setDirection(1);
      setStepIndex((i) => i + 1);
      return;
    }

    // Last step: compose the transcript and build the skill.
    const transcript = composeTranscript(candidate, steps, picks);
    const seed: SkillSeed | null =
      candidate.seedText && candidate.seedKind
        ? { kind: candidate.seedKind, text: candidate.seedText }
        : null;

    const response = await skillExport.generateSkill(transcript, { seed });
    if (!response) {
      // useSkillExport set the error; the cascade surfaces it inline.
      return;
    }

    if (isSkillSuccess(response)) {
      setReadySkill(response.skill);
      setReadyChips(builtYourWayChips(steps, picks));
      setDirection(1);
      setPhase("ready");
      return;
    }

    // Triage rerouted this away from a skill - hand it up to the parent so the
    // existing context-blob fallback can rescue the transcript.
    onTriageReroute?.(transcript, response.triage.result, response.triage.reasoning);
  }, [candidate, steps, stepIndex, picks, skillExport, onTriageReroute]);

  // ─── Skill-ready handlers ───────────────────────────────────────
  const handleRun = useCallback(() => {
    // No dedicated in-app run surface yet (the skill is a downloadable Claude
    // skill). The honest "run it" is to take the skill to an AI - so we export
    // and tell the leader how to fire it. This stays truthful and never claims
    // an in-app execution that does not exist.
    skillExport.downloadZip();
    toast({
      title: "Skill downloaded",
      description:
        "Drop it into Claude (or paste the markdown into any AI) and say your trigger phrase to run it.",
    });
    onExported?.();
  }, [skillExport, toast, onExported]);

  const handleExport = useCallback(() => {
    skillExport.downloadZip();
    toast({ title: "Exported as markdown", description: "Saved to your downloads." });
    onExported?.();
  }, [skillExport, toast, onExported]);

  const handleBuildAnother = useCallback(() => {
    setReadySkill(null);
    setCandidate(null);
    resetCascade();
    setPhase("suggestions");
    suggestions.refetch();
  }, [resetCascade, suggestions]);

  const handleSeeAll = useCallback(() => {
    window.location.assign("/memory?tab=library");
  }, []);

  // ─── Library peek (new skill first, then the leader's others) ────
  const library: LibraryPeekItem[] = useMemo(() => {
    const newItem: LibraryPeekItem = {
      id: "new",
      label: candidate?.title ?? readySkill?.name ?? "Your new skill",
    };
    const others: LibraryPeekItem[] = (artifacts ?? [])
      .slice(0, 2)
      .map((a) => ({ id: a.id, label: a.name }));
    // If the brain has no prior skills, seed two tasteful placeholders so the
    // shelf never looks empty on a first build (clearly the leader's lane).
    const fallback: LibraryPeekItem[] = [
      { id: "f1", label: "Weekly investor update" },
      { id: "f2", label: "Board one-pager" },
    ];
    const tail = others.length > 0 ? others : fallback;
    return [newItem, ...tail].slice(0, 3);
  }, [candidate, readySkill, artifacts]);

  // ─── Render the active phase ─────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full min-h-0 flex-col"
    >
      {phase === "suggestions" && (
        <AutomatorSuggestions
          candidates={suggestions.candidates}
          loading={suggestions.loading}
          hasMined={suggestions.hasMined}
          onPick={handlePick}
          onCustomDeliverable={handleCustomDeliverable}
        />
      )}

      {phase === "cascade" && candidate && (
        <AutomatorCascade
          candidate={candidate}
          steps={steps}
          stepIndex={stepIndex}
          picks={picks}
          direction={direction}
          isGenerating={skillExport.isGenerating}
          generationError={skillExport.error}
          onSelect={handleSelect}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {phase === "ready" && readySkill && (
        <AutomatorSkillReady
          skill={readySkill}
          chips={readyChips}
          whatItDoes={readySkill.description.split(".")[0] + "."}
          library={library}
          onRun={handleRun}
          onExport={handleExport}
          onSeeAll={handleSeeAll}
          onBuildAnother={handleBuildAnother}
        />
      )}
    </motion.div>
  );
}
