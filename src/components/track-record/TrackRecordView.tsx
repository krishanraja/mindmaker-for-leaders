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

import { motion } from 'framer-motion';
import { Clock, Scale, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgedCallRow } from './AgedCallRow';
import { CalibrationSparkline, ProofGlyph } from './trackRecordMotifs';
import type { CalibrationRead, SharpenTrend, TrackRecordModel } from './trackRecordModel';

// ---------------------------------------------------------------------------------------
// COLD: the inviting promise. ONE centrepiece, three future-value rows, one door. No zeros.
// ---------------------------------------------------------------------------------------

const PROMISE_ROWS = [
  {
    Icon: Scale,
    title: 'Where your gut met the evidence',
    sub: 'The call you made, against what the data said.',
  },
  {
    Icon: TrendingUp,
    title: 'How each call aged',
    sub: 'Held up, did not hold, or still playing out.',
  },
  {
    Icon: Clock,
    title: 'Your hit-rate over time',
    sub: 'Whether you are getting sharper, honestly scored.',
  },
] as const;

function PromiseState({ desktop, onWeigh }: { desktop: boolean; onWeigh?: () => void }) {
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
      <div className={cn('relative mb-1.5', desktop ? 'h-[172px] w-[172px]' : 'h-[148px] w-[148px]')}>
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
          desktop ? 'max-w-[22ch] text-[32px]' : 'max-w-[19ch] text-2xl',
        )}
      >
        Your judgment record <span className="text-accent">starts with your first banked call.</span>
      </h2>
      <p
        className={cn(
          'mt-3.5 leading-relaxed text-muted-foreground',
          desktop ? 'max-w-[46ch] text-[15.5px]' : 'max-w-[30ch] text-sm',
        )}
      >
        Pressure-test a decision, bank it, and I will track how it ages. Over time this becomes proof of how you
        actually call it.
      </p>

      <div
        className={cn(
          'mt-6 flex w-full gap-2.5',
          desktop ? 'max-w-[560px] flex-row' : 'max-w-[340px] flex-col',
        )}
      >
        {PROMISE_ROWS.map(({ Icon, title, sub }) => (
          <div
            key={title}
            className={cn(
              'flex items-center gap-3.5 rounded-2xl border border-border bg-[linear-gradient(180deg,#0f141c,#0b0f15)] px-3.5 py-3 text-left',
              desktop && 'flex-1 flex-col items-start gap-2.5',
            )}
          >
            <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border border-accent/30 bg-accent/10 text-accent">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-bold leading-tight text-foreground">{title}</span>
              <span className="text-[11.5px] leading-snug text-muted-foreground">{sub}</span>
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onWeigh}
        className={cn(
          'mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border-none bg-accent px-4 py-3.5 text-[14.5px] font-extrabold tracking-tight text-[#04241f] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
          desktop ? 'max-w-[300px]' : 'max-w-[340px]',
        )}
        style={{ boxShadow: '0 14px 30px -12px hsl(var(--accent)/0.55), inset 0 1px 0 rgba(255,255,255,.25)' }}
      >
        <Scale className="h-[18px] w-[18px]" strokeWidth={2.1} />
        Weigh your first decision
      </button>
      <p className="mt-3 text-[11.5px] text-muted-foreground/80">Takes a minute. Nothing here until you bank one.</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------
// The calibration card (centre of warm + rich). In warm it is an n/N first read; in rich
// it is a hero hit-rate with an honest trend strip + the "gut beat the data" insight.
// ---------------------------------------------------------------------------------------

function freshnessLabel(freshDays: number | null): string | null {
  if (freshDays === null) return null;
  if (freshDays === 0) return 'updated today';
  if (freshDays === 1) return 'last call yesterday';
  return `last call ${freshDays}d ago`;
}

function WarmCalibration({ calibration, freshDays }: { calibration: CalibrationRead; freshDays: number | null }) {
  const fresh = freshnessLabel(freshDays);
  // Three honest warm sub-states, none of which is ever a zero-scoreboard (spec s4):
  //  - readRight:  read >= 1  -> the positive n/N hero ("3/4 calls read right").
  //  - firstMiss:  scored >= 1 but read === 0 -> the pattern has not landed your way YET.
  //                We never lead a brand-new leader with a stark "0/N" hero; we frame it as
  //                early and forward-looking, honestly (the calls are still listed below).
  //  - awaiting:   scored === 0 -> banked, but no gut-vs-ground signal to score yet.
  const mode: 'readRight' | 'firstMiss' | 'awaiting' =
    calibration.read > 0 ? 'readRight' : calibration.scored > 0 ? 'firstMiss' : 'awaiting';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[22px] border border-accent/30 bg-[linear-gradient(180deg,#101620,#0a0e12)] px-5 pb-[18px] pt-5"
      style={{ boxShadow: '0 30px 64px -34px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.025)' }}
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 88% -20%, hsl(var(--accent)/0.12), transparent 55%)' }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">The first pattern</span>
        {fresh && <span className="text-[11px] font-medium text-muted-foreground/80">{fresh}</span>}
      </div>

      {mode === 'readRight' && (
        <>
          <div className="relative mt-3.5 flex items-baseline gap-3.5">
            <span
              className="text-[62px] font-bold leading-[0.86] tracking-tighter text-[#aef6ea] [font-variant-numeric:tabular-nums]"
              style={{ textShadow: '0 0 30px hsl(var(--accent)/0.5)' }}
            >
              {calibration.read}
              <span className="text-[0.42em] font-semibold text-muted-foreground">/{calibration.scored}</span>
            </span>
            <span className="flex flex-col gap-0.5 pb-1.5">
              <span className="text-[13px] font-bold text-foreground">calls read right</span>
              <span className="max-w-[18ch] text-[11.5px] leading-snug text-muted-foreground">
                You called these the way the evidence landed.
              </span>
            </span>
          </div>
          <p className="relative mt-3.5 text-[13px] leading-relaxed text-[#c2cad6]">
            Early days, but it is honest. <b className="font-bold text-accent">One more banked call</b> and I can start
            showing whether you are sharpening.
          </p>
        </>
      )}

      {mode === 'firstMiss' && (
        // No fabricated upside. We acknowledge the first read went the other way, plainly and
        // without a deflating "0/N" hero, and point forward.
        <p className="relative mt-3.5 text-[14px] leading-relaxed text-[#c2cad6]">
          {calibration.scored === 1 ? 'Your first scored call' : `Your first ${calibration.scored} scored calls`} went
          the other way to your read. <b className="font-bold text-accent">That is the point.</b> A few more banked
          calls and the real pattern starts to show.
        </p>
      )}

      {mode === 'awaiting' && (
        // Banked calls exist but none can be scored yet (no gut-vs-ground signal).
        <p className="relative mt-3.5 text-[14px] leading-relaxed text-[#c2cad6]">
          Your first calls are banked. As they pick up a gut-vs-ground signal, I will start showing how you call it.
        </p>
      )}
    </motion.div>
  );
}

function RichCalibration({
  calibration,
  trend,
  freshDays,
  insight,
  desktop,
}: {
  calibration: CalibrationRead;
  trend: SharpenTrend;
  freshDays: number | null;
  insight: string | null;
  desktop: boolean;
}) {
  const fresh = freshnessLabel(freshDays);
  const showTrend =
    trend.direction !== null && trend.earlierRate !== null && trend.recentRate !== null && trend.series.length >= 2;
  const trendLabel =
    trend.direction === 'up' ? 'Sharper' : trend.direction === 'down' ? 'Slipped' : 'Holding steady';
  const trendTone =
    trend.direction === 'up' ? 'text-accent' : trend.direction === 'down' ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-[22px] border border-accent/30 bg-[linear-gradient(180deg,#101620,#0a0e12)]',
        desktop ? 'px-[30px] pb-[26px] pt-7' : 'px-5 pb-[18px] pt-5',
      )}
      style={{ boxShadow: '0 30px 64px -34px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.025)' }}
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 88% -20%, hsl(var(--accent)/0.12), transparent 55%)' }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between">
        <span className={cn('font-bold uppercase tracking-[0.12em] text-muted-foreground', desktop ? 'text-[11px]' : 'text-[10px]')}>
          Calibration over {calibration.scored} scored {calibration.scored === 1 ? 'call' : 'calls'}
        </span>
        {fresh && <span className="text-[11px] font-medium text-muted-foreground/80">{fresh}</span>}
      </div>

      <div className="relative mt-3.5 flex items-baseline gap-3.5">
        <span
          className={cn(
            'font-bold leading-[0.86] tracking-tighter text-[#aef6ea] [font-variant-numeric:tabular-nums]',
            desktop ? 'text-[84px]' : 'text-[62px]',
          )}
          style={{ textShadow: '0 0 30px hsl(var(--accent)/0.5)' }}
        >
          {calibration.pct}
          <span className="text-[0.4em] font-bold text-accent">%</span>
        </span>
        <span className="flex flex-col gap-0.5 pb-1.5">
          <span className="text-[13px] font-bold text-foreground">read the way it landed</span>
          <span className="max-w-[20ch] text-[11.5px] leading-snug text-muted-foreground">
            {calibration.read} of {calibration.scored} calls aged the way you called them.
          </span>
        </span>
      </div>

      {showTrend && (
        <div className={cn('relative flex items-center gap-3.5', desktop ? 'mt-5' : 'mt-4')}>
          <div className={cn('flex-1', desktop ? 'h-[72px]' : 'h-[54px]')}>
            <CalibrationSparkline points={trend.series} />
          </div>
          <div className="flex-none text-right">
            <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] font-bold', trendTone)}>
              <TrendingUp
                className={cn('h-3.5 w-3.5', trend.direction === 'down' && 'rotate-180', trend.direction === 'flat' && 'rotate-90')}
              />
              {trendLabel}
            </span>
            <span className="mt-1 block whitespace-nowrap text-[11px] text-muted-foreground">
              {Math.round((trend.earlierRate ?? 0) * 100)}% then to {Math.round((trend.recentRate ?? 0) * 100)}% now
            </span>
          </div>
        </div>
      )}

      {insight && (
        <p className={cn('relative leading-relaxed text-[#c2cad6]', desktop ? 'mt-5 max-w-[42ch] text-[14.5px]' : 'mt-4 text-[13px]')}>
          <span className="font-bold text-accent">Where your gut beat the data: </span>
          {insight}
        </p>
      )}
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

// ---------------------------------------------------------------------------------------
// The view.
// ---------------------------------------------------------------------------------------

export interface TrackRecordViewProps {
  model: TrackRecordModel;
  desktop: boolean;
  onWeigh?: () => void;
  /** false renders at final state with no entrance motion (QC harness / static capture). */
  animated?: boolean;
}

export function TrackRecordView({ model, desktop, onWeigh, animated = true }: TrackRecordViewProps) {
  if (model.kind === 'cold') {
    return <PromiseState desktop={desktop} onWeigh={onWeigh} />;
  }

  if (model.kind === 'warm') {
    // Warm: the first pattern + the first aged calls, calm. Mobile and desktop both read as
    // one calm column here (there is not yet enough to earn the two-zone desktop split).
    const shown = model.calls.slice(0, desktop ? 6 : 3);
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col gap-3.5', desktop && 'mx-auto w-full max-w-[680px]')}>
        <WarmCalibration calibration={model.calibration} freshDays={model.freshDays} />
        {shown.length > 0 && (
          <>
            <SectionLabel>Aging now</SectionLabel>
            <div className="flex min-h-0 flex-col gap-2.5">
              {shown.map((c, i) => (
                <AgedCallRow key={c.id} call={c} index={i} animated={animated} />
              ))}
            </div>
          </>
        )}
        <p className="mt-auto py-1.5 text-center text-[12px] text-muted-foreground/80">
          Sharpens as more calls play out.
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
    // Two-zone reading surface: calibration left, the full aged-calls scroll right.
    return (
      <div className="grid min-h-0 flex-1 grid-cols-[1.05fr_1fr] gap-6">
        <div className="flex min-h-0 flex-col gap-4">{calibration}</div>
        <div className="flex min-h-0 flex-col gap-3.5">
          <SectionLabel count={model.calls.length}>How your calls aged</SectionLabel>
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto scrollbar-hide pb-1">
            {model.calls.map((c, i) => (
              <AgedCallRow key={c.id} call={c} index={i} animated={animated} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Mobile rich: calibration hero, then a tighter, fully-readable list in the single scroll.
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      {calibration}
      <SectionLabel count={model.calls.length}>How your calls aged</SectionLabel>
      <div className="flex min-h-0 flex-col gap-2.5">
        {model.calls.map((c, i) => (
          <AgedCallRow key={c.id} call={c} index={i} animated={animated} />
        ))}
      </div>
    </div>
  );
}
