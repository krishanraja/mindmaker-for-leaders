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
import {
  metricsFrom,
  releaseVerdict,
  storedMetrics,
  type ConfusionMatrix,
  type Metrics,
} from '../../supabase/functions/_shared/confusion.ts';
import { weakerLabel } from '../../supabase/functions/_shared/discrimination.ts';

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
  tnr: number | null;
  heldOutGraded: number | null;
  /** The measurement as the measuring run produced it, counts and all. */
  measurement: Metrics | null;
  /** releaseVerdict's own sentence about why this label and not a stronger one. */
  releaseReason: string;
  compiledAt: string;
}

const LABELS: StandardLabel[] = ['draft', 'provisional', 'verified'];

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function int(value: unknown): number {
  const n = num(value);
  return n !== null && n >= 0 ? Math.floor(n) : 0;
}

/** The stored matrix, when a measurement run kept one. Never partially filled. */
function readMatrix(value: unknown): ConfusionMatrix | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  for (const key of ['tp', 'fp', 'fn', 'tn']) {
    if (num(raw[key]) === null) return null;
  }
  const excluded = (raw.excluded ?? {}) as Record<string, unknown>;
  const skipped = int(excluded.skipped);
  const insufficient = int(excluded.insufficient);
  return {
    tp: int(raw.tp),
    fp: int(raw.fp),
    fn: int(raw.fn),
    tn: int(raw.tn),
    excluded: { skipped, insufficient, total: skipped + insufficient },
  };
}

/**
 * Read the metadata the compile step wrote, and never show a stronger label
 * than the stored numbers support.
 *
 * The stored label is not trusted on its own. It is taken as a ceiling and
 * re-derived through releaseVerdict from the numbers sitting beside it, and the
 * weaker of the two wins. A row that says 'verified' with no measurement under
 * it renders as Draft, which is what it is. That rule is the whole reason this
 * function exists rather than a field read: 'verified' has exactly one source
 * in this codebase, and the existence of a rubric is not it.
 */
export function readStandardMeta(artifact: GeneratedArtifact | null): StandardMeta | null {
  if (!artifact) return null;
  const meta = (artifact.metadata ?? {}) as Record<string, unknown>;
  const raw = typeof meta.label === 'string' ? meta.label : '';
  // A row with no label is a Draft. Guessing upward from a missing field is
  // exactly the quiet wrongness the label exists to prevent.
  const stored: StandardLabel = LABELS.includes(raw as StandardLabel)
    ? (raw as StandardLabel)
    : 'draft';

  const precision = num(meta.precision);
  const recall = num(meta.recall);
  const tnr = num(meta.tnr);
  const heldOutGraded = num(meta.held_out_graded);
  const matrix = readMatrix(meta.confusion);
  const measurement = matrix
    ? metricsFrom(matrix)
    : precision === null && recall === null && tnr === null
      ? null
      : storedMetrics({ precision, recall, tnr, n: heldOutGraded ?? 0 });

  const agreement = (meta.self_agreement ?? null) as { matched?: unknown; total?: unknown } | null;
  const derived = releaseVerdict({
    metrics: measurement,
    heldOutGraded: heldOutGraded ?? 0,
    selfAgreement: agreement
      ? { matched: int(agreement.matched), total: int(agreement.total) }
      : null,
  });

  return {
    label: weakerLabel(stored, derived.label),
    criteriaVersion: num(meta.criteria_version),
    criteriaKept: num(meta.criteria_kept) ?? 0,
    criteriaAwaiting: num(meta.criteria_awaiting) ?? 0,
    surface: typeof meta.surface === 'string' && meta.surface ? meta.surface : null,
    precision,
    recall,
    tnr,
    heldOutGraded,
    measurement,
    releaseReason: typeof meta.release_reason === 'string' && meta.release_reason
      ? meta.release_reason
      : derived.reason,
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
