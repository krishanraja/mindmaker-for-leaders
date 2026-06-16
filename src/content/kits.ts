/**
 * Frontend access to the Kit Engine presets. Single indirection point into
 * the shared preset registry, mirroring how src/constants/billing.ts imports
 * supabase/functions/_shared/edge-pricing.ts. Everything under kit-presets is
 * plain TypeScript with no Deno or Node APIs, so Vite bundles it directly.
 */

export {
  PRESETS,
  getPreset,
  getPresetByCodePrefix,
  isValidSlug,
  toolFromIntake,
  KIT_TOOL_LABELS,
} from "../../supabase/functions/_shared/kit-presets/index.ts";

export type {
  KitPreset,
  KitTool,
  KitPathway,
  ChartFeed,
  IntakeQuestion,
  IntakeOption,
  IntakeAnswer,
  IntakeAnswers,
  AdaptiveOptions,
  IntakeShowIf,
  ArtifactSpec,
  ArtifactBuildContext,
  KitReadingPage,
} from "../../supabase/functions/_shared/kit-presets/index.ts";
