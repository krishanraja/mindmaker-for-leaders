import { describe, expect, it } from "vitest";
import {
  composeTranscript,
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

describe("composeTranscript", () => {
  it("threads the frequency chip as a sentence, not a fragment", () => {
    const t = composeTranscript(candidate({ frequencyChip: "several a week" }), [], {});
    expect(t).toContain("It comes up several times a week.");
    expect(t).not.toMatch(/\.\s*several a week\./i);
  });

  it("never doubles the possessive on titles that already start with my", () => {
    const t = composeTranscript(candidate({ title: "My follow-up message" }), [], {});
    expect(t).not.toMatch(/my my/i);
    expect(t).toContain("my follow-up message");
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
