import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SuggestedBriefingInterest } from '@/types/briefing';

interface SuggestedInterestsCardProps {
  suggestions: SuggestedBriefingInterest[];
  loading?: boolean;
  onAccept: (s: SuggestedBriefingInterest) => void | Promise<void>;
  onDismiss: (id: string) => void | Promise<void>;
  onAcceptAll: () => void | Promise<void>;
}

/**
 * Shows medium-confidence interests inferred from `user_memory`. Each row
 * has accept/dismiss; the header has a "Keep all" shortcut. Hidden when
 * `suggestions` is empty so it doesn't add chrome to the briefing tab.
 */
export function SuggestedInterestsCard({
  suggestions,
  loading = false,
  onAccept,
  onDismiss,
  onAcceptAll,
}: SuggestedInterestsCardProps) {
  if (loading || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">
              We picked these up from what you've shared
            </p>
            <p className="text-[11px] text-muted-foreground">
              Keep them in your briefing, or drop the ones that don't fit.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAcceptAll()}
          className="h-7 px-2 text-[11px] shrink-0"
        >
          Keep all
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence initial={false}>
          {suggestions.map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-background pl-2.5 pr-1 py-0.5 text-[11px]',
              )}
              title={s.reason ?? undefined}
            >
              <span className="text-muted-foreground/80 mr-0.5">
                {s.kind === 'entity' ? '@' : s.kind === 'exclude' ? '−' : '#'}
              </span>
              <span className="font-medium text-foreground">{s.text}</span>
              <button
                type="button"
                onClick={() => onAccept(s)}
                aria-label={`Keep ${s.text}`}
                className="w-5 h-5 rounded-full inline-flex items-center justify-center text-emerald-600 hover:bg-emerald-500/10 transition-colors"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onDismiss(s.id)}
                aria-label={`Dismiss ${s.text}`}
                className="w-5 h-5 rounded-full inline-flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
