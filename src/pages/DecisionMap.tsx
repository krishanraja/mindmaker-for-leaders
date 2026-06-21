import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Compass, Flag, Loader2, Map as MapIcon, RefreshCw, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { cn } from '@/lib/utils';
import { useDevice } from '@/hooks/useDevice';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { useDecisionCall, type UserCall } from '@/hooks/useDecisionCall';
import { useContestActions } from '@/contexts/ContestProvider';
import { ConsiderationStone, isOnlyYou } from '@/components/decision-map/ConsiderationStone';
import { StoneRead } from '@/components/decision-map/StoneRead';
import { StoneDeeper } from '@/components/decision-map/StoneDeeper';

const SUBTITLE = 'One decision, decomposed. Each consideration shows where the evidence stands - and where only you can answer.';

// Where the EVIDENCE stands on the pinned decision - descriptive, never a
// recommendation (CTRL clarifies, the leader decides). Read from the tally.
function standsFrom(t: { loadBearing: number; contested: number; onlyYou: number; quiet: number; holds: number }): {
  chip: string; cls: string; line: string;
} {
  if (t.quiet > 0 && t.holds + t.contested === 0) {
    return { chip: 'Checking', cls: 'border-border bg-secondary/40 text-muted-foreground', line: 'CTRL is still checking the considerations this rests on.' };
  }
  if (t.contested > 0) {
    return {
      chip: 'Contested', cls: 'border-amber-500/30 bg-amber-500/[0.08] text-amber-300',
      line: `${t.contested} of the considerations it rests on are contested${t.onlyYou ? `, and ${t.onlyYou} only you can answer.` : '.'}`,
    };
  }
  return {
    chip: 'Holding', cls: 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300',
    line: t.onlyYou
      ? `The evidence holds so far; ${t.onlyYou} of the considerations are yours to call.`
      : 'The evidence holds across the considerations it rests on.',
  };
}

function MapBody({ caseId, onChange }: { caseId: string; onChange: () => void }) {
  const { decisionCase, claims, evidence, isRunning, load, enrichClaim } = useDecisionEngine();
  const { getCallsForCase, recordCall } = useDecisionCall();
  const { openContest } = useContestActions();
  const [openId, setOpenId] = useState<string | null>(null);
  const [deeperId, setDeeperId] = useState<string | null>(null);
  const [calls, setCalls] = useState<Record<string, UserCall>>({});

  useEffect(() => {
    load(caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    let active = true;
    getCallsForCase(caseId).then((rows) => {
      if (!active) return;
      const map: Record<string, UserCall> = {};
      for (const r of rows) if (r.claim_id) map[r.claim_id] = r.call;
      setCalls(map);
    });
    return () => { active = false; };
  }, [caseId, getCallsForCase]);

  const setCall = useCallback(
    (claimId: string, call: UserCall) => {
      setCalls((prev) => ({ ...prev, [claimId]: call }));
      void recordCall(caseId, claimId, call);
    },
    [caseId, recordCall],
  );

  const tally = useMemo(() => {
    const loadBearing = claims.filter((c) => c.is_load_bearing).length;
    const onlyYou = claims.filter(isOnlyYou).length;
    const contested = claims.filter((c) => c.verdict === 'contested').length;
    const holds = claims.filter((c) => c.verdict === 'supported').length;
    const quiet = claims.filter((c) => c.verdict === 'pending').length;
    return { loadBearing, onlyYou, contested, holds, quiet, total: claims.length };
  }, [claims]);
  const stands = standsFrom(tally);

  const deeperClaim = useMemo(() => claims.find((c) => c.id === deeperId) ?? null, [claims, deeperId]);
  const deeperEvidence = useMemo(
    () => (deeperId ? evidence.filter((e) => e.claim_id === deeperId) : []),
    [evidence, deeperId],
  );

  const flag = (claimId: string, text: string) =>
    openContest({ target_type: 'decision_claim', target_id: claimId, element: text, surface: '/decision-map' });

  if (!decisionCase) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* THE PINNED DECISION - the one thing everything hangs off */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-[radial-gradient(130%_100%_at_50%_0%,#10241e_0%,#0b0f13_60%)] p-4 shadow-[0_0_50px_-24px_hsl(var(--accent))]">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-accent/80">
            <Star className="h-3 w-3 fill-current" /> Pinned decision
          </span>
          <button
            type="button"
            onClick={onChange}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-[#0c1116] px-2.5 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-secondary/50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Change
          </button>
        </div>
        <h2 className="text-[20px] font-bold leading-[1.22] tracking-tight text-balance text-foreground">
          {decisionCase.statement}
        </h2>
        <div className="mt-3.5 flex items-start gap-2.5 border-t border-border/70 pt-3">
          <span className={cn('shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold leading-none', stands.cls)}>{stands.chip}</span>
          <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-muted-foreground">
            {stands.line}
            {isRunning && <span className="ml-1 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> updating</span>}
          </span>
        </div>
      </div>

      {/* section head */}
      <div className="mt-5 mb-2.5 flex items-baseline gap-2 px-0.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">What it rests on</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{tally.total} considerations</span>
      </div>

      {/* THE RAIL - the considerations hang off the pinned decision */}
      <div className="relative pl-4 before:absolute before:content-[''] before:left-[7px] before:top-1 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-border before:to-transparent">
        <div className="space-y-2">
          {claims.map((c) => {
            const isOpen = openId === c.id;
            const claimEvidence = evidence.filter((e) => e.claim_id === c.id);
            return (
              <div key={c.id} className="relative before:absolute before:content-[''] before:left-[-9px] before:top-6 before:h-px before:w-[9px] before:bg-border">
                {isOpen ? (
                  <div className="rounded-2xl border border-border bg-card/60 p-3.5">
                    <StoneRead
                      claim={c}
                      evidence={claimEvidence}
                      call={calls[c.id] ?? null}
                      onSetCall={(call) => setCall(c.id, call)}
                      onGoDeeper={() => setDeeperId(c.id)}
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setOpenId(null)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => flag(c.id, c.text)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-amber-300"
                      >
                        <Flag className="h-3.5 w-3.5" /> Something off? Flag it
                      </button>
                    </div>
                  </div>
                ) : (
                  <ConsiderationStone claim={c} evidence={claimEvidence} expanded={false} onToggle={() => setOpenId(c.id)} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {claims.length > 0 && (
        <p className="mt-4 text-center text-[10.5px] leading-relaxed tracking-[0.02em] text-muted-foreground">
          Tap a consideration to see the evidence. A claim wrong or out of date?
          <button type="button" onClick={() => flag(claims[0].id, decisionCase.statement)} className="ml-1 underline underline-offset-2 transition-colors hover:text-foreground">
            Flag it
          </button>{' '}
          and CTRL re-checks it.
        </p>
      )}

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

// Starter decisions any leader is likely weighing, lightly tailored by the
// leader's role/sector (read from the brain). Lets a leader with nothing pinned
// start a real decision in one tap instead of facing a blank page.
const STARTER_DECISIONS = [
  'Should we build our own AI agents, or buy off the shelf?',
  'Where should AI take work off my team first?',
  'Which AI vendor should we standardise the company on?',
];

function CasePicker({ onPick }: { onPick: (id: string) => void }) {
  const navigate = useNavigate();
  const { cases, loading } = useDecisionInbox();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from('user_memory')
        .select('fact_value')
        .in('fact_category', ['identity', 'role', 'business'])
        .eq('is_current', true)
        .order('importance', { ascending: false, nullsFirst: false })
        .limit(1);
      if (!active) return;
      const v = (data as { fact_value: string }[] | null)?.[0]?.fact_value;
      if (v) setRole(v);
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-[18px] border border-dashed border-border bg-card/50 p-6 text-center">
          <MapIcon className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-balance text-sm text-foreground">You have not pinned a decision yet.</p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {role ? `Leaders like you${role ? ` (${role})` : ''} are often weighing one of these.` : 'Leaders are often weighing one of these.'} Pick one to map it out, or run your own from Decide.
          </p>
        </div>
        <div className="space-y-2">
          {STARTER_DECISIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => navigate('/decision', { state: { prefill: s } })}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/30 hover:bg-accent/[0.04]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-accent/30 bg-accent/[0.08] text-accent">
                <Compass className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-foreground">{s}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
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
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/50"
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
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinked = searchParams.get('case');
  const [picked, setPicked] = useState<string | null>(null);
  const caseId = deepLinked || picked;

  const change = useCallback(() => {
    setPicked(null);
    if (deepLinked) {
      const next = new URLSearchParams(searchParams);
      next.delete('case');
      setSearchParams(next, { replace: true });
    }
  }, [deepLinked, searchParams, setSearchParams]);

  const inner = caseId ? <MapBody caseId={caseId} onChange={change} /> : <CasePicker onPick={setPicked} />;

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Workspace" title="How your decision holds up">
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
        <div className="mx-auto w-full max-w-3xl space-y-5 py-4">
          {inner}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
