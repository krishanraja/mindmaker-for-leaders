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

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown, ChevronRight, Check, ShieldCheck, Search, Swords, Loader2,
  Sparkles, Plus, ArrowRightLeft,
} from 'lucide-react';
import type { ResearchMode, Dimension } from '@/hooks/useDecisionEngine';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { useDecisionEngine } from '@/hooks/useDecisionEngine';
import type { DecisionCaseSummary } from '@/hooks/useDecisionInbox';
import { DecisionSpider } from './DecisionSpider';
import { ForceDrawer } from './ForceDrawer';
import { buildSpider } from './decisionSpiderModel';

type Engine = ReturnType<typeof useDecisionEngine>;

// The action-oriented moves a finished decision offers: firm up the case, dig
// deeper, or actively look for the case against. Plain labels, no jargon.
const RESEARCH_ACTIONS: { mode: ResearchMode; label: string; desc: string; Icon: typeof ShieldCheck }[] = [
  { mode: 'strengthen', label: 'Strengthen', desc: 'Firm up the case for it with more backing.', Icon: ShieldCheck },
  { mode: 'research_more', label: 'Research more', desc: 'Dig wider for anything I might have missed.', Icon: Search },
  { mode: 'counter_evidence', label: 'Counter-points', desc: 'Actively look for the case against.', Icon: Swords },
];

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
  const [selectedForce, setSelectedForce] = useState<Dimension | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  // The full answer (behind the decision) starts open on desktop, closed on mobile.
  const [callOpen, setCallOpen] = useState(isDesktop);

  // Close any open force when the decision in focus changes.
  const caseId = decisionCase?.id ?? null;
  useEffect(() => { setSelectedForce(null); }, [caseId]);

  const evByClaim = (id: string) => evidence.filter((e) => e.claim_id === id);
  // The six fixed forces (with their claims + health), built from this decision's claims + labels.
  const spider = useMemo(() => buildSpider(claims, decisionCase?.force_labels), [claims, decisionCase?.force_labels]);

  if (!decisionCase) return null;
  const pct = decisionCase.confidence != null ? Math.round(decisionCase.confidence * 100) : null;
  // The spine leads with the decision itself; the recommendation is the answer behind the tap.
  const statement = decisionCase.title || decisionCase.statement;
  const answer = decisionCase.recommendation;
  const reframeNote = decisionCase.reframed ? decisionCase.reframe_note ?? null : null;
  const selectedForceObj = selectedForce ? spider.forces.find((f) => f.key === selectedForce) ?? null : null;

  const toggleSpine = () => { setCallOpen((o) => !o); haptics.light(); };

  const spine = (
    <Spine
      statement={statement}
      answer={answer}
      counter={decisionCase.counter_case}
      validateNext={decisionCase.validate_next}
      reframeNote={reframeNote}
      pct={pct}
      open={callOpen}
      collapsed={false}
      onToggle={toggleSpine}
      isDesktop={isDesktop}
    />
  );

  // The hero: the decision at the centre, the six forces spidering out, coloured by health.
  const spiderCanvas = (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(120%_90%_at_50%_-10%,hsl(var(--accent)/0.05),transparent_60%)]">
      <DecisionSpider
        claims={claims}
        forceLabels={decisionCase.force_labels}
        pct={pct}
        selectedKey={selectedForce}
        onSelect={(k) => { setSelectedForce(k); haptics.light(); }}
        onCenterTap={toggleSpine}
        peekFirst={!isDesktop}
      />
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

  // ---- DESKTOP: decision + spider + shelf on the left, the tapped-force detail rail on the right --
  if (isDesktop) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="flex min-h-0 flex-col gap-3">
            {spine}
            {spiderCanvas}
            {shelf}
          </div>
          <ForceDrawer force={selectedForceObj} evidenceFor={evByClaim} isDesktop onClose={() => setSelectedForce(null)} />
        </div>
        {sheets}
      </div>
    );
  }

  // ---- MOBILE: compact decision on top, the spider fills the screen (no scroll), pinned shelf ----
  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {spine}
      {spiderCanvas}
      {mobileShelf}
      {sheets}
      <ForceDrawer force={selectedForceObj} evidenceFor={evByClaim} isDesktop={false} onClose={() => setSelectedForce(null)} />
    </div>
  );
}
