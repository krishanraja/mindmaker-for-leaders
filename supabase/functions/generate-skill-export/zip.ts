/**
 * ZIP assembly for skill packages.
 *
 * Uses JSZip via esm.sh - same pattern as other esm.sh imports across the
 * edge function codebase. Output structure is the agentskills.io standard:
 *
 *   <skill-name>.zip
 *     <skill-name>/
 *       SKILL.md
 *       references/
 *         <ref>.md
 *       01-test-prompts.txt
 *       02-maintenance-card.txt
 *       03-install-guide.txt
 *
 * Critical detail: the ZIP must contain a SINGLE root folder named exactly
 * the same as the YAML `name` field. Files at the ZIP root, or a different
 * folder name, will fail validation by Claude.ai's skill uploader.
 */

import JSZip from "https://esm.sh/jszip@3.10.1";

import { buildSkillMarkdown, buildTestPromptsFile, buildMaintenanceCard, buildInstallGuide } from "./templates.ts";

export interface BuildSkillZipInput {
  name: string;
  description: string;
  body: string;
  references: Array<{ filename: string; content: string }>;
  testPrompts: string[];
  archetype?: string;
  client?: string;
}

export interface BuildSkillZipResult {
  base64: string;
  byteLength: number;
}

export async function buildSkillZip(input: BuildSkillZipInput): Promise<BuildSkillZipResult> {
  const zip = new JSZip();
  const folder = zip.folder(input.name);
  if (!folder) throw new Error("Failed to create skill folder in ZIP");

  // SKILL.md - YAML frontmatter + body
  folder.file(
    "SKILL.md",
    buildSkillMarkdown(
      {
        name: input.name,
        description: input.description,
        archetype: input.archetype,
        client: input.client,
        version: "1.0",
      },
      input.body,
    ),
  );

  // references/<file>.md - load-on-demand context
  if (input.references.length > 0) {
    const refsFolder = folder.folder("references");
    if (!refsFolder) throw new Error("Failed to create references folder in ZIP");
    for (const ref of input.references) {
      const cleaned = sanitizeFilename(ref.filename);
      if (!cleaned) continue;
      refsFolder.file(cleaned, ref.content);
    }
  }

  folder.file("01-test-prompts.txt", buildTestPromptsFile(input.testPrompts, input.name));
  folder.file("02-maintenance-card.txt", buildMaintenanceCard(input.name));
  folder.file("03-install-guide.txt", buildInstallGuide(input.name));

  const u8 = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    base64: encodeBase64(u8),
    byteLength: u8.byteLength,
  };
}

function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== "string") return null;
  // Strip any path separators and parent-dir tokens; allow only one level.
  const base = filename.replace(/^.*[\\/]/, "").trim();
  if (!base || base.startsWith(".")) return null;
  if (!/^[a-zA-Z0-9._-]+\.md$/.test(base)) {
    // Force a .md extension and scrub.
    const stem = base.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "-");
    if (!stem) return null;
    return `${stem}.md`;
  }
  return base;
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
