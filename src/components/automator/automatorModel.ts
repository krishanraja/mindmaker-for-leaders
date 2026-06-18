/**
 * Automator (Build a skill) - the recognition flow's data model.
 *
 * The redesigned skill builder is three screens:
 *   1. SUGGESTIONS  - pick a recurring deliverable CTRL mined from your brain
 *   2. CAPTURE      - a 3-step recognition cascade
 *                       trigger -> steps -> output
 *   3. SKILL READY  - the payoff + your skills library + export
 *
 * The cascade follows the recognition-over-recall design from the intake
 * theory appendix: each step picks from concrete chips rather than asking the
 * leader to write prose. Voice and hard rules are NOT round-tripped through
 * the transcript - they flow from the leader's `voice_profile.*` rows in
 * user_memory through buildMemoryContext into the generate-skill-export
 * prompt as a separate VOICE_PROFILE block.
 *
 * No JSX here, no hooks. Just the shapes + the deterministic transcript build,
 * so it can be unit-reasoned about and rendered in the QC harness.
 */

/**
 * Which family a deliverable belongs to. Drives the cascade copy so the
 * captured detail matches the real artifact (a report reads differently from
 * a proposal). Plain language; never shown raw to the user.
 */
export type AutomatorArchetype =
  | "report" // recurring update written to an audience (investor / board / team)
  | "proposal" // a doc produced from inputs (call -> proposal, brief -> plan)
  | "summary" // distil a long thing into a short thing (notes -> recap)
  | "outreach" // a message in your voice (follow-up, intro, nudge)
  | "custom"; // user-named ("Something else")

/**
 * A recurring-deliverable candidate shown on the Suggestions screen. Either
 * mined from the brain (mined=true, with a "why we picked this" reason) or a
 * curated role/sector-seeded fallback (mined=false).
 */
export interface DeliverableCandidate {
  /** Stable id (used as the React key + carried into the cascade). */
  id: string;
  /** The deliverable as the leader would name it, e.g. "Your weekly investor update". */
  title: string;
  /**
   * Why CTRL picked this. For mined candidates this references something real
   * ("you write one most Mondays"); for curated ones it is role/sector framing.
   * The leading clause is emphasised in the UI (the <em> in the mock).
   */
  reasonLead: string;
  reasonRest: string;
  /** Small effort chip, e.g. "~45 min each". */
  effortChip: string;
  /** Small frequency chip, e.g. "repeats weekly". */
  frequencyChip: string;
  /** The cascade family this candidate uses. */
  archetype: AutomatorArchetype;
  /** True when this came from the brain (shows the "pulled from your brain" badge). */
  mined: boolean;
  /**
   * Optional seed pain backlink (when mined from a blocker/decision) so the
   * generated skill can be anchored in the leader's actual language.
   */
  seedText?: string;
  seedKind?: "blocker" | "decision";
}

/**
 * One option inside a cascade step. The leader SELECTS one (single-step) - they
 * never type. `transcriptFragment` is the sentence this pick contributes to the
 * composed transcript (kept in the leader's voice, present-tense, no jargon).
 */
export interface CascadeOption {
  id: string;
  /** Short title shown on the option card. */
  label: string;
  /** One-line description under the title. Optional. */
  description?: string;
  /** The sentence this pick adds to the transcript. */
  transcriptFragment: string;
}

/** One step of the recognition cascade. */
export interface CascadeStep {
  id: CascadeStepId;
  /** The H1 question, e.g. "When do you do this?". */
  question: string;
  /** The supporting line under the question. */
  helper: string;
  /**
   * Render mode. After the brief's redesign every step is "options" (no more
   * three-way voice samples - voice now flows from the voice profile).
   */
  kind: "options";
  options: CascadeOption[];
}

export type CascadeStepId = "trigger" | "steps" | "output";

/** The leader's picks across the cascade: stepId -> selected optionId. */
export type CascadePicks = Partial<Record<CascadeStepId, string>>;

/** The ordered step ids - always three, so the progress bar reads "Step N of 3". */
export const CASCADE_STEP_ORDER: CascadeStepId[] = ["trigger", "steps", "output"];

/* ------------------------------------------------------------------ */
/* Per-archetype cascade content                                       */
/* ------------------------------------------------------------------ */

/**
 * Step 1 - the time-anchored trigger. Identical option set across archetypes
 * because triggers are about WHEN the work happens, not WHAT it is. The
 * candidate's frequency hint reorders them so the most likely chip leads.
 */
function triggerStep(candidate: DeliverableCandidate): CascadeStep {
  const baseOptions: CascadeOption[] = [
    {
      id: "weekly-monday",
      label: "Every Monday morning",
      description: "A standing slot on the calendar.",
      transcriptFragment:
        "It triggers every Monday morning - a standing slot on my calendar.",
    },
    {
      id: "monthly",
      label: "End of each month",
      description: "The monthly cycle pulls it in.",
      transcriptFragment:
        "It triggers at the end of each month, on the monthly cycle.",
    },
    {
      id: "after-event",
      label: "After every key event",
      description: "A call, a meeting or a milestone kicks it off.",
      transcriptFragment:
        "It triggers right after a key event - a call, a meeting or a milestone closing.",
    },
    {
      id: "when-asked",
      label: "Whenever an audience asks",
      description: "An investor pings, a customer churns, a team needs an update.",
      transcriptFragment:
        "It triggers whenever the audience asks - an investor pings, a customer churns, a team needs an update.",
    },
    {
      id: "when-deadline",
      label: "When a deadline lands",
      description: "Something must ship by a known date.",
      transcriptFragment:
        "It triggers when a deadline lands - something has to ship by a known date.",
    },
  ];
  const frequency = candidate.frequencyChip.toLowerCase();
  const lead = pickLeadTrigger(frequency);
  if (lead) {
    const idx = baseOptions.findIndex((o) => o.id === lead);
    if (idx > 0) {
      const [moved] = baseOptions.splice(idx, 1);
      baseOptions.unshift(moved);
    }
  }
  return {
    id: "trigger",
    question: "When do you do this?",
    helper:
      "Pick the time anchor that fires it. We will encode this as the skill's trigger phrase.",
    kind: "options",
    options: baseOptions,
  };
}

function pickLeadTrigger(frequency: string): string | null {
  if (frequency.includes("weekly") || frequency.includes("monday")) return "weekly-monday";
  if (frequency.includes("monthly")) return "monthly";
  if (frequency.includes("call") || frequency.includes("meeting")) return "after-event";
  if (frequency.includes("week") || frequency.includes("several")) return "weekly-monday";
  return null;
}

/**
 * Step 2 - the story-mode steps. Each option is a 3-act compression of the
 * work, captured in the leader's voice. The archetype tailors the wording so
 * the captured fragment reads like a real walk-through, not a generic recipe.
 */
function stepsStep(archetype: AutomatorArchetype): CascadeStep {
  const optionsByArchetype: Record<AutomatorArchetype, CascadeOption[]> = {
    report: [
      {
        id: "pull-write-send",
        label: "Pull numbers, write narrative, send",
        description: "Open the dashboard, write around the data, send.",
        transcriptFragment:
          "Here is how I do it now: I pull the latest numbers, write a short narrative around them, and send.",
      },
      {
        id: "gather-consolidate-send",
        label: "Gather team updates, consolidate, send",
        description: "Each area sends an update, I turn them into one voice.",
        transcriptFragment:
          "Here is how I do it now: I gather updates from each area, consolidate them into one voice, and send.",
      },
      {
        id: "start-from-last",
        label: "Start from last time, update what changed",
        description: "Open the previous one, edit what moved.",
        transcriptFragment:
          "Here is how I do it now: I open the previous update and change only the parts that have moved since last time.",
      },
    ],
    proposal: [
      {
        id: "from-transcript-draft-send",
        label: "From the call transcript, draft, send",
        description: "Read the transcript, write the draft straight from it.",
        transcriptFragment:
          "Here is how I do it now: I open the call transcript, draft the proposal straight from it, and send.",
      },
      {
        id: "from-notes-draft-send",
        label: "From rough notes, draft, send",
        description: "Pull my own notes, write the first cut, send.",
        transcriptFragment:
          "Here is how I do it now: I pull my rough notes from the call, write the first cut of the proposal, and send.",
      },
      {
        id: "template-adapt-send",
        label: "Adapt a template, fill the gaps, send",
        description: "Open a template, fill in what changed for this client.",
        transcriptFragment:
          "Here is how I do it now: I open my template, fill in what is specific for this client, and send.",
      },
    ],
    summary: [
      {
        id: "read-distil-share",
        label: "Read the source, distil, share",
        description: "Read the full thing, write the short version.",
        transcriptFragment:
          "Here is how I do it now: I read the full source, distil it to what matters, and share.",
      },
      {
        id: "pull-decisions-share",
        label: "Pull decisions and owners, share",
        description: "Extract what was decided and who owns each action.",
        transcriptFragment:
          "Here is how I do it now: I pull the decisions and owners out of the discussion and share the recap.",
      },
      {
        id: "action-only",
        label: "Strip to action items, share",
        description: "Just the next steps, nothing else.",
        transcriptFragment:
          "Here is how I do it now: I strip the discussion down to action items only and share.",
      },
    ],
    outreach: [
      {
        id: "reread-write-send",
        label: "Reread last exchange, write next message, send",
        description: "Skim the thread, write the follow-up, hit send.",
        transcriptFragment:
          "Here is how I do it now: I reread the last exchange, write the next message off it, and send.",
      },
      {
        id: "trigger-reach-out",
        label: "A trigger fires, I reach out",
        description: "They went quiet or hit a milestone - I reach out.",
        transcriptFragment:
          "Here is how I do it now: a trigger fires (they sign, go quiet, hit a milestone) and I reach out.",
      },
      {
        id: "list-personalise",
        label: "Work a list, personalise each one",
        description: "Same kind of note, tailored a little for each person.",
        transcriptFragment:
          "Here is how I do it now: I work down a list of people and personalise each note a little.",
      },
    ],
    custom: [
      {
        id: "gather-build-ship",
        label: "Gather inputs, build the output, ship",
        description: "Collect a few things, turn them into the output, send.",
        transcriptFragment:
          "Here is how I do it now: I gather a few inputs, turn them into the output, and ship.",
      },
      {
        id: "from-scratch",
        label: "Open a blank page, build it up",
        description: "Start from nothing each time and build it from scratch.",
        transcriptFragment:
          "Here is how I do it now: I open a blank page and build it from scratch each time.",
      },
      {
        id: "reuse-adapt",
        label: "Reuse the last one, adapt, ship",
        description: "Past version is the seed, I change what is new.",
        transcriptFragment:
          "Here is how I do it now: I open the last one I made, adapt it to what is new, and ship.",
      },
    ],
  };
  return {
    id: "steps",
    question: "Walk me through how you do this now",
    helper:
      "Pick the closest version of the actual steps. We will encode these as the skill's workflow.",
    kind: "options",
    options: optionsByArchetype[archetype],
  };
}

/**
 * Step 3 - the output format self-ID. Pick the shape of the artifact, not the
 * tone. Tone comes from the voice profile rows on the leader's account.
 */
function outputStep(archetype: AutomatorArchetype): CascadeStep {
  const optionsByArchetype: Record<AutomatorArchetype, CascadeOption[]> = {
    report: [
      {
        id: "short-paragraph",
        label: "Short crisp paragraphs",
        description: "Flowing prose, no bullets, easy to skim.",
        transcriptFragment:
          "The output is short crisp paragraphs - flowing prose, no bullets, easy to skim.",
      },
      {
        id: "bulleted-recap",
        label: "Bulleted recap",
        description: "Tight bullets under one or two headers.",
        transcriptFragment:
          "The output is a bulleted recap - tight bullets under one or two headers.",
      },
      {
        id: "narrative",
        label: "Long-form narrative",
        description: "A proper story, sections and all.",
        transcriptFragment:
          "The output is a long-form narrative with sections and a proper story arc.",
      },
    ],
    proposal: [
      {
        id: "one-pager",
        label: "Single one-pager",
        description: "One page, headings, scannable.",
        transcriptFragment:
          "The output is a single one-pager - one page, clear headings, scannable.",
      },
      {
        id: "structured-doc",
        label: "Structured multi-section doc",
        description: "Several sections, properly laid out.",
        transcriptFragment:
          "The output is a structured multi-section document with clear section breaks.",
      },
      {
        id: "email-ready",
        label: "Email-ready draft",
        description: "Body of an email, ready to send.",
        transcriptFragment:
          "The output is an email-ready draft - body text only, ready to paste and send.",
      },
    ],
    summary: [
      {
        id: "three-bullets",
        label: "Three-bullet recap",
        description: "Three bullets. Done.",
        transcriptFragment:
          "The output is a three-bullet recap - three bullets and nothing else.",
      },
      {
        id: "headed-sections",
        label: "Headed sections",
        description: "Decisions / Owners / Open questions style.",
        transcriptFragment:
          "The output uses headed sections like Decisions, Owners, and Open questions.",
      },
      {
        id: "paragraph",
        label: "Short paragraph",
        description: "A single tight paragraph anyone can skim.",
        transcriptFragment:
          "The output is a single short paragraph that anyone can skim in seconds.",
      },
    ],
    outreach: [
      {
        id: "email-ready",
        label: "Email-ready draft",
        description: "Body of an email, ready to send.",
        transcriptFragment:
          "The output is an email-ready draft - body text only, ready to paste and send.",
      },
      {
        id: "chat-snippet",
        label: "Chat-ready message",
        description: "Conversational, one or two lines.",
        transcriptFragment:
          "The output is a chat-ready message - conversational, one or two lines.",
      },
      {
        id: "linkedin-style",
        label: "LinkedIn-style post",
        description: "Hook, body, payoff.",
        transcriptFragment:
          "The output is a LinkedIn-style post - hook, body, payoff structure.",
      },
    ],
    custom: [
      {
        id: "short-paragraph",
        label: "Short crisp paragraphs",
        description: "Flowing prose, easy to read.",
        transcriptFragment:
          "The output is short crisp paragraphs - flowing prose, easy to read.",
      },
      {
        id: "structured-doc",
        label: "Structured doc",
        description: "Sections and headings.",
        transcriptFragment:
          "The output is a structured document with sections and headings.",
      },
      {
        id: "list",
        label: "Bulleted list",
        description: "Bullets only, scannable.",
        transcriptFragment:
          "The output is a bulleted list - bullets only, designed to be scanned.",
      },
    ],
  };
  return {
    id: "output",
    question: "What does the output look like?",
    helper:
      "Pick the shape. We will encode this as the skill's output format. Voice and tone come from the voice profile you saved.",
    kind: "options",
    options: optionsByArchetype[archetype],
  };
}

/**
 * The three-step cascade for a candidate. Steps are tailored by archetype so
 * the captured detail reads like the real artifact. Voice and hard rules are
 * NOT in the cascade - they flow from the leader's voice_profile.* rows.
 */
export function cascadeFor(candidate: DeliverableCandidate): CascadeStep[] {
  return [triggerStep(candidate), stepsStep(candidate.archetype), outputStep(candidate.archetype)];
}

/* ------------------------------------------------------------------ */
/* "Built your way" chips (the skill-ready card)                       */
/* ------------------------------------------------------------------ */

export interface BuiltYourWayChip {
  /** The dimension, e.g. "when", "how", "shape". */
  key: string;
  /** The picked value, e.g. "Every Monday morning". */
  value: string;
}

const CHIP_KEY_BY_STEP: Record<CascadeStepId, string> = {
  trigger: "when",
  steps: "how",
  output: "shape",
};

/**
 * Distil the cascade picks into the short "Built your way" chips shown on the
 * skill-ready card. Uses the picked option's label (short) rather than its
 * transcript fragment (long).
 */
export function builtYourWayChips(
  steps: CascadeStep[],
  picks: CascadePicks,
): BuiltYourWayChip[] {
  const chips: BuiltYourWayChip[] = [];
  for (const stepId of CASCADE_STEP_ORDER) {
    const step = steps.find((s) => s.id === stepId);
    const pickedId = picks[stepId];
    if (!step || !pickedId) continue;
    const opt = step.options.find((o) => o.id === pickedId);
    if (!opt) continue;
    chips.push({ key: CHIP_KEY_BY_STEP[stepId], value: opt.label.toLowerCase() });
  }
  return chips;
}

/* ------------------------------------------------------------------ */
/* Transcript composer                                                 */
/* ------------------------------------------------------------------ */

/**
 * Turn the candidate + cascade picks into a well-formed transcript the
 * generate-skill-export edge function knows how to parse.
 *
 * The composed transcript reads like a leader narrating their workflow:
 *   - states the deliverable + that it RECURS (passes the REPEATABLE test)
 *   - states WHEN it triggers (seeds trigger phrases for the description)
 *   - threads the steps fragment (the workflow)
 *   - states the output shape (seeds the output format section)
 * Voice rules are NOT in the transcript - they flow from voice_profile.* rows
 * through buildMemoryContext into the prompt's VOICE_PROFILE block.
 */
export function composeTranscript(
  candidate: DeliverableCandidate,
  steps: CascadeStep[],
  picks: CascadePicks,
): string {
  const lines: string[] = [];
  const title = candidate.title.replace(/^your\s+/i, "").trim() || candidate.title;

  // Opening: what it is + that it recurs (REPEATABLE).
  const frequencyLine = candidate.frequencyChip
    .replace(/^repeats\s+/i, "It repeats ")
    .replace(/^(\d)/, "It happens $1");
  lines.push(`I regularly produce my ${lowerFirst(title)}. ${frequencyLine}.`);

  // Trigger phrase the leader would actually say.
  lines.push(
    `I would kick this off by saying something like "draft my ${lowerFirst(
      title,
    )}" or "write the ${lowerFirst(title)}".`,
  );

  // Thread the picks: trigger -> steps -> output. Each contributes one sentence.
  for (const stepId of CASCADE_STEP_ORDER) {
    const step = steps.find((s) => s.id === stepId);
    const pickedId = picks[stepId];
    if (!step || !pickedId) continue;
    const opt = step.options.find((o) => o.id === pickedId);
    if (opt) lines.push(opt.transcriptFragment);
  }

  // If the candidate carries a real seed pain, surface it so the description
  // anchors in the leader's actual language (the prompt boosts this).
  if (candidate.seedText && candidate.seedText.trim().length > 0) {
    lines.push(
      `This matters because it ties directly to something I am working on: ${candidate.seedText.trim()}`,
    );
  }

  return lines.join(" \n");
}

function lowerFirst(s: string): string {
  return s.length > 0 ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
