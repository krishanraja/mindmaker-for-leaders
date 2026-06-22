/**
 * DecisionResultView - the call + where it holds / where it breaks. One screen.
 *
 * Faithful to prototypes/decisions-2028.html (.res): a quiet reframe note (only
 * when the engine actually reframed), THE CALL hero (verdict pill + a single
 * trust read + trust bar), the two-column truth (where it HOLDS in emerald /
 * where it BREAKS in amber), the watch line, and two actions (Your decisions /
 * Bank this call). Depth (every claim + its evidence) stays one tap away in a
 * sheet, so the screen itself never grows past the viewport.
 *
 * Holds / breaks are DERIVED HONESTLY from the real engine output, never faked:
 *   holds  = supported claims (load-bearing first), capped at 2.
 *   breaks = contested / unverified claims (the breakpoint first), capped at 2;
 *            if the claims are all clean, the counter-case carries the breaks
 *            column so the honest "where it breaks" is never empty theatre.
 * The trust % is the engine's real `confidence`.
 *
 * All from ctrl-ds tokens; emerald = accent, amber = the one warm "breaks" hue.
 * No em dashes. Motion respects reduced-motion (framer honours it globally here
 * via the small fade/slide only).
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check, AlertTriangle, Sparkles, Eye, ArrowLeft, ChevronRight, ShieldCheck, HelpCircle, CircleDashed, Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  type useDecisionEngine, type DecisionClaim, type DecisionEvidence, type Verdict,
} from '@/hooks/useDecisionEngine';

type Engine = ReturnType<typeof useDecisionEngine>;

const VERDICT_STYLE: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  supported: { label: 'Holds up', cls: 'text-accent bg-accent/10 border-accent/30', Icon: ShieldCheck },
  contested: { label: 'Contested', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30', Icon: AlertTriangle },
  unverified: { label: 'Unverified', cls: 'text-muted-foreground bg-foreground/5 border-border', Icon: HelpCircle },
  unverifiable: { label: 'Your call', cls: 'text-muted-foreground bg-foreground/5 border-border', Icon: CircleDashed },
  pending: { label: 'Checking', cls: 'text-muted-foreground bg-secondary border-border', Icon: Loader2 },
};

const STANCE_STYLE: Record<DecisionEvidence['stance'], { label: string; cls: string }> = {
  supports: { label: 'Backs it', cls: 'text-accent bg-accent/10 border-accent/30' },
  refutes: { label: 'Pushes back', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
  neutral: { label: 'Context', cls: 'text-muted-foreground bg-foreground/5 border-border' },
};
const STANCE_ORDER: Record<DecisionEvidence['stance'], number> = { supports: 0, neutral: 1, refutes: 2 };

// First-sentence distillation: holds / breaks bullets stay short, like the mock.
function firstClause(text: string, max = 110): string {
  const trimmed = text.trim();
  const stop = trimmed.search(/[.;]/);
  const clause = stop > 20 ? trimmed.slice(0, stop) : trimmed;
  return clause.length > max ? `${clause.slice(0, max - 1).trimEnd()}...` : clause;
}

function deriveTruth(claims: DecisionClaim[], breakpointId: string | null, counterCase: string | null) {
  const byBearing = (a: DecisionClaim, b: DecisionClaim) => Number(b.is_load_bearing) - Number(a.is_load_bearing);
  const holds = claims
    .filter((c) => c.verdict === 'supported')
    .sort(byBearing)
    .slice(0, 2)
    .map((c) => firstClause(c.text));
  const breakCandidates = claims
    .filter((c) => c.verdict === 'contested' || c.verdict === 'unverified' || c.verdict === 'unverifiable')
    .sort((a, b) => Number(a.id === breakpointId ? 0 : 1) - Number(b.id === breakpointId ? 0 : 1) || byBearing(a, b));
  const breaks = breakCandidates.slice(0, 2).map((c) => firstClause(c.text));
  // If every claim came back clean, the honest "where it breaks" is the counter-case.
  if (breaks.length === 0 && counterCase) breaks.push(firstClause(counterCase, 140));
  return { holds, breaks };
}

function ClaimSheet({ claim, evidence, onClose }: { claim: DecisionClaim | null; evidence: DecisionEvidence[]; onClose: () => void }) {
  const open = claim !== null;
  const v = claim ? VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.pending : null;
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl scrollbar-hide sm:mx-auto sm:max-w-lg">
        {claim && v && (
          <div className="space-y-4 pt-1">
            <SheetTitle className="sr-only">Evidence for: {claim.text}</SheetTitle>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className={cn('flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium', v.cls)}>
                  <v.Icon className={cn('h-3 w-3', claim.verdict === 'pending' && 'animate-spin')} />
                  {v.label}
                </span>
                {claim.confidence != null && <span className="text-xs text-muted-foreground">{Math.round(claim.confidence * 100)}% sure</span>}
              </div>
              <p className="text-sm leading-relaxed text-foreground text-pretty">{claim.text}</p>
              {claim.rationale && <p className="mt-2 text-xs leading-relaxed text-muted-foreground text-pretty">{claim.rationale}</p>}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{evidence.length > 0 ? 'What I found' : 'The sources'}</p>
              {evidence.length === 0 ? (
                <p className="text-xs text-muted-foreground">No outside sources backed this one yet. It may be something only you can answer.</p>
              ) : (
                <ul className="space-y-2.5">
                  {[...evidence].sort((a, b) => STANCE_ORDER[a.stance] - STANCE_ORDER[b.stance]).map((e) => {
                    const st = STANCE_STYLE[e.stance] ?? STANCE_STYLE.neutral;
                    return (
                      <li key={e.id} className="text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-medium', st.cls)}>{st.label}</span>
                          <a href={e.source_url ?? '#'} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{e.source_title || e.source_url || e.retriever}</a>
                          <span className="text-muted-foreground/60">· {e.retriever}</span>
                        </div>
                        {e.excerpt && <p className="mt-0.5 text-muted-foreground text-pretty">{e.excerpt}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function DecisionResultView({
  engine,
  onBack,
  onBank,
  banked,
  banking,
  isDesktop = false,
}: {
  engine: Engine;
  onBack: () => void;
  onBank: () => void;
  banked: boolean;
  banking: boolean;
  isDesktop?: boolean;
}) {
  const { decisionCase, claims, evidence } = engine;
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);

  const { holds, breaks } = useMemo(
    () => deriveTruth(claims, decisionCase?.breakpoint_assumption_id ?? null, decisionCase?.counter_case ?? null),
    [claims, decisionCase?.breakpoint_assumption_id, decisionCase?.counter_case],
  );

  if (!decisionCase) return null;
  const pct = decisionCase.confidence != null ? Math.round(decisionCase.confidence * 100) : null;
  const evByClaim = (id: string) => evidence.filter((e) => e.claim_id === id);
  const openClaim = openClaimId ? claims.find((c) => c.id === openClaimId) ?? null : null;
  const theCall = decisionCase.recommendation || decisionCase.title || decisionCase.statement;

  const Reframe = decisionCase.reframed && decisionCase.reframe_note ? (
    <div className="flex shrink-0 gap-2.5 rounded-xl border border-border bg-foreground/[0.025] px-3 py-2.5">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <p className="text-[11.5px] leading-snug text-muted-foreground text-pretty">
        <span className="font-semibold text-foreground/90">I read this as an AI-native call: </span>
        {decisionCase.reframe_note}
      </p>
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

  const Truth = (
    <div className="grid shrink-0 grid-cols-2 gap-2.5">
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-b from-card to-background p-3.5">
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-md bg-accent/10 text-accent"><Check className="h-3 w-3" strokeWidth={3} /></span>
          <span className="text-[8.5px] font-bold uppercase tracking-wide text-accent">Where it holds</span>
        </div>
        <ul className="space-y-2">
          {holds.length === 0 && <li className="text-[11.5px] leading-snug text-muted-foreground">Nothing came back clean enough to lean on yet.</li>}
          {holds.map((h, i) => (
            <li key={i} className="relative pl-3.5 text-[11.5px] leading-snug text-foreground/85 text-pretty">
              <span className="absolute left-0 top-[7px] h-[5px] w-[5px] rounded-full bg-accent shadow-[0_0_7px_hsl(var(--accent))]" />{h}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-background p-3.5">
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-md bg-amber-500/10 text-amber-400"><AlertTriangle className="h-3 w-3" /></span>
          <span className="text-[8.5px] font-bold uppercase tracking-wide text-amber-400">Where it breaks</span>
        </div>
        <ul className="space-y-2">
          {breaks.length === 0 && <li className="text-[11.5px] leading-snug text-muted-foreground">No load-bearing claim came back broken.</li>}
          {breaks.map((b, i) => (
            <li key={i} className="relative pl-3.5 text-[11.5px] leading-snug text-foreground/85 text-pretty">
              <span className="absolute left-0 top-[7px] h-[5px] w-[5px] rounded-full bg-amber-400 shadow-[0_0_7px_rgba(224,161,58,0.6)]" />{b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const Watch = decisionCase.last_verified_at ? (
    <div className="flex shrink-0 items-start gap-2.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2.5">
      <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <p className="text-[11.5px] leading-snug text-foreground/90">
        <span className="font-bold text-foreground">I'll keep watching.</span> If a load-bearing claim shifts, I'll re-check and flag it. Last read{' '}
        {formatDistanceToNow(new Date(decisionCase.last_verified_at), { addSuffix: true })}.
      </p>
    </div>
  ) : null;

  const claimsHint = claims.length > 0 ? (
    <button
      type="button"
      onClick={() => setOpenClaimId(decisionCase.breakpoint_assumption_id ?? claims[0].id)}
      className="flex w-full shrink-0 items-center justify-between rounded-xl border border-border bg-foreground/[0.025] px-3 py-2.5 text-left transition-colors hover:border-accent/30"
    >
      <span className="text-[11.5px] text-muted-foreground">See what it rests on, source by source ({claims.length} claim{claims.length === 1 ? '' : 's'})</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  ) : null;

  const Actions = (
    <div className="flex shrink-0 gap-2.5 pt-3">
      <button type="button" onClick={onBack} className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-border bg-secondary px-3 py-3 text-[13px] font-bold text-foreground/90 transition-colors hover:border-accent/30 hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Your decisions
      </button>
      <button type="button" onClick={onBank} disabled={banking || banked} className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-gradient-to-b from-accent to-accent px-3 py-3 text-[13px] font-bold text-accent-foreground shadow-[0_12px_26px_-12px_hsl(var(--accent)/0.5)] disabled:opacity-80">
        {banking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        {banked ? 'Banked' : 'Bank this call'}
      </button>
    </div>
  );

  // ---- DESKTOP: two-zone, room to breathe -----------------------------------
  if (isDesktop) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] gap-4">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto scrollbar-hide pr-1">
            {Reframe}
            {Call}
            {Watch}
            {claimsHint}
          </div>
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto scrollbar-hide">
            {Truth}
            <div className="mt-auto">{Actions}</div>
          </div>
        </div>
        <ClaimSheet claim={openClaim} evidence={openClaim ? evByClaim(openClaim.id) : []} onClose={() => setOpenClaimId(null)} />
      </div>
    );
  }

  // ---- MOBILE: one thumb-first column, bounded, depth in a sheet ------------
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-hide py-0.5">
        {Reframe}
        {Call}
        {Truth}
        {Watch}
        {claimsHint}
      </div>
      {Actions}
      <ClaimSheet claim={openClaim} evidence={openClaim ? evByClaim(openClaim.id) : []} onClose={() => setOpenClaimId(null)} />
    </div>
  );
}
