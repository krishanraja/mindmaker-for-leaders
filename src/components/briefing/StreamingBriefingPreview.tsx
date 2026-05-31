import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { BriefingSegment } from '@/types/briefing';

/**
 * Flag-gated (FF.briefingStream) live "assembling" view: shows the briefing's
 * preliminary headlines streaming in while curation runs, then a polishing
 * state once the script is being written. Purely presentational.
 */
export function StreamingBriefingPreview({
  segments,
  ready,
}: {
  segments: BriefingSegment[];
  ready: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-accent">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        {ready ? 'Polishing your briefing' : 'Assembling your briefing'}
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {segments.map((s, i) => (
            <motion.div
              key={`${s.headline ?? 'item'}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
              className="rounded-lg border border-border/60 bg-card/60 px-3 py-2"
            >
              <p className="text-sm font-medium leading-snug text-foreground/90">
                {s.headline}
              </p>
              {s.source && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.source}</p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Drawn live from your priorities. The final briefing will be tighter.
      </p>
    </div>
  );
}
