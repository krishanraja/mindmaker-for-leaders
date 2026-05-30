import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BriefingInterest } from '@/types/briefing';

interface InterestChipsRowProps {
  interests: BriefingInterest[];
  loading?: boolean;
  onRemove: (id: string) => void | Promise<void>;
  onAdd?: () => void;
  emptyHint?: string;
}

/**
 * Compact row showing the beats/entities driving today's briefing. Each chip
 * has an inline X to drop ("don't brief me on this anymore"). Excludes are
 * rendered with a strikethrough so users can see what they've muted.
 */
export function InterestChipsRow({
  interests,
  loading = false,
  onRemove,
  onAdd,
  emptyHint = 'No interests yet - voice steer or tap + to add some.',
}: InterestChipsRowProps) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-20 rounded-full bg-muted/40 animate-pulse shrink-0"
          />
        ))}
      </div>
    );
  }

  if (interests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-2.5">
        <p className="text-[11px] text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AnimatePresence initial={false}>
        {interests.map((i) => {
          const isExclude = i.kind === 'exclude';
          const isEntity = i.kind === 'entity';
          return (
            <motion.span
              key={i.id}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={cn(
                'inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[11px] font-medium border',
                isExclude
                  ? 'border-muted bg-muted/40 text-muted-foreground line-through'
                  : isEntity
                  ? 'border-accent/30 bg-accent/10 text-foreground'
                  : 'border-border bg-background text-foreground',
              )}
            >
              {isExclude ? '−' : isEntity ? '@' : '#'} {i.text}
              <button
                type="button"
                onClick={() => onRemove(i.id)}
                aria-label={`Remove ${i.text}`}
                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </motion.span>
          );
        })}
      </AnimatePresence>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-border text-muted-foreground hover:text-accent hover:border-accent/50 transition-colors"
          aria-label="Add interest"
        >
          +
        </button>
      )}
    </div>
  );
}
