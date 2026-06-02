import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useOnceFlag } from '@/hooks/useOnceFlag';

interface CoachmarkProps {
  /** Stable id - the tip shows once per id, ever. */
  id: string;
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
}

/**
 * A one-time contextual tip shown at the top of a deep surface (Edge,
 * Briefing, Export) the first time a user lands there. Dismissible, and never
 * shown again. Deliberately not a DOM-anchored spotlight: a top-of-surface
 * callout is robust across the desktop sidebar and mobile bottom-nav layouts
 * and degrades gracefully if the page structure changes.
 */
export function Coachmark({ id, icon: Icon, title, body, className }: CoachmarkProps) {
  const [seen, markSeen] = useOnceFlag(`coach_${id}`);

  return (
    <AnimatePresence>
      {!seen && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25 }}
          className={className}
        >
          <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/[0.07] px-4 py-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15">
              <Icon className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
            <button
              type="button"
              onClick={markSeen}
              aria-label="Dismiss tip"
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
