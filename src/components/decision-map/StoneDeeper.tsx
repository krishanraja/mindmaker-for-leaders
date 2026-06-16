import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ExternalLink, Plus, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';
import type { UserCall } from '@/hooks/useDecisionCall';
import { STONE, claimGlyph, domainOf, isOnlyYou, magnitudeFrom } from './ConsiderationStone';

// Evidence reliability tier, read honestly from the retriever + stance. "Original" =
// a primary/official pull; "Reputable" = a known analyst/press source; "Yours" = the
// leader's own input; otherwise neutral.
type Tier = 'high' | 'med' | 'thin';
function tierOf(e: DecisionEvidence): { tier: Tier; label: string } {
  const r = (e.retriever || '').toLowerCase();
  if (/you|yours|self|manual|input/.test(r)) return { tier: 'thin', label: 'Yours' };
  if (/pricing|official|primary|original|filing|sec/.test(r)) return { tier: 'high', label: 'Original' };
  if ((e.relevance_score ?? 0) >= 0.7) return { tier: 'med', label: 'Reputable' };
  return { tier: 'thin', label: 'Unverified' };
}

const TIER_CLASS: Record<Tier, string> = {
  high: 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-300',
  med: 'border-amber-500/40 bg-amber-500/[0.06] text-amber-300',
  thin: 'border-dashed border-border bg-secondary/40 text-muted-foreground',
};

const STANCES: { call: UserCall; label: string }[] = [
  { call: 'accept', label: 'Agree' },
  { call: 'reject', label: 'Disagree' },
  { call: 'unsure', label: 'Not sure' },
];

function relTime(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const d = Math.floor(ms / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

/**
 * GO DEEPER - the receipts behind the read, as a bottom-sheet drawer. The read in a
 * sentence, what it rests on (sources with reliability tiers and click-out), the
 * counter-case, how sure, the leader's stance, and what would flip it. Honest by
 * construction: only-you drops the synthesis-number and the green tiering.
 */
export function StoneDeeper({
  open,
  claim,
  evidence,
  call,
  onSetCall,
  onClose,
  onVerify,
  onEnrich,
  verifying = false,
  animated = true,
}: {
  open: boolean;
  claim: DecisionClaim | null;
  evidence: DecisionEvidence[];
  call: UserCall | null;
  onSetCall: (call: UserCall) => void;
  onClose: () => void;
  onVerify?: () => void;
  onEnrich?: () => void;
  verifying?: boolean;
  animated?: boolean;
}) {
  // Close on Escape (the app's standard dismissal ritual).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onlyYou = claim ? isOnlyYou(claim) : false;
  const stone = claim ? STONE[claim.verdict] ?? STONE.pending : STONE.pending;
  const Glyph = claim ? claimGlyph(claim) : null;
  const magnitude = useMemo(() => (claim ? magnitudeFrom(claim) : null), [claim]);

  const { sourceCount, originalCount, newest } = useMemo(() => {
    const dated = evidence.map((e) => e.retrieved_at).filter(Boolean) as string[];
    const newest = dated.sort().slice(-1)[0] ?? null;
    const originalCount = evidence.filter((e) => tierOf(e).tier === 'high').length;
    return { sourceCount: evidence.length, originalCount, newest };
  }, [evidence]);

  // The refuting evidence forms the honest counter-case.
  const counter = useMemo(() => evidence.filter((e) => e.stance === 'refutes'), [evidence]);
  // How-sure: a coarse, honest confidence read off the claim confidence (0..1).
  const sureBars = useMemo(() => {
    const c = claim?.confidence;
    const lit = c == null ? 1 : Math.max(1, Math.min(4, Math.round(c * 4)));
    return [0, 1, 2, 3].map((i) => i < lit);
  }, [claim]);

  // Show first 3 sources inline; the rest behind "view all".
  const shown = evidence.slice(0, 3);
  const remaining = evidence.length - shown.length;

  return (
    <AnimatePresence>
      {open && claim && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* scrim */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(4,6,9,0.62)] backdrop-blur-[1.5px]"
          />

          {/* the drawer */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[88vh] min-h-0 flex-col overflow-hidden rounded-t-[22px] border-t border-border bg-[linear-gradient(180deg,#0f1218,#0b0d11)] shadow-[0_-24px_60px_-20px_#000]"
            initial={animated ? { y: '100%' } : false}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {/* grab handle */}
            <div className="grid shrink-0 place-items-center pb-1 pt-2.5">
              <span className="h-1 w-9 rounded-full bg-border" />
            </div>

            {/* header: the consideration restated + its verdict */}
            <div className="shrink-0 border-b border-border px-[18px] pb-3 pt-1.5">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] border',
                    onlyYou
                      ? 'border-border bg-secondary/40 text-muted-foreground'
                      : claim.verdict === 'supported'
                        ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-300'
                        : 'border-border bg-secondary/40 text-muted-foreground',
                  )}
                >
                  {Glyph && <Glyph className="h-5 w-5" strokeWidth={2} />}
                </span>
                <h2 className="min-w-0 flex-1 text-[15.5px] font-semibold leading-snug text-balance text-foreground">
                  {claim.text}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px]">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold',
                    onlyYou
                      ? 'border-border bg-foreground/[0.03] text-muted-foreground'
                      : claim.verdict === 'supported'
                        ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300'
                        : claim.verdict === 'contested'
                          ? 'border-amber-500/30 bg-amber-500/[0.06] text-amber-300'
                          : 'border-border bg-secondary/40 text-muted-foreground',
                  )}
                >
                  {onlyYou ? 'Only you' : stone.label}
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  {!onlyYou && <span className="h-2 w-2 rounded-full bg-emerald-500/70 shadow-[0_0_9px_-1px_#00d9b6]" />}
                  {onlyYou ? 'Yours to judge' : 'Read from the market'}
                </span>
                {claim.is_load_bearing && <span className="ml-auto font-semibold text-emerald-300/80">carries this</span>}
              </div>
            </div>

            {/* the band */}
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-3.5 scrollbar-hide">
              {/* the read */}
              <Section label="The read">
                <p className="text-[15px] font-normal leading-relaxed text-foreground/95">
                  {claim.rationale?.trim() ||
                    (onlyYou
                      ? 'No benchmark or competitor move can answer this - it turns on your internal knowledge. It is yours to judge.'
                      : 'The read is still forming as the evidence comes in.')}
                </p>
                {!onlyYou && sourceCount > 0 && (
                  <p className="mt-2 text-[11.5px] text-muted-foreground">
                    Synthesised from <b className="font-semibold text-foreground/80">{sourceCount} {sourceCount === 1 ? 'source' : 'sources'}</b>
                    {originalCount > 0 && <> &middot; {originalCount} original</>}
                    {newest && <> &middot; newest {relTime(newest)}</>}
                    {magnitude && <> &middot; figure is {magnitude.mark === 'est.' ? 'a modelled est.' : 'sourced'}</>}
                  </p>
                )}
              </Section>

              {/* what it rests on - the receipts */}
              {!onlyYou && (
                <Section label="What it rests on">
                  {shown.length > 0 ? (
                    <div className="space-y-1.5">
                      {shown.map((e) => {
                        const { tier, label } = tierOf(e);
                        const clickable = !!e.source_url;
                        const Row = clickable ? 'a' : 'div';
                        return (
                          <Row
                            key={e.id}
                            {...(clickable
                              ? { href: e.source_url as string, target: '_blank', rel: 'noopener noreferrer' }
                              : {})}
                            className={cn(
                              'flex items-start gap-2.5 rounded-[11px] border border-border bg-card px-[11px] py-2.5',
                              clickable && 'transition-colors hover:border-border/80 hover:bg-secondary/40',
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-medium leading-snug text-foreground/90">
                                {e.excerpt?.trim() || e.source_title || 'Source'}
                              </div>
                              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                                <span className="font-semibold text-emerald-300/70">
                                  {e.source_title || domainOf(e.source_url) || 'source'}
                                </span>
                                {e.retrieved_at && <> &middot; {relTime(e.retrieved_at)}</>}
                              </div>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 self-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold tracking-[0.05em]',
                                TIER_CLASS[tier],
                              )}
                            >
                              {label}
                            </span>
                            {clickable && (
                              <span className="grid h-[26px] w-[26px] shrink-0 self-center place-items-center rounded-lg border border-border bg-card text-muted-foreground">
                                <ExternalLink className="h-3 w-3" />
                              </span>
                            )}
                          </Row>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No sources retrieved yet.</p>
                  )}
                  {remaining > 0 && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-border py-2.5 text-[11.5px] font-semibold text-muted-foreground">
                      <ExternalLink className="h-3 w-3" /> View all {evidence.length} sources
                    </div>
                  )}
                  {/* how sure - the honesty governor made visible */}
                  <div className="mt-3 flex items-start gap-2.5 border-l-2 border-amber-500/70 pl-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                    <span>
                      {sureBars.filter(Boolean).length >= 3 ? (
                        <><b className="font-bold text-amber-300">Strong</b> on today's read. </>
                      ) : (
                        <><b className="font-bold text-amber-300">Thin</b> so far. </>
                      )}
                      {originalCount > 0
                        ? 'Built on primary sources where it could be.'
                        : 'Lean on primary sources; the gap is the half only you can firm up.'}
                    </span>
                  </div>
                </Section>
              )}

              {/* the counter-case - the honest other side */}
              {!onlyYou && counter.length > 0 && (
                <Section label="The counter-case">
                  <div className="border-l-2 border-amber-500/70 pl-[11px] text-[13px] leading-relaxed text-foreground/85">
                    {counter[0].excerpt?.trim() || counter[0].source_title || 'Some sources push the other way.'}{' '}
                    <b className="font-semibold text-amber-300">The gap is real, but worth weighing.</b>
                  </div>
                </Section>
              )}

              {/* only-you: what it turns on */}
              {onlyYou && (
                <Section label="Why this is yours to call">
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {claim.rationale?.trim() ||
                      'No external source can settle this - it turns on knowledge only you hold. CTRL will not fake a verdict here.'}
                  </p>
                </Section>
              )}

              {/* where do you land - stance, white never emerald */}
              <Section label="Where do you land?">
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
                          'flex-1 rounded-[11px] border px-1 py-2.5 text-center text-[13px] font-semibold transition-colors',
                          on ? 'border-white bg-[#16181d] text-white' : 'border-border bg-card text-foreground/75 hover:text-foreground',
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* what would flip this */}
              <Section label="What would flip this">
                <div className="flex items-start gap-2.5 rounded-[11px] border border-emerald-500/40 bg-emerald-500/[0.05] px-3 py-2.5">
                  <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border border-emerald-500/40 text-emerald-300">
                    <Zap className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-emerald-200/90">
                    {onlyYou
                      ? 'New internal evidence, or a fact that turns this into something CTRL can check.'
                      : 'A fresh source that contradicts the read, or your own input that moves the estimate.'}
                  </span>
                  <span className="shrink-0 self-start rounded-[5px] border border-emerald-500/40 bg-emerald-500/[0.10] px-1.5 py-0.5 text-[8.5px] font-bold tracking-[0.08em] text-emerald-300">
                    WATCHING
                  </span>
                </div>
              </Section>
            </div>

            {/* foot: verify + enrich (confirm what's known, add what's missing) */}
            <div className="flex shrink-0 gap-2.5 border-t border-border bg-card/40 px-[18px] pb-3.5 pt-3">
              <button
                type="button"
                onClick={onVerify}
                disabled={verifying || !onVerify}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/[0.06] px-3 py-2.5 text-sm font-semibold text-emerald-300 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> {verifying ? 'Checking...' : 'Still true?'}
              </button>
              <button
                type="button"
                onClick={onEnrich}
                disabled={!onEnrich}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground/90 transition-colors hover:bg-secondary/40 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add what's missing
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-[17px] first:mt-0">
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
