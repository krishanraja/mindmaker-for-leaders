import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, GitFork, Loader2, Lock, Map as MapIcon } from 'lucide-react';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useDevice } from '@/hooks/useDevice';
import { cn } from '@/lib/utils';
import {
  useDecisionEngine,
  type DecisionClaim,
  type Verdict,
} from '@/hooks/useDecisionEngine';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';

const SUBTITLE = 'A bet, decomposed. Each consideration shows where the evidence stands - and where only you can answer.';

// The evidence vocabulary (the locked numerical-first set), mapped from the engine verdict.
const STONE: Record<Verdict, { label: string; ring: string; text: string }> = {
  supported: { label: 'Holds', ring: 'border-emerald-500/30 bg-emerald-500/[0.06]', text: 'text-emerald-300' },
  contested: { label: 'Contested', ring: 'border-amber-500/30 bg-amber-500/[0.06]', text: 'text-amber-300' },
  unverified: { label: 'Thin', ring: 'border-border bg-foreground/[0.03]', text: 'text-muted-foreground' },
  unverifiable: { label: 'Assumption', ring: 'border-indigo-500/30 bg-indigo-500/[0.06]', text: 'text-indigo-300' },
  pending: { label: 'Checking', ring: 'border-border bg-secondary/40', text: 'text-muted-foreground' },
};

// Source reliability: an "unverifiable" consideration cannot be answered by external evidence -
// only the leader can. The cardinal honesty rule, surfaced.
function isOnlyYou(c: DecisionClaim): boolean {
  return c.verdict === 'unverifiable';
}

function ConsiderationStone({ claim, expanded, onToggle }: { claim: DecisionClaim; expanded: boolean; onToggle: () => void }) {
  const onlyYou = isOnlyYou(claim);
  const stone = STONE[claim.verdict] ?? STONE.pending;
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'w-full rounded-xl border p-3.5 text-left transition-colors',
        onlyYou ? 'border-border bg-foreground/[0.03]' : stone.ring,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
            onlyYou ? 'border-border text-muted-foreground' : cn('border-border', stone.text),
          )}
          aria-hidden
        >
          {onlyYou ? <Lock className="h-3.5 w-3.5" /> : <GitFork className="h-3.5 w-3.5 rotate-90" />}
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{claim.text}</span>
        <span className="shrink-0 self-center">
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-10 text-[11px]">
        {onlyYou ? (
          <span className="font-medium text-muted-foreground">Only you can answer</span>
        ) : (
          <span className={cn('font-semibold', stone.text)}>{stone.label}</span>
        )}
        {claim.is_load_bearing && <span className="text-muted-foreground">load-bearing</span>}
      </div>
      {expanded && claim.rationale && (
        <p className="mt-3 pl-10 text-xs leading-relaxed text-muted-foreground">{claim.rationale}</p>
      )}
    </motion.button>
  );
}

function MapBody({ caseId }: { caseId: string }) {
  const { decisionCase, claims, isRunning, load } = useDecisionEngine();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    load(caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const tally = useMemo(() => {
    const loadBearing = claims.filter((c) => c.is_load_bearing).length;
    const onlyYou = claims.filter(isOnlyYou).length;
    const external = claims.length - onlyYou;
    return { loadBearing, onlyYou, external };
  }, [claims]);

  if (!decisionCase) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* The bet */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground" aria-hidden>
            <GitFork className="h-4 w-4 rotate-90" />
          </span>
          <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-foreground">
            {decisionCase.statement}
          </h2>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-10 text-[11px] text-muted-foreground">
          <span><span className="font-medium text-foreground">{tally.loadBearing}</span> carry this</span>
          <span className="inline-flex items-center gap-1 text-emerald-300/80">{tally.external} external</span>
          <span className="inline-flex items-center gap-1 text-amber-300/80">{tally.onlyYou} only you</span>
          {isRunning && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> updating</span>}
        </div>
      </div>

      {/* The spine */}
      <div className="mt-3 space-y-2">
        {claims.map((c) => (
          <ConsiderationStone key={c.id} claim={c} expanded={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} />
        ))}
      </div>
      {claims.length > 0 && <p className="mt-4 text-center text-[11px] text-muted-foreground">Tap a consideration to go deeper</p>}
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
  const [caseId, setCaseId] = useState<string | null>(null);

  const inner = caseId ? <MapBody caseId={caseId} /> : <CasePicker onPick={setCaseId} />;

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
