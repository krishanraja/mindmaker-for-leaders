import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// The decision_* tables are newer than the committed generated types. Access
// them through an untyped client; row shapes are enforced by the interfaces
// below. Regenerating the full types file pulls a drifted live schema that
// breaks unrelated modules, so we scope the looseness to this hook.
const db = supabase as unknown as SupabaseClient;

export type ClaimType = 'factual' | 'market' | 'causal' | 'assumption' | 'forecast';
// The 6 fixed AI-native forces a decision spiders into (see decision-engine/types.ts Dimension).
export type Dimension = 'capability' | 'economics' | 'risk' | 'build_buy' | 'team' | 'timing';
export type Verdict = 'supported' | 'contested' | 'unverified' | 'unverifiable' | 'pending';
export type Stage = 'decomposing' | 'verifying' | 'cross_examining' | 'advising' | 'complete' | 'error';
// The action-oriented research modes a finished decision can be pushed through.
export type ResearchMode = 'research_more' | 'strengthen' | 'counter_evidence';

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
  // AI-native reframe (additive; see supabase/functions/decision-engine/reframe.ts).
  // When the submitted statement was general business, the engine reframed it into
  // its AI-native version and reasoned on the reframed statement. `statement` is
  // always the leader's original; these carry the reframe honestly so the UI can
  // show it rather than silently swapping. Optional so older rows / drifted types
  // do not break.
  reframed?: boolean | null;
  reframed_statement?: string | null;
  reframe_note?: string | null;
  lifecycle_stage?: 'build' | 'orchestrate' | 'productize' | 'gtm' | 'substrate' | null;
  // A 1-2 word specific concern per force (e.g. { economics: 'Token cost' }); supplies the
  // decision-specific node captions in the spider. Optional/null on older rows.
  force_labels?: Partial<Record<Dimension, string>> | null;
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
  // Which of the 6 fixed AI-native forces this claim bears on. Optional/null on older rows
  // (predate the column) -> the spider infers a force from `type`.
  dimension?: Dimension | null;
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
  // Additive (see decision-engine/reliability.ts + _shared/evidence-keypoint.ts). All optional so
  // older rows / drifted types do not break:
  //  - key_point: the one-line distillation shown by default (UI falls back to firstClause(excerpt)).
  //  - published_at: source publish date when the retriever surfaced one; feeds the freshness score.
  //  - evidence_score: the single 0-100 trust score (freshness + reliability + corroboration).
  //  - theme: a short adjudicator-assigned category so the UI can NEST like sources under one
  //    heading instead of a flat scroll (null on old rows / research gathers -> client grouper).
  key_point?: string | null;
  published_at?: string | null;
  evidence_score?: number | null;
  theme?: string | null;
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
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  // Bumped to (re)start polling after a research run flips a complete case back
  // to a running stage server-side.
  const [pollNonce, setPollNonce] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Delayed re-reads that catch the silent counter-evidence pass the engine fires at completion
  // (it lands a few seconds after the stage is already terminal, so the one-shot terminal load misses it).
  const settleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearSettle = () => { settleTimers.current.forEach(clearTimeout); settleTimers.current = []; };

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    clearSettle();
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

  // Make a finished decision actionable: kick a research mode (strengthen /
  // research more / counter-evidence), optimistically flip to a running stage so
  // the panel shows progress, and restart polling so the refreshed evidence +
  // recommendation land without a reload.
  const research = useCallback(
    async (mode: ResearchMode) => {
      if (!caseId) return;
      setResearching(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('decision-research', {
          body: { case_id: caseId, mode },
        });
        if (invokeError) throw invokeError;
        if (data?.upgrade_required) {
          setUpgradeRequired(true);
          setUpgradeMessage(data.message ?? 'Upgrade to Edge Pro to continue.');
          return;
        }
        setDecisionCase((c) => (c ? { ...c, stage: 'verifying' } : c));
        setPollNonce((n) => n + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start that research.');
      } finally {
        setResearching(false);
      }
    },
    [caseId],
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

          // On a clean finish the engine has fired a SILENT counter-evidence pass that appends the
          // case-against WITHOUT moving the stage, so it lands after this terminal load. Re-pull the
          // evidence (+ the possibly re-advised case/tensions) a couple of times so the counters show
          // live in the same session; reopening the decision refetches anyway.
          if (stage === 'complete') {
            clearSettle();
            settleTimers.current = [8000, 18000].map((ms) => setTimeout(async () => {
              const [{ data: caseRow2 }, { data: ev2 }, { data: tn2 }] = await Promise.all([
                db.from('decision_cases').select('*').eq('id', caseId).maybeSingle(),
                db.from('decision_evidence').select('*').in('claim_id', claimIds),
                db.from('decision_tensions').select('*').eq('decision_case_id', caseId),
              ]);
              if (!active) return;
              if (caseRow2) setDecisionCase(caseRow2 as DecisionCase);
              if (ev2) setEvidence(ev2 as DecisionEvidence[]);
              if (tn2) setTensions(tn2 as DecisionTension[]);
            }, ms));
          }
        }
        return; // stop polling
      }
      timer.current = setTimeout(poll, 2000);
    };

    poll();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      clearSettle();
    };
  }, [caseId, pollNonce]);

  const isRunning = Boolean(caseId) && !!decisionCase && !TERMINAL.includes(decisionCase.stage);
  const isComplete = decisionCase?.stage === 'complete';

  return { start, load, reset, refetch, enrichClaim, research, researching, starting, isRunning, isComplete, error, upgradeRequired, upgradeMessage, decisionCase, claims, evidence, tensions };
}
