import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, GitFork, Loader2, Map as MapIcon } from 'lucide-react';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useDevice } from '@/hooks/useDevice';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { useDecisionCall, type UserCall } from '@/hooks/useDecisionCall';
import { ConsiderationStone, isOnlyYou } from '@/components/decision-map/ConsiderationStone';
import { StoneRead } from '@/components/decision-map/StoneRead';
import { StoneDeeper } from '@/components/decision-map/StoneDeeper';
import { ContestLongPress } from '@/contexts/ContestProvider';

const SUBTITLE = 'A bet, decomposed. Each consideration shows where the evidence stands - and where only you can answer.';

function MapBody({ caseId }: { caseId: string }) {
  const { decisionCase, claims, evidence, isRunning, load, enrichClaim } = useDecisionEngine();
  const { getCallsForCase, recordCall } = useDecisionCall();
  // The opened stone (its read shows inline); and whether the receipts drawer is up.
  const [openId, setOpenId] = useState<string | null>(null);
  const [deeperId, setDeeperId] = useState<string | null>(null);
  // The leader's own call per claim (accept/reject/unsure), read from + written to
  // decision_user_calls so the judgement persists across sessions.
  const [calls, setCalls] = useState<Record<string, UserCall>>({});

  useEffect(() => {
    load(caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Hydrate the leader's existing calls for this case.
  useEffect(() => {
    let active = true;
    getCallsForCase(caseId).then((rows) => {
      if (!active) return;
      const map: Record<string, UserCall> = {};
      for (const r of rows) if (r.claim_id) map[r.claim_id] = r.call;
      setCalls(map);
    });
    return () => {
      active = false;
    };
  }, [caseId, getCallsForCase]);

  const setCall = useCallback(
    (claimId: string, call: UserCall) => {
      setCalls((prev) => ({ ...prev, [claimId]: call })); // optimistic
      void recordCall(caseId, claimId, call);
    },
    [caseId, recordCall],
  );

  const tally = useMemo(() => {
    const loadBearing = claims.filter((c) => c.is_load_bearing).length;
    const onlyYou = claims.filter(isOnlyYou).length;
    const external = claims.length - onlyYou;
    const quiet = claims.filter((c) => c.verdict === 'pending').length;
    return { loadBearing, onlyYou, external, quiet, total: claims.length };
  }, [claims]);

  const deeperClaim = useMemo(() => claims.find((c) => c.id === deeperId) ?? null, [claims, deeperId]);
  const deeperEvidence = useMemo(
    () => (deeperId ? evidence.filter((e) => e.claim_id === deeperId) : []),
    [evidence, deeperId],
  );

  if (!decisionCase) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* THE BET (header) - the open-decision fork, the question, the completeness tally */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-secondary/40 text-muted-foreground" aria-hidden>
            <GitFork className="h-4 w-4 rotate-90" />
          </span>
          <h2 className="min-w-0 flex-1 text-[21px] font-bold leading-[1.16] tracking-tight text-balance text-foreground">
            {decisionCase.statement}
          </h2>
        </div>
        {/* completeness tally folded under the header (one slim line) */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2.5 text-[10.5px] text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground/90">{tally.loadBearing}</span> carry this
          </span>
          {tally.quiet > 0 && <span>&middot; {tally.quiet} checking</span>}
          <span className="ml-auto inline-flex items-center gap-1 text-emerald-300/80">&#9679; {tally.external} read</span>
          <span className="inline-flex items-center gap-1 text-amber-300/80">&#128274; {tally.onlyYou} only you</span>
          {isRunning && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> updating
            </span>
          )}
        </div>
      </div>

      {/* THE SPINE - the one scroll band of stones */}
      <div className="mt-3 space-y-2">
        {claims.map((c) => {
          const isOpen = openId === c.id;
          const claimEvidence = evidence.filter((e) => e.claim_id === c.id);
          return (
            <ContestLongPress
              key={c.id}
              target={{ target_type: 'decision_claim', target_id: c.id, element: c.text, surface: '/decision-map' }}
            >
              {isOpen ? (
                // OPENED: the numerical-first read (or words-led only-you), in place.
                <div className="rounded-2xl border border-border bg-card/60 p-3.5">
                  <StoneRead
                    claim={c}
                    evidence={claimEvidence}
                    call={calls[c.id] ?? null}
                    onSetCall={(call) => setCall(c.id, call)}
                    onGoDeeper={() => setDeeperId(c.id)}
                  />
                  <button
                    type="button"
                    onClick={() => setOpenId(null)}
                    className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Back to the spine
                  </button>
                </div>
              ) : (
                <ConsiderationStone
                  claim={c}
                  evidence={claimEvidence}
                  expanded={false}
                  onToggle={() => setOpenId(c.id)}
                />
              )}
            </ContestLongPress>
          );
        })}
      </div>
      {claims.length > 0 && (
        <p className="mt-4 text-center text-[10.5px] tracking-[0.02em] text-muted-foreground">
          Tap a stone to go deeper &middot; press &amp; hold to flag
        </p>
      )}

      {/* GO DEEPER - the receipts drawer */}
      <StoneDeeper
        open={!!deeperId}
        claim={deeperClaim}
        evidence={deeperEvidence}
        call={deeperId ? calls[deeperId] ?? null : null}
        onSetCall={(call) => deeperId && setCall(deeperId, call)}
        onClose={() => setDeeperId(null)}
        onVerify={() => load(caseId)}
        onEnrich={deeperId ? () => enrichClaim(deeperId) : undefined}
      />
    </div>
  );
}

function CasePicker({ onPick }: { onPick: (id: string) => void }) {
  const { cases, loading } = useDecisionInbox();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
        <MapIcon className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No decisions yet. Pressure-test one in Decide and it maps out here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {cases.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/40"
        >
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{c.statement}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

export default function DecisionMapPage() {
  const { isMobile } = useDevice();
  const [searchParams] = useSearchParams();
  // Deep-link target: the cockpit (and other surfaces) route here as ?case=<id>.
  const deepLinked = searchParams.get('case');
  const [picked, setPicked] = useState<string | null>(null);
  const caseId = deepLinked || picked;

  const inner = caseId ? <MapBody caseId={caseId} /> : <CasePicker onPick={setPicked} />;

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Workspace" title="Decision Map">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <div className="mx-auto w-full max-w-3xl">
            <p className="mb-6 text-sm text-muted-foreground">{SUBTITLE}</p>
            {inner}
          </div>
        </div>
      </DesktopShell>
    );
  }

  return (
    <div className="h-screen-safe flex flex-col overflow-hidden bg-background">
      <AppHeader />
      <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 scrollbar-hide">
        <div className="mx-auto w-full max-w-3xl space-y-6 py-4">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-accent" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Decision Map</h1>
            </div>
            <p className="text-sm text-muted-foreground">{SUBTITLE}</p>
          </header>
          {inner}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
