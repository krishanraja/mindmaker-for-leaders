import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BrainGraph } from '@/components/memory-web/BrainGraph';
import { BRAIN_DEMO_EDGES, BRAIN_DEMO_FACTS } from './brainDemoSeed';
import { cn } from '@/lib/utils';

/**
 * BrainDemo - the landing hero's proof, and the real component.
 *
 * This is not a picture of the brain. It is BrainGraph, the same component the
 * authed app renders at /memory, fed a static seed. That is possible because
 * BrainGraph is pure and prop-driven: it takes facts and edges, holds no auth,
 * touches no Supabase, and its MemoryEdge import is `import type`, so nothing
 * from the hook layer reaches the public bundle.
 *
 * It replaced the worked decision here because the section it sits in is about
 * the brain ("CTRL builds your private AI brain"), and a canned decision was
 * illustrating a different claim from the one the words make. /try keeps the
 * weigh, which is the right proof there: it is the page where you then do one.
 *
 * THE ASSEMBLY IS THE ARGUMENT. Nodes arrive one at a time so the eye follows
 * the graph being built rather than landing on a finished diagram, which reads
 * as an illustration. Under reduced motion the whole thing is present on the
 * first frame; the staging is decoration and decoration is the first thing that
 * should go when someone has asked for less of it.
 */

/** Gap between nodes arriving. Fast enough to finish before anyone scrolls past. */
const STEP_MS = 220;

interface BrainDemoProps {
  className?: string;
}

export function BrainDemo({ className }: BrainDemoProps) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(() => (reduceMotion ? BRAIN_DEMO_FACTS.length : 1));

  useEffect(() => {
    if (reduceMotion) {
      setShown(BRAIN_DEMO_FACTS.length);
      return;
    }
    if (shown >= BRAIN_DEMO_FACTS.length) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => window.clearTimeout(t);
  }, [shown, reduceMotion]);

  const facts = BRAIN_DEMO_FACTS.slice(0, shown);
  const visible = new Set(facts.map((f) => f.id));
  // An edge to a node that has not arrived would render as a line into empty
  // space, so edges follow their endpoints rather than being staged separately.
  const edges = BRAIN_DEMO_EDGES.filter(
    (e) => visible.has(e.from_fact_id) && visible.has(e.to_fact_id),
  );

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-border bg-card/40',
        'h-[320px] sm:h-[400px] lg:h-[460px]',
        className,
      )}
    >
      <BrainGraph facts={facts} edges={edges} className="h-full w-full" />
    </div>
  );
}

export default BrainDemo;
