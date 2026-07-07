// TrackRecordView - the presentational You-tab surface. It is PURE: it takes a derived
// TrackRecordModel (built honestly from real rows in trackRecordModel.ts) plus the device,
// and renders the right state. Both the live page and the /preview harness drive it, so the
// harness shows exactly what a user sees.
//
// States, faithful to prototypes/you-2028.html:
//   cold -> a PROMISE: proof glyph + "your record starts with your first banked call" +
//           three "what gets tracked" rows (future value, never zeros) + one CTA.
//   warm -> the first honest pattern: calibration read (n/N) + honest caveat + first aged calls.
//   rich -> the earned reward: hero hit-rate + honest trend sparkline + "gut beat the data"
//           insight + aged-calls list railed by outcome.
//
// Device-native: mobile is a calm focused column (minimal scroll); desktop is a spacious
// two-zone reading surface (calibration left, calls right). No em dashes. Tokens only.

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { AgedCallRow, type DecisionCardActions } from './AgedCallRow';
import { CapabilityHeader } from './CapabilityHeader';
import { WarmCalibration, RichCalibration } from './CalibrationSummary';
import { ProofGlyph } from './trackRecordMotifs';
import type { AgedOutcome, TrackRecordModel } from './trackRecordModel';
import type { CapabilityNextMove, CapabilityRead } from '@/lib/capabilityLadder';

// ---------------------------------------------------------------------------------------
// COLD: the inviting promise. ONE centrepiece + a few questions worth weighing (each one
// deep-links into the weigher, prefilled). No zeros, no jargon.
// ---------------------------------------------------------------------------------------

// Generic, AI-native questions a leader should be asking (CTRL's north star: building /
// orchestrating / productizing / getting your business to market the AI-native way).
const SUGGESTED_QUESTIONS = [
  'Which part of your business should an AI run first?',
  'What is the one workflow worth turning into a product?',
  'Where would going AI-native change your economics most?',
] as const;

function PromiseState({ desktop, onWeigh }: { desktop: boolean; onWeigh?: (prefill?: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-1 flex-col items-center justify-center text-center',
        desktop && 'mx-auto max-w-[640px]',
      )}
    >
      <div className={cn('relative mb-1.5', desktop ? 'h-[150px] w-[150px]' : 'h-[128px] w-[128px]')}>
        <span
          className="pointer-events-none absolute -inset-[18%] rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 45%, hsl(var(--accent)/0.22), transparent 62%)',
          }}
          aria-hidden="true"
        />
        <ProofGlyph />
      </div>

      <h2
        className={cn(
          'mt-1 font-extrabold leading-[1.16] tracking-tight text-foreground',
          desktop ? 'max-w-[22ch] text-[30px]' : 'max-w-[19ch] text-2xl',
        )}
      >
        Your history <span className="text-accent">starts with your first big decision.</span>
      </h2>
      <p
        className={cn(
          'mt-3 leading-relaxed text-muted-foreground',
          desktop ? 'max-w-[48ch] text-[15px]' : 'max-w-[32ch] text-sm',
        )}
      >
        Weigh a decision and I will keep it here, then track how it turns out. Here are a few worth starting with.
      </p>

      <div
        className={cn(
          'mt-5 flex w-full flex-col gap-2.5',
          desktop ? 'max-w-[520px]' : 'max-w-[360px]',
        )}
      >
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onWeigh?.(q)}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-[linear-gradient(180deg,#0f141c,#0b0f15)] px-4 py-3.5 text-left transition-colors hover:border-accent/40"
          >
            <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[10px] border border-accent/30 bg-accent/10 text-accent">
              <Scale className="h-[16px] w-[16px]" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-foreground">{q}</span>
            <ArrowRight className="h-4 w-4 flex-none text-muted-foreground transition-colors group-hover:text-accent" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onWeigh?.()}
        className={cn(
          'mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border-none bg-accent px-4 py-3.5 text-[14.5px] font-extrabold tracking-tight text-[#04241f] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
          desktop ? 'max-w-[300px]' : 'max-w-[360px]',
        )}
        style={{ boxShadow: '0 14px 30px -12px hsl(var(--accent)/0.55), inset 0 1px 0 rgba(255,255,255,.25)' }}
      >
        <Scale className="h-[18px] w-[18px]" strokeWidth={2.1} />
        Weigh your own decision
      </button>
      <p className="mt-3 text-[11.5px] text-muted-foreground/80">Takes a minute. Nothing here until you weigh one.</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------
// Section label (the .slab) + the aged-calls list.
// ---------------------------------------------------------------------------------------

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
      {typeof count === 'number' && <span className="text-accent">&middot; {count}</span>}
    </p>
  );
}

// Plain-English outcome filter for the rich aged-calls list (the same segmented-lens
// grammar as the Decisions ladder): jump straight to the calls that worked out, the
// ones that fell short, or the ones still playing out.
const OUTCOME_SEGMENTS: { key: 'all' | AgedOutcome; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'held', label: 'Worked out' },
  { key: 'broke', label: 'Fell short' },
  { key: 'watch', label: 'Active' },
];

function OutcomeFilter({
  counts, value, onChange,
}: {
  counts: Record<'all' | AgedOutcome, number>;
  value: 'all' | AgedOutcome;
  onChange: (v: 'all' | AgedOutcome) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-foreground/[0.03] p-1">
      {OUTCOME_SEGMENTS.map((s) => {
        const on = value === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => { onChange(s.key); haptics.light(); }}
            className={cn(
              'flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-[11px] font-bold transition-colors',
              on ? 'bg-gradient-to-b from-accent to-accent text-accent-foreground shadow-[0_8px_18px_-10px_hsl(var(--accent)/0.6)]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {s.label}<span className={cn('text-[10px] tabular-nums', on ? 'opacity-80' : 'opacity-60')}>{counts[s.key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// The view.
// ---------------------------------------------------------------------------------------

export interface TrackRecordViewProps {
  model: TrackRecordModel;
  desktop: boolean;
  onWeigh?: (prefill?: string) => void;
  /** false renders at final state with no entrance motion (QC harness / static capture). */
  animated?: boolean;
  /** The quiet progression header (capability ladder); absent renders exactly the pre-ladder view. */
  capability?: CapabilityRead | null;
  onCapabilityGo?: (move: CapabilityNextMove) => void;
  /** When present, active-decision rows become a control centre (open/strengthen/archive). */
  decisionActions?: DecisionCardActions;
  /**
   * 'full' (default) = the standalone You surface: capability header + the
   * calibration hero + the calls list.
   * 'list' = the Decisions -> History embed: the calls list ONLY. The reflective
   * read (capability stage + calibration) lives in the track-record drawer, so
   * the Decisions tab leads with the actual decisions, not a summary card.
   */
  variant?: 'full' | 'list';
}

export function TrackRecordView({ model, desktop, onWeigh, animated = true, capability, onCapabilityGo, decisionActions, variant = 'full' }: TrackRecordViewProps) {
  const listOnly = variant === 'list';
  // Outcome filter for the rich list (hooks must run before any early return).
  const [outcome, setOutcome] = useState<'all' | AgedOutcome>('all');
  const outcomeCounts = useMemo(() => {
    const c: Record<'all' | AgedOutcome, number> = { all: model.calls.length, held: 0, broke: 0, watch: 0 };
    for (const call of model.calls) c[call.outcome] += 1;
    return c;
  }, [model.calls]);
  const richCalls = useMemo(
    () => (outcome === 'all' ? model.calls : model.calls.filter((c) => c.outcome === outcome)),
    [model.calls, outcome],
  );

  // The quiet progression header: where the leader is on the ladder + the one
  // next move. Rendered above every state on the FULL surface; in list mode it is
  // suppressed (it moves into the track-record drawer).
  const capabilityHeader = capability && !listOnly ? (
    <CapabilityHeader capability={capability} onGo={onCapabilityGo} />
  ) : null;

  if (model.kind === 'cold') {
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col gap-3.5', desktop && 'mx-auto w-full max-w-[680px]')}>
        {capabilityHeader}
        <PromiseState desktop={desktop} onWeigh={onWeigh} />
      </div>
    );
  }

  if (model.kind === 'warm') {
    // Warm: the first pattern + the first aged calls, calm. Mobile and desktop both read as
    // one calm column here (there is not yet enough to earn the two-zone desktop split).
    const shown = model.calls.slice(0, desktop ? 6 : 3);
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col gap-3.5', desktop && 'mx-auto w-full max-w-[680px]')}>
        {capabilityHeader}
        {!listOnly && <WarmCalibration calibration={model.calibration} freshDays={model.freshDays} />}
        {shown.length > 0 && (
          <>
            <SectionLabel>Active decisions</SectionLabel>
            <div className="flex min-h-0 flex-col gap-2.5">
              {shown.map((c, i) => (
                <AgedCallRow key={c.id} call={c} index={i} animated={animated} actions={decisionActions} />
              ))}
            </div>
          </>
        )}
        <p className="mt-auto py-1.5 text-center text-[12px] text-muted-foreground/80">
          Fills in as more decisions play out.
        </p>
      </div>
    );
  }

  // rich
  const calibration = (
    <RichCalibration
      calibration={model.calibration}
      trend={model.trend}
      freshDays={model.freshDays}
      insight={model.insight}
      desktop={desktop}
    />
  );

  if (desktop) {
    // List-only (Decisions History embed): a single calls column, no calibration
    // zone (that lives in the drawer). Otherwise the two-zone reading surface.
    if (listOnly) {
      return (
        <div className="mx-auto flex min-h-0 w-full max-w-[680px] flex-1 flex-col gap-3">
          <SectionLabel count={model.calls.length}>How they turned out</SectionLabel>
          <OutcomeFilter counts={outcomeCounts} value={outcome} onChange={setOutcome} />
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto scrollbar-hide pb-1">
            {richCalls.length === 0 && <p className="text-[12.5px] text-muted-foreground">None in this group.</p>}
            {richCalls.map((c, i) => (
              <AgedCallRow key={c.id} call={c} index={i} animated={animated} actions={decisionActions} />
            ))}
          </div>
        </div>
      );
    }
    // Two-zone reading surface: calibration left, the filterable aged-calls scroll right.
    return (
      <div className="grid min-h-0 flex-1 grid-cols-[1.05fr_1fr] gap-6">
        <div className="flex min-h-0 flex-col gap-4">
          {capabilityHeader}
          {calibration}
        </div>
        <div className="flex min-h-0 flex-col gap-3">
          <SectionLabel count={model.calls.length}>How they turned out</SectionLabel>
          <OutcomeFilter counts={outcomeCounts} value={outcome} onChange={setOutcome} />
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto scrollbar-hide pb-1">
            {richCalls.length === 0 && <p className="text-[12.5px] text-muted-foreground">None in this group.</p>}
            {richCalls.map((c, i) => (
              <AgedCallRow key={c.id} call={c} index={i} animated={animated} actions={decisionActions} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Mobile rich: calibration hero, the outcome filter, then a tighter readable list.
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {capabilityHeader}
      {!listOnly && calibration}
      <SectionLabel count={model.calls.length}>How your calls aged</SectionLabel>
      <OutcomeFilter counts={outcomeCounts} value={outcome} onChange={setOutcome} />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto scrollbar-hide">
        {richCalls.length === 0 && <p className="text-[12.5px] text-muted-foreground">None in this group.</p>}
        {richCalls.map((c, i) => (
          <AgedCallRow key={c.id} call={c} index={i} animated={animated} actions={decisionActions} />
        ))}
      </div>
    </div>
  );
}
