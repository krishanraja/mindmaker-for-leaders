/**
 * BrainCanvas - the framed canvas that hosts the centred Brain graph and owns its
 * three first-class states (CTRL-SYSTEM-SPEC s6 "state is the experience"):
 *
 *   LOADING : the shared branded SkeletonCard materializing inside a centred
 *             canvas, with an anticipatory caption (never a raw spinner).
 *   COLD    : a breathing emerald seed-orb invitation + a single Add CTA (a
 *             promise, not an empty dashboard or a guilt-list of zeros).
 *   GRAPH   : the hub-anchored, always-centred BrainGraph (warm + rich).
 *
 * The frame itself is the calm bordered well from prototypes/brain-2028.html
 * (.canvas-wrap): rounded, soft inner vignette, the graph absolutely filling it.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Brain, Plus } from 'lucide-react';
import type { MemoryWebFact, UserPattern } from '@/types/memory';
import type { MemoryEdge } from '@/hooks/useMemoryEdges';
import { SkeletonCard, LoadingCaption } from '@/components/system/SkeletonCard';
import { BrainGraph, type GraphBond } from './BrainGraph';
import { cn } from '@/lib/utils';

interface BrainCanvasProps {
  facts: MemoryWebFact[];
  patterns?: UserPattern[];
  edges?: MemoryEdge[];
  loading?: boolean;
  selectedFactId?: string | null;
  onBondSelect?: (bond: GraphBond | null) => void;
  onPatternSelect?: (pattern: UserPattern | null) => void;
  onAdd: () => void;
  isMobile: boolean;
}

export function BrainCanvas({
  facts,
  patterns = [],
  edges = [],
  loading = false,
  selectedFactId = null,
  onBondSelect,
  onPatternSelect,
  onAdd,
  isMobile,
}: BrainCanvasProps) {
  // cold = nothing to draw at all (no facts AND no observed patterns).
  const cold = !loading && facts.length === 0 && patterns.length === 0;

  return (
    <div
      className={cn(
        'relative h-full min-h-0 w-full overflow-hidden rounded-[18px] border border-border',
        // the calm bordered well + soft radial centre, from the mock
        'bg-[radial-gradient(60%_55%_at_50%_50%,hsl(220_28%_11%/0.7),transparent_75%),hsl(var(--popover)/0.4)]',
      )}
    >
      {/* inner vignette so depth reads (the mock's .canvas-wrap::after) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[18px]"
        style={{ boxShadow: 'inset 0 0 120px 20px hsl(225 25% 3% / 0.8)' }}
      />

      {loading ? (
        <LoadingState />
      ) : cold ? (
        <ColdInvite onAdd={onAdd} />
      ) : (
        <>
          <p className="pointer-events-none absolute left-0 right-0 top-3.5 z-[3] text-center text-[11px] tracking-[0.04em] text-muted-foreground/80">
            {isMobile ? 'Tap a node to read its bond' : 'Click a node to read its bond'}
          </p>
          <BrainGraph
            facts={facts}
            patterns={patterns}
            edges={edges}
            selectedFactId={selectedFactId}
            onBondSelect={onBondSelect}
            onPatternSelect={onPatternSelect}
          />
        </>
      )}
    </div>
  );
}

/* ---------- LOADING: a centred canvas materializing ---------- */
function LoadingState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-full max-w-[320px]">
        <SkeletonCard variant="tile" />
      </div>
      <LoadingCaption>Assembling your memory</LoadingCaption>
    </div>
  );
}

/* ---------- COLD: the breathing seed-orb invitation ---------- */
function ColdInvite({ onAdd }: { onAdd: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="absolute inset-0 z-[4] flex flex-col items-center justify-center gap-4 px-8 text-center">
      {/* seed orb: a dashed spinning ring + a breathing emerald core */}
      <div className="relative grid h-[132px] w-[132px] place-items-center">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle at 50% 45%, hsl(171 100% 43% / 0.16), transparent 70%)' }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-[1.5px] border-dashed"
          style={{ borderColor: 'hsl(var(--primary) / 0.4)' }}
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 26, ease: 'linear' }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-[26px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 40%, hsl(171 100% 50% / 0.5), hsl(171 100% 38% / 0.15))',
            boxShadow: '0 0 40px hsl(171 100% 43% / 0.5), inset 0 0 20px hsl(171 100% 60% / 0.3)',
          }}
          animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
        />
        <Brain className="relative z-[1] h-[38px] w-[38px] text-primary" strokeWidth={1.7} />
      </div>

      <div>
        <h3 className="text-[19px] font-[650] tracking-[-0.01em] text-foreground">Let&apos;s start your memory</h3>
        <p className="mx-auto mt-1.5 max-w-[340px] text-[13.5px] leading-relaxed text-muted-foreground">
          Add the first thing your AI should know about you. Each one makes every AI you use sound a little more like you.
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 inline-flex items-center gap-2 rounded-[13px] bg-primary px-[22px] py-3 text-[14px] font-[650] text-primary-foreground shadow-[0_10px_30px_hsl(171_100%_43%/0.4)] transition-transform hover:-translate-y-0.5"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} />
        Add your first memory
      </button>
    </div>
  );
}
