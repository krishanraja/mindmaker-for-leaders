import { describe, it, expect } from "vitest";
import {
  scoreChief,
  AUTONOMY_WARNING,
  PILLARS_LINE,
  type ChiefInputs,
} from "./scoring.ts";
import type { IntakeAnswers } from "../types.ts";

/**
 * The decision engine is the product of this kit, so it gets pinned. These
 * assertions lock two contracts:
 *
 *  1. The five persona shortcuts the field guide spells out (Section 10.4) each
 *     resolve to the rung the guide names. This is the behavioural spec.
 *  2. The guardrails (Section 10.3), the auditable safety floor: a non-maintainer
 *     is never sent above no-code; an early builder is never sent to code/self-host;
 *     a must-stay-local user is never sent to a bought product; an unsupervised-
 *     autonomy answer always carries the earn-it warning; and the pillars line is
 *     always returned, whatever the rung.
 */

/** Build an intake answer set from the eight typed inputs (chip optionIds). */
function intakeOf(i: Partial<ChiefInputs>): IntakeAnswers {
  const out: IntakeAnswers = {};
  for (const [k, v] of Object.entries(i)) out[k] = { optionId: v as string };
  return out;
}

describe("chief-of-staff decision engine: persona shortcuts (10.4)", () => {
  it("results today, no code, not technical -> Native (2)", () => {
    const r = scoreChief(
      intakeOf({
        tech: "none",
        time: "one_evening",
        budget: "under_25",
        privacy: "medium",
        job: "inbox_calendar",
        autonomy: "draft_for_approval",
        now: "just_chat",
        maintain: "maybe",
      }),
    );
    expect(r.recommended.rung).toBe(2);
  });

  it("on a schedule in my messaging app, an afternoon to spend -> No-code (4)", () => {
    const r = scoreChief(
      intakeOf({
        tech: "comfortable_nocode",
        time: "a_weekend",
        budget: "25_50",
        privacy: "medium",
        job: "scheduled_briefs",
        autonomy: "act_on_low_stakes",
        now: "tried_tools",
        maintain: "yes",
      }),
    );
    expect(r.recommended.rung).toBe(4);
  });

  it("inbox/calendar relief, willing to pay, will not build it -> Buy a product (3)", () => {
    const r = scoreChief(
      intakeOf({
        tech: "none",
        time: "minutes",
        budget: "50_150",
        privacy: "low",
        job: "inbox_calendar",
        autonomy: "draft_for_approval",
        now: "some_native",
        maintain: "no",
      }),
    );
    expect(r.recommended.rung).toBe(3);
  });

  it("technical, privacy paramount, hates metered bills -> self-host or own hardware (6 or 7)", () => {
    const r = scoreChief(
      intakeOf({
        tech: "engineer",
        time: "weeks",
        budget: "prefer_own_hardware",
        privacy: "must_be_local",
        job: "everything_private",
        autonomy: "act_on_low_stakes",
        now: "self_hosting",
        maintain: "yes",
      }),
    );
    expect([6, 7]).toContain(r.recommended.rung);
  });

  it("just a better thinking partner for one-offs -> Just chat (1)", () => {
    const r = scoreChief(
      intakeOf({
        tech: "none",
        time: "minutes",
        budget: "under_25",
        privacy: "low",
        job: "think_draft",
        autonomy: "only_respond",
        now: "just_chat",
        maintain: "no",
      }),
    );
    expect(r.recommended.rung).toBe(1);
  });
});

describe("chief-of-staff decision engine: guardrails (10.3)", () => {
  it("a non-maintainer is never recommended above no-code (rung 4)", () => {
    const r = scoreChief(
      intakeOf({
        tech: "engineer",
        time: "weeks",
        budget: "150_plus",
        privacy: "high",
        job: "everything_private",
        autonomy: "act_on_low_stakes",
        now: "self_hosting",
        maintain: "no",
      }),
    );
    expect(r.recommended.rung).toBeLessThanOrEqual(4);
    expect(r.ranked.some((x) => x.rung >= 5)).toBe(false);
    expect(r.guardrailsApplied.join(" ")).toMatch(/upkeep|maintain/i);
  });

  it("an early builder (none/light tech) is never sent to rungs 5-7", () => {
    const r = scoreChief(
      intakeOf({
        tech: "light",
        time: "weeks",
        budget: "150_plus",
        privacy: "high",
        job: "take_action",
        autonomy: "run_unsupervised",
        now: "built_a_flow",
        maintain: "yes",
      }),
    );
    expect(r.ranked.every((x) => x.rung <= 4)).toBe(true);
    expect(r.recommended.rung).toBeLessThanOrEqual(4);
  });

  it("a must-stay-local user is never recommended a bought product (rung 3)", () => {
    const r = scoreChief(
      intakeOf({
        tech: "engineer",
        time: "weeks",
        budget: "50_150",
        privacy: "must_be_local",
        job: "everything_private",
        autonomy: "draft_for_approval",
        now: "self_hosting",
        maintain: "yes",
      }),
    );
    expect(r.recommended.rung).not.toBe(3);
    expect(r.ranked.some((x) => x.rung === 3)).toBe(false);
  });

  it("an unsupervised-autonomy answer always carries the earn-it warning", () => {
    const r = scoreChief(
      intakeOf({
        tech: "engineer",
        time: "weeks",
        budget: "150_plus",
        privacy: "high",
        job: "take_action",
        autonomy: "run_unsupervised",
        now: "self_hosting",
        maintain: "yes",
      }),
    );
    expect(r.warnings).toContain(AUTONOMY_WARNING);
  });

  it("always returns the pillars line, whatever the rung", () => {
    const r = scoreChief(intakeOf({ job: "think_draft" }));
    expect(r.warnings).toContain(PILLARS_LINE);
  });
});

describe("chief-of-staff decision engine: invariants", () => {
  it("an empty intake defaults to the safe rung: Native (2)", () => {
    const r = scoreChief({});
    expect(r.recommended.rung).toBe(2);
    // All eight inputs are filled with their defaults.
    expect(Object.keys(r.inputs)).toHaveLength(8);
  });

  it("ties are broken toward the lower rung (start simple)", () => {
    // Across a spread of personas, the recommended rung is always the LOWEST
    // among the rungs sharing the top eligible score.
    const personas: Partial<ChiefInputs>[] = [
      {},
      { job: "scheduled_briefs", tech: "comfortable_nocode", time: "a_weekend", maintain: "yes" },
      { tech: "engineer", privacy: "must_be_local", maintain: "yes", time: "weeks", job: "everything_private" },
      { job: "inbox_calendar", tech: "none", budget: "50_150", time: "minutes", maintain: "no" },
    ];
    for (const p of personas) {
      const r = scoreChief(intakeOf(p));
      const top = r.ranked[0].score;
      const lowestAtTop = Math.min(...r.ranked.filter((x) => x.score === top).map((x) => x.rung));
      expect(r.recommended.rung).toBe(lowestAtTop);
    }
  });
});
