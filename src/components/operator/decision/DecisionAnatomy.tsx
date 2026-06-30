/**
 * DecisionAnatomy - the Decisions tab's front door when you open an existing
 * decision for review. Approved redesign: prototypes/decisions-anatomy-2028.html.
 *
 * The old layout led with the full multi-sentence recommendation as a hero, which
 * ate the whole phone viewport and pushed everything the decision rests on below
 * the fold. The fix reframes the screen around its real substance:
 *
 *   SPINE   - a thin, sticky card: the decision in one line + a compact trust
 *             gauge. Tap it and the full answer unfolds in place (the answer, what
 *             would change my mind, what to check next). On scroll it collapses to
 *             a slim status bar, handing the height back to the ladder.
 *   LADDER  - "what this is based on" becomes the hero of the screen: a plain,
 *             filterable list of every point the answer rests on. Each row opens
 *             its sources INLINE (no bottom-sheet hop), so nothing hides under
 *             another component.
 *   SHELF   - pinned actions (save / your other decisions / weigh a new one).
 *
 * Copy is plain English for a non-technical first-time reader (no "Holds" /
 * "Contested" / "Bank"). Honest by construction: every row, number, and source
 * comes from the REAL engine output; an unverifiable claim is never dressed up as
 * confirmed; a modelled number always wears the "est." mark. Haptics fire on each
 * reveal (real on Android, silently ignored elsewhere).
 */

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown, ChevronRight, Layers, Check, ShieldCheck, Search, Swords, Loader2,
  Sparkles, Plus, ArrowRightLeft,
} from 'lucide-react';
import type { ResearchMode } from '@/hooks/useDecisionEngine';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { useDecisionEngine, DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';
import type { DecisionCaseSummary } from '@/hooks/useDecisionInbox';
import { VERDICT_STYLE, verdictBucket, emptyEvidenceMessage, type VerdictBucket } from './decisionParts';
import { EvidenceList } from './EvidenceList';

type Engine = ReturnType<typeof useDecisionEngine>;

// Ladder order: the most important point (the breakpoint) first, then the rest of
// the load-bearing points, then supporting context.
const VERDICT_RANK: Record<DecisionClaim['verdict'], number> = {
  contested: 0, supported: 1, unverifiable: 2, unverified: 3, pending: 4,
};

// The filter segments, plain English. "All" plus the three buckets.
const SEGMENTS: { key: 'all' | VerdictBucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'checks', label: 'Checks out' },
  { key: 'unsure', label: 'Unsure' },
  { key: 'yours', label: 'Your call' },
];

// The action-oriented moves a finished decision offers: firm up the case, dig
// deeper, or actively look for the case against. Plain labels, no jargon.
const RESEARCH_ACTIONS: { mode: ResearchMode; label: string; desc: string; Icon: typeof ShieldCheck }[] = [
  { mode: 'strengthen', label: 'Strengthen', desc: 'Firm up the case for it with more backing.', Icon: ShieldCheck },
  { mode: 'research_more', label: 'Research more', desc: 'Dig wider for anything I might have missed.', Icon: Search },
  { mode: 'counter_evidence', label: 'Counter-points', desc: 'Actively look for the case against.', Icon: Swords },
];

function evidenceCounts(evidence: DecisionEvidence[]) {
  let backs = 0;
  let against = 0;
  for (const e of evidence) {
    if (e.stance === 'supports') backs += 1;
    else if (e.stance === 'refutes') against += 1;
  }
  return { backs, against };
}

/* ------------------------------------------------------------------ */
/* The trust gauge: a compact ring around the confidence %.            */
/* ------------------------------------------------------------------ */
function TrustGauge({ pct, compact }: { pct: number | null; compact: boolean }) {
  const size = compact ? 34 : 46;
  const r = compact ? 14 : 19;
  const c = 2 * Math.PI * r;
  const off = pct != null ? c * (1 - pct / 100) : c;
  return (
    <span className="relative grid flex-none place-items-center transition-all" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground)/0.08)" strokeWidth={4} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--accent))" strokeWidth={4} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }}
          transition={{ duration: 0.7, ease: 'easeOut' }} style={{ filter: 'drop-shadow(0 0 5px hsl(var(--accent)/0.6))' }}
        />
      </svg>
      <b className={cn('font-bold tabular-nums text-accent', compact ? 'text-[11px]' : 'text-[14px]')} style={{ textShadow: '0 0 12px hsl(var(--accent)/0.4)' }}>
        {pct != null ? pct : '?'}
      </b>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* One ladder row: a point the answer rests on, with inline evidence.  */
/* ------------------------------------------------------------------ */
function LadderRung({
  claim, evidence, isHinge, open, onToggle,
}: {
  claim: DecisionClaim;
  evidence: DecisionEvidence[];
  isHinge: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const v = VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.pending;
  const { backs, against } = evidenceCounts(evidence);
  const num = claim.reaction_value;
  const est = claim.reaction_kind === 'modelled';

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,#0f141c,#0a0e13)] transition-colors', open ? 'border-accent/30' : 'border-border')}>
      <button type="button" onClick={onToggle} className="flex w-full items-stretch gap-3 p-3.5 text-left" aria-expanded={open}>
        {/* the rail: emerald when it checks out, amber when it does not add up, neutral otherwise */}
        <span
          className={cn('w-1 flex-none rounded-full',
            claim.verdict === 'supported' ? 'bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.5)]'
              : claim.verdict === 'contested' ? 'bg-amber-400 shadow-[0_0_8px_rgba(224,161,58,0.5)]'
              : 'bg-muted-foreground/40')}
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
                Most important
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
            {claim.text}
          </span>
          <span className="flex items-center justify-between gap-2">
            <EvidenceMeter backs={backs} against={against} />
            <ChevronRight className={cn('h-3.5 w-3.5 flex-none text-muted-foreground transition-transform', open && 'rotate-90 text-accent')} />
          </span>
        </span>
      </button>

      {/* inline evidence - opens in place, nothing hidden behind a sheet */}
      <div className={cn('grid transition-all duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t border-border p-3.5">
            {claim.rationale && <p className="text-[11.5px] leading-relaxed text-muted-foreground text-pretty">{claim.rationale}</p>}
            <EvidenceList evidence={evidence} emptyMessage={emptyEvidenceMessage(claim.type)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceMeter({ backs, against }: { backs: number; against: number }) {
  if (backs === 0 && against === 0) {
    return <span className="text-[11px] text-muted-foreground">Only you can answer this one</span>;
  }
  const pips = (n: number, cls: string) =>
    Array.from({ length: Math.min(n, 5) }).map((_, i) => <span key={i} className={cn('h-[6px] w-[6px] rounded-full', cls)} />);
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {backs > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="flex gap-[3px]">{pips(backs, 'bg-accent shadow-[0_0_5px_hsl(var(--accent)/0.6)]')}</span>
          <span className="text-[11px] text-muted-foreground">{backs === 1 ? '1 supports' : `${backs} support`}</span>
        </span>
      )}
      {against > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="flex gap-[3px]">{pips(against, 'bg-rose-400/80')}</span>
          <span className="text-[11px] text-muted-foreground">{against === 1 ? '1 counters' : `${against} counter`}</span>
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* The spine: thin decision line + gauge, tap to unfold the answer.    */
/* ------------------------------------------------------------------ */
function Spine({
  statement, answer, counter, validateNext, reframeNote, pct, open, collapsed, onToggle, isDesktop,
}: {
  statement: string;
  answer: string | null;
  counter: string | null;
  validateNext: string[] | null;
  reframeNote: string | null;
  pct: number | null;
  open: boolean;
  collapsed: boolean;
  onToggle: () => void;
  isDesktop: boolean;
}) {
  const showFull = open && !collapsed;
  return (
    <div
      onClick={onToggle}
      className={cn(
        'relative cursor-pointer overflow-hidden border border-accent/30 bg-gradient-to-b from-card to-background shadow-[0_24px_50px_-34px_rgba(0,0,0,0.95)] transition-all',
        collapsed ? 'rounded-2xl px-3.5 py-2.5' : 'rounded-[20px] p-[15px]',
        isDesktop && 'cursor-default',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_90%_-10%,hsl(var(--accent)/0.13),transparent_60%)]" />
      <div className="relative flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {!collapsed && (
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-accent">
              Your current decision
            </p>
          )}
          <h2
            className={cn(
              'font-extrabold leading-snug tracking-tight text-foreground text-balance',
              collapsed ? 'line-clamp-1 text-[13px]' : isDesktop ? 'mt-1.5 text-[21px]' : 'mt-1.5 text-[16.5px]',
            )}
          >
            {statement}
          </h2>
        </div>
        <TrustGauge pct={pct} compact={collapsed} />
      </div>

      {/* the "read my full answer" handle (hidden once collapsed), left-aligned
          under the decision so it reads as part of the same column */}
      {!collapsed && (
        <div className="relative mt-2.5 flex items-center justify-start gap-1.5 text-[10.5px] font-semibold text-muted-foreground">
          {showFull ? 'Hide the answer' : 'Read my full answer'}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showFull && 'rotate-180')} />
        </div>
      )}

      {/* the full answer, unfolded in place */}
      <div className={cn('relative grid transition-all duration-300 ease-out', showFull ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 text-pretty">
            {reframeNote && (
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/90">How I looked at it: </span>{reframeNote}
              </p>
            )}
            {answer && (
              <div>
                <p className="text-[8.5px] font-bold uppercase tracking-wide text-muted-foreground">My answer</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/85">{answer}</p>
              </div>
            )}
            {counter && (
              <div>
                <p className="text-[8.5px] font-bold uppercase tracking-wide text-muted-foreground">What would change my mind</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/85">{counter}</p>
              </div>
            )}
            {validateNext && validateNext.length > 0 && (
              <div>
                <p className="text-[8.5px] font-bold uppercase tracking-wide text-muted-foreground">What to check next</p>
                <ul className="mt-1.5 space-y-1.5">
                  {validateNext.map((n, i) => (
                    <li key={i} className="relative pl-4 text-[12px] leading-snug text-foreground/85">
                      <span className="absolute left-0 top-[7px] h-[5px] w-[5px] rounded-full bg-accent shadow-[0_0_6px_hsl(var(--accent))]" />{n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "Take it further": the secondary moves, off the page in a sheet so   */
/* the decision content owns the screen and one closing action stays    */
/* pinned. Mirrors the SwitcherSheet's bottom-sheet styling.            */
/* ------------------------------------------------------------------ */
function DecisionActionsSheet({
  open, onOpenChange, researching, onResearch, onCompose, onSwitchDecisions, casesCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  researching: boolean;
  onResearch: (mode: ResearchMode) => void;
  onCompose: () => void;
  onSwitchDecisions: () => void;
  casesCount: number;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[72vh] overflow-y-auto rounded-t-2xl scrollbar-hide sm:mx-auto sm:max-w-lg">
        <SheetTitle className="mb-3 text-[15px] font-bold text-foreground">Take it further</SheetTitle>
        <div className="flex flex-col gap-2 pb-2">
          {RESEARCH_ACTIONS.map((a) => (
            <button
              key={a.mode}
              type="button"
              disabled={researching}
              onClick={() => { onResearch(a.mode); onOpenChange(false); }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-foreground/[0.02] p-3 text-left transition-colors hover:border-accent/30 disabled:opacity-50"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-accent/[0.08]">
                {researching ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <a.Icon className="h-4 w-4 text-accent" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-foreground">{a.label}</span>
                <span className="block text-[11.5px] leading-snug text-muted-foreground">{a.desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 flex-none text-muted-foreground/50" />
            </button>
          ))}

          <span className="my-1 h-px bg-border" aria-hidden />

          <button
            type="button"
            onClick={() => { onCompose(); onOpenChange(false); }}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-foreground/[0.02] p-3 text-left transition-colors hover:border-accent/30"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-accent/[0.08]">
              <Plus className="h-4 w-4 text-accent" />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-bold text-foreground">Weigh a new one</span>
            <ChevronRight className="h-4 w-4 flex-none text-muted-foreground/50" />
          </button>

          {casesCount > 1 && (
            <button
              type="button"
              onClick={onSwitchDecisions}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-foreground/[0.02] p-3 text-left transition-colors hover:border-accent/30"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-accent/[0.08]">
                <ArrowRightLeft className="h-4 w-4 text-accent" />
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-bold text-foreground">Switch decision ({casesCount})</span>
              <ChevronRight className="h-4 w-4 flex-none text-muted-foreground/50" />
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* The "your other decisions" switcher (a navigation menu, not content) */
/* ------------------------------------------------------------------ */
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
        <SheetTitle className="mb-3 text-[15px] font-bold text-foreground">Your other decisions</SheetTitle>
        <ul className="space-y-2 pb-2">
          {cases.map((c) => {
            const pct = c.confidence != null ? Math.round(c.confidence * 100) : null;
            const active = c.id === currentId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { onSwitch(c.id); onOpenChange(false); }}
                  className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                    active ? 'border-accent/40 bg-accent/[0.06]' : 'border-border bg-foreground/[0.02] hover:border-accent/30')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground">{c.title || c.statement}</span>
                  </span>
                  {pct != null && <span className="flex-none text-[12px] font-bold tabular-nums text-accent">{pct}%</span>}
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
  engine, cases, onSwitch, onCompose, onResolve, isDesktop = false,
}: {
  engine: Engine;
  cases: DecisionCaseSummary[];
  onSwitch: (id: string) => void;
  onCompose: () => void;
  onResolve: () => void;
  isDesktop?: boolean;
}) {
  const { decisionCase, claims, evidence } = engine;
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | VerdictBucket>('all');
  // The spine starts open on desktop (room to breathe) and closed on mobile.
  const [callOpen, setCallOpen] = useState(isDesktop);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const evByClaim = (id: string) => evidence.filter((e) => e.claim_id === id);
  const hingeId = decisionCase?.breakpoint_assumption_id ?? null;

  const ladder = useMemo(() => {
    return [...claims].sort((a, b) => {
      if (a.id === hingeId) return -1;
      if (b.id === hingeId) return 1;
      const lb = Number(b.is_load_bearing) - Number(a.is_load_bearing);
      if (lb !== 0) return lb;
      return VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
    });
  }, [claims, hingeId]);

  const segCounts = useMemo(() => {
    const c = { all: claims.length, checks: 0, unsure: 0, yours: 0 } as Record<string, number>;
    for (const cl of claims) c[verdictBucket(cl.verdict)] += 1;
    return c;
  }, [claims]);

  const visible = useMemo(
    () => (filter === 'all' ? ladder : ladder.filter((c) => verdictBucket(c.verdict) === filter)),
    [ladder, filter],
  );

  if (!decisionCase) return null;
  const pct = decisionCase.confidence != null ? Math.round(decisionCase.confidence * 100) : null;
  // The spine leads with the decision itself; the recommendation is the answer
  // behind the tap.
  const statement = decisionCase.title || decisionCase.statement;
  const answer = decisionCase.recommendation;
  const reframeNote = decisionCase.reframed ? decisionCase.reframe_note ?? null : null;

  const toggleSpine = () => {
    if (isDesktop) { setCallOpen((o) => !o); haptics.light(); return; }
    if (collapsed) {
      // scroll back to the top, then open the answer
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setCollapsed(false);
      setCallOpen(true);
    } else {
      setCallOpen((o) => !o);
    }
    haptics.light();
  };

  const onScroll = () => {
    if (isDesktop) return;
    const top = scrollRef.current?.scrollTop ?? 0;
    // Hysteresis: collapse once past 64px, and don't expand again until back
    // under 16px. A single wide dead-band stops the collapse/expand oscillation
    // (the spine's height change nudged scrollTop back across a single 44px line,
    // which re-toggled it every frame and read as flicker).
    const next = collapsed ? top > 16 : top > 64;
    if (next !== collapsed) setCollapsed(next);
    if (next && callOpen) setCallOpen(false);
  };

  const pickFilter = (key: 'all' | VerdictBucket) => { setFilter(key); haptics.light(); };
  const toggleRung = (id: string) => { setOpenClaimId((cur) => (cur === id ? null : id)); haptics.light(); };

  const spine = (
    <Spine
      statement={statement}
      answer={answer}
      counter={decisionCase.counter_case}
      validateNext={decisionCase.validate_next}
      reframeNote={reframeNote}
      pct={pct}
      open={callOpen}
      collapsed={collapsed}
      onToggle={toggleSpine}
      isDesktop={isDesktop}
    />
  );

  const seg = (
    <div className="flex gap-1 rounded-xl border border-border bg-foreground/[0.03] p-1">
      {SEGMENTS.map((s) => {
        const n = segCounts[s.key] ?? 0;
        const on = filter === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => pickFilter(s.key)}
            className={cn('flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1.5 py-2 text-[11px] font-bold transition-colors',
              on ? 'bg-gradient-to-b from-accent to-accent text-accent-foreground shadow-[0_8px_18px_-10px_hsl(var(--accent)/0.6)]' : 'text-muted-foreground hover:text-foreground')}
          >
            {s.label}<span className={cn('text-[10px] tabular-nums', on ? 'opacity-80' : 'opacity-60')}>{n}</span>
          </button>
        );
      })}
    </div>
  );

  const ladderHeader = (
    <div className="flex items-center gap-2 pb-2.5 pt-3">
      <Layers className="h-3.5 w-3.5 text-accent" />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">What this is based on</span>
      <span className="text-[10px] font-bold text-accent">&middot; {ladder.length}</span>
    </div>
  );

  const rungs = (
    <div className="relative pl-5">
      {/* The ladder rail: every point visibly branches UP to the decision, so the
          screen reads top-down as "this decision rests on these things". */}
      {visible.length > 0 && (
        <span aria-hidden className="pointer-events-none absolute left-1.5 top-0 bottom-4 w-px bg-gradient-to-b from-accent/45 via-border to-transparent" />
      )}
      <div className="flex flex-col gap-2.5 pb-1">
        {ladder.length === 0 && <p className="text-[12.5px] text-muted-foreground">I am still breaking this one down. Check back in a moment.</p>}
        {ladder.length > 0 && visible.length === 0 && <p className="text-[12.5px] text-muted-foreground">Nothing in this group.</p>}
        {visible.map((c) => (
          <div key={c.id} className="relative">
            {/* the node + tick where this point meets the rail */}
            <span aria-hidden className="pointer-events-none absolute top-[22px] -left-[14px] h-px w-3 bg-border" />
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-[18px] -left-[17px] h-2 w-2 rounded-full border-2 border-background',
                c.id === hingeId ? 'bg-accent shadow-[0_0_7px_hsl(var(--accent)/0.7)]' : 'bg-muted-foreground/60',
              )}
            />
            <LadderRung claim={c} evidence={evByClaim(c.id)} isHinge={c.id === hingeId} open={openClaimId === c.id} onToggle={() => toggleRung(c.id)} />
          </div>
        ))}
      </div>
    </div>
  );

  const onResearch = (mode: ResearchMode) => { engine.research(mode); haptics.light(); };
  const shelf = (
    <div className="flex shrink-0 flex-col gap-2 pt-3">
      {/* Make the decision actionable: three ways to take it further, then the
          one closing move. Each kicks the decision-research pipeline; the panel
          flips to its running state and the refreshed evidence + recommendation
          land when it completes. */}
      <div className="grid grid-cols-3 gap-2">
        {RESEARCH_ACTIONS.map((a) => (
          <button
            key={a.mode}
            type="button"
            onClick={() => onResearch(a.mode)}
            disabled={engine.researching}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-secondary/60 px-2 py-2.5 text-[11px] font-bold leading-tight text-foreground/85 transition-colors hover:border-accent/40 hover:text-foreground disabled:opacity-50"
          >
            {engine.researching ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <a.Icon className="h-4 w-4 text-accent" />}
            {a.label}
          </button>
        ))}
      </div>
      {/* ONE clear closing move: say how it played out and it drops into History
          (the Now|History toggle on this same tab). Starting another decision and
          switching between them are quiet, secondary text links underneath. */}
      <button type="button" onClick={() => { onResolve(); haptics.light(); }}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/[0.08] px-3 py-3 text-[13px] font-bold text-accent transition-colors hover:bg-accent/[0.13]">
        <Check className="h-4 w-4" strokeWidth={3} />Resolve and move on
      </button>
      <div className="flex items-center justify-center gap-3 text-[11.5px] text-muted-foreground">
        <button type="button" onClick={() => { onCompose(); haptics.light(); }}
          className="font-semibold transition-colors hover:text-foreground">
          Weigh a new one
        </button>
        {cases.length > 1 && (
          <>
            <span aria-hidden className="text-muted-foreground/40">&middot;</span>
            <button type="button" onClick={() => { setSwitcherOpen(true); haptics.light(); }}
              className="font-semibold transition-colors hover:text-foreground">
              Switch decision ({cases.length})
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Mobile keeps just ONE closing move pinned ("Resolve and move on"), with the
  // ways to take it further folded into a sheet behind "Take it further". This
  // hands the ~130px the old three-row shelf ate back to the ladder, so the
  // decision content owns the screen; every removed action is one tap away.
  const mobileShelf = (
    <div className="flex shrink-0 items-stretch gap-2 pt-3">
      <button
        type="button"
        onClick={() => { setActionsOpen(true); haptics.light(); }}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-3.5 py-3 text-[13px] font-bold text-foreground/85 transition-colors hover:border-accent/40 hover:text-foreground"
      >
        {engine.researching ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <Sparkles className="h-4 w-4 text-accent" />}
        Take it further
      </button>
      <button
        type="button"
        onClick={() => { onResolve(); haptics.light(); }}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/[0.08] px-3 py-3 text-[13px] font-bold text-accent transition-colors hover:bg-accent/[0.13]"
      >
        <Check className="h-4 w-4" strokeWidth={3} />Resolve and move on
      </button>
    </div>
  );

  const sheets = (
    <>
      <SwitcherSheet open={switcherOpen} onOpenChange={setSwitcherOpen} cases={cases} currentId={decisionCase.id} onSwitch={onSwitch} />
      <DecisionActionsSheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        researching={engine.researching}
        onResearch={onResearch}
        onCompose={onCompose}
        onSwitchDecisions={() => { setActionsOpen(false); setSwitcherOpen(true); }}
        casesCount={cases.length}
      />
    </>
  );

  // ---- DESKTOP: spine + answer + shelf on the left, the ladder on the right ----
  if (isDesktop) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-4">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto scrollbar-hide pr-1">
            {spine}
            <div className="mt-auto">{shelf}</div>
          </div>
          <div className="flex min-h-0 flex-col">
            {ladderHeader}
            {seg}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto scrollbar-hide">{rungs}</div>
          </div>
        </div>
        {sheets}
      </div>
    );
  }

  // ---- MOBILE: collapsing spine + ladder hero in one scroll, pinned shelf ----
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        {/* The spine AND the filter ride in ONE sticky block. The spine collapses
            to a status bar as the ladder scrolls up behind it (the native
            large-title move); keeping the filter inside the same pinned block
            means it no longer jumps when the spine changes height - it just stays
            put, always reachable, while only the rungs scroll underneath. */}
        <div className="sticky top-0 z-20 bg-background pb-2">
          {spine}
          {ladderHeader}
          {seg}
        </div>
        {rungs}
      </div>
      {mobileShelf}
      {sheets}
    </div>
  );
}
