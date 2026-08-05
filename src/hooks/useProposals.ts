import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * useProposals - the decisions the weekly pass found, each answerable yes or no.
 *
 * This is the last surface in the chain and the only place a standard changes.
 * `capture-week` reads the last five weeks of reviews, applies two strikes, and
 * writes proposals with status 'awaiting'. Nothing it writes is applied. This
 * hook is where a person answers, and the answer is the whole mechanism.
 *
 * ---------------------------------------------------------------------------
 * Acceptance is never automated (4.10.5)
 * ---------------------------------------------------------------------------
 *
 * Automate everything up to the yes, and nothing past it. The finding, the
 * grouping, the two-strikes filter, the exact wording of the change, the
 * consequence if it is wrong and the size it costs are all produced without
 * anybody being asked for anything. The yes is not, and there is deliberately
 * no bulk accept, no default, no auto-accept-after-N-days and no "apply all"
 * anywhere in this file. A standard that changes without a decision is a
 * standard nobody owns, and a person who has to defend a rule they never agreed
 * to stops trusting every other rule in the file.
 *
 * `accept` and `reject` write the SAME kind of row: a status and a decided_at.
 * Accepting does not edit `criteria` and there is no code path here that could.
 * What an accepted proposal produces is a decision on the record; applying it is
 * a separate, later, human act with the exact text already written out for it.
 */

// The harness tables post-date the committed generated types, so they are
// reached through an untyped client with the row shapes pinned below. Same
// scoping decision as useReview and useSort.
const db = supabase as unknown as SupabaseClient;

export type ProposalType = 'uncovered' | 'false_positive' | 'drift';

export type ProposalStatus = 'awaiting' | 'accepted' | 'rejected';

export interface ProposalEvidenceLine {
  week: string;
  surface: string;
  criterion: string;
  verdict: string;
  quote: string | null;
  disposition: string;
}

export interface ProposalEvidence {
  key?: string;
  occurrences?: number;
  weeks?: string[];
  lines?: ProposalEvidenceLine[];
  size?: { delta?: number; paired_obligation?: string };
  criterion_name?: string;
  last_fired_week?: string | null;
  question?: string;
  topic?: string;
}

export interface Proposal {
  id: string;
  type: ProposalType;
  surface: string;
  headline: string;
  /** Null for a drift question, and only for a drift question. */
  delta_text: string | null;
  if_wrong: string;
  size_delta: number | null;
  evidence: ProposalEvidence;
  status: ProposalStatus;
  created_at: string;
}

interface ProposalRow extends Omit<Proposal, 'evidence'> {
  evidence: ProposalEvidence | null;
}

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Ids currently being written, so a button cannot be pressed twice. */
  const [deciding, setDeciding] = useState<Record<string, boolean>>({});

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProposals([]);
        return;
      }

      const { data, error: readError } = await db
        .from('proposals')
        .select('id, type, surface, headline, delta_text, if_wrong, size_delta, evidence, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'awaiting')
        .order('created_at', { ascending: true });

      if (readError) {
        setError('I could not load these just now.');
        return;
      }
      setError(null);
      setProposals(((data ?? []) as ProposalRow[]).map((row) => ({ ...row, evidence: row.evidence ?? {} })));
    } catch {
      setError('I could not load these just now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProposals();
  }, [fetchProposals]);

  /**
   * Yes or no, and nothing else.
   *
   * Optimistic: the card leaves the list immediately and a failed write puts it
   * back and says so, because a decision silently not recorded means the same
   * proposal arrives again next week as if it had never been answered.
   *
   * A rejection is recorded and never argued with. The weekly pass reads it and
   * does not re-propose that key; a SECOND disagreement with the same rule comes
   * back as the urgent kind, which is the one thing a repeated no should cause.
   */
  const decide = useCallback(
    async (id: string, status: 'accepted' | 'rejected') => {
      if (deciding[id]) return;
      setDeciding((current) => ({ ...current, [id]: true }));
      const previous = proposals;
      setProposals((current) => current.filter((p) => p.id !== id));

      const { error: writeError } = await db
        .from('proposals')
        .update({ status, decided_at: new Date().toISOString() })
        .eq('id', id);

      setDeciding((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });

      if (writeError) {
        setProposals(previous);
        setError('I could not record that. Try it again in a moment.');
        return;
      }
      setError(null);
    },
    [deciding, proposals],
  );

  const accept = useCallback((id: string) => decide(id, 'accepted'), [decide]);
  const reject = useCallback((id: string) => decide(id, 'rejected'), [decide]);

  return { proposals, loading, error, deciding, accept, reject, refresh: fetchProposals };
}
