/**
 * Kit preset registry. Adding a class = adding a preset folder + one entry here
 * (+ one kit_codes row seeded by SQL). Nothing else in the engine changes.
 */

import type { KitPreset } from "./types.ts";
import { vibeCodingPreset } from "./vibe-coding/preset.ts";
import { autonomousBusinessPreset } from "./autonomous-business/preset.ts";
import { memoryIdentityPreset } from "./memory-identity/preset.ts";

export * from "./types.ts";

export const PRESETS: Record<string, KitPreset> = {
  [vibeCodingPreset.slug]: vibeCodingPreset,
  [autonomousBusinessPreset.slug]: autonomousBusinessPreset,
  [memoryIdentityPreset.slug]: memoryIdentityPreset,
};

export function getPreset(slug: string): KitPreset | null {
  return PRESETS[slug] ?? null;
}

export function isValidSlug(slug: string): boolean {
  return slug in PRESETS;
}

/** Best-effort preset guess from a raw code (for optimistic branding only). */
export function getPresetByCodePrefix(code: string): KitPreset | null {
  const normalized = code.trim().toUpperCase();
  for (const preset of Object.values(PRESETS)) {
    if (preset.codePrefixes.some((p) => normalized.startsWith(p.toUpperCase()))) {
      return preset;
    }
  }
  return null;
}
