/**
 * Automator (Build a skill) - the recognition flow's data model.
 *
 * The redesigned skill builder is three screens:
 *   1. SUGGESTIONS  - pick a recurring deliverable CTRL mined from your brain
 *   2. CAPTURE      - a 5-step pick-cascade (recognition, never a blank box)
 *   3. SKILL READY  - the payoff + your skills library + export
 *
 * This file owns the pure data: the candidate shape, the per-candidate cascade
 * questions (tailored by archetype), and composeBuildBrief() - the function
 * that turns the cascade picks into a well-formed transcript the existing
 * generate-skill-export edge function already knows how to parse.
 *
 * No JSX here, no hooks. Just the shapes + the deterministic transcript build,
 * so it can be unit-reasoned about and rendered in the QC harness.
 */

import type { VoiceProfile } from "@/types/voiceProfile";

/**
 * Which family a deliverable belongs to. Drives the cascade copy + the tone
 * samples so the captured detail matches the real artifact (a report reads
 * differently from a proposal). Plain language; never shown raw to the user.
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
  /** Short title shown on the option card / sample header. */
  label: string;
  /** One-line description under the title (the mock's .ds line). Optional for tone samples. */
  description?: string;
  /** For the tone step: the worked SAMPLE text shown italic (one output, three voices). */
  sample?: string;
  /** The sentence this pick adds to the transcript. */
  transcriptFragment: string;
}

/** One step of the recognition cascade. */
export interface CascadeStep {
  id: CascadeStepId;
  /** The H1 question, e.g. "How do you do this now?". */
  question: string;
  /** The supporting line under the question. */
  helper: string;
  /** Whether this step shows worked SAMPLES (the tone step) vs option cards. */
  kind: "options" | "samples";
  options: CascadeOption[];
}

export type CascadeStepId = "how" | "inputs" | "structure" | "tone" | "guardrails";

/** The leader's picks across the cascade: stepId -> selected optionId. */
export type CascadePicks = Partial<Record<CascadeStepId, string>>;

/** The ordered step ids - always five, so the progress bar reads "Step N of 5". */
export const CASCADE_STEP_ORDER: CascadeStepId[] = [
  "how",
  "inputs",
  "structure",
  "tone",
  "guardrails",
];

/* ------------------------------------------------------------------ */
/* Per-archetype cascade content                                       */
/* ------------------------------------------------------------------ */

/**
 * The tone step is shared across archetypes in spirit (warm / crisp / formal)
 * but the SAMPLE text is written for the family so it reads like the real
 * artifact. We build the three samples per archetype.
 */
function toneStep(archetype: AutomatorArchetype): CascadeStep {
  const samples: Record<AutomatorArchetype, [string, string, string]> = {
    report: [
      "Quick one before the numbers: genuinely good month. The team pulled hard and it shows. Here is where we landed and the one thing on my mind.",
      "Month in three lines. Revenue up, burn flat, one risk. Numbers and the ask are below.",
      "Please find below this month's update. Following a strong period of execution, I have set out our performance against plan and the matters requiring attention.",
    ],
    proposal: [
      "Really enjoyed today. I came away genuinely excited about what you are building, and confident we can get you there faster. Here is how I would approach it.",
      "Here is the plan. You need to hit the Q3 number. We get you there in three phases. Scope, timeline and price are below.",
      "Thank you for your time today. Following our discussion, I have outlined a proposed approach to the objectives we covered, structured across three workstreams.",
    ],
    summary: [
      "Short version for anyone who missed it: here is what was decided, who owns what, and the one thing to watch.",
      "Recap. Three decisions, two owners, one open question. Details below.",
      "The following is a summary of the discussion, capturing the key decisions reached and the actions assigned to each owner.",
    ],
    outreach: [
      "Great to meet you. I have been thinking about what you said, and I reckon there is a real fit here. Worth a proper chat?",
      "Following up on the above. One line: I think we can help. Fifteen minutes this week?",
      "I am writing to follow up on our recent conversation. I believe there may be a valuable opportunity to collaborate, and would welcome the chance to discuss further.",
    ],
    custom: [
      "Friendly and direct - I write the way I talk, warm but I get to the point.",
      "Crisp and stripped back - short sentences, no filler, the point first.",
      "Considered and formal - full sentences, measured, nothing too casual.",
    ],
  };
  const [warm, crisp, formal] = samples[archetype];
  return {
    id: "tone",
    question: "Which of these sounds most like you?",
    helper:
      "The same opener, three ways. Pick the closest - we will write yours in that voice. No need to describe it.",
    kind: "samples",
    options: [
      {
        id: "warm",
        label: "Warm and direct",
        sample: warm,
        transcriptFragment:
          "My voice is warm and direct - human and a little personal, but I get to the point.",
      },
      {
        id: "crisp",
        label: "Crisp and no-fluff",
        sample: crisp,
        transcriptFragment:
          "My voice is crisp and stripped back - short sentences, the point first, no filler.",
      },
      {
        id: "formal",
        label: "Considered and formal",
        sample: formal,
        transcriptFragment:
          "My voice is considered and formal - full sentences, measured, nothing too casual.",
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Tone <-> voice-profile bridge (the unification)                     */
/* ------------------------------------------------------------------ */

/** The three in-flow tone ids (the tone step's option ids). */
export type ToneId = "warm" | "crisp" | "formal";

/**
 * Map an in-flow tone pick to a full 8-dimension voice profile, so a single
 * warm/crisp/formal tap becomes the leader's SAVED voice - reused by every
 * future skill, every kit, and the harness. Inferred defaults for the
 * dimensions the tone step does not directly capture (signoff, disagreement,
 * one hard rule); the full sheet or paste-extract can enrich later.
 */
export function toneToVoiceProfile(
  toneId: string,
  source: VoiceProfile["source"] = "context",
): VoiceProfile {
  if (toneId === "crisp") {
    return {
      signoff: "none",
      disagreement: "direct",
      contentArchetype: "argument",
      sentenceLength: "short-punchy",
      firstPerson: "minimal-I",
      punctuationStyle: "minimal",
      hardRules: ["Never pad it out. Say the point and stop."],
      source,
    };
  }
  if (toneId === "formal") {
    return {
      signoff: "sincerely",
      disagreement: "question-led",
      contentArchetype: "how-to",
      sentenceLength: "long-flowing",
      firstPerson: "balanced",
      punctuationStyle: "formal",
      hardRules: ["Keep it measured and considered, never too casual."],
      source,
    };
  }
  // warm (default)
  return {
    signoff: "thanks",
    disagreement: "context-first",
    contentArchetype: "story-lesson",
    sentenceLength: "short-punchy",
    firstPerson: "heavy-I",
    punctuationStyle: "minimal",
    hardRules: ["Always sound human and personal, never a generic AI tone."],
    source,
  };
}

/** Recover the closest in-flow tone id from a saved voice profile. */
export function toneIdFromProfile(p: VoiceProfile): ToneId {
  if (p.sentenceLength === "long-flowing" || p.punctuationStyle === "formal") return "formal";
  if (p.firstPerson === "heavy-I" || p.contentArchetype === "story-lesson") return "warm";
  return "crisp";
}

/**
 * The five-step cascade for a candidate. Steps 1-3 and 5 are tailored by
 * archetype; step 4 (tone) shares structure but uses family-specific samples.
 * Every step offers options to SELECT - never a blank "describe it" box.
 */
export function cascadeFor(candidate: DeliverableCandidate): CascadeStep[] {
  const a = candidate.archetype;

  const howByArchetype: Record<AutomatorArchetype, CascadeStep> = {
    report: {
      id: "how",
      question: "How do you do this now?",
      helper: "Pick the closest. CTRL tailors everything after this from your choice - no long forms.",
      kind: "options",
      options: [
        {
          id: "from-numbers",
          label: "From the numbers",
          description: "You pull the latest metrics and write the update around them.",
          transcriptFragment: "I start from the latest numbers and write the update around them.",
        },
        {
          id: "from-team",
          label: "From the team's updates",
          description: "You gather what each area sent and turn it into one voice.",
          transcriptFragment:
            "I gather updates from each area or team and turn them into one update in my voice.",
        },
        {
          id: "from-lastweek",
          label: "From last time, updated",
          description: "You start from the previous one and update what changed.",
          transcriptFragment:
            "I start from the previous update and change the parts that moved since last time.",
        },
      ],
    },
    proposal: {
      id: "how",
      question: "How do you do this now?",
      helper: "Pick the closest. CTRL tailors everything after this from your choice - no long forms.",
      kind: "options",
      options: [
        {
          id: "from-transcript",
          label: "From the call transcript",
          description: "You work from the full recording or transcript after the call.",
          transcriptFragment:
            "I work from the full call transcript or recording and write the first draft from that.",
        },
        {
          id: "from-notes",
          label: "From your rough notes",
          description: "You jot a few notes during the call and write from those.",
          transcriptFragment:
            "I jot a few rough notes during the call and write the draft from those.",
        },
        {
          id: "from-template",
          label: "From a template you adapt",
          description: "You start from a template and fill in the gaps each time.",
          transcriptFragment:
            "I start from a template I keep and fill in the gaps for each new one.",
        },
      ],
    },
    summary: {
      id: "how",
      question: "How do you do this now?",
      helper: "Pick the closest. CTRL tailors everything after this from your choice - no long forms.",
      kind: "options",
      options: [
        {
          id: "from-transcript",
          label: "From a transcript",
          description: "You work from the full recording or transcript of the thing.",
          transcriptFragment: "I work from the full transcript or recording and distil it down.",
        },
        {
          id: "from-notes",
          label: "From your own notes",
          description: "You read back your notes and pull out what matters.",
          transcriptFragment: "I read back my own notes and pull out the parts that matter.",
        },
        {
          id: "from-thread",
          label: "From a long thread or doc",
          description: "You scan a long email thread or document and condense it.",
          transcriptFragment: "I scan a long thread or document and condense it into the short version.",
        },
      ],
    },
    outreach: {
      id: "how",
      question: "How do you do this now?",
      helper: "Pick the closest. CTRL tailors everything after this from your choice - no long forms.",
      kind: "options",
      options: [
        {
          id: "from-context",
          label: "From the last exchange",
          description: "You reread the thread or call and write the next message off it.",
          transcriptFragment:
            "I reread the last exchange or call and write the next message off the back of it.",
        },
        {
          id: "from-trigger",
          label: "From a trigger",
          description: "Something happens (they signed, went quiet) and you reach out.",
          transcriptFragment:
            "I reach out when something triggers it - they signed, went quiet, or hit a milestone.",
        },
        {
          id: "from-list",
          label: "From a list",
          description: "You work down a list of people who each need the same kind of note.",
          transcriptFragment:
            "I work down a list of people who each need the same kind of note, tailored a little.",
        },
      ],
    },
    custom: {
      id: "how",
      question: "How do you do this now?",
      helper: "Pick the closest. CTRL tailors everything after this from your choice - no long forms.",
      kind: "options",
      options: [
        {
          id: "from-scratch",
          label: "Mostly from scratch",
          description: "You start with a blank page each time and build it up.",
          transcriptFragment: "I mostly start from a blank page each time and build it up.",
        },
        {
          id: "from-inputs",
          label: "From inputs you gather",
          description: "You collect a few things first, then turn them into the output.",
          transcriptFragment: "I gather a few inputs first, then turn them into the output.",
        },
        {
          id: "from-template",
          label: "From something you reuse",
          description: "You start from a past version or template and adapt it.",
          transcriptFragment: "I start from a past version or template I reuse and adapt it.",
        },
      ],
    },
  };

  const inputsByArchetype: Record<AutomatorArchetype, CascadeStep> = {
    report: {
      id: "inputs",
      question: "What goes into it?",
      helper: "The raw material you start with each time. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "metrics",
          label: "Metrics and a few notes",
          description: "The numbers plus a line or two of colour on each.",
          transcriptFragment: "What goes in: the key metrics plus a short note of colour on each.",
        },
        {
          id: "team-updates",
          label: "Updates from each area",
          description: "What sales, product, ops and so on each sent in.",
          transcriptFragment:
            "What goes in: written updates from each area (sales, product, ops, and so on).",
        },
        {
          id: "mixed",
          label: "A mix of numbers and wins",
          description: "Some metrics, some wins, some risks, loosely gathered.",
          transcriptFragment:
            "What goes in: a loose mix of metrics, wins, and risks I gather through the period.",
        },
      ],
    },
    proposal: {
      id: "inputs",
      question: "What goes into it?",
      helper: "The raw material you start with each time. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "needs",
          label: "Their needs and goals",
          description: "What they said they want and where they are trying to get to.",
          transcriptFragment:
            "What goes in: the prospect's stated needs and the goal they are trying to reach.",
        },
        {
          id: "scope-budget",
          label: "Scope, budget, timeline",
          description: "The practical constraints they gave you on the call.",
          transcriptFragment:
            "What goes in: the practical constraints they gave - scope, budget, and timeline.",
        },
        {
          id: "pains",
          label: "Their pains, in their words",
          description: "The specific problems they described, quoted back.",
          transcriptFragment:
            "What goes in: the specific pains they described, kept in their own words.",
        },
      ],
    },
    summary: {
      id: "inputs",
      question: "What goes into it?",
      helper: "The raw material you start with each time. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "decisions",
          label: "Decisions and owners",
          description: "What was decided and who picked up each action.",
          transcriptFragment: "What goes in: the decisions reached and who owns each action.",
        },
        {
          id: "discussion",
          label: "The whole discussion",
          description: "Everything said, which you boil down to what matters.",
          transcriptFragment:
            "What goes in: the whole discussion, which I boil down to only what matters.",
        },
        {
          id: "actions",
          label: "Just the action items",
          description: "The next steps, stripped of the back and forth.",
          transcriptFragment: "What goes in: the action items, stripped of the back and forth.",
        },
      ],
    },
    outreach: {
      id: "inputs",
      question: "What goes into it?",
      helper: "The raw material you start with each time. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "history",
          label: "The history with them",
          description: "What you have already said and where you left it.",
          transcriptFragment:
            "What goes in: the history with this person and where the last exchange left off.",
        },
        {
          id: "one-detail",
          label: "One specific detail",
          description: "A single thing they said that you can anchor the note to.",
          transcriptFragment:
            "What goes in: one specific detail they mentioned that I anchor the note to.",
        },
        {
          id: "their-role",
          label: "Who they are",
          description: "Their role and what they care about, to pitch it right.",
          transcriptFragment:
            "What goes in: their role and what they care about, so I pitch the note right.",
        },
      ],
    },
    custom: {
      id: "inputs",
      question: "What goes into it?",
      helper: "The raw material you start with each time. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "notes",
          label: "Notes or a transcript",
          description: "Something written you start from each time.",
          transcriptFragment: "What goes in: notes or a transcript I start from each time.",
        },
        {
          id: "data",
          label: "Numbers or data",
          description: "Figures you pull together before writing.",
          transcriptFragment: "What goes in: numbers or data I pull together before writing.",
        },
        {
          id: "context",
          label: "Context in my head",
          description: "What you already know about the situation, shaped into the finished work.",
          transcriptFragment: "What goes in: context I already hold, which I turn into the output.",
        },
      ],
    },
  };

  const structureByArchetype: Record<AutomatorArchetype, CascadeStep> = {
    report: {
      id: "structure",
      question: "What shape does it take?",
      helper: "The order it always seems to land in. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "tldr-metrics-asks",
          label: "TLDR, metrics, asks",
          description: "Headline first, then the numbers, then what you need.",
          transcriptFragment:
            "The shape is: a TLDR up top, then the key metrics, then my asks at the end.",
        },
        {
          id: "wins-risks-next",
          label: "Wins, risks, what's next",
          description: "What went well, what to watch, where you are headed.",
          transcriptFragment:
            "The shape is: wins first, then risks to watch, then what is next.",
        },
        {
          id: "narrative",
          label: "One flowing narrative",
          description: "No headers - a continuous read, start to finish.",
          transcriptFragment:
            "The shape is one flowing narrative with no headers - a continuous read start to finish.",
        },
      ],
    },
    proposal: {
      id: "structure",
      question: "What shape does it take?",
      helper: "The order it always seems to land in. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "problem-approach-price",
          label: "Problem, approach, price",
          description: "Name the problem, lay out how, then the cost.",
          transcriptFragment:
            "The shape is: problem first, then my approach, then the price.",
        },
        {
          id: "phases",
          label: "Phased plan",
          description: "Break the work into phases with what each delivers.",
          transcriptFragment:
            "The shape is a phased plan - the work split into phases with what each delivers.",
        },
        {
          id: "outcomes-first",
          label: "Outcomes first",
          description: "Lead with what they get, then how you deliver it.",
          transcriptFragment:
            "The shape leads with the outcomes they get, then how I deliver them.",
        },
      ],
    },
    summary: {
      id: "structure",
      question: "What shape does it take?",
      helper: "The order it always seems to land in. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "decisions-actions-watch",
          label: "Decisions, actions, watch",
          description: "What was decided, who does what, what to keep an eye on.",
          transcriptFragment:
            "The shape is: decisions, then actions and owners, then one thing to watch.",
        },
        {
          id: "three-bullets",
          label: "Three tight bullets",
          description: "The whole thing in three scannable lines.",
          transcriptFragment:
            "The shape is three tight bullets - the whole thing scannable in three lines.",
        },
        {
          id: "tldr-detail",
          label: "TLDR then detail",
          description: "A one-line headline, then the detail under it.",
          transcriptFragment:
            "The shape is a one-line TLDR, then the supporting detail underneath.",
        },
      ],
    },
    outreach: {
      id: "structure",
      question: "What shape does it take?",
      helper: "The order it always seems to land in. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "hook-value-ask",
          label: "Hook, value, ask",
          description: "Open with the hook, show the value, make one ask.",
          transcriptFragment:
            "The shape is: a hook, then the value, then one clear ask.",
        },
        {
          id: "short-personal",
          label: "Short and personal",
          description: "Two or three lines that feel written just for them.",
          transcriptFragment:
            "The shape is short and personal - two or three lines that feel written just for them.",
        },
        {
          id: "context-then-cta",
          label: "Context, then a CTA",
          description: "Remind them where you left it, then the next step.",
          transcriptFragment:
            "The shape is context first (where we left it), then a single call to action.",
        },
      ],
    },
    custom: {
      id: "structure",
      question: "What shape does it take?",
      helper: "The order it always seems to land in. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "headers",
          label: "Clear sections",
          description: "Headed sections in a set order.",
          transcriptFragment: "The shape is clear, headed sections in a set order each time.",
        },
        {
          id: "narrative",
          label: "One flowing piece",
          description: "No headers - a single continuous read.",
          transcriptFragment: "The shape is one flowing piece with no headers.",
        },
        {
          id: "bullets",
          label: "Scannable bullets",
          description: "Tight bullets, easy to skim.",
          transcriptFragment: "The shape is scannable bullets, easy to skim.",
        },
      ],
    },
  };

  const guardrailsByArchetype: Record<AutomatorArchetype, CascadeStep> = {
    report: {
      id: "guardrails",
      question: "Any rule it must never break?",
      helper: "The one thing you would catch if it got it wrong. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "no-spin",
          label: "Never spin a bad month",
          description: "Be straight about misses - no dressing them up.",
          transcriptFragment:
            "A hard rule: never spin a bad month. Be straight about misses, do not dress them up.",
        },
        {
          id: "no-bullets",
          label: "Never bullet-point it",
          description: "The audience wants flowing paragraphs, not lists.",
          transcriptFragment:
            "A hard rule: never use bullet points. The audience wants flowing paragraphs, not lists.",
        },
        {
          id: "always-ask",
          label: "Always end on the ask",
          description: "Every update closes with one specific ask.",
          transcriptFragment:
            "A hard rule: always close with one specific ask, every single time.",
        },
      ],
    },
    proposal: {
      id: "guardrails",
      question: "Any rule it must never break?",
      helper: "The one thing you would catch if it got it wrong. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "no-date",
          label: "Never commit a date",
          description: "Talk timeline in ranges, never a hard delivery date.",
          transcriptFragment:
            "A hard rule: never commit to a date. Talk timeline in ranges, never a hard delivery date.",
        },
        {
          id: "no-price-first",
          label: "Never lead with price",
          description: "Price comes last, after the value is clear.",
          transcriptFragment:
            "A hard rule: never lead with price. Price comes last, after the value is clear.",
        },
        {
          id: "their-words",
          label: "Always use their words",
          description: "Mirror their language back, not your jargon.",
          transcriptFragment:
            "A hard rule: always mirror their own words back, never my internal jargon.",
        },
      ],
    },
    summary: {
      id: "guardrails",
      question: "Any rule it must never break?",
      helper: "The one thing you would catch if it got it wrong. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "no-invent",
          label: "Never invent a decision",
          description: "Only capture what was actually decided.",
          transcriptFragment:
            "A hard rule: never invent a decision. Only capture what was actually decided.",
        },
        {
          id: "name-owners",
          label: "Always name the owner",
          description: "Every action has a name attached to it.",
          transcriptFragment:
            "A hard rule: every action item names its owner, no orphan tasks.",
        },
        {
          id: "stay-short",
          label: "Never run long",
          description: "If it cannot be skimmed fast, it is too long.",
          transcriptFragment:
            "A hard rule: keep it skimmable. If it cannot be read fast, it is too long.",
        },
      ],
    },
    outreach: {
      id: "guardrails",
      question: "Any rule it must never break?",
      helper: "The one thing you would catch if it got it wrong. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "no-needy",
          label: "Never sound needy",
          description: "Confident and easy, never chasing or apologetic.",
          transcriptFragment:
            "A hard rule: never sound needy. Confident and easy, never chasing or apologetic.",
        },
        {
          id: "no-generic",
          label: "Never feel like a template",
          description: "Always one specific, personal detail.",
          transcriptFragment:
            "A hard rule: never feel like a template. Always include one specific, personal detail.",
        },
        {
          id: "one-ask",
          label: "Never more than one ask",
          description: "Exactly one next step, never a list.",
          transcriptFragment:
            "A hard rule: exactly one ask per message, never a list of next steps.",
        },
      ],
    },
    custom: {
      id: "guardrails",
      question: "Any rule it must never break?",
      helper: "The one thing you would catch if it got it wrong. Pick the closest.",
      kind: "options",
      options: [
        {
          id: "no-invent",
          label: "Never make things up",
          description: "Only use what I actually gave it.",
          transcriptFragment:
            "A hard rule: never make things up. Only use what I actually provided.",
        },
        {
          id: "my-voice",
          label: "Always sound like me",
          description: "My voice, not a generic AI tone.",
          transcriptFragment:
            "A hard rule: always sound like me, never a generic AI tone.",
        },
        {
          id: "stay-tight",
          label: "Never pad it out",
          description: "No filler - say it and stop.",
          transcriptFragment: "A hard rule: never pad it out. No filler, say it and stop.",
        },
      ],
    },
  };

  return [
    howByArchetype[a],
    inputsByArchetype[a],
    structureByArchetype[a],
    toneStep(a),
    guardrailsByArchetype[a],
  ];
}

/* ------------------------------------------------------------------ */
/* "Built your way" chips (the skill-ready card)                       */
/* ------------------------------------------------------------------ */

export interface BuiltYourWayChip {
  /** The dimension, e.g. "in", "voice", "shape", "rule". */
  key: string;
  /** The picked value, e.g. "a transcript", "warm and direct". */
  value: string;
}

const CHIP_KEY_BY_STEP: Record<CascadeStepId, string> = {
  how: "from",
  inputs: "in",
  structure: "shape",
  tone: "voice",
  guardrails: "rule",
};

/**
 * Distil the cascade picks into the short "Built your way" chips shown on the
 * skill-ready card. Uses the picked option's label (short) rather than its
 * transcript fragment (long). Order mirrors the mock: in, voice, shape, rule.
 */
export function builtYourWayChips(
  steps: CascadeStep[],
  picks: CascadePicks,
): BuiltYourWayChip[] {
  const order: CascadeStepId[] = ["inputs", "tone", "structure", "guardrails"];
  const chips: BuiltYourWayChip[] = [];
  for (const stepId of order) {
    const step = steps.find((s) => s.id === stepId);
    const pickedId = picks[stepId];
    if (!step || !pickedId) continue;
    const opt = step.options.find((o) => o.id === pickedId);
    if (!opt) continue;
    chips.push({ key: CHIP_KEY_BY_STEP[stepId], value: chipValue(stepId, opt) });
  }
  return chips;
}

function chipValue(stepId: CascadeStepId, opt: CascadeOption): string {
  // The tone chip reads better in lower case ("warm and direct"); structure
  // and guardrail chips use the short label as-is.
  if (stepId === "tone") return opt.label.toLowerCase();
  return opt.label.toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Transcript composer                                                 */
/* ------------------------------------------------------------------ */

/**
 * Turn the candidate + cascade picks into a well-formed transcript the
 * generate-skill-export edge function already knows how to parse.
 *
 * The edge prompt (supabase/functions/generate-skill-export/prompt.ts) runs
 * the Three Honest Tests on the transcript and extracts trigger phrases,
 * format rules, structure, and guardrails from the leader's "voice". So the
 * composed transcript is written in first person, present tense, and:
 *   - states the deliverable + that it RECURS (passes the REPEATABLE test)
 *   - states the trigger phrase the leader would say (seeds trigger phrases)
 *   - threads each pick's fragment (how / inputs / structure / voice / rule)
 *   - names a specialised constraint (passes the SPECIALISED test)
 * The result reads like a leader narrating their workflow, which is exactly
 * the input shape the prompt was tuned on - so the backend produces the skill
 * with no edge-function change.
 *
 * THIS IS NOT EVIDENCE, AND IT USED TO BE TREATED AS SOME.
 *
 * It was called composeTranscript and passed to generate-skill-export as the
 * `transcript`, which the backend splits into citable spans. So every surviving
 * [E#] pointer in a built skill resolved to a sentence in this file, written
 * once by hand and attributed to whoever tapped the matching chip. The chain
 * was real, offset-verified, and terminated in our own template library, which
 * is worse than no provenance because it looks sourced.
 *
 * It is a BRIEF now: it shapes what gets built and nothing more. The leader's
 * own words travel separately as `own_words`, and only those may be quoted.
 * Do not pass this to anything that stores or cites it.
 */
export function composeBuildBrief(
  candidate: DeliverableCandidate,
  steps: CascadeStep[],
  picks: CascadePicks,
): string {
  const lines: string[] = [];
  // Strip a leading "your"/"my" so the "my ${title}" template never doubles
  // the possessive ("my my follow-up message").
  const title = candidate.title.replace(/^(your|my)\s+/i, "").trim() || candidate.title;

  // Opening: what it is + that it recurs (REPEATABLE) + the trigger phrase.
  // Every real chip shape gets a full sentence; the old regex only handled
  // "repeats <adverb>" and emitted fragments like "several a week." for the
  // other four chips.
  lines.push(
    `I regularly produce my ${lowerFirst(title)}. ${frequencySentence(candidate.frequencyChip)}`,
  );
  lines.push(
    `I would kick this off by saying something like "draft my ${lowerFirst(
      title,
    )}" or "write the ${lowerFirst(title)}".`,
  );

  // Thread the picks in cascade order so the narration flows how -> in ->
  // shape -> voice -> rule, each contributing one sentence.
  for (const step of steps) {
    const pickedId = picks[step.id];
    if (!pickedId) continue;
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

/**
 * The leader's OWN material from this build, and nothing CTRL wrote.
 *
 * This is the only text a rule in the finished skill is allowed to quote, so
 * the rule for what belongs here is strict: it came from them. The seed is
 * mined from their own memory facts and decisions; a custom title is what they
 * typed. Chip fragments are ours and never appear, however well they read.
 *
 * Empty is a real and common answer, for a leader who picked from suggestions
 * and typed nothing. Returning "" rather than padding is the point: with no
 * words of theirs and no compiled criteria, there is nothing legitimate to
 * cite, and demoteUnpointedClaims rewrites the rules as NOT ESTABLISHED
 * instead of dressing our template prose up as their voice.
 */
export function composeOwnWords(
  candidate: DeliverableCandidate,
  customTitle?: string,
): string {
  const parts: string[] = [];
  const seed = (candidate.seedText ?? "").trim();
  if (seed) parts.push(seed);
  const typed = (customTitle ?? "").trim();
  if (typed) parts.push(typed);
  return parts.join("\n\n");
}

/**
 * Turn a frequency chip into a complete sentence for the composed transcript.
 * Known chip shapes across the codebase: "repeats", "repeats weekly",
 * "repeats monthly", "several a week", "daily", "most days".
 */
export function frequencySentence(chip: string): string {
  const c = (chip ?? "").trim().toLowerCase();
  if (!c || c === "repeats" || c === "recurring" || c === "your call") {
    return "It repeats regularly.";
  }
  if (c.startsWith("repeats ")) return `It repeats ${c.slice("repeats ".length)}.`;
  if (c === "several a week") return "It comes up several times a week.";
  return `It comes up ${c}.`;
}
