/**
 * ZIP assembly for skill packages.
 *
 * Uses JSZip via esm.sh - same pattern as other esm.sh imports across the
 * edge function codebase. Output structure is spec 4.4, the router plus leaves:
 *
 *   <skill-name>.zip
 *     <skill-name>/
 *       SKILL.md              router only, hard cap 80 lines
 *       rubric/
 *         core.md             always-on criteria
 *         <surface>.md        the procedure and the per-surface criteria
 *         general.md          the explicit fallback leaf
 *       exemplars/
 *         INDEX.md            contents
 *         <n>.md              their own graded work, verbatim
 *       references/
 *         company-context.md
 *         voice-profile.md    only when a real profile exists
 *       evals/
 *         holdout.jsonl       the graded items held back from the build
 *       01-test-prompts.txt
 *       02-maintenance-card.txt
 *       03-install-guide.txt
 *
 * The layout is built by buildSkillPackage in _shared/skill-package.ts, which is
 * pure and unit tested. This file only writes those bytes into a ZIP, so the
 * package shape can be reasoned about without a JSZip round trip.
 *
 * Critical detail unchanged from the flat layout: the ZIP must contain a SINGLE
 * root folder named exactly the same as the YAML `name` field. Files at the ZIP
 * root, or a different folder name, fail validation by Claude.ai's uploader.
 */

import JSZip from "https://esm.sh/jszip@3.10.1";

import { buildTestPromptsFile, buildMaintenanceCard, buildInstallGuide } from "./templates.ts";
import {
  buildSkillPackage,
  type BuildPackageInput,
  type PackageCriterion,
  type PackageExemplar,
  type PackageHoldoutItem,
  type PackageStatus,
  type SkillPackage,
} from "../_shared/skill-package.ts";

export interface BuildSkillZipInput {
  name: string;
  description: string;
  body: string;
  references: Array<{ filename: string; content: string }>;
  testPrompts: string[];
  archetype?: string;
  client?: string;
  /** What this standard covers. Names the surface leaf; defaults off the name. */
  surface?: string | null;
  /** Compiled criteria, already carrying their short ids. */
  criteria?: PackageCriterion[];
  /** Their own graded work, verbatim. */
  exemplars?: PackageExemplar[];
  /** The graded items held back from the build. */
  holdout?: PackageHoldoutItem[];
  status?: PackageStatus;
  ownerLabel?: string | null;
  builtFrom?: string | null;
  baseline?: string | null;
}

export interface BuildSkillZipResult {
  base64: string;
  byteLength: number;
  /** Raw ZIP bytes, for Storage upload (skill-packages bucket). */
  bytes: Uint8Array;
  /** The package that was written, so the caller can gate it and flatten it. */
  pkg: SkillPackage;
}

/** The package shape, without the ZIP. Callers that gate before writing use this. */
export function packageFromZipInput(input: BuildSkillZipInput): SkillPackage {
  const packageInput: BuildPackageInput = {
    name: input.name,
    description: input.description,
    body: input.body,
    surface: input.surface,
    references: input.references,
    criteria: input.criteria,
    exemplars: input.exemplars,
    holdout: input.holdout,
    archetype: input.archetype,
    client: input.client,
    ownerLabel: input.ownerLabel,
    status: input.status,
    builtFrom: input.builtFrom,
    baseline: input.baseline,
  };
  return buildSkillPackage(packageInput);
}

export async function buildSkillZip(input: BuildSkillZipInput): Promise<BuildSkillZipResult> {
  return await buildSkillZipFromPackage(packageFromZipInput(input), input.testPrompts, input.name);
}

/**
 * Write an already-built package. generate-skill-export builds the package once,
 * runs the gate over it, regenerates if the gate blocks, and only then writes
 * bytes; going back through buildSkillZip would rebuild it and risk the gated
 * package and the shipped package being different files.
 */
export async function buildSkillZipFromPackage(
  pkg: SkillPackage,
  testPrompts: string[],
  skillName?: string,
): Promise<BuildSkillZipResult> {
  const name = skillName || pkg.name;
  const zip = new JSZip();
  const folder = zip.folder(name);
  if (!folder) throw new Error("Failed to create skill folder in ZIP");

  for (const file of pkg.files) {
    folder.file(file.path, file.content);
  }

  // The three operator files keep their place at the package root. They are
  // instructions about the package, not rules about the person, which is also
  // why the provenance gate never reads them.
  folder.file("01-test-prompts.txt", buildTestPromptsFile(testPrompts ?? [], name));
  folder.file("02-maintenance-card.txt", buildMaintenanceCard(name));
  folder.file("03-install-guide.txt", buildInstallGuide(name));

  const u8 = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    base64: encodeBase64(u8),
    byteLength: u8.byteLength,
    bytes: u8,
    pkg,
  };
}

function encodeBase64(bytes: Uint8Array): string {
  // Chunk to avoid argument-length limits in String.fromCharCode for large
  // payloads. 8KB chunks keep us well under the V8 stack limit.
  const chunkSize = 0x2000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
