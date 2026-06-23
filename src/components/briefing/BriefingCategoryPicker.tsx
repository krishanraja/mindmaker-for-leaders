// BriefingCategoryPicker - the one-ask "what should your briefing cover?" step.
//
// A first-timer picks which of the nine AI-native NEWS CATEGORIES they want
// their daily briefing to cover (docs/MAIN-APP-POLISH-SPEC.md s2 + s3). This is
// the SAME AI-native world the news deck reads, so the briefing and the deck
// speak one language. It reuses the category registry (src/types/newsCategory.ts)
// and the branded CategoryMotif so each choice feels like the news card it maps
// to. No generic interests, ever.
//
// No-scroll: the whole picker is a fit-to-viewport flex column. The grid of
// nine takes the leftover space and never overflows the frame; the heading and
// the single primary action stay pinned. One clear ask: pick a few, then "Build
// my first briefing".

import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { CategoryMotif } from '@/components/cockpit/CategoryMotif';
import { NEWS_CATEGORIES, type NewsCategoryId } from '@/types/newsCategory';

// We ask for at least three so the first briefing has enough to feel like the
// leader's own world, not a generic feed. Matches the old MIN_INTERESTS.
export const MIN_BRIEFING_CATEGORIES = 3;

// The plain one-liner per category now lives in the registry (newsCategory.ts
// `meaning`), so the picker and the card chip hint speak with one voice.

export interface BriefingCategoryPickerProps {
  /** The category ids already chosen (controlled). */
  selected: Set<NewsCategoryId>;
  onToggle: (id: NewsCategoryId) => void;
  onConfirm: () => void;
  saving?: boolean;
  /** Tighter spacing for the desktop hero card vs the full mobile screen. */
  compact?: boolean;
}

export function BriefingCategoryPicker({
  selected,
  onToggle,
  onConfirm,
  saving = false,
  compact = false,
}: BriefingCategoryPickerProps) {
  const count = selected.size;
  const canConfirm = count >= MIN_BRIEFING_CATEGORIES;
  const remaining = Math.max(0, MIN_BRIEFING_CATEGORIES - count);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* The one ask, explained for a newcomer. */}
      <div className={cn('flex-shrink-0 text-center', compact ? 'mb-3' : 'mb-4')}>
        <h2
          className={cn(
            'font-semibold text-foreground',
            compact ? 'text-lg' : 'text-xl',
          )}
        >
          What should your briefing cover?
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Your briefing is a short daily read on the AI world, in your voice.
          Pick the parts you care about and we will build the first one for you.
        </p>
      </div>

      {/* The nine AI-native categories. Fills the leftover space; the grid wraps
          to fit any viewport with no page scroll (an internal hidden-scroll
          region catches a very short phone, never the page). */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NEWS_CATEGORIES.map((cat) => {
            const isOn = selected.has(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  haptics.light();
                  onToggle(cat.id);
                }}
                aria-pressed={isOn}
                className={cn(
                  'group relative overflow-hidden rounded-xl border text-left transition-colors',
                  isOn
                    ? 'border-accent/60 bg-accent/[0.06]'
                    : 'border-border bg-card hover:border-accent/30',
                )}
              >
                {/* the branded motif band - same art as the news card */}
                <div className="ctrl-motif-band relative h-12 w-full">
                  <CategoryMotif category={cat.id} />
                  {isOn && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div className="px-2.5 py-2">
                  <p
                    className={cn(
                      'text-[12px] font-semibold leading-tight',
                      isOn ? 'text-accent' : 'text-foreground',
                    )}
                  >
                    {cat.label}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">
                    {cat.meaning}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* The single primary action, pinned. */}
      <div className={cn('flex-shrink-0', compact ? 'pt-3' : 'pt-4')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          onClick={onConfirm}
          disabled={!canConfirm || saving}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90 disabled:opacity-50',
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {canConfirm ? 'Build my first briefing' : `Pick ${remaining} more to start`}
        </motion.button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {count > 0 ? (
            <>
              <span className="font-medium text-foreground">{count}</span> picked.
              You can change these any time.
            </>
          ) : (
            <>Pick at least {MIN_BRIEFING_CATEGORIES}. You can change these any time.</>
          )}
        </p>
      </div>
    </div>
  );
}
