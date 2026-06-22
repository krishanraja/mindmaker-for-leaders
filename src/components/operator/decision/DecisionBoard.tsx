/**
 * DecisionBoard - the WARM state: your decisions in play.
 *
 * Faithful to prototypes/decisions-2028.html (.live / .dwarm): the live
 * pressure-tests as calm cards (a Ready card shows its trust read; one still
 * pressure-testing shows a working pill + a quiet "what I'm doing" line) above a
 * slim fast-capture bar that collapses the big cold input to one tap. Mobile is a
 * single scrolling column of cards with the capture pinned; desktop is a slim
 * capture on top of a two-up board with room to breathe.
 *
 * Driven by the real decision inbox (useDecisionInbox cases). A `complete` case
 * is Ready (its confidence is the trust read); anything mid-pipeline is
 * Pressure-testing. Tapping a Ready card opens it (loads the real case). All from
 * ctrl-ds tokens; reduced-motion safe.
 */

import { formatDistanceToNow } from 'date-fns';
import { Mic, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionCaseSummary } from '@/hooks/useDecisionInbox';

function CaseCard({ c, onOpen, isDesktop }: { c: DecisionCaseSummary; onOpen: (id: string) => void; isDesktop?: boolean }) {
  const ready = c.stage === 'complete';
  const failed = c.stage === 'error';
  const pct = c.confidence != null ? Math.round(c.confidence * 100) : null;
  const when = formatDistanceToNow(new Date(c.created_at), { addSuffix: true });

  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      className="group relative overflow-hidden rounded-[18px] border border-border bg-gradient-to-b from-card to-background p-4 text-left transition-all hover:-translate-y-px hover:border-accent/30"
    >
      <div className="mb-2.5 flex items-center gap-2">
        {ready ? (
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-[3px] text-[8px] font-bold uppercase tracking-wide text-accent">Ready</span>
        ) : failed ? (
          <span className="rounded-full border border-border bg-foreground/5 px-2 py-[3px] text-[8px] font-bold uppercase tracking-wide text-muted-foreground">Did not finish</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/5 px-2 py-[3px] text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            <span className="h-2 w-2 rounded-full border-[1.6px] border-muted-foreground border-t-accent motion-safe:animate-spin" />
            Checking
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/70">{ready ? `weighed ${when}` : `started ${when}`}</span>
      </div>
      <h3 className={cn('font-bold leading-snug tracking-tight text-foreground', isDesktop ? 'text-base' : 'text-[15px]')}>{c.title || c.statement}</h3>
      {ready && pct != null ? (
        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
            <i className="block h-full rounded-full bg-gradient-to-r from-accent/55 to-accent shadow-[0_0_12px_hsl(var(--accent)/0.5)]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[15px] font-bold text-accent tabular-nums [text-shadow:0_0_14px_hsl(var(--accent)/0.45)]">{pct}%</span>
        </div>
      ) : !ready && !failed ? (
        <p className="mt-2.5 text-[11.5px] leading-snug text-muted-foreground">Checking this against real sources. I'll have an answer shortly.</p>
      ) : null}
    </button>
  );
}

function FastCapture({ onNew, isDesktop }: { onNew: () => void; isDesktop?: boolean }) {
  return (
    <button
      type="button"
      onClick={onNew}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border border-border bg-gradient-to-b from-card to-background text-left transition-colors hover:border-accent/30',
        isDesktop ? 'px-4 py-3.5' : 'px-3.5 py-3.5',
      )}
    >
      <span className="grid place-items-center text-muted-foreground"><Mic className="h-[18px] w-[18px]" /></span>
      <span className={cn('min-w-0 flex-1 text-muted-foreground', isDesktop ? 'text-sm' : 'text-[13.5px]')}>Weigh another decision...</span>
      <span className="grid h-[34px] w-[34px] place-items-center rounded-[11px] border border-accent/30 bg-accent/10 text-accent"><Plus className="h-[15px] w-[15px]" strokeWidth={2.2} /></span>
    </button>
  );
}

export function DecisionBoard({
  cases,
  onOpen,
  onNew,
  isDesktop = false,
}: {
  cases: DecisionCaseSummary[];
  onOpen: (id: string) => void;
  onNew: () => void;
  isDesktop?: boolean;
}) {
  const openCount = cases.filter((c) => c.stage !== 'complete' && c.stage !== 'error').length;

  // ---- DESKTOP: slim capture on top, two-up board below --------------------
  if (isDesktop) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0"><FastCapture onNew={onNew} isDesktop /></div>
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-baseline justify-between px-0.5 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your decisions</span>
            <span className="text-xs text-muted-foreground/70">{cases.length} total{openCount > 0 ? `, ${openCount} open` : ''}</span>
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3.5 overflow-y-auto scrollbar-hide">
            {cases.map((c) => <CaseCard key={c.id} c={c} onOpen={onOpen} isDesktop />)}
          </div>
        </div>
      </div>
    );
  }

  // ---- MOBILE: a scrolling column of cards + a pinned fast capture ----------
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-baseline justify-between px-0.5 pb-2.5">
        <span className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground">Your decisions</span>
        <span className="text-[11px] text-muted-foreground/70">{cases.length} total{openCount > 0 ? `, ${openCount} open` : ''}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto scrollbar-hide pb-0.5">
        {cases.map((c) => <CaseCard key={c.id} c={c} onOpen={onOpen} />)}
      </div>
      <div className="shrink-0 pt-3"><FastCapture onNew={onNew} /></div>
    </div>
  );
}
