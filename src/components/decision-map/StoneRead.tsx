import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';
import type { UserCall } from '@/hooks/useDecisionCall';
import { STONE, isOnlyYou, magnitudeFrom } from './ConsiderationStone';

// The leader's three stances. White, never emerald - a self-report can't read as
// validated. Maps onto the decision_user_calls vocabulary (accept/reject/unsure).
const STANCES: { call: UserCall; label: string }[] = [
  { call: 'accept', label: 'Agree' },
  { call: 'reject', label: 'Disagree' },
  { call: 'unsure', label: 'Not sure' },
];

// The verdict chip shown beside the question, reusing the locked vocabulary.
function chipClass(claim: DecisionClaim): string {
  switch (claim.verdict) {
    case 'supported':
      return 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300';
    case 'contested':
      return 'border-amber-500/30 bg-amber-500/[0.06] text-amber-300';
    case 'unverifiable':
      return 'border-border bg-foreground/[0.03] text-muted-foreground';
    case 'unverified':
      return 'border-border bg-foreground/[0.03] text-muted-foreground';
    default:
      return 'border-border bg-secondary/40 text-muted-foreground';
  }
}

/**
 * The single-stone READ. Numerical-first when the crux is a measurable quantity
 * (a kind-marked est. hero), words-led + neutral when it is unverifiable (only you).
 * Honest by construction: the only-you variant carries no emerald glow and no number.
 *
 * Wired into the spine via DecisionMap; "Go deeper" raises the receipts.
 */
export function StoneRead({
  claim,
  evidence,
  call,
  onSetCall,
  onGoDeeper,
  animated = true,
}: {
  claim: DecisionClaim;
  evidence: DecisionEvidence[];
  call: UserCall | null;
  onSetCall: (call: UserCall) => void;
  onGoDeeper: () => void;
  animated?: boolean;
}) {
  const onlyYou = isOnlyYou(claim);
  const stone = STONE[claim.verdict] ?? STONE.pending;
  const magnitude = useMemo(() => magnitudeFrom(claim), [claim]);

  // Honest evidence counts for the "Go deeper" sub-line.
  const { sourceCount, originalCount, supports, refutes } = useMemo(() => {
    const supports = evidence.filter((e) => e.stance === 'supports').length;
    const refutes = evidence.filter((e) => e.stance === 'refutes').length;
    // "original" = primary / official retrieval (the engine tags its retriever).
    const originalCount = evidence.filter((e) => /pricing|official|primary|original|filing/i.test(e.retriever || '')).length;
    return { sourceCount: evidence.length, originalCount, supports, refutes };
  }, [evidence]);

  // The "why" - one honest sentence. Prefer the engine rationale; fall back to a
  // neutral state-true statement rather than fabricating a story.
  const why = claim.rationale?.trim() || (onlyYou
    ? 'This is yours to judge - no benchmark or competitor move can settle it.'
    : 'The read is still forming as the evidence comes in.');

  // A trend read - only shown when there is a real magnitude (never invented for words).
  const trendDown = magnitude ? /[-]|down|fell|cut|drop|cheaper/i.test(claim.rationale || '') : false;
  const trendUp = magnitude ? /\bup\b|rose|grew|surge|climb/i.test(claim.rationale || '') : false;

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col"
    >
      {/* the question, small - it gets out of the way of the answer */}
      <div className="flex items-center gap-2.5 pt-1">
        <span className={cn('inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-[10px] font-bold', chipClass(claim))}>
          {onlyYou ? 'Only you' : stone.label}
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-balance text-muted-foreground">
          {claim.text}
        </span>
      </div>

      {/* THE HERO. A measurable crux leads with the NUMBER; everything else (and every
          only-you read) leads with WORDS via .num.phrase on a neutral hero - never a
          fabricated figure, never a green glow it has not earned. */}
      <div
        className={cn(
          'relative mt-3.5 rounded-[18px] border px-[18px] pb-[18px] pt-[22px] text-center',
          magnitude
            ? 'border-emerald-900/60 bg-[radial-gradient(120%_100%_at_50%_0%,#10261f_0%,#0c0f13_62%)] shadow-[0_0_55px_-22px_#00d9b6]'
            : 'border-border bg-[radial-gradient(120%_100%_at_50%_0%,#15161c_0%,#0c0f13_62%)]',
        )}
      >
        {/* the soft-number mark: shown ONLY for a modelled read (an estimate), never for a
            SOURCED figure (which is verbatim in evidence and stands clean) - sanctity. */}
        {magnitude && magnitude.mark && (
          <span
            className="absolute right-3 top-3 inline-flex items-center rounded-[5px] border border-border px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground"
            title="CTRL's modelled read - not a measured quote"
          >
            {magnitude.mark}
          </span>
        )}

        {/* words-led hero: no honest number, so NO confident teal glow (cardinal rule).
            Neutral ink, no text-shadow, regardless of verdict. */}
        {magnitude ? (
          <div className="num">{magnitude.value}</div>
        ) : (
          <div className="num phrase text-foreground/80 [text-shadow:none]">
            {onlyYou ? 'Only you can answer this' : claim.text}
          </div>
        )}

        <div className={cn('mt-2 text-[15px] font-semibold text-balance', magnitude ? 'text-emerald-100/90' : 'text-muted-foreground')}>
          {magnitude
            ? deriveSubline(claim)
            : onlyYou
              ? 'no external signal can settle it'
              : stone.label === 'Contested'
                ? 'the evidence pulls both ways'
                : 'still gathering the read'}
        </div>

        {/* trend line - only when a real magnitude carries a direction */}
        {magnitude && (trendDown || trendUp) && (
          <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300/90">
            {trendDown ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {trendDown ? 'moving in your favour' : 'moving against this'}
          </div>
        )}
      </div>

      {/* one line: why it matters to you */}
      <p className="mx-0.5 mt-4 text-[15px] font-normal leading-relaxed text-balance text-foreground/95">{why}</p>

      {/* the honest stance of the evidence (only when there is external evidence) */}
      {!onlyYou && evidence.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-0.5 text-[11.5px] text-muted-foreground">
          {supports > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {supports} {supports === 1 ? 'source backs it' : 'sources back it'}
            </span>
          )}
          {refutes > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              {refutes} {refutes === 1 ? 'pushes back' : 'push back'}
            </span>
          )}
        </div>
      )}

      {/* your call - 3 taps, white never emerald, does not fake certainty */}
      <div className="mb-2.5 mt-[18px] px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Where do you land?
      </div>
      <div className="flex gap-2">
        {STANCES.map((s) => {
          const on = call === s.call;
          return (
            <button
              key={s.call}
              type="button"
              onClick={() => onSetCall(s.call)}
              aria-pressed={on}
              className={cn(
                'flex-1 rounded-xl border px-1 py-3 text-center text-sm font-semibold transition-colors',
                on ? 'border-white bg-[#16181d] text-white' : 'border-border bg-card text-foreground/75 hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* the whole apparatus, behind ONE tap */}
      <button
        type="button"
        onClick={onGoDeeper}
        className="mt-4 flex w-full items-center gap-3 rounded-[13px] border border-border bg-card px-3.5 py-3 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Go deeper</span>
          <span className="block text-[11.5px] text-muted-foreground">
            {onlyYou
              ? 'why this is yours to call - what would change it'
              : `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}${originalCount > 0 ? `, ${originalCount} original` : ''} - the counter-case - how sure`}
          </span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

// A short, honest subline for the hero number. Derived only when a magnitude exists.
// Prefers the stored, gate-approved reaction descriptor (the words that ride beside the
// sourced/modelled figure); falls back to a clause from the rationale, then the claim.
function deriveSubline(claim: DecisionClaim): string {
  const descriptor = claim.reaction_descriptor?.trim();
  if (descriptor && descriptor.length > 0 && descriptor.length <= 64) return descriptor.toLowerCase();
  const r = claim.rationale ?? '';
  // Take the clause around the first sentence, trimmed to a tidy length.
  const first = r.split(/[.;]/)[0]?.trim();
  if (first && first.length > 0 && first.length <= 64) return first.toLowerCase();
  return claim.text.replace(/\?$/, '').toLowerCase();
}
