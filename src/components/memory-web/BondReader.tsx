/**
 * BondReader - the right-rail (desktop) / sheet (mobile) reader for a selected
 * bond in the four-world brain canvas. Mirrors brain-2.html step 2:
 *   "You're walking: ... -> bond -> ..." breadcrumb
 *   the connected detail (label + value + provenance)
 *   Confirm / Strengthen / Fix actions.
 *
 * HONESTY: only Confirm has a real backend (verifyFact on the memory hook), so
 * Strengthen and Fix render but are DISABLED with an honest "not wired yet"
 * note - we never fake an action. The reader also never shows a green
 * "validated" tick for an inferred bond; it reflects the real state
 * (confirmed vs inferred / only-you).
 */

import React from 'react';
import { motion } from 'framer-motion';
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
  if (!bond) {
    return (
      <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
        <div className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-accent/60" />
        </div>
        <p className="text-sm text-foreground font-medium">Walk to a connection</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
          Tap a node in your brain to read the bond it sits on - then confirm, strengthen, or fix it with your hands.
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
          onClick={() => canConfirm && onConfirm?.(fact.id)}
          disabled={!canConfirm}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
            bond.confirmed
              ? 'border-accent/30 bg-accent/5 cursor-default'
              : canConfirm
                ? 'border-border bg-card hover:border-accent/40'
                : 'border-border bg-card opacity-50 cursor-not-allowed',
          )}
        >
          <span className="flex-shrink-0 w-6 h-6 rounded-lg grid place-items-center bg-accent/10 border border-accent/30 text-accent">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-semibold text-foreground">
              {bond.confirmed ? 'Confirmed' : 'Confirm'}
            </span>
            <span className="block text-[10.5px] text-muted-foreground mt-0.5">
              {bond.confirmed ? 'You stand behind this; CTRL trusts it' : 'Snap it taut - CTRL trusts it'}
            </span>
          </span>
        </button>

        {/* Strengthen - rendered honest: disabled unless a real handler exists */}
        <button
          onClick={() => onStrengthen?.(fact.id)}
          disabled={!onStrengthen}
          className={cn(
            'flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors',
            onStrengthen ? 'hover:border-blue-400/40' : 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className="flex-shrink-0 w-6 h-6 rounded-lg grid place-items-center bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Plus className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-semibold text-foreground">Strengthen</span>
            <span className="block text-[10.5px] text-muted-foreground mt-0.5">
              {onStrengthen ? "Add the one thing it's missing" : 'Add the missing piece (coming soon)'}
            </span>
          </span>
        </button>

        {/* Fix - rendered honest: disabled unless a real handler exists */}
        <button
          onClick={() => onFix?.(fact.id)}
          disabled={!onFix}
          className={cn(
            'flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors',
            onFix ? 'hover:border-amber-400/40' : 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className="flex-shrink-0 w-6 h-6 rounded-lg grid place-items-center bg-amber-500/10 border border-amber-500/30 text-amber-400">
            {onFix ? <Scissors className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-semibold text-foreground">Fix</span>
            <span className="block text-[10.5px] text-muted-foreground mt-0.5">
              {onFix ? 'Cut a wrong one, or re-point it' : 'Cut or re-point (coming soon)'}
            </span>
          </span>
        </button>
      </div>
    </motion.div>
  );
}
