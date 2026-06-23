import { motion } from 'framer-motion';
import { ArrowRight, FileText, Scale } from 'lucide-react';
import { cn, capLabel } from '@/lib/utils';
import type { EdgeStrength, EdgeWeakness } from '@/types/edge';

/**
 * The Verdict: the new focal Edge screen.
 *
 * Answers, in order and without interaction: who you lead with, where the
 * remit bites, how you compare, and the ONE next move. A time-poor leader
 * reads it in five seconds and leaves with a single board-ready artifact.
 *
 * Everything else (the full strength/gap read) is one quiet link away. No
 * stat-chip dashboard, no cycling teaser, no competing CTAs. One focal point.
 */

interface EdgeVerdictProps {
  strengths: EdgeStrength[];
  weaknesses: EdgeWeakness[];
  /** Open the board-memo draft for the leading gap (or strength as fallback). */
  onMakeMove: (targetKey: string) => void;
  /** Open the demoted full strength/gap read. */
  onOpenFullRead: () => void;
  /** Open the decision pressure-test. */
  onPressureTest: () => void;
}

function lower(label: string): string {
  // Skill labels read naturally lowercased mid-sentence ("you lead with
  // strategic thinking"). Acronyms (2+ caps) are left intact.
  return label
    .split(' ')
    .map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase()))
    .join(' ');
}

export function EdgeVerdict({
  strengths,
  weaknesses,
  onMakeMove,
  onOpenFullRead,
  onPressureTest,
}: EdgeVerdictProps) {
  const s0 = strengths[0];
  const w0 = weaknesses[0];
  const moveTargetKey = w0?.key || s0?.key || '';

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-lg font-bold text-foreground">Your Edge</h1>
        <span className="text-xs text-muted-foreground">Read in 5 seconds</span>
      </div>

      {/* The verdict: three plain sentences */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2.5"
      >
        {s0 ? (
          <p className="text-[clamp(1.375rem,6vw,1.5rem)] font-bold leading-tight tracking-tight text-balance text-foreground">
            You lead with {lower(capLabel(s0.label))}.
          </p>
        ) : (
          <p className="text-[clamp(1.375rem,6vw,1.5rem)] font-bold leading-tight tracking-tight text-balance text-foreground">
            Your edge is still taking shape.
          </p>
        )}
        {w0 && (
          <p className="text-[clamp(1.375rem,6vw,1.5rem)] font-bold leading-tight tracking-tight text-balance text-foreground">
            <span className="text-amber-500">{capLabel(w0.label)}</span> is where the remit
            bites.
          </p>
        )}
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          {s0 && w0
            ? 'Most leaders carrying the AI remit share this exact split.'
            : 'Add a few more thoughts and this read sharpens fast.'}
        </p>
      </motion.div>

      {/* Compare strip: how you sit against peers, no threatening numbers */}
      {(s0 || w0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3"
        >
          {s0 && (
            <CompareRow
              label="Sharper than most"
              fill={Math.max(0.55, s0.confidence || 0.7)}
              tone="mint"
            />
          )}
          {w0 && (
            <CompareRow
              label={`Behind on ${lower(capLabel(w0.label, 32))}`}
              fill={Math.max(0.35, w0.confidence || 0.6)}
              tone="amber"
            />
          )}
        </motion.div>
      )}

      {/* The one move */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
          Your next move
        </p>
        <p className="mb-4 text-sm leading-relaxed text-pretty text-foreground">
          {w0
            ? `Cover ${lower(capLabel(w0.label, 32))} the fast way: a board memo drafted from your real context, ready to send.`
            : 'Put your strongest thinking on paper. We draft a board memo from your context, ready to send.'}
        </p>
        <button
          type="button"
          onClick={() => onMakeMove(moveTargetKey)}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5',
            'text-sm font-semibold text-accent-foreground',
            'bg-accent shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90',
          )}
        >
          <FileText className="h-4 w-4" />
          Make my board memo
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>

      {/* Secondary move: pressure-test a real decision */}
      <motion.button
        type="button"
        onClick={onPressureTest}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-foreground/5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
          <Scale className="h-4 w-4 text-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            Weigh a decision
          </span>
          <span className="block text-xs text-muted-foreground">
            Name a call you are weighing. We stress-test what it rests on.
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </motion.button>

      {/* Quiet secondary: the full read */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onOpenFullRead}
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          See the full read
        </button>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  fill,
  tone,
}: {
  label: string;
  fill: number;
  tone: 'mint' | 'amber';
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.round(fill * 100))}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            tone === 'mint' ? 'bg-accent' : 'bg-amber-500',
          )}
        />
      </div>
    </div>
  );
}
