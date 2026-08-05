/**
 * useStandard - the leader's compiled standard, and the one click that gets it
 * out of CTRL and into whatever they actually work in.
 *
 * This is the export path CH-18 splits Phase 3 to ship. The argument in one
 * line: the artefact that would make the SORT the product is a markdown file,
 * and CTRL already ships that exact delivery mechanism for a different payload
 * (ContextFileButton / useMemoryExport, one click, my-ai-context.md). Adding a
 * standard to the unified library was one CHECK-constraint migration.
 *
 * The blob and anchor dance below is deliberately the same one useMemoryExport
 * already does. Two download implementations would be two things to fix.
 *
 * logOpened() and the download event are not analytics decoration. The share of
 * sort completers who open or download their standard inside a week is the
 * number that decides whether Phase 6's plugin, marketplace and OAuth block
 * gets built at all. Above roughly 30 percent the sort is the product and
 * Phase 6 shrinks; below it, the skill is the product and Phase 6 is confirmed.
 * A null result is still an answer, but only if the events fire.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emitEvent } from '@/lib/track';
import type { GeneratedArtifact } from '@/types/artifact';

/** The label the compile step wrote, honestly, at the time it wrote it. */
export type StandardLabel = 'draft' | 'provisional' | 'verified';

export interface StandardMeta {
  label: StandardLabel;
  criteriaVersion: number | null;
  criteriaKept: number;
  criteriaAwaiting: number;
  surface: string | null;
  /** Null until a measurement stage runs. Null is the honest common case. */
  precision: number | null;
  recall: number | null;
  heldOutGraded: number | null;
  compiledAt: string;
}

const LABELS: StandardLabel[] = ['draft', 'provisional', 'verified'];

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Read the metadata the compile step wrote. Never infer a label that is absent. */
export function readStandardMeta(artifact: GeneratedArtifact | null): StandardMeta | null {
  if (!artifact) return null;
  const meta = (artifact.metadata ?? {}) as Record<string, unknown>;
  const raw = typeof meta.label === 'string' ? meta.label : '';
  return {
    // A row with no label is a Draft. Guessing upward from a missing field is
    // exactly the quiet wrongness the label exists to prevent.
    label: LABELS.includes(raw as StandardLabel) ? (raw as StandardLabel) : 'draft',
    criteriaVersion: num(meta.criteria_version),
    criteriaKept: num(meta.criteria_kept) ?? 0,
    criteriaAwaiting: num(meta.criteria_awaiting) ?? 0,
    surface: typeof meta.surface === 'string' && meta.surface ? meta.surface : null,
    precision: num(meta.precision),
    recall: num(meta.recall),
    heldOutGraded: num(meta.held_out_graded),
    compiledAt: artifact.created_at,
  };
}

export function useStandard() {
  const [standard, setStandard] = useState<GeneratedArtifact | null>(null);
  const [meta, setMeta] = useState<StandardMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStandard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStandard(null);
        setMeta(null);
        return;
      }

      // Scoped cast, same as useMemoryEdges / useCapabilitySignals: the 'standard'
      // kind post-dates the generated types.
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: string) => {
                order: (c: string, o: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{ data: GeneratedArtifact | null; error: unknown }>;
                  };
                };
              };
            };
          };
        };
      })
        .from('generated_artifacts')
        .select('id, user_id, kind, name, body, metadata, created_at')
        .eq('user_id', user.id)
        .eq('kind', 'standard')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setStandard(null);
        setMeta(null);
        return;
      }
      setStandard(data);
      setMeta(readStandardMeta(data));
    } catch {
      // Quiet: a leader with no standard yet is the normal state, not an error.
      setStandard(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStandard();
  }, [fetchStandard]);

  /**
   * Call when the standard is actually put in front of someone. `once` is false
   * on purpose: a second read in a later session is the signal that it is being
   * used rather than glanced at.
   */
  const logOpened = useCallback(() => {
    if (!standard) return;
    void emitEvent(
      'standard_opened',
      { artifact_id: standard.id, label: meta?.label ?? 'draft' },
      false,
    );
  }, [standard, meta]);

  const downloadMarkdown = useCallback(
    (filename?: string) => {
      if (!standard?.body) return;
      // Same blob and anchor dance as useMemoryExport.downloadAsFile. One
      // implementation, one place to fix it.
      const blob = new Blob([standard.body], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'my-standard.md';
      a.click();
      URL.revokeObjectURL(url);
      void emitEvent(
        'standard_downloaded',
        { artifact_id: standard.id, label: meta?.label ?? 'draft' },
        false,
      );
    },
    [standard, meta],
  );

  return { standard, meta, loading, refresh: fetchStandard, downloadMarkdown, logOpened };
}
