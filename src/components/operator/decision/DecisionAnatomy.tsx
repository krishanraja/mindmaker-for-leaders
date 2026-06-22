/**
 * DecisionAnatomy - the Decisions tab's front door: the in-depth, friendly,
 * VISUAL anatomy of one decision. Replaces the cramped list + truncated orange
 * alert box. One decision in focus, with everything that feeds the call laddered
 * up plainly:
 *
 *   THE CALL hero (recommendation + trust % + bar)
 *   |
 *   the LADDER - one rung per claim the call rests on, each showing in plain
 *   language: a status chip (Holds up / Contested / ...), the claim, a little
 *   evidence meter (how many sources back it vs push back), and the honest hero
 *   number when there is one. Tap a rung -> the full evidence sheet.
 *
 * An open watch alert for this decision folds in as a small inline chip (the old
 * orange box is gone). A quiet switcher lets the leader open another decision or
 * weigh a new one - the long list is demoted, never the front door.
 *
 * Honest by construction: holds/breaks/ladder all come from the REAL engine
 * output (claim verdicts + real decision_evidence rows); the trust % is the real
 * `confidence`; an `unverifiable` claim is never dressed up as "Holds up"; a
 * modelled number always wears the "est." mark.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ChevronRight, Layers, Plus, RotateCcw, X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { useDecisionEngine, DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';
import type { DecisionCaseSummary, OpenAlert } from '@/hooks/useDecisionInbox';
import { VERDICT_STYLE, firstClause } from './decisionParts';
import { ClaimSheet } from './DecisionResultView';

type Engine = ReturnType<typeof useDecisionEngine>;

// Rung order: the hinge (breakpoint) first, then the rest of the load-bearing
// claims, then supporting context. Keeps the ladder reading top-down "what the
// call rests on most".
const VERDICT_RANK: Record<DecisionClaim['verdict'], number> = {
  contested: 0, supported: 1, unverifiable: 2, unverified: 3, pending: 4,
};

function evidenceCounts(evidence: DecisionEvidence[]) {
  let backs = 0;
  let against = 0;
  for (const e of evidence) {
    if (e.stance === 'supports') backs += 1;
    else if (e.stance === 'refutes') against += 1;
  }
  return { backs, against, total: evidence.length };
}

// A tiny, friendly evidence meter: emerald pips for sources that back the claim,
// rose pips for sources that push back. Capped so a long list stays calm.
function EvidenceMeter({ backs, against }: { backs: number; against: number }) {
  if (backs === 0 && against === 0) {
    return <span className="text-[11px] text-muted-foreground">Only you can answer this one</span>;
  }
  const pips = (n: number, cls: string) =>
    Array.from({ length: Math.min(n, 5) }).map((_, i) => (
      <span key={i} className={cn('h-[6px] w-[6px] rounded-full', cls)} />
    ));
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {backs > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="flex gap-[3px]">{pips(backs, 'bg-accent shadow-[0_0_5px_hsl(var(--accent)/0.6)]')}</span>
          <span className="text-[11px] text-muted-foreground">{backs} back{backs === 1 ? 's' : ''} it</span>
        </span>
      )}
      {against > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="flex gap-[3px]">{pips(against, 'bg-rose-400/80')}</span>
          <span className="text-[11px] text-muted-foreground">{against} push{against === 1 ? 'es' : ''} back</span>
        </span>
      )}
    </span>
  );
}

function LadderRung({
  claim, evidence, isHinge, onOpen,
}: {
  claim: DecisionClaim;
  evidence: DecisionEvidence[];
  isHinge: boolean;
  onOpen: () => void;
}) {
  const v = VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.pending;
  const { backs, against } = evidenceCounts(evidence);
  const num = claim.reaction_value;
  const est = claim.reaction_kind === 'modelled';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-stretch gap-3 rounded-2xl border border-border bg-[linear-gradient(180deg,#0f141c,#0a0e13)] p-3.5 text-left transition-colors hover:border-accent/30"
    >
      {/* the rung rail - emerald when it holds, amber when contested, neutral else */}
      <span
        className={cn(
          'w-1 flex-none rounded-full',
          claim.verdict === 'supported' ? 'bg-accent' : claim.verdict === 'contested' ? 'bg-amber-400' : 'bg-muted-foreground/40',
        )}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', v.cls)}>
            <v.Icon className={cn('h-3 w-3', claim.verdict === 'pending' && 'animate-spin')} />
            {v.label}
          </span>
          {isHinge && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-accent">
              The hinge
            </span>
          )}
          {num && (
            <span className="ml-auto inline-flex items-baseline gap-1 text-accent">
              {est && <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">est.</span>}
              <b className="text-[15px] font-bold leading-none tabular-nums">{num}</b>
            </span>
          )}
        </span>
        <span className="text-[13px] font-semibold leading-snug text-foreground/90 [overflow-wrap:anywhere]">
          {firstClause(claim.text, 140)}
        </span>
        <span className="flex items-center justify-between gap-2">
          <EvidenceMeter backs={backs} against={against} />
          <ChevronRight className="h-3.5 w-3.5 flex-none text-muted-foreground transition-colors group-hover:text-foreground" />
        </span>
      </span>
    </button>
  );
}

function SwitcherSheet({
  open, onOpenChange, cases, currentId, onSwitch,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cases: DecisionCaseSummary[];
  currentId: string | null;
  onSwitch: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[72vh] overflow-y-auto rounded-t-2xl scrollbar-hide sm:mx-auto sm:max-w-lg">
        <SheetTitle className="mb-3 text-[15px] font-bold text-foreground">Your decisions</SheetTitle>
        <ul className="space-y-2 pb-2">
          {cases.map((c) => {
            const pct = c.confidence != null ? Math.round(c.confidence * 100) : null;
            const active = c.id === currentId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { onSwitch(c.id); onOpenChange(false); }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                    active ? 'border-accent/40 bg-accent/[0.06]' : 'border-border bg-foreground/[0.02] hover:border-accent/30',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground">{c.title || c.statement}</span>
                  </span>
                  {pct != null && (
                    <span className="flex-none text-[12px] font-bold tabular-nums text-accent">{pct}%</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

export function DecisionAnatomy({
  engine,
  cases,
  alert,
  onReWeigh,
  onAcknowledgeAlert,
  onSwitch,
  onCompose,
  onBank,
  banked,
  banking,
  isDesktop = false,
}: {
  engine: Engine;
  cases: DecisionCaseSummary[];
  alert: OpenAlert | null;
  onReWeigh: () => void;
  onAcknowledgeAlert: (id: string) => void;
  onSwitch: (id: string) => void;
  onCompose: () => void;
  onBank: () => void;
  banked: boolean;
  banking: boolean;
  isDesktop?: boolean;
}) {
  const { decisionCase, claims, evidence } = engine;
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const evByClaim = (id: string) => evidence.filter((e) => e.claim_id === id);
  const hingeId = decisionCase?.breakpoint_assumption_id ?? null;

  // ladder order: the hinge first, then load-bearing, then by verdict rank.
  const ladder = useMemo(() => {
    return [...claims].sort((a, b) => {
      if (a.id === hingeId) return -1;
      if (b.id === hingeId) return 1;
      const lb = Number(b.is_load_bearing) - Number(a.is_load_bearing);
      if (lb !== 0) return lb;
      return VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
    });
  }, [claims, hingeId]);

  if (!decisionCase) return null;
  const pct = decisionCase.confidence != null ? Math.round(decisionCase.confidence * 100) : null;
  const theCall = decisionCase.recommendation || decisionCase.title || decisionCase.statement;
  const openClaim = openClaimId ? claims.find((c) => c.id === openClaimId) ?? null : null;

  const AlertChip = alert ? (
    <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/[0.07] px-3 py-2.5">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
      <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-foreground/90">
        <span className="font-semibold text-amber-200">{alert.headline}</span>
      </p>
      <button
        type="button"
        onClick={onReWeigh}
        className="flex-none rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition-colors hover:bg-amber-500/20"
      >
        <RotateCcw className="mr-1 inline h-3 w-3" />Re-weigh
      </button>
      <button
        type="button"
        onClick={() => onAcknowledgeAlert(alert.id)}
        aria-label="Dismiss"
        className="flex-none text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : null;

  const Call = (
    <div className="relative shrink-0 overflow-hidden rounded-[20px] border border-accent/30 bg-gradient-to-b from-card to-background p-[18px] shadow-[0_30px_60px_-34px_rgba(0,0,0,0.95)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_88%_-10%,hsl(var(--accent)/0.14),transparent_60%)]" />
      <div className="relative mb-3 flex items-center gap-2">
        <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-accent">The call</span>
        {pct != null && (
          <span className="ml-auto flex items-baseline gap-1.5">
            <b className="text-[21px] font-bold leading-none text-accent tabular-nums [text-shadow:0_0_16px_hsl(var(--accent)/0.45)] sm:text-[26px]">{pct}%</b>
            <span className="text-[8.5px] uppercase tracking-wide text-muted-foreground">holds up</span>
          </span>
        )}
      </div>
      <h2 className={cn('relative font-extrabold leading-snug tracking-tight text-foreground text-balance', isDesktop ? 'text-[23px]' : 'text-[18.5px]')}>{theCall}</h2>
      {pct != null && (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
          <motion.i className="block h-full rounded-full bg-gradient-to-r from-accent/55 to-accent shadow-[0_0_14px_hsl(var(--accent)/0.55)]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
        </div>
      )}
    </div>
  );

  const LadderHeader = (
    <div className="flex shrink-0 items-center gap-2 pt-0.5">
      <Layers className="h-3.5 w-3.5 text-accent" />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        What the call rests on
      </span>
      <span className="text-[10px] font-bold text-accent">&middot; {ladder.length}</span>
    </div>
  );

  const Ladder = (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto scrollbar-hide pb-1">
      {ladder.length === 0 && (
        <p className="text-[12.5px] text-muted-foreground">I am still breaking this one down. Check back in a moment.</p>
      )}
      {ladder.map((c) => (
        <LadderRung
          key={c.id}
          claim={c}
          evidence={evByClaim(c.id)}
          isHinge={c.id === hingeId}
          onOpen={() => setOpenClaimId(c.id)}
        />
      ))}
    </div>
  );

  const Actions = (
    <div className="flex shrink-0 gap-2.5 pt-3">
      <button
        type="button"
        onClick={() => setSwitcherOpen(true)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-border bg-secondary px-3 py-3 text-[13px] font-bold text-foreground/90 transition-colors hover:border-accent/30 hover:text-foreground"
        disabled={cases.length <= 1}
      >
        <Layers className="h-3.5 w-3.5" />Your decisions{cases.length > 1 ? ` (${cases.length})` : ''}
      </button>
      <button
        type="button"
        onClick={onCompose}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-gradient-to-b from-accent to-accent px-3 py-3 text-[13px] font-bold text-accent-foreground shadow-[0_12px_26px_-12px_hsl(var(--accent)/0.5)]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={3} />Weigh a new one
      </button>
    </div>
  );

  const BankRow = !banked ? (
    <button
      type="button"
      onClick={onBank}
      disabled={banking}
      className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/[0.07] px-3 py-2.5 text-[12px] font-bold text-accent transition-colors hover:bg-accent/[0.12] disabled:opacity-70"
    >
      {banking ? 'Banking...' : 'Bank this call to your History'}
    </button>
  ) : (
    <p className="shrink-0 text-center text-[11.5px] text-muted-foreground">Banked to your History. I will track how it ages.</p>
  );

  const sheet = (
    <>
      <ClaimSheet claim={openClaim} evidence={openClaim ? evByClaim(openClaim.id) : []} onClose={() => setOpenClaimId(null)} />
      <SwitcherSheet open={switcherOpen} onOpenChange={setSwitcherOpen} cases={cases} currentId={decisionCase.id} onSwitch={onSwitch} />
    </>
  );

  // ---- DESKTOP: two zones - the call + bank on the left, the ladder on the right
  if (isDesktop) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        {AlertChip}
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-4">
          <div className="flex min-h-0 flex-col gap-3">
            {Call}
            {BankRow}
            <div className="mt-auto">{Actions}</div>
          </div>
          <div className="flex min-h-0 flex-col gap-2.5">
            {LadderHeader}
            {Ladder}
          </div>
        </div>
        {sheet}
      </div>
    );
  }

  // ---- MOBILE: one thumb-first column; the ladder scrolls, depth in the sheet
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {AlertChip}
      {Call}
      {LadderHeader}
      {Ladder}
      {BankRow}
      {Actions}
      {sheet}
    </div>
  );
}
