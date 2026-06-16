import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// The decision_* tables are newer than the committed generated types. Access
// them through an untyped client; row shapes are enforced by the interfaces
// below. Regenerating the full types file pulls a drifted live schema that
// breaks unrelated modules, so we scope the looseness to this hook.
const db = supabase as unknown as SupabaseClient;

export type ClaimType = 'factual' | 'market' | 'causal' | 'assumption' | 'forecast';
export type Verdict = 'supported' | 'contested' | 'unverified' | 'unverifiable' | 'pending';
export type Stage = 'decomposing' | 'verifying' | 'cross_examining' | 'advising' | 'complete' | 'error';

export interface DecisionCase {
  id: string;
  title: string | null;
  statement: string;
  stage: Stage;
  decision_kind: string | null;
  recommendation: string | null;
  counter_case: string | null;
  breakpoint_assumption_id: string | null;
  validate_next: string[] | null;
  confidence: number | null;
  error_detail: string | null;
  last_verified_at: string | null;
}

// The stored, honesty-gated hero magnitude. Populated by the decision-engine
// reaction pass (proposeReaction -> gateReaction). null on every field means
// "no honest number" -> the hero leads with words. kind: 'sourced' (numeric core
// appears verbatim in a retrieved excerpt, renders clean) | 'modelled' (an explicit
// CTRL derivation, always rendered with the 'est.' mark).
export type ReactionKind = 'sourced' | 'modelled';

export interface DecisionClaim {
  id: string;
  text: string;
  type: ClaimType;
  is_load_bearing: boolean;
  verdict: Verdict;
  confidence: number | null;
  rationale: string | null;
  reaction_value: string | null;
  reaction_descriptor: string | null;
  reaction_kind: ReactionKind | null;
  reaction_evidence_id: string | null;
}

// reliability_tier is the REAL stored trust level of the source, set honestly at insert
// from the retriever / source host (see decision-engine/reliability.ts). null on older
// rows that predate the column -> the UI falls back to its render-time heuristic.
export type ReliabilityTier = 'primary' | 'reputable' | 'community' | 'unverified';

export interface DecisionEvidence {
  id: string;
  claim_id: string;
  source_url: string | null;
  source_title: string | null;
  excerpt: string | null;
  stance: 'supports' | 'refutes' | 'neutral';
  retriever: string;
  retrieved_at: string | null;
  relevance_score: number | null;
  reliability_tier: ReliabilityTier | null;
}

export interface DecisionTension {
  id: string;
  kind: 'vs_profile' | 'vs_evidence' | 'internal' | 'model_disagreement';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

const TERMINAL: Stage[] = ['complete', 'error'];

/**
 * Drives a decision-engine run: kicks off the pipeline, then polls the case,
 * claims, and tensions every 2s until the stage is terminal, at which point it
 * loads the evidence. Mirrors the briefing poll pattern.
 */
export function useDecisionEngine() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [decisionCase, setDecisionCase] = useState<DecisionCase | null>(null);
  const [claims, setClaims] = useState<DecisionClaim[]>([]);
  const [evidence, setEvidence] = useState<DecisionEvidence[]>([]);
  const [tensions, setTensions] = useState<DecisionTension[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCaseId(null);
    setDecisionCase(null);
    setClaims([]);
    setEvidence([]);
    setTensions([]);
    setError(null);
    setUpgradeRequired(false);
    setUpgradeMessage(null);
  }, []);

  const start = useCallback(async (statement: string) => {
    setStarting(true);
    setError(null);
    setUpgradeRequired(false);
    setUpgradeMessage(null);
    setDecisionCase(null);
    setClaims([]);
    setEvidence([]);
    setTensions([]);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('decision-engine', {
        body: { statement: statement.trim(), source: 'advisor' },
      });
      if (invokeError) throw invokeError;
      if (data?.upgrade_required) {
        setUpgradeRequired(true);
        setUpgradeMessage(data.message ?? 'Upgrade to Edge Pro to continue.');
        return;
      }
      if (!data?.case_id) throw new Error('No case id returned');
      setCaseId(data.case_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start the pressure test.');
    } finally {
      setStarting(false);
    }
  }, []);

  const load = useCallback((existingCaseId: string) => {
    setError(null);
    setUpgradeRequired(false);
    setUpgradeMessage(null);
    setEvidence([]);
    setCaseId(existingCaseId);
  }, []);

  // Re-read the case, its claims, and its evidence once (no polling). Used after an
  // enrich so the freshly-inserted evidence + refreshed verdict land without a reload.
  const refetch = useCallback(async () => {
    if (!caseId) return;
    const [{ data: caseRow }, { data: claimRows }, { data: tensionRows }] = await Promise.all([
      db.from('decision_cases').select('*').eq('id', caseId).maybeSingle(),
      db.from('decision_claims').select('*').eq('decision_case_id', caseId).order('created_at'),
      db.from('decision_tensions').select('*').eq('decision_case_id', caseId),
    ]);
    if (caseRow) setDecisionCase(caseRow as DecisionCase);
    if (claimRows) setClaims(claimRows as DecisionClaim[]);
    if (tensionRows) setTensions(tensionRows as DecisionTension[]);
    const claimIds = (claimRows ?? []).map((c: { id: string }) => c.id);
    if (claimIds.length) {
      const { data: ev } = await db.from('decision_evidence').select('*').in('claim_id', claimIds);
      if (ev) setEvidence(ev as DecisionEvidence[]);
    }
  }, [caseId]);

  // "Add what's missing" for one claim: re-run retrieval server-side, then refetch so the
  // new evidence (with real reliability tiers) and the refreshed verdict appear. Returns
  // the number of new sources added (0 is a valid, honest outcome).
  const enrichClaim = useCallback(
    async (claimId: string): Promise<number> => {
      const { data, error: invokeError } = await supabase.functions.invoke('enrich-decision', {
        body: { claim_id: claimId },
      });
      if (invokeError) throw invokeError;
      await refetch();
      return typeof data?.added === 'number' ? data.added : 0;
    },
    [refetch],
  );

  useEffect(() => {
    if (!caseId) return;
    let active = true;

    const poll = async () => {
      const [{ data: caseRow }, { data: claimRows }, { data: tensionRows }] = await Promise.all([
        db.from('decision_cases').select('*').eq('id', caseId).maybeSingle(),
        db.from('decision_claims').select('*').eq('decision_case_id', caseId).order('created_at'),
        db.from('decision_tensions').select('*').eq('decision_case_id', caseId),
      ]);
      if (!active) return;

      if (caseRow) setDecisionCase(caseRow as DecisionCase);
      if (claimRows) setClaims(claimRows as DecisionClaim[]);
      if (tensionRows) setTensions(tensionRows as DecisionTension[]);

      const stage = (caseRow as DecisionCase | null)?.stage;
      if (stage && TERMINAL.includes(stage)) {
        if (stage === 'error') setError((caseRow as DecisionCase).error_detail || 'The pressure test hit an error.');
        const claimIds = (claimRows ?? []).map((c: { id: string }) => c.id);
        if (claimIds.length) {
          const { data: ev } = await db.from('decision_evidence').select('*').in('claim_id', claimIds);
          if (active && ev) setEvidence(ev as DecisionEvidence[]);
        }
        return; // stop polling
      }
      timer.current = setTimeout(poll, 2000);
    };

    poll();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [caseId]);

  const isRunning = Boolean(caseId) && !!decisionCase && !TERMINAL.includes(decisionCase.stage);
  const isComplete = decisionCase?.stage === 'complete';

  return { start, load, reset, refetch, enrichClaim, starting, isRunning, isComplete, error, upgradeRequired, upgradeMessage, decisionCase, claims, evidence, tensions };
}
