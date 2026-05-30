import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isSkillSuccess,
  type SkillData,
  type SkillExportResponse,
  type SkillQualityGate,
  type SkillSeed,
  type SkillTriage,
} from "@/types/skill";

export interface GenerateSkillOptions {
  skillNameHint?: string;
  seed?: SkillSeed | null;
}

interface UseSkillExport {
  isGenerating: boolean;
  error: string | null;
  triageResult: SkillTriage | null;
  skillData: SkillData | null;
  qualityGate: SkillQualityGate | null;
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
export function useSkillExport(): UseSkillExport {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triageResult, setTriageResult] = useState<SkillTriage | null>(null);
  const [skillData, setSkillData] = useState<SkillData | null>(null);
  const [qualityGate, setQualityGate] = useState<SkillQualityGate | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [zipFilename, setZipFilename] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setError(null);
    setTriageResult(null);
    setSkillData(null);
    setQualityGate(null);
    setZipBlob(null);
    setZipFilename(null);
  }, []);

  const generateSkill = useCallback(
    async (transcript: string, options?: GenerateSkillOptions): Promise<SkillExportResponse | null> => {
      setIsGenerating(true);
      setError(null);
      setTriageResult(null);
      setSkillData(null);
      setQualityGate(null);
      setZipBlob(null);
      setZipFilename(null);

      try {
        const seed = options?.seed
          ? { kind: options.seed.kind, text: options.seed.text }
          : undefined;
        const { data, error: fnError } = await supabase.functions.invoke("generate-skill-export", {
          body: {
            transcript,
            skill_name_hint: options?.skillNameHint,
            ...(seed ? { seed } : {}),
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
          throw new Error(serverMessage || (fnError as Error | null)?.message || "Generation failed");
        }

        const response = data as SkillExportResponse;
        setTriageResult(response.triage);

        if (isSkillSuccess(response)) {
          setSkillData(response.skill);
          setQualityGate(response.quality_gate);
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
    [],
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
    triageResult,
    skillData,
    qualityGate,
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
