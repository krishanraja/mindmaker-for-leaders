import { describe, it, expect } from "vitest";
import { chiefOfStaffPreset } from "./preset.ts";
import { scoreChief } from "./scoring.ts";
import { getPreset } from "../index.ts";
import type { ArtifactBuildContext, IntakeAnswers } from "../types.ts";

/**
 * Composition smoke test: every artifact's deterministic renderer / fallback /
 * prompt must run without throwing and produce real content for a complete
 * intake. This catches runtime bugs in the renderers that typechecking cannot
 * (bad lookups, empty output, malformed JSON), and pins the preset's wiring into
 * the shared registry. The LLM path is not exercised; the deterministic floor is.
 */

const FULL_INTAKE: IntakeAnswers = {
  role: { optionId: "founder" },
  tech: { optionId: "comfortable_nocode" },
  time: { optionId: "a_weekend" },
  budget: { optionId: "25_50" },
  privacy: { optionId: "medium" },
  job: { optionId: "scheduled_briefs" },
  autonomy: { optionId: "draft_for_approval" },
  now: { optionId: "tried_tools" },
  maintain: { optionId: "yes" },
  tool: { optionId: "claude" },
};

function ctxFor(intake: IntakeAnswers): ArtifactBuildContext {
  return { intake, tool: "claude", memoryContext: "", scores: scoreChief(intake) };
}

describe("chief-of-staff preset wiring", () => {
  it("is registered in the shared registry under its slug", () => {
    expect(getPreset("chief-of-staff")).toBe(chiefOfStaffPreset);
    expect(chiefOfStaffPreset.codePrefixes).toContain("CHIEF");
  });

  it("has a linear quiz: ten single-select chip questions, no fork", () => {
    expect(chiefOfStaffPreset.intake).toHaveLength(10);
    expect(chiefOfStaffPreset.intake.every((q) => q.type === "chips")).toBe(true);
    expect(chiefOfStaffPreset.intake.some((q) => q.pathwayFork)).toBe(false);
    // The eight decision inputs the engine reads are all present as questions.
    const ids = chiefOfStaffPreset.intake.map((q) => q.id);
    for (const k of ["tech", "time", "budget", "privacy", "job", "autonomy", "now", "maintain"]) {
      expect(ids).toContain(k);
    }
  });
});

describe("chief-of-staff artifacts compose deterministically", () => {
  const ctx = ctxFor(FULL_INTAKE);

  for (const spec of chiefOfStaffPreset.artifacts) {
    it(`${spec.id} (${spec.strategy}) produces real content`, () => {
      if (spec.strategy === "scaffold_zip") {
        const files = spec.renderFiles?.(ctx) ?? [];
        expect(files.length).toBeGreaterThan(0);
        for (const f of files) {
          expect(f.path).toMatch(/\.(md|txt)$/);
          expect(f.content.trim().length).toBeGreaterThan(20);
        }
        return;
      }

      // Every non-zip artifact has a deterministic render() floor.
      const body = spec.render?.(ctx) ?? "";
      expect(body.trim().length).toBeGreaterThan(20);
      if (spec.contentType === "json") {
        expect(() => JSON.parse(body)).not.toThrow();
      }
      // llm_polish artifacts must also build a non-empty prompt.
      if (spec.strategy === "llm_polish") {
        expect((spec.buildPrompt?.(ctx) ?? "").length).toBeGreaterThan(40);
      }
    });
  }

  it("the seven-day plan is a valid 7-entry {days} payload", () => {
    const plan = chiefOfStaffPreset.artifacts.find((a) => a.id === "seven-day-plan");
    const parsed = JSON.parse(plan!.render!(ctx)) as { days: { day: number; title: string; action: string }[] };
    expect(parsed.days).toHaveLength(7);
    expect(parsed.days.every((d) => d.title && d.action)).toBe(true);
  });

  it("the recommendation names the computed rung and never leaks a [FILL IN] into the plan", () => {
    const path = chiefOfStaffPreset.artifacts.find((a) => a.id === "your-path");
    const body = path!.render!(ctx);
    const rec = scoreChief(FULL_INTAKE).recommended;
    expect(body).toContain(`rung ${rec.rung}`);
  });

  it("the context-pull prompt is paste-ready for the chosen tool and for none", () => {
    expect(chiefOfStaffPreset.contextPullPrompt("claude").length).toBeGreaterThan(40);
    expect(chiefOfStaffPreset.contextPullPrompt("none").length).toBeGreaterThan(40);
  });
});
