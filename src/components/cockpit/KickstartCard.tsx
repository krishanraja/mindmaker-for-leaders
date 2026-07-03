// KickstartCard - the guide-posture LEAD of Home (CTRL-SYSTEM-SPEC s3: a NEW or
// DORMANT leader is led in with a kickstart, not a wall of news). It proposes one
// real decision to weigh and routes straight into the engine with a prefill.
//
// It is DEVICE-CONTEXT aware (founder, 2026-06-29): mobile is on-the-go, so the
// invitation is a quick, thumb-first capture ("weigh a call in ~30s"); desktop is
// deep work, so it reads as a roomier "let's think this through properly" panel.
// Shares CockpitHero's card shell so the lead slot stays one coherent instrument.

import { ArrowRight, Scale } from 'lucide-react';
import type { DeckCard } from '@/types/cockpit';
import { cn } from '@/lib/utils';

export interface KickstartCardProps {
  card: DeckCard;
  /** lead = the wide desktop deep-work panel; feed = the mobile quick-capture card. */
  variant?: 'feed' | 'lead';
  onOpen?: (card: DeckCard) => void;
}

export function KickstartCard({ card, variant = 'feed', onOpen }: KickstartCardProps) {
  const isLead = variant === 'lead';
  const cta = isLead ? 'Pressure-test this decision' : 'Weigh it';
  const deviceLine = isLead
    ? "You've got room to think - I'll decompose it, weigh the evidence, and show you where it holds."
    : "A quick call now; I'll keep watching it for you after.";

  return (
    <article
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-accent/40',
        'bg-[linear-gradient(160deg,#11201d_0%,#0a0e12_70%)]',
        'shadow-[0_30px_64px_-30px_rgba(0,0,0,0.95),0_0_0_1px_hsl(var(--accent)/0.35),inset_0_1px_0_rgba(255,255,255,0.03)]',
      )}
    >
      <div className={cn('flex min-h-0 flex-1 flex-col', isLead ? 'p-[28px_30px_26px]' : 'p-[20px_20px_18px]')}>
        {/* eyebrow */}
        <span
          className={cn(
            'inline-flex w-fit flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-accent/35 bg-accent/12 font-gobold uppercase tracking-[0.07em] text-accent',
            isLead ? 'px-3 py-1.5 text-[10px]' : 'px-2.5 py-1 text-[9.5px]',
          )}
        >
          <Scale className={isLead ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
          {card.eyebrow}
        </span>

        {/* THE VARIABLE MIDDLE - the same uniform-height contract as CockpitHero:
            variable text lives in a bounded, clipped block behind clamps, so the
            card fills its wrapper's exact height and the CTA row never moves. */}
        <div className="min-h-0 overflow-hidden">
          {/* the proposed decision (clamped: next-move labels vary in length) */}
          <button type="button" onClick={() => onOpen?.(card)} className="mt-3 block w-full text-left">
            <h2
              className={cn(
                'm-0 line-clamp-3 text-balance font-extrabold tracking-[-0.02em] text-foreground',
                isLead ? 'text-[30px] leading-[1.12]' : 'text-[22px] leading-[1.18]',
              )}
            >
              {card.headline}
            </h2>
          </button>

          {card.say && (
            <p
              className={cn(
                'text-[#c2cad6]',
                isLead ? 'mt-4 line-clamp-4 max-w-[56ch] text-[16px] leading-[1.55]' : 'mt-2.5 line-clamp-3 text-[13.5px] leading-[1.48]',
              )}
            >
              {card.say}
            </p>
          )}
        </div>

        {/* primary action, pinned to the bottom of the card (flex-none: it never
            shrinks and never clips - the one row that must always be visible) */}
        <div className={cn('mt-auto flex flex-none items-center justify-between gap-3', isLead ? 'pt-[20px]' : 'pt-4')}>
          <span className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">{deviceLine}</span>
          <button
            type="button"
            onClick={() => onOpen?.(card)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent font-bold text-accent-foreground transition hover:brightness-110',
              isLead ? 'px-5 py-2.5 text-[14px]' : 'px-4 py-2.5 text-[13px]',
            )}
          >
            {cta}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
