// AiTermHint - demystify an AI term in place. A leader should never have to
// wonder what a piece of AI jargon means: this wraps the term in a subtle,
// tappable affordance that reveals a one-line plain-language explanation.
//
// Principle (from the first-principles audit): teach the AI CONCEPTS a
// non-technical leader meets (orchestration, agents, models, inference), NOT the
// app's own vocabulary. Use this only for genuine AI/industry terms.
//
// Tap (mobile) or click/focus (desktop) the term to reveal the meaning. The
// click never bubbles, so using it inside a tappable card never triggers the
// card. Reduced-motion safe (Popover animation is token/CSS driven).

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface AiTermHintProps {
  /** The visible term (e.g. a category label or "orchestration"). */
  term: string;
  /** The one-line plain-language meaning shown on tap. */
  meaning: string;
  /** Extra classes for the trigger (so it can match a chip's styling). */
  className?: string;
}

export function AiTermHint({ term, meaning, className }: AiTermHintProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${term}: ${meaning}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            // a quiet dotted underline marks it as "tap to learn", nothing loud
            'inline-flex items-center gap-1 underline decoration-dotted decoration-accent/40 underline-offset-2',
            className,
          )}
        >
          {term}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className="w-56 rounded-xl border border-border bg-[linear-gradient(180deg,#0f141b,#0b0e13)] p-3 text-[12px] leading-snug text-[#c2cad6] shadow-xl"
      >
        <span className="mb-0.5 block font-gobold text-[10px] uppercase tracking-[0.1em] text-accent">{term}</span>
        {meaning}
      </PopoverContent>
    </Popover>
  );
}
