// AgedCallRow - one banked call, aged, railed by outcome. A coloured left rail
// (emerald held / amber did-not-hold / neutral active), an honest badge, the call
// itself, and a plain read line.
//
// For an ACTIVE decision (outcome 'watch') the row doubles as a mini control
// centre: open it, strengthen it (dig deeper), or archive it - each wired to the
// SAME existing doors the Decisions tab already uses (no new features). The
// actions only render when the parent supplies them; static harnesses (/preview)
// omit them and get a plain read line.
//
// Tokens only (ctrl-ds): accent for held, amber-500 for did-not-hold, muted for active.

import { motion } from 'framer-motion';
import { Archive, ArrowUpRight, Check, Clock, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgedCall } from './trackRecordModel';

// The control-centre actions for an active decision. Supplied by the parent so
// the card reuses the app's real open/strengthen/archive doors.
export interface DecisionCardActions {
  onOpen: (id: string) => void;
  onStrengthen: (id: string) => void;
  onArchive: (id: string) => void | Promise<void>;
  archivingId?: string | null;
}

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
    badge: 'Active decision',
    Icon: Clock,
  },
};

// The plain-language read line for a resolved (held/broke) call. We HAVE the call
// + whether it was scored + the match, so we say the honest thing the data supports.
function readLine(call: AgedCall): React.ReactNode {
  if (!call.scored || call.readMatch === null) {
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

// The active-decision control centre: open / strengthen / archive, each a quiet
// on-token action wired to an existing door.
function ActiveActions({ id, actions }: { id: string; actions: DecisionCardActions }) {
  const archiving = actions.archivingId === id;
  const base =
    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors';
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => actions.onOpen(id)}
        className={cn(base, 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/15')}
      >
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        Open
      </button>
      <button
        type="button"
        onClick={() => actions.onStrengthen(id)}
        className={cn(base, 'border-border bg-card/40 text-foreground hover:border-accent/30')}
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
        Strengthen
      </button>
      <button
        type="button"
        onClick={() => actions.onArchive(id)}
        disabled={archiving}
        className={cn(base, 'ml-auto border-border bg-card/40 text-muted-foreground hover:text-foreground disabled:opacity-50')}
      >
        {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" strokeWidth={2.2} />}
        Archive
      </button>
    </div>
  );
}

export function AgedCallRow({
  call,
  index = 0,
  animated = true,
  actions,
}: {
  call: AgedCall;
  index?: number;
  animated?: boolean;
  /** When present on an active ('watch') call, renders the open/strengthen/archive control centre. */
  actions?: DecisionCardActions;
}) {
  const meta = OUTCOME_META[call.outcome];
  const isActive = call.outcome === 'watch';
  const showControls = isActive && Boolean(actions);
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
        {showControls ? (
          <button
            type="button"
            onClick={() => actions!.onOpen(call.id)}
            className="block w-full text-left"
          >
            <h3 className="text-[13.5px] font-bold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
              {call.question}
            </h3>
          </button>
        ) : (
          <h3 className="text-[13.5px] font-bold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
            {call.question}
          </h3>
        )}
        {showControls ? (
          <ActiveActions id={call.id} actions={actions!} />
        ) : (
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
            {isActive ? 'Still open. I will track how it turns out.' : readLine(call)}
          </p>
        )}
      </div>
    </motion.article>
  );
}
