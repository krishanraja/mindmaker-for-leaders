import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, GitFork, Loader2, Map as MapIcon } from 'lucide-react';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useDevice } from '@/hooks/useDevice';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { ConsiderationStone, isOnlyYou } from '@/components/decision-map/ConsiderationStone';
import { ContestLongPress } from '@/contexts/ContestProvider';

const SUBTITLE = 'A bet, decomposed. Each consideration shows where the evidence stands - and where only you can answer.';

function MapBody({ caseId }: { caseId: string }) {
  const { decisionCase, claims, evidence, isRunning, load } = useDecisionEngine();
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
          <ContestLongPress
            key={c.id}
            target={{ target_type: 'decision_claim', target_id: c.id, element: c.text, surface: '/decision-map' }}
          >
            <ConsiderationStone
              claim={c}
              evidence={evidence.filter((e) => e.claim_id === c.id)}
              expanded={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
            />
          </ContestLongPress>
        ))}
      </div>
      {claims.length > 0 && <p className="mt-4 text-center text-[11px] text-muted-foreground">Tap to go deeper &middot; press &amp; hold to flag</p>}
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
