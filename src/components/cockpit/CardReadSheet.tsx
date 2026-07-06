/**
 * CardReadSheet - the read layer behind a Home news card.
 *
 * The card is a glance (motif, headline, one line, triage); this sheet is the
 * read: the FULL summary and Take with no clamps, the honest personalization
 * ("how this applies to you", composed only from facts the brain holds), the
 * benchmark cross-check, corroboration, and the three ways out - read the
 * article, weigh it as a decision, or react to train the feed.
 *
 * One component for both devices (ClaimSheet precedent): a bottom sheet on
 * mobile that becomes a centered, capped-width panel on desktop via
 * sm:mx-auto sm:max-w-lg. Every section renders only real data; absent
 * fields are skipped, never faked.
 */
import { X, Heart, BadgeCheck, Scale, ArrowUpRight, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AiTermHint } from '@/components/system/AiTermHint';
import { SkeletonBar } from '@/components/system/SkeletonCard';
import { weighPrefillFor } from '@/lib/cardForYou';
import { useCardForYou } from '@/hooks/useCardForYou';
import { getNewsCategory, resolveNewsCategory } from '@/types/newsCategory';
import type { DeckCard, NewsBenchmark } from '@/types/cockpit';
import { cn } from '@/lib/utils';

function BenchmarkRow({ benchmark }: { benchmark: NewsBenchmark }) {
  const bits: string[] = [];
  if (benchmark.rank) bits.push(`#${benchmark.rank} by intelligence`);
  if (benchmark.intelligenceIndex != null) bits.push(`index ${benchmark.intelligenceIndex}`);
  if (benchmark.pricePer1m != null) bits.push(`$${benchmark.pricePer1m}/1M tokens`);
  if (bits.length === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/[0.07] px-3 py-2.5">
      <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.2} />
      <p className="text-[12px] leading-snug text-[#aeb6c2]">
        <span className="font-semibold text-foreground/90">Artificial Analysis</span> checks out{' '}
        <span className="font-semibold text-foreground/90">{benchmark.model}</span>: {bits.join(' · ')}
      </p>
    </div>
  );
}

export interface CardReadSheetProps {
  card: DeckCard | null;
  onClose: () => void;
  /** the leader's known role/sector facts, for the honest for-you line. */
  leaderRole?: string | null;
  leaderSector?: string | null;
  /** quiet flag when this headline touches the pinned decision. */
  relevantToPinnedDecision?: boolean;
  /** route into the decision weigher with a prefill. */
  onWeigh?: (prefill: string) => void;
  /** the swipe-trained reactions; reacting closes the sheet. */
  onReact?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
}

export function CardReadSheet({
  card,
  onClose,
  leaderRole,
  leaderSector,
  relevantToPinnedDecision,
  onWeigh,
  onReact,
}: CardReadSheetProps) {
  const open = card !== null;
  const isTrend = card?.kind === 'trend';
  const categoryId = card ? resolveNewsCategory(card.category, `${card.headline} ${card.say ?? ''}`) : null;
  const category = categoryId ? getNewsCategory(categoryId) : null;
  // LLM-personalized (the story read through the leader's real brain context),
  // cached per card; silently falls back to the deterministic line on failure.
  // A trend card carries its own org implication (in `pov`), so it skips this.
  const forYou = useCardForYou(isTrend ? null : card, leaderRole, leaderSector);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-border bg-[linear-gradient(180deg,#0d1219,#0a0e12)] scrollbar-hide sm:mx-auto sm:max-w-lg"
      >
        {card && category && categoryId && (
          <div className="space-y-4 pb-[env(safe-area-inset-bottom,0px)] pt-1">
            <SheetTitle className="sr-only">Read: {card.headline}</SheetTitle>

            {/* topline: category chip + magnitude, same grammar as the card */}
            <div className="flex items-center justify-between gap-2.5 pr-8">
              <span className="whitespace-nowrap rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[9.5px] font-gobold uppercase tracking-[0.07em] text-accent">
                <AiTermHint
                  term={category.label}
                  meaning={category.meaning}
                  className="font-gobold uppercase tracking-[0.07em] text-accent"
                />
              </span>
              {card.magnitude?.value && (
                <span className="flex items-baseline gap-1.5">
                  <b
                    className="font-grotesk text-[22px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                    style={{ color: 'var(--ctrl-accent-ink-bright,#aef6ea)', textShadow: '0 0 16px hsl(var(--accent)/0.45)' }}
                  >
                    {card.magnitude.value}
                  </b>
                  <span className="text-[8.5px] uppercase tracking-[0.07em] text-muted-foreground">
                    {card.magnitude.kind === 'modelled' ? 'est. for you' : 'in the world'}
                  </span>
                </span>
              )}
            </div>

            {/* the full headline + full summary - the read, no clamps */}
            <div>
              <h2 className="text-balance text-[20px] font-extrabold leading-[1.2] tracking-[-0.02em] text-foreground">
                {card.headline}
              </h2>
              {card.say && (
                <p className="mt-2 text-[13.5px] leading-[1.55] text-[#c2cad6]">{card.say}</p>
              )}
            </div>

            {/* THE TAKE (news) / WHAT THIS MEANS FOR YOUR ORG (trend) - full,
                never clipped. A trend carries its org implication here. */}
            {card.pov && (
              <p className="border-l-2 border-accent/60 pl-3 text-[13px] leading-[1.55] text-foreground/90">
                <span className="mr-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-accent">
                  {isTrend ? 'For your org' : 'Take'}
                </span>
                {card.pov}
              </p>
            )}

            {/* WHY I'M FLAGGING THIS (trend) - the real, dated stories the shift
                is built from. The honest grounding: a shift is only surfaced when
                it recurs across these. */}
            {isTrend && card.evidence && card.evidence.length > 0 && (
              <div>
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-accent">Why I'm flagging this</p>
                <div className="space-y-1.5">
                  {card.evidence.slice(0, 5).map((e, i) => {
                    const meta = [e.source, e.date].filter(Boolean).join(' · ');
                    const inner = (
                      <>
                        <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-foreground/85">{e.headline}</span>
                        {meta && <span className="mt-0.5 block text-[10.5px] text-muted-foreground">{meta}</span>}
                      </>
                    );
                    return e.url ? (
                      <a
                        key={i}
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 transition-colors hover:border-accent/30"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div key={i} className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2">{inner}</div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FOR YOU - the story read through the leader's real brain context
                (LLM, cached per card; deterministic fallback lands silently).
                Trend cards carry their own org implication above, so skip it. */}
            {!isTrend && (
              <div className="rounded-xl border border-border bg-foreground/[0.025] px-3 py-2.5">
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-accent">For you</p>
                {forYou.loading ? (
                  <div className="space-y-1.5 py-0.5" aria-label="Reading this through what I know about you">
                    <SkeletonBar className="h-3 w-full" />
                    <SkeletonBar className="h-3 w-[78%]" />
                  </div>
                ) : (
                  forYou.line && <p className="text-[12.5px] leading-[1.55] text-foreground/85">{forYou.line}</p>
                )}
              </div>
            )}

            {/* trust signals: benchmark cross-check + corroboration + decision relevance */}
            {card.benchmark && <BenchmarkRow benchmark={card.benchmark} />}
            {(card.corroboration || relevantToPinnedDecision) && (
              <div className="flex flex-wrap items-center gap-2">
                {card.corroboration && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] font-semibold text-[#aeb6c2]">
                    <Users className="h-3 w-3" />
                    {card.corroboration}
                  </span>
                )}
                {relevantToPinnedDecision && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                    <Scale className="h-3 w-3" />
                    Relevant to your decision
                  </span>
                )}
              </div>
            )}

            {/* source + time */}
            {(card.source || card.timeAgo) && (
              <p className="text-[11px] text-muted-foreground">
                {card.source ?? 'CTRL briefing'}
                {card.timeAgo && <> &middot; {card.timeAgo}</>}
              </p>
            )}

            {/* the ways out: read the article / weigh it / react */}
            <div className="flex items-center gap-2.5 pt-1">
              {card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[13px] font-bold text-accent-foreground transition hover:brightness-110"
                >
                  Read the article
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
              {onWeigh && (
                <button
                  type="button"
                  onClick={() => onWeigh(isTrend && card.prefill ? card.prefill : weighPrefillFor(card.headline))}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors',
                    isTrend
                      ? 'flex-1 bg-accent text-accent-foreground hover:brightness-110'
                      : cn('border border-accent/30 bg-accent/[0.08] text-accent hover:bg-accent/[0.14]', !card.url && 'flex-1'),
                  )}
                >
                  <Scale className="h-4 w-4" />
                  {isTrend ? 'Weigh what this means for your org' : 'Weigh it'}
                </button>
              )}
              {onReact && !isTrend && (
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { onReact(card, 'dislike'); onClose(); }}
                    aria-label="Less like this"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[#0c1116] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { onReact(card, 'like'); onClose(); }}
                    aria-label="More like this"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/40 bg-accent/[0.08] text-accent transition-colors hover:bg-accent/15"
                  >
                    <Heart className="h-[18px] w-[18px] fill-current" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
