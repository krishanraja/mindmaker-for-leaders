/**
 * Intake flow engine for the Kit Engine.
 *
 * Walks a preset's intake questions and decides, per the question's optional
 * org-chart fields, whether this is the plain LINEAR flow (the three existing
 * presets) or the FORKED, adaptive, chart-building flow (the org-chart preset).
 *
 * Fork vs linear is decided purely by data: a preset is "forked" iff one of
 * its intake questions sets `pathwayFork`. Linear presets set none of the
 * org-chart fields, so every derivation below collapses to the old behaviour
 * (show every question in order, fixed options, no chart).
 *
 * The hook is pure-ish: it takes the preset + current answers and returns the
 * resolved step list, the active question, navigation state, and the live
 * OrgChartModel assembled from the chart-feeding answers. KitIntake owns the
 * answer state and renders from this.
 */

import { useMemo } from "react";
import type {
  IntakeAnswer,
  IntakeAnswers,
  IntakeOption,
  IntakeQuestion,
  KitPathway,
  KitPreset,
} from "@/content/kits";
// Single source of truth for the chart shape is Agent C's OrgChartView
// (the SHARED CONTRACT). We assemble exactly that type so the live preview
// and the final artifact render the same component with no field drift.
import type { OrgChart, OrgChartBox, OrgChartTag } from "@/components/kit/OrgChartView";

/* ------------------------------------------------------------------ */
/* Shared chart model (re-exported from OrgChartView's contract)       */
/* ------------------------------------------------------------------ */

export type ChartTag = OrgChartTag;
export type OrgChartModel = OrgChart;
export type { OrgChartBox };

/* ------------------------------------------------------------------ */
/* Answer helpers                                                       */
/* ------------------------------------------------------------------ */

const MIN_TEXT_LENGTH = 10;

/** Selected option ids of a question, in selection order. */
function selectedIds(answer: IntakeAnswer | undefined): string[] {
  return answer?.optionIds ?? (answer?.optionId ? [answer.optionId] : []);
}

/**
 * The FULL { id, label } of the options a question has selected, in selection
 * order. For a question with the pathway-resolved set passed in `resolved`, we
 * look up labels there; ids are carried through verbatim so downstream slots
 * (and the backend) see the same option identity the student picked.
 */
function selectedOptions(
  resolved: IntakeOption[],
  answer: IntakeAnswer | undefined,
): IntakeOption[] {
  const byId = new Map(resolved.map((o) => [o.id, o]));
  return selectedIds(answer).map((id) => byId.get(id) ?? { id, label: id });
}

/** Labels of the options a question has selected, in selection order. */
export function selectedLabels(question: IntakeQuestion, answer: IntakeAnswer | undefined): string[] {
  if (!answer || !question.options) {
    // Adaptive questions have no static options; the raw ids ARE the carried-
    // through identity. Best-effort label = id.
    return selectedIds(answer);
  }
  const byId = new Map(question.options.map((o) => [o.id, o.label]));
  return selectedIds(answer).map((id) => byId.get(id) ?? id);
}

export function isAnswered(question: IntakeQuestion, answer: IntakeAnswer | undefined): boolean {
  if (!answer) return false;
  if (question.type === "chips") return !!answer.optionId;
  if (question.type === "chips_multi") return (answer.optionIds?.length ?? 0) > 0;
  return (answer.text?.trim().length ?? 0) >= MIN_TEXT_LENGTH;
}

/** The pathway the student forked into, or null before the fork is answered. */
export function pathwayFromAnswers(
  preset: KitPreset | null | undefined,
  answers: IntakeAnswers,
): KitPathway | null {
  if (!preset) return null;
  const fork = preset.intake.find((q) => q.pathwayFork);
  if (!fork) return null;
  const pickedId = answers[fork.id]?.optionId;
  const opt = fork.options?.find((o) => o.id === pickedId);
  return opt?.pathway ?? null;
}

/* ------------------------------------------------------------------ */
/* Option resolution (static, adaptive-from-answer, matrix)            */
/* ------------------------------------------------------------------ */

/**
 * The base (non-adaptive) option set for a question, respecting any pathway
 * split. When a question declares `pathwayOptions`, the active pathway's set is
 * used (so the boxes step shows business functions for biz, hats for self, and
 * never the wrong-pathway options the backend would silently drop). Falls back
 * to `options` when there is no pathway split or no active pathway.
 */
function baseOptions(question: IntakeQuestion, pathway: KitPathway | null): IntakeOption[] {
  if (question.pathwayOptions && pathway && question.pathwayOptions[pathway]) {
    return question.pathwayOptions[pathway]!;
  }
  return question.options ?? [];
}

/**
 * The options a question actually shows right now, resolving any adaptive
 * source AND any pathway split. Returns [] for an adaptive question whose
 * source is not answered yet (the cascade gates it behind a showIf anyway).
 */
export function resolveOptions(
  preset: KitPreset,
  question: IntakeQuestion,
  pathway: KitPathway | null,
  answers: IntakeAnswers,
): IntakeOption[] {
  const adaptive = question.adaptiveOptions;
  if (!adaptive) return baseOptions(question, pathway);

  // (a) options drawn from another question's SELECTED options, identity
  //     preserved (id + label) so the chosen slug flows to the backend.
  if (adaptive.fromQuestionId) {
    const src = preset.intake.find((q) => q.id === adaptive.fromQuestionId);
    const srcAnswer = answers[adaptive.fromQuestionId];
    if (src) {
      const srcResolved = baseOptions(src, pathway);
      const chosen = selectedOptions(srcResolved, srcAnswer);
      if (chosen.length > 0) {
        return chosen.map((o) => ({ id: o.id, label: o.label }));
      }
    }
  }

  // (b) options drawn from a curated deterministic matrix on the preset, keyed
  //     by a prior answer's selected LABEL (matrices are keyed by label).
  if (adaptive.matrixKey && preset.optionMatrices) {
    const matrix = preset.optionMatrices[adaptive.matrixKey];
    if (matrix) {
      let key: string | undefined;
      if (adaptive.matrixFromQuestionId) {
        const src = preset.intake.find((q) => q.id === adaptive.matrixFromQuestionId);
        const srcAnswer = answers[adaptive.matrixFromQuestionId];
        // The matrix-from question may itself be adaptive (e.g. timeSink draws
        // from boxes). Resolve its options first so we read the chosen label.
        const srcResolved = src ? resolveOptions(preset, src, pathway, answers) : [];
        key = src ? selectedOptions(srcResolved, srcAnswer)[0]?.label : undefined;
      }
      if (key && matrix[key]) return matrix[key];
    }
  }

  return adaptive.fallback ?? baseOptions(question, pathway);
}

/* ------------------------------------------------------------------ */
/* Visibility (show-if) + step resolution                              */
/* ------------------------------------------------------------------ */

/** Whether a question is visible given the active pathway and prior answers. */
export function isVisible(
  question: IntakeQuestion,
  pathway: KitPathway | null,
  answers: IntakeAnswers,
): boolean {
  const cond = question.showIf;
  if (!cond) return true;
  if (cond.pathway && cond.pathway !== pathway) return false;
  if (cond.answeredQuestionId && !answers[cond.answeredQuestionId]) return false;
  return true;
}

/**
 * The ordered list of questions to actually walk, after the fork is chosen and
 * show-if conditions are applied. For a linear preset this is just the full
 * intake array (no question has a showIf, so nothing is filtered).
 *
 * The fork question itself is excluded: in fork-mode KitIntake renders the
 * fork as its own dedicated splash screen, then walks the steps returned here.
 * In linear-mode there is no fork question, so the full list flows through.
 */
export function resolveSteps(
  preset: KitPreset,
  pathway: KitPathway | null,
  answers: IntakeAnswers,
): IntakeQuestion[] {
  return preset.intake.filter((q) => {
    if (q.pathwayFork) return false;
    return isVisible(q, pathway, answers);
  });
}

/* ------------------------------------------------------------------ */
/* Pathway-aware copy                                                   */
/* ------------------------------------------------------------------ */

export function promptFor(question: IntakeQuestion, pathway: KitPathway | null): string {
  if (pathway && question.pathwayCopy?.[pathway]?.prompt) {
    return question.pathwayCopy[pathway]!.prompt!;
  }
  return question.prompt;
}

export function helperFor(question: IntakeQuestion, pathway: KitPathway | null): string | undefined {
  if (pathway && question.pathwayCopy?.[pathway]?.helper) {
    return question.pathwayCopy[pathway]!.helper!;
  }
  return question.helper;
}

/* ------------------------------------------------------------------ */
/* Live chart assembly (preview stub)                                  */
/* ------------------------------------------------------------------ */

/**
 * Find the (first) question feeding a given chart slot.
 */
function questionByFeed(preset: KitPreset, feed: "boxes" | "startBox" | "tags") {
  return preset.intake.find((q) => q.chartFeed === feed);
}

/**
 * The deterministic preview tag for a box, mirroring the mock's stub logic.
 *
 * HONESTY NOTE: this is an optimistic in-intake PREVIEW only. The real,
 * authored tags + roles on the final chart artifact come from the compose LLM
 * off the student's actual answers. The UI marks the preview "building" while
 * this stub runs and never presents it as the final, verified chart.
 */
function previewTag(label: string, isStart: boolean, guardrails: string[]): ChartTag {
  if (isStart) return "led";
  // Guardrails that imply a box stays human-in-the-loop (assisted) or fully
  // with the person. Coarse stub; compose authors the real call.
  const assistTriggers = ["Email real customers", "Post publicly", "Touch customer data", "Spend money"];
  if (guardrails.includes("Make the final call") && /product|strategy|the work/i.test(label)) {
    return "excluded";
  }
  if (assistTriggers.some((g) => guardrails.includes(g)) && /sales|market|support|finance|invoic|client/i.test(label)) {
    return "assisted";
  }
  return "led";
}

/**
 * Assemble the live OrgChartModel from the chart-feeding answers. `revealed`
 * flips tags/roles on (they are hidden while the student is still picking
 * boxes, matching the mock's reveal beat). When no boxes are chosen yet the
 * model carries an empty boxes array and OrgChartView shows its empty state.
 */
export function buildChartModel(
  preset: KitPreset,
  pathway: KitPathway | null,
  answers: IntakeAnswers,
  revealed: boolean,
): OrgChartModel | null {
  if (!pathway) return null;

  const boxesQ = questionByFeed(preset, "boxes");
  const startQ = questionByFeed(preset, "startBox");
  const tagsQ = questionByFeed(preset, "tags");
  if (!boxesQ) return null;

  // Leadership node label: the name field on the first visible question, or a
  // pathway-appropriate default.
  const nameQ = preset.intake.find((q) => q.nameField);
  const businessName = nameQ ? (answers[nameQ.id]?.text?.trim() ?? "") : "";
  const leadershipDefault = pathway === "self" ? "You" : "Leadership";
  const leadershipLabel = businessName || leadershipDefault;

  // Resolve the chosen boxes against the pathway-correct option set so the
  // preview reads the same labels the backend will (and never the wrong-
  // pathway options the backend would drop).
  const boxResolved = resolveOptions(preset, boxesQ, pathway, answers);
  const boxChosen = selectedOptions(boxResolved, answers[boxesQ.id]);
  const boxLabels = boxChosen.map((o) => o.label);

  // The start box's stored optionId is the slug of the chosen box (the time-
  // sink options are drawn from the boxes). Resolve it back to the box label.
  let startLabel: string | undefined;
  if (startQ) {
    const startResolved = resolveOptions(preset, startQ, pathway, answers);
    startLabel = selectedOptions(startResolved, answers[startQ.id])[0]?.label;
  }

  const guardrails = tagsQ ? selectedLabels(tagsQ, answers[tagsQ.id]) : [];

  const boxes: OrgChartBox[] = boxLabels.map((label) => {
    const isStart = !!startLabel && label === startLabel;
    const role = preset.agentRoles?.[label];
    const tag = revealed ? previewTag(label, isStart, guardrails) : null;
    return {
      id: label,
      label,
      isStart,
      tag,
      agentRole: revealed && tag !== "excluded" ? role?.agentRole : undefined,
      agentDesc: revealed && tag !== "excluded" ? role?.agentDesc : undefined,
      humanRole: undefined,
    };
  });

  return { businessName, pathway, leadershipLabel, boxes };
}

/* ------------------------------------------------------------------ */
/* Generic picks model (the 'picks' previewKind)                        */
/* ------------------------------------------------------------------ */

/** One picked item rendered as a card on the KitPicksBoard. */
export interface PicksItem {
  /** Stable id (option id, used as the React key). */
  id: string;
  /** The picked option's label. */
  label: string;
  /** The START item: the chosen startBox, flagged on the board. */
  isStart?: boolean;
  /** Optional one-line note under the card (unused by the cascade today). */
  note?: string;
}

/**
 * The model the generic KitPicksBoard renders. Analogous to OrgChartModel but
 * preview-kind agnostic: a leadership/title node + the picked chartFeed items.
 * The three retrofitted kits emit a `boxes` chartFeed question (the items) and,
 * optionally, a `startBox` chartFeed question (the flagged item) plus a
 * nameField on their first question (the title). This is a deterministic,
 * in-intake preview only: the honest final artifact is authored by that kit's
 * SHARED agent (the picks-board renderer) off the same structured answers.
 */
export interface PicksModel {
  /** The title node, from the nameField answer or a pathway-appropriate default. */
  title: string;
  /** A small framing label above the items (the boxes question's eyebrow). */
  framingLabel: string;
  /** The picked items, in selection order; the startBox flagged isStart. */
  items: PicksItem[];
}

/**
 * Assemble the generic PicksModel from the preset's chartFeed questions:
 * - boxes    -> items (the picked options, in selection order)
 * - startBox -> the item flagged isStart
 * - nameField (or pathway default) -> title
 *
 * Pathway-aware like buildChartModel: items are resolved against the
 * pathway-correct option set so the preview reads the same labels the backend
 * will. Returns an empty-items model before any boxes are picked (the board
 * shows its empty state). Used only when preset.previewKind === "picks".
 */
export function buildPicksModel(
  preset: KitPreset,
  pathway: KitPathway | null,
  answers: IntakeAnswers,
): PicksModel | null {
  const boxesQ = questionByFeed(preset, "boxes");
  const startQ = questionByFeed(preset, "startBox");
  if (!boxesQ) return null;

  // Title node: the name field's answer, else a pathway-appropriate default.
  const nameQ = preset.intake.find((q) => q.nameField);
  const name = nameQ ? (answers[nameQ.id]?.text?.trim() ?? "") : "";
  const titleDefault = pathway === "self" ? "You" : "Your kit";
  const title = name || titleDefault;

  // Framing label: prefer the boxes question's eyebrow, else a neutral line.
  const framingLabel = boxesQ.eyebrow ?? "Your picks";

  // Resolve the picked items against the pathway-correct option set.
  const boxResolved = resolveOptions(preset, boxesQ, pathway, answers);
  const chosen = selectedOptions(boxResolved, answers[boxesQ.id]);

  // The start item's stored optionId is the slug of the chosen item (the
  // startBox options are drawn from the boxes). Resolve it back to a label.
  let startLabel: string | undefined;
  if (startQ) {
    const startResolved = resolveOptions(preset, startQ, pathway, answers);
    startLabel = selectedOptions(startResolved, answers[startQ.id])[0]?.label;
  }

  const items: PicksItem[] = chosen.map((o) => ({
    id: o.id,
    label: o.label,
    isStart: !!startLabel && o.label === startLabel,
  }));

  return { title, framingLabel, items };
}

/* ------------------------------------------------------------------ */
/* The hook                                                             */
/* ------------------------------------------------------------------ */

export interface IntakeFlow {
  /** True when the preset declares a pathway fork (org-chart preset). */
  isForked: boolean;
  /** The fork question, when forked. */
  forkQuestion: IntakeQuestion | null;
  /** Active pathway, or null before the fork is answered (always null linear). */
  pathway: KitPathway | null;
  /** Ordered, show-if-filtered questions to walk (excludes the fork). */
  steps: IntakeQuestion[];
  /** Whether any question feeds the live chart (gates the preview pane). */
  hasChart: boolean;
}

export function useIntakeFlow(
  preset: KitPreset | null | undefined,
  answers: IntakeAnswers,
): IntakeFlow {
  return useMemo<IntakeFlow>(() => {
    if (!preset) {
      return { isForked: false, forkQuestion: null, pathway: null, steps: [], hasChart: false };
    }
    const forkQuestion = preset.intake.find((q) => q.pathwayFork) ?? null;
    const isForked = !!forkQuestion;
    const pathway = pathwayFromAnswers(preset, answers);
    const steps = resolveSteps(preset, pathway, answers);
    const hasChart = preset.intake.some((q) => !!q.chartFeed);
    return { isForked, forkQuestion, pathway, steps, hasChart };
  }, [preset, answers]);
}
