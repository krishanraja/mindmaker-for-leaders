import { describe, expect, it } from "vitest";
import {
  cascadeFor,
  composeBuildBrief,
  composeOwnWords,
  frequencySentence,
  toneToVoiceProfile,
  type DeliverableCandidate,
} from "@/components/automator/automatorModel";

function candidate(overrides: Partial<DeliverableCandidate> = {}): DeliverableCandidate {
  return {
    id: "c1",
    title: "Board update",
    reasonLead: "lead",
    reasonRest: "rest",
    effortChip: "recurring",
    frequencyChip: "repeats weekly",
    archetype: "report",
    mined: true,
    ...overrides,
  };
}

describe("frequencySentence", () => {
  it("covers every real chip shape with a complete sentence", () => {
    expect(frequencySentence("repeats weekly")).toBe("It repeats weekly.");
    expect(frequencySentence("repeats monthly")).toBe("It repeats monthly.");
    expect(frequencySentence("repeats")).toBe("It repeats regularly.");
    expect(frequencySentence("several a week")).toBe("It comes up several times a week.");
    expect(frequencySentence("daily")).toBe("It comes up daily.");
    expect(frequencySentence("most days")).toBe("It comes up most days.");
  });

  it("never emits a bare fragment", () => {
    for (const chip of ["repeats", "repeats weekly", "several a week", "daily", "most days", ""]) {
      const s = frequencySentence(chip);
      expect(s[0]).toMatch(/[A-Z]/);
      expect(s.endsWith(".")).toBe(true);
    }
  });
});

describe("composeBuildBrief", () => {
  it("threads the frequency chip as a sentence, not a fragment", () => {
    const t = composeBuildBrief(candidate({ frequencyChip: "several a week" }), [], {});
    expect(t).toContain("It comes up several times a week.");
    expect(t).not.toMatch(/\.\s*several a week\./i);
  });

  it("never doubles the possessive on titles that already start with my", () => {
    const t = composeBuildBrief(candidate({ title: "My follow-up message" }), [], {});
    expect(t).not.toMatch(/my my/i);
    expect(t).toContain("my follow-up message");
  });
});

/**
 * The brief is OUR prose and the own words are THEIRS, and the whole reason
 * these are two functions is that mixing them is what made every [E#] pointer
 * in a built skill resolve to a sentence in automatorModel.ts.
 */
describe("composeOwnWords", () => {
  it("carries the seed, which came from their own memory", () => {
    const own = composeOwnWords(candidate({ seedText: "I keep redoing the same investor recap" }));
    expect(own).toBe("I keep redoing the same investor recap");
  });

  it("is empty when they tapped through and typed nothing", () => {
    // Empty is correct. With no words of theirs and no compiled criteria there
    // is nothing legitimate to cite, and the demotion pass handles it.
    expect(composeOwnWords(candidate())).toBe("");
  });

  it("never contains a single word CTRL wrote for them", () => {
    const c = candidate({ seedText: "the weekly board note eats my Monday" });
    const steps = cascadeFor(c);
    const picks = Object.fromEntries(steps.map((s) => [s.id, s.options[0].id]));
    const brief = composeBuildBrief(c, steps, picks);
    const own = composeOwnWords(c);

    // Every chip fragment is in the brief and none is in the own words.
    for (const step of steps) {
      const fragment = step.options[0].transcriptFragment;
      expect(brief).toContain(fragment);
      expect(own).not.toContain(fragment);
    }
    expect(own).toBe("the weekly board note eats my Monday");
  });
});

describe("toneToVoiceProfile", () => {
  it("presets never carry a sample, so a real captured sample marks ground truth", () => {
    // AutomatorFlow's handleAdoptTone refuses to overwrite any profile that
    // has a sampleVoice. That guard only works while presets never set one.
    for (const tone of ["warm", "crisp", "formal"]) {
      expect(toneToVoiceProfile(tone, "context").sampleVoice).toBeUndefined();
    }
  });
});
