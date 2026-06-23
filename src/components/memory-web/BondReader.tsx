/**
 * BondReader - the right-rail (desktop) / sheet (mobile) reader for a selected
 * bond in the four-world brain canvas. Mirrors brain-2.html step 2:
 *   "You're walking: ... -> bond -> ..." breadcrumb
 *   the connected detail (label + value + provenance)
 *   Confirm / Strengthen / Fix actions.
 *
 * HONESTY: every action here is backed by a real RPC. Confirm verifies the
 * fact (verifyFact); Strengthen vouches for it (strengthen_memory_fact: bumps
 * confidence + marks verified); Fix flags it wrong (fix_memory_fact: disputes
 * the fact + deactivates its edges). A handler is only rendered live when the
 * parent actually wires it; absent handlers still render DISABLED rather than
 * faking an action. The reader never shows a green "validated" tick for an
 * inferred bond; it reflects the real state (confirmed vs inferred / only-you).
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, Plus, Scissors, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORLD_META, factImportance, type MemoryBond } from './worldModel';

interface BondReaderProps {
  bond: MemoryBond | null;
  /** real backend action - confirm (verify) the fact this bond reads from */
  onConfirm?: (factId: string) => void | Promise<void>;
  /** optional: a real strengthen handler if/when one exists; disabled if absent */
  onStrengthen?: (factId: string) => void | Promise<void>;
  /** optional: a real fix/cut handler if/when one exists; disabled if absent */
  onFix?: (factId: string) => void | Promise<void>;
  className?: string;
  /** render as a compact sheet body (mobile) vs a full rail (desktop) */
  variant?: 'rail' | 'sheet';
}

function strengthLabel(strength: number, confirmed: boolean): { text: string; tone: string } {
  if (confirmed) return { text: 'Load-bearing - you confirmed it', tone: 'text-accent' };
  if (strength > 0.7) return { text: 'Reads as load-bearing (inferred)', tone: 'text-foreground' };
  if (strength > 0.4) return { text: 'A working link (inferred)', tone: 'text-muted-foreground' };
  return { text: 'A slack rope - only you can answer', tone: 'text-muted-foreground' };
}

export function BondReader({
  bond,
  onConfirm,
  onStrengthen,
  onFix,
  className,
  variant = 'rail',
}: BondReaderProps) {
  // Which action is mid-flight, so we disable the row + show honest progress.
  // Declared before any early return to keep hook order stable.
  const [busy, setBusy] = useState<'confirm' | 'strengthen' | 'fix' | null>(null);

  // Run a wired action with an honest result toast. The handler does the real
  // RPC + refetch; we only narrate the outcome (never claim success on error).
  const run = async (
    kind: 'confirm' | 'strengthen' | 'fix',
    handler: ((factId: string) => void | Promise<void>) | undefined,
    factId: string,
    okMessage: string,
  ) => {
    if (!handler || busy) return;
    setBusy(kind);
    try {
      await handler(factId);
      toast.success(okMessage);
    } catch {
      toast.error('Could not save that. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!bond) {
    return (
      <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
        <div className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-accent/60" />
        </div>
        <p className="text-sm text-foreground font-medium">Walk to a connection</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
          Tap a node in your brain to read the connection it sits on - then confirm, strengthen, or fix it with your hands.
        </p>
      </div>
    );
  }

  const meta = WORLD_META[bond.world];
  const sl = strengthLabel(bond.strength, bond.confirmed);
  const fact = bond.fact;
  const canConfirm = !!onConfirm && !bond.confirmed;

  return (
    <motion.div
      key={bond.id}
      initial={{ opacity: 0, x: variant === 'rail' ? 12 : 0, y: variant === 'sheet' ? 12 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn('flex flex-col h-full min-h-0', className)}
    >
      {/* breadcrumb of the walk */}
      <div className="text-[10.5px] text-muted-foreground leading-relaxed mb-3.5">
        <span className="text-foreground/80 font-semibold">You are reading:</span>{' '}
        <span style={{ color: meta.ink }}>{meta.label.replace('YOUR ', '').replace('YOU - ', '')}</span>
        {' -> '}
        <span className="text-foreground/80">{fact.fact_label}</span>
      </div>

      {/* the bond headline (the world + label this connection feeds) */}
      <div className="flex items-start gap-2.5 pb-3.5 mb-3.5 border-b border-border/60">
        <span
          className="flex-shrink-0 w-7 h-7 rounded-lg grid place-items-center text-xs font-bold mt-0.5"
          style={{ color: meta.fill, backgroundColor: `rgba(${meta.rgb},0.14)`, border: `1px solid rgba(${meta.rgb},0.4)` }}
        >
          {meta.label.charAt(0)}
        </span>
        <h2 className="flex-1 min-w-0 text-[15px] font-bold text-foreground leading-tight tracking-tight">
          {fact.fact_label}
        </h2>
      </div>

      {/* this connection */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        This connection
      </div>
      <p className="text-sm text-foreground font-medium leading-snug mt-1.5">
        {fact.fact_value}
      </p>
      {fact.fact_context && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {fact.fact_context}
        </p>
      )}

      {/* honest strength + provenance (never a fake validated tick) */}
      <div className="mt-3 space-y-1">
        <p className={cn('text-[11px] font-medium', sl.tone)}>{sl.text}</p>
        <p className="text-[10.5px] text-muted-foreground">
          {bond.provenance}
          {typeof factImportance(fact) === 'number' && (
            <span className="text-muted-foreground/60"> - importance {factImportance(fact)}/10 (est.)</span>
          )}
        </p>
      </div>

      {/* actions */}
      <div className={cn('flex flex-col gap-2', variant === 'rail' ? 'mt-auto pt-4' : 'mt-5')}>
        {/* Confirm - real backend (verify) */}
        <button
          onClick={() => canConfirm && run('confirm', onConfirm, fact.id, 'Confirmed')}
          disabled={!canConfirm || busy !== null}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
            bond.confirmed
              ? 'border-accent/30 bg-accent/5 cursor-default'
              : canConfirm && busy === null
                ? 'border-border bg-card hover:border-accent/40'
                : 'border-border bg-card opacity-50 cursor-not-allowed',
          )}
        >
          <span className="flex-shrink-0 w-6 h-6 rounded-lg grid place-items-center bg-accent/10 border border-accent/30 text-accent">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-semibold text-foreground">
              {bond.confirmed ? 'Confirmed' : busy === 'confirm' ? 'Confirming...' : 'Confirm'}
            </span>
            <span className="block text-[10.5px] text-muted-foreground mt-0.5">
              {bond.confirmed ? 'You stand behind this; CTRL trusts it' : 'Snap it taut - CTRL trusts it'}
            </span>
          </span>
        </button>

        {/* Strengthen - real backend (strengthen_memory_fact); disabled unless wired */}
        <button
          onClick={() => run('strengthen', onStrengthen, fact.id, 'Strengthened')}
          disabled={!onStrengthen || busy !== null}
          className={cn(
            'flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors',
            onStrengthen && busy === null ? 'hover:border-blue-400/40' : 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className="flex-shrink-0 w-6 h-6 rounded-lg grid place-items-center bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Plus className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-semibold text-foreground">
              {busy === 'strengthen' ? 'Strengthening...' : 'Strengthen'}
            </span>
            <span className="block text-[10.5px] text-muted-foreground mt-0.5">
              {onStrengthen ? 'Vouch for it - CTRL leans on it harder' : 'Vouch for it (coming soon)'}
            </span>
          </span>
        </button>

        {/* Fix - real backend (fix_memory_fact); disabled unless wired */}
        <button
          onClick={() => run('fix', onFix, fact.id, 'Flagged as wrong')}
          disabled={!onFix || busy !== null}
          className={cn(
            'flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors',
            onFix && busy === null ? 'hover:border-amber-400/40' : 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className="flex-shrink-0 w-6 h-6 rounded-lg grid place-items-center bg-amber-500/10 border border-amber-500/30 text-amber-400">
            {onFix ? <Scissors className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-semibold text-foreground">
              {busy === 'fix' ? 'Flagging...' : 'Fix'}
            </span>
            <span className="block text-[10.5px] text-muted-foreground mt-0.5">
              {onFix ? 'Flag it wrong - CTRL drops it and its links' : 'Cut or re-point (coming soon)'}
            </span>
          </span>
        </button>
      </div>
    </motion.div>
  );
}
