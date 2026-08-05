import { describe, expect, it } from "vitest";
import {
  buildProposal,
  DriftCarriesDeltaError,
  groupBySignal,
  isoWeekOf,
  MIN_STRIKES,
  orderProposals,
  sizeDelta,
  STRIKE_WINDOW_WEEKS,
  twoStrikes,
  typeAUncovered,
  typeBFalsePositive,
  typeCDrift,
  weeklyPass,
  weekIndex,
  windowWeeks,
  type Candidate,
  type CriterionRow,
  type LedgerRow,
} from "./capture-core.ts";

/**
 * The behaviour these tests pin is the difference between a standard that
 * sharpens and one that accumulates noise until nobody reads it. Every one of
 * them is a rule from skills/ctrl-capture, not an implementation detail.
 */

const NOW = "2026-W32";
const WINDOW = windowWeeks(NOW); // 2026-W28 .. 2026-W32

/**
 * One check that happened in the window, on an unrelated criterion. Drift only
 * speaks when the gate has run, so a drift fixture needs standing to exist.
 */
function aCheckHappened() {
  return row({ week: NOW, criterion_id: "unrelated", criterion_name: "Unrelated rule" });
}

function row(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    user_id: "u1",
    week: NOW,
    surface: "email",
    signal: "output",
    criterion_id: null,
    criterion_name: "Earned claim",
    verdict: "breaks",
    quote: "delighted to explore synergies",
    disposition: "rejected",
    ...overrides,
  };
}

describe("the window", () => {
  it("is five ISO weeks ending at now, oldest first", () => {
    expect(WINDOW).toEqual(["2026-W28", "2026-W29", "2026-W30", "2026-W31", "2026-W32"]);
    expect(WINDOW).toHaveLength(STRIKE_WINDOW_WEEKS);
  });

  it("crosses a year boundary by week arithmetic, not by calendar guessing", () => {
    expect(windowWeeks("2027-W02")).toEqual([
      "2026-W51",
      "2026-W52",
      "2026-W53",
      "2027-W01",
      "2027-W02",
    ]);
  });

  it("reads an unreadable week as absent rather than assigning it a week", () => {
    expect(weekIndex("not-a-week")).toBeNull();
    expect(windowWeeks("not-a-week")).toEqual([]);
  });

  it("agrees with the writer's own week format", () => {
    // useReview stamps rows with this exact shape; a mismatch here would mean
    // the pass silently reads zero rows forever.
    expect(isoWeekOf(new Date("2026-08-05T00:00:00Z"))).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("two strikes", () => {
  it("proposes nothing from a single occurrence", () => {
    const rows = [row({ week: "2026-W31" })];
    expect(twoStrikes(rows, WINDOW)).toEqual([]);
    expect(typeBFalsePositive(rows, WINDOW)).toEqual([]);
  });

  it("proposes from two of the same thing inside five weeks", () => {
    const rows = [row({ week: "2026-W28" }), row({ week: "2026-W32" })];
    const struck = twoStrikes(rows, WINDOW);
    expect(struck).toHaveLength(1);
    expect(struck[0].occurrences).toBe(MIN_STRIKES);
    expect(struck[0].weeks).toEqual(["2026-W28", "2026-W32"]);
  });

  it("proposes nothing from two across six weeks, because one is outside the window", () => {
    const rows = [row({ week: "2026-W27" }), row({ week: "2026-W32" })];
    expect(WINDOW).not.toContain("2026-W27");
    expect(twoStrikes(rows, WINDOW)).toEqual([]);
    expect(typeBFalsePositive(rows, WINDOW)).toEqual([]);
  });

  it("counts two in one week as a pattern, and reports the single week honestly", () => {
    const struck = twoStrikes([row(), row({ quote: "excited about the opportunity to" })], WINDOW);
    expect(struck[0].occurrences).toBe(2);
    expect(struck[0].weeks).toEqual([NOW]);
  });
});

describe("the three signal classes", () => {
  it("splits output, method and trigger rows", () => {
    const groups = groupBySignal([
      row(),
      row({ signal: "method", class: "omission", verdict: "uncovered", criterion_name: "method" }),
      row({ signal: "trigger", verdict: "undertrigger", criterion_name: "ctrl-check" }),
    ]);
    expect(groups.output).toHaveLength(1);
    expect(groups.method).toHaveLength(1);
    expect(groups.trigger).toHaveLength(1);
  });
});

describe("type A, uncovered", () => {
  const uncovered = (week: string, quote: string) =>
    row({
      week,
      surface: "proposal",
      criterion_name: "uncovered",
      verdict: "uncovered",
      quote,
      disposition: "unknown",
    });

  it("groups rewordings of the same note and proposes once", () => {
    const candidates = typeAUncovered(
      [
        uncovered("2026-W30", "second half repeats the first half"),
        uncovered("2026-W31", "the second half repeats the first"),
      ],
      WINDOW,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].type).toBe("uncovered");
    expect(candidates[0].occurrences).toBe(2);
    expect(candidates[0].topic).toBe("second half repeats the first half");
  });

  it("leaves two unrelated notes alone, because one occurrence each is not a pattern", () => {
    const candidates = typeAUncovered(
      [
        uncovered("2026-W30", "second half repeats the first"),
        uncovered("2026-W31", "no named owner anywhere in the document"),
      ],
      WINDOW,
    );
    expect(candidates).toEqual([]);
  });
});

describe("type B, false positive", () => {
  it("promotes two rejections on one criterion automatically", () => {
    const candidates = typeBFalsePositive(
      [
        row({ week: "2026-W31", criterion_id: "c1" }),
        row({ week: "2026-W32", criterion_id: "c1", quote: "excited about the opportunity to" }),
      ],
      WINDOW,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].type).toBe("false_positive");
    expect(candidates[0].criterionName).toBe("Earned claim");
    expect(candidates[0].occurrences).toBe(2);
  });

  it("ignores a break the person agreed with, which is the gate working", () => {
    const candidates = typeBFalsePositive(
      [
        row({ week: "2026-W31", criterion_id: "c1", disposition: "accepted" }),
        row({ week: "2026-W32", criterion_id: "c1", disposition: "accepted" }),
      ],
      WINDOW,
    );
    expect(candidates).toEqual([]);
  });

  it("names the one surface the pushbacks landed on, so the delta can be a scope change", () => {
    const [candidate] = typeBFalsePositive(
      [
        row({ week: "2026-W31", criterion_id: "c1", surface: "email" }),
        row({ week: "2026-W32", criterion_id: "c1", surface: "email" }),
      ],
      WINDOW,
    );
    expect(candidate.surfaces).toEqual(["email"]);
    expect(buildProposal(candidate, 4).delta_text).toContain("does not apply to email");
  });
});

describe("type C, drift", () => {
  const criteria: CriterionRow[] = [
    { id: "c1", user_id: "u1", surface: "email", name: "Earned claim" },
    { id: "c2", user_id: "u1", surface: "email", name: "Named owner" },
  ];

  it("raises only the criterion that has not fired, on zero occurrences", () => {
    const drifted = typeCDrift(criteria, [row({ criterion_id: "c1" })], NOW);
    expect(drifted).toHaveLength(1);
    expect(drifted[0].criterionName).toBe("Named owner");
    expect(drifted[0].occurrences).toBe(0);
  });

  it("carries no delta, and its type cannot produce one", () => {
    const [drifted] = typeCDrift(criteria, [row({ criterion_id: "c1" })], NOW);
    // The candidate itself holds no delta of any spelling.
    expect("delta" in drifted).toBe(false);
    expect("delta_text" in drifted).toBe(false);
    expect("deltaText" in drifted).toBe(false);
    // The type-level half of "drift asks a question, it does not propose an
    // answer": a drift candidate carrying a delta does not compile. Built as a
    // copy so the candidate under test is not mutated by its own proof.
    // @ts-expect-error delta_text is never on a drift candidate.
    const withDelta: typeof drifted = { ...drifted, delta_text: "retire it" };
    expect(withDelta.criterionName).toBe("Named owner");

    const proposal = buildProposal(drifted, 5);
    expect(proposal.delta_text).toBeNull();
    expect(proposal.evidence).toHaveProperty("question");
  });

  it("refuses to build a proposal from a drift row that arrived carrying a delta", () => {
    const [drifted] = typeCDrift(criteria, [aCheckHappened()], NOW);
    const smuggled = { ...drifted, delta_text: "retire it" } as unknown as Candidate;
    expect(() => buildProposal(smuggled, 5)).toThrow(DriftCarriesDeltaError);
  });

  it("reports the last week it was seen, from outside the window", () => {
    const drifted = typeCDrift(
      criteria,
      [row({ week: "2026-W20", criterion_id: "c2", criterion_name: "Named owner" }), aCheckHappened()],
      NOW,
    );
    const named = drifted.find((c) => c.criterionName === "Named owner");
    expect(named?.lastFiredWeek).toBe("2026-W20");
    // The one that never appeared at all says so, rather than guessing a date.
    expect(drifted.find((c) => c.criterionName === "Earned claim")?.lastFiredWeek).toBeNull();
  });
});

describe("ordering", () => {
  it("is A, then B, then C, and most-struck first inside each", () => {
    const candidates = [
      ...typeCDrift([{ id: "c9", user_id: "u1", surface: "email", name: "Quiet rule" }], [aCheckHappened()], NOW),
      ...typeBFalsePositive(
        [row({ week: "2026-W31", criterion_id: "c1" }), row({ week: "2026-W32", criterion_id: "c1" })],
        WINDOW,
      ),
      ...typeAUncovered(
        [
          row({
            week: "2026-W30",
            criterion_name: "uncovered",
            verdict: "uncovered",
            quote: "second half repeats the first half",
            disposition: "unknown",
          }),
          row({
            week: "2026-W31",
            criterion_name: "uncovered",
            verdict: "uncovered",
            quote: "second half repeats the first half again",
            disposition: "unknown",
          }),
        ],
        WINDOW,
      ),
    ];
    expect(orderProposals(candidates).map((c) => c.type)).toEqual([
      "uncovered",
      "false_positive",
      "drift",
    ]);
  });

  it("puts the most-struck first within a type", () => {
    const three = typeBFalsePositive(
      [
        row({ week: "2026-W30", criterion_id: "c1" }),
        row({ week: "2026-W31", criterion_id: "c1" }),
        row({ week: "2026-W32", criterion_id: "c1" }),
        row({ week: "2026-W31", criterion_id: "c2", criterion_name: "Named owner" }),
        row({ week: "2026-W32", criterion_id: "c2", criterion_name: "Named owner" }),
      ],
      WINDOW,
    );
    expect(orderProposals(three).map((c) => c.occurrences)).toEqual([3, 2]);
  });
});

describe("the size obligation", () => {
  it("always names a paired obligation, for every type and every count", () => {
    for (const type of ["uncovered", "false_positive", "drift"] as const) {
      for (const count of [0, 1, 6, 7, 12]) {
        const size = sizeDelta({ type }, count);
        expect(size.pairedObligation.trim().length).toBeGreaterThan(0);
        expect(Number.isFinite(size.delta)).toBe(true);
      }
    }
  });

  it("asks for a split rather than an eighth rule", () => {
    expect(sizeDelta({ type: "uncovered" }, 7).pairedObligation).toContain("splitting");
    expect(sizeDelta({ type: "uncovered" }, 3).pairedObligation).not.toContain("splitting");
  });

  it("adds nothing for a false positive: the old wording comes out in the same edit", () => {
    expect(sizeDelta({ type: "false_positive" }, 5).delta).toBe(0);
  });
});

describe("the proposal row", () => {
  const everyType = (): Candidate[] => [
    ...typeAUncovered(
      [
        row({
          week: "2026-W30",
          criterion_name: "uncovered",
          verdict: "uncovered",
          quote: "second half repeats the first half",
          disposition: "unknown",
        }),
        row({
          week: "2026-W31",
          criterion_name: "uncovered",
          verdict: "uncovered",
          quote: "the second half repeats the first half",
          disposition: "unknown",
        }),
      ],
      WINDOW,
    ),
    ...typeBFalsePositive(
      [row({ week: "2026-W31", criterion_id: "c1" }), row({ week: "2026-W32", criterion_id: "c1" })],
      WINDOW,
    ),
    ...typeCDrift([{ id: "c2", user_id: "u1", surface: "email", name: "Named owner" }], [aCheckHappened()], NOW),
  ];

  it("always carries a non-empty if_wrong", () => {
    for (const candidate of everyType()) {
      const proposal = buildProposal(candidate, 4);
      expect(typeof proposal.if_wrong).toBe("string");
      expect(proposal.if_wrong.trim().length).toBeGreaterThan(0);
    }
  });

  it("states the size obligation on every proposal", () => {
    for (const candidate of everyType()) {
      const evidence = buildProposal(candidate, 4).evidence as {
        size?: { paired_obligation?: string };
      };
      expect(evidence.size?.paired_obligation).toBeTruthy();
    }
  });

  it("writes the delta out in full for A and B, and never for C", () => {
    const [a, b, c] = everyType();
    expect(buildProposal(a, 4).delta_text).toContain("Add one rule");
    expect(buildProposal(b, 4).delta_text).toContain("Earned claim");
    expect(buildProposal(c, 4).delta_text).toBeNull();
  });

  it("routes to the person, and carries the dedupe key it was found under", () => {
    const proposal = buildProposal(everyType()[0], 4);
    expect(proposal.user_id).toBe("u1");
    expect(proposal.status).toBe("awaiting");
    expect((proposal.evidence as { key?: string }).key).toBeTruthy();
  });
});

describe("the weekly pass end to end", () => {
  const criteria: CriterionRow[] = [
    { id: "c1", user_id: "u1", surface: "email", name: "Earned claim" },
    { id: "c2", user_id: "u1", surface: "email", name: "Named owner" },
  ];

  it("finds nothing from a quiet week, and says how much it read", () => {
    const result = weeklyPass({
      rows: [row({ criterion_id: "c1", disposition: "accepted", verdict: "holds" })],
      criteria: [criteria[0]],
      nowWeek: NOW,
    });
    expect(result.candidates).toEqual([]);
    expect(result.rowsRead).toBe(1);
  });

  it("does not re-propose something already awaiting or rejected", () => {
    const rows = [
      row({ week: "2026-W31", criterion_id: "c1" }),
      row({ week: "2026-W32", criterion_id: "c1" }),
    ];
    const first = weeklyPass({ rows, criteria: [criteria[0]], nowWeek: NOW });
    expect(first.candidates).toHaveLength(1);

    const second = weeklyPass({
      rows,
      criteria: [criteria[0]],
      nowWeek: NOW,
      alreadyProposed: new Set(first.candidates.map((c) => c.key)),
    });
    expect(second.candidates).toEqual([]);
  });

  it("counts method and trigger strikes without turning them into proposals", () => {
    const result = weeklyPass({
      rows: [
        row({
          week: "2026-W31",
          signal: "method",
          class: "omission",
          verdict: "uncovered",
          criterion_name: "method",
          surface: "spec",
        }),
        row({
          week: "2026-W32",
          signal: "method",
          class: "omission",
          verdict: "uncovered",
          criterion_name: "method",
          surface: "spec",
        }),
      ],
      criteria: [],
      nowWeek: NOW,
    });
    expect(result.methodStrikes).toHaveLength(1);
    expect(result.candidates).toEqual([]);
  });
});

describe("drift needs the gate to have run", () => {
  const crit = [{ id: "c1", surface: "client updates", name: "Named owner", is_current: true }];

  it("asks nothing when no check ran in the window", () => {
    // Silence only means something relative to checks that happened. With no
    // reviews at all, every criterion looks stale, and reporting that as
    // drift tells the person their rules went off when the truth is they
    // have not used the gate.
    expect(typeCDrift(crit, [], "2026-W32")).toEqual([]);
  });

  it("asks once a check has run and this rule still did not fire", () => {
    const rows = [{
      week: "2026-W31", surface: "client updates", signal: "output",
      criterion_id: "other", criterion_name: "Something else",
      verdict: "holds", disposition: "accepted",
    }];
    const drift = typeCDrift(crit, rows, "2026-W32");
    expect(drift).toHaveLength(1);
    expect(drift[0].key).toContain("c1");
  });

  it("stays silent for a rule that did fire", () => {
    const rows = [{
      week: "2026-W31", surface: "client updates", signal: "output",
      criterion_id: "c1", criterion_name: "Named owner",
      verdict: "breaks", disposition: "accepted",
    }];
    expect(typeCDrift(crit, rows, "2026-W32")).toEqual([]);
  });
});
