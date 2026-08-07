import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isSkillSuccess,
  type SkillData,
  type SkillExportResponse,
  type SkillQualityGate,
  type SkillReleaseBlock,
  type SkillSeed,
  type SkillTriage,
} from "@/types/skill";

export interface GenerateSkillOptions {
  skillNameHint?: string;
  seed?: SkillSeed | null;
  /**
   * The leader's OWN words from this build, when the caller composed any part
   * of the transcript itself.
   *
   * The backend splits the transcript into citable spans, so whatever goes in
   * as `transcript` is what a finished rule may quote. A caller that narrates
   * on the leader's behalf (the Automator does, from chip picks) must say which
   * text is genuinely theirs, or the skill ends up citing CTRL's own template
   * prose back at them. Omit it when the person typed or spoke the whole thing.
   */
  ownWords?: string;
}

interface UseSkillExport {
  isGenerating: boolean;
  error: string | null;
  /**
   * Set to true when the edge function returned 402 free_quota_exhausted. The
   * parent UI uses this to open the EdgePaywall in quota-exhausted mode rather
   * than showing a generic error.
   */
  quotaExhausted: boolean;
  triageResult: SkillTriage | null;
  skillData: SkillData | null;
  qualityGate: SkillQualityGate | null;
  /**
   * What the delivery screen may claim about this package (label, sentence,
   * numbers). Null when the function did not send one, which the delivery
   * screen renders as Draft with "no measurement exists" rather than as blank.
   */
  release: SkillReleaseBlock | null;
  zipBlob: Blob | null;
  zipFilename: string | null;
  generateSkill: (transcript: string, options?: GenerateSkillOptions) => Promise<SkillExportResponse | null>;
  downloadZip: () => void;
  reset: () => void;
}

/**
 * Wraps the generate-skill-export edge function. Manages the full lifecycle:
 * call, parse, decode the base64 ZIP into a Blob the UI can download.
 *
 * Triage failures (custom_instruction, memory_fact, saved_style) come back
 * with passed: false and no skill/zip - the UI surfaces the routing decision
 * so the leader knows what to do with the input instead.
 */
export function useSkillExport(functionName: string = "generate-skill-export"): UseSkillExport {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [triageResult, setTriageResult] = useState<SkillTriage | null>(null);
  const [skillData, setSkillData] = useState<SkillData | null>(null);
  const [qualityGate, setQualityGate] = useState<SkillQualityGate | null>(null);
  const [release, setRelease] = useState<SkillReleaseBlock | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [zipFilename, setZipFilename] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setError(null);
    setQuotaExhausted(false);
    setTriageResult(null);
    setSkillData(null);
    setQualityGate(null);
    setRelease(null);
    setZipBlob(null);
    setZipFilename(null);
  }, []);

  const generateSkill = useCallback(
    async (transcript: string, options?: GenerateSkillOptions): Promise<SkillExportResponse | null> => {
      setIsGenerating(true);
      setError(null);
      setQuotaExhausted(false);
      setTriageResult(null);
      setSkillData(null);
      setQualityGate(null);
      setRelease(null);
      setZipBlob(null);
      setZipFilename(null);

      try {
        const seed = options?.seed
          ? { kind: options.seed.kind, text: options.seed.text }
          : undefined;
        const { data, error: fnError } = await supabase.functions.invoke(functionName, {
          body: {
            transcript,
            skill_name_hint: options?.skillNameHint,
            ...(seed ? { seed } : {}),
            ...(options?.ownWords?.trim() ? { own_words: options.ownWords.trim() } : {}),
          },
        });

        // Edge function returns the human-readable message in the error body
        // for non-2xx responses; pull it via error.context like useEdgeSubscription.
        const bodyError = data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : null;
        if (fnError || bodyError) {
          let serverMessage = bodyError;
          const ctx = (fnError as { context?: Response } | null)?.context;
          if (!serverMessage && ctx && typeof ctx.text === "function") {
            try {
              const text = await ctx.clone().text();
              const parsed = text ? JSON.parse(text) : null;
              serverMessage = parsed?.error ?? text ?? null;
            } catch {
              // ignore parse errors
            }
          }
          if (serverMessage === "free_quota_exhausted") {
            setQuotaExhausted(true);
            setError(null);
            return null;
          }
          throw new Error(serverMessage || (fnError as Error | null)?.message || "Generation failed");
        }

        const response = data as SkillExportResponse;
        setTriageResult(response.triage);

        if (isSkillSuccess(response)) {
          setSkillData(response.skill);
          setQualityGate(response.quality_gate);
          setRelease(response.release ?? null);
          setZipFilename(response.zip_filename);
          const blob = base64ToBlob(response.zip_base64, "application/zip");
          setZipBlob(blob);
        }

        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate skill";
        console.error("useSkillExport: generateSkill failed", err);
        setError(message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [functionName],
  );

  const downloadZip = useCallback(() => {
    if (!zipBlob || !zipFilename) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [zipBlob, zipFilename]);

  return {
    isGenerating,
    error,
    quotaExhausted,
    triageResult,
    skillData,
    qualityGate,
    release,
    zipBlob,
    zipFilename,
    generateSkill,
    downloadZip,
    reset,
  };
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
