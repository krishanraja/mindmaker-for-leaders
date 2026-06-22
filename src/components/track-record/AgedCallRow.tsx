// AgedCallRow - one banked call, aged, railed by outcome. Faithful to the .acall rows in
// prototypes/you-2028.html: a coloured left rail (emerald held / amber did-not-hold /
// neutral still-playing-out), an honest badge, the call itself, and a plain-language read
// line. Never green-ticks a "validated"; the watch state reads neutrally.
//
// Tokens only (ctrl-ds): accent for held, amber-500 for did-not-hold, muted for watch.

import { motion } from 'framer-motion';
import { Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgedCall } from './trackRecordModel';

const OUTCOME_META: Record<
  AgedCall['outcome'],
  { rail: string; badgeCls: string; badge: string; Icon: typeof Check }
> = {
  held: {
    rail: 'bg-gradient-to-b from-accent to-[hsl(var(--accent)/0.55)]',
    badgeCls: 'text-accent bg-accent/10 border-accent/30',
    badge: 'Held up',
    Icon: Check,
  },
  broke: {
    rail: 'bg-gradient-to-b from-amber-500 to-amber-800',
    badgeCls: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    badge: 'Did not hold',
    Icon: X,
  },
  watch: {
    rail: 'bg-gradient-to-b from-muted-foreground/50 to-muted-foreground/20',
    badgeCls: 'text-muted-foreground bg-secondary border-border',
    badge: 'Still playing out',
    Icon: Clock,
  },
};

// The plain-language read line. We HAVE the call + whether it was scored + the match, but
// not a per-call prose narrative, so we say the honest thing the data supports.
function readLine(call: AgedCall): React.ReactNode {
  if (call.outcome === 'watch') {
    return (
      <>
        <b className="font-semibold text-[#c2cad6]">Watching how it lands.</b>
      </>
    );
  }
  if (!call.scored || call.readMatch === null) {
    // Banked but no gut-vs-ground signal to score against; describe the outcome only.
    return call.outcome === 'held' ? (
      <>This call <span className="font-semibold text-accent">held up</span> as you decided it.</>
    ) : (
      <>This call <span className="font-semibold text-amber-500">did not hold</span> the way you decided it.</>
    );
  }
  if (call.readMatch) {
    return (
      <>
        <b className="font-semibold text-[#c2cad6]">Your read:</b>{' '}
        <span className="font-semibold text-accent">you called it the way it landed.</span>
      </>
    );
  }
  return (
    <>
      <b className="font-semibold text-[#c2cad6]">Your read:</b>{' '}
      <span className="font-semibold text-amber-500">the evidence went the other way.</span>
    </>
  );
}

export function AgedCallRow({
  call,
  index = 0,
  animated = true,
}: {
  call: AgedCall;
  index?: number;
  animated?: boolean;
}) {
  const meta = OUTCOME_META[call.outcome];
  return (
    <motion.article
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: animated ? Math.min(index * 0.055, 0.33) : 0, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-[linear-gradient(180deg,#0f141c,#0a0e13)]"
    >
      <span className={cn('w-1 flex-none', meta.rail)} aria-hidden="true" />
      <div className="min-w-0 flex-1 px-4 py-3.5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[8.5px] font-bold uppercase tracking-wide',
              meta.badgeCls,
            )}
          >
            <meta.Icon className="h-2.5 w-2.5" strokeWidth={3} />
            {meta.badge}
          </span>
          <span className="ml-auto whitespace-nowrap text-[10.5px] text-muted-foreground">{call.ageLabel}</span>
        </div>
        <h3 className="text-[13.5px] font-bold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
          {call.question}
        </h3>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{readLine(call)}</p>
      </div>
    </motion.article>
  );
}
