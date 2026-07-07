// CalibrationSummary - the "how your judgment is turning out" read (the n/N warm
// hero, or the % hit-rate + trend rich hero). Extracted from TrackRecordView so
// BOTH the standalone You surface AND the Decisions track-record drawer render the
// exact same honest calibration card from one source of truth. No em dashes.

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalibrationSparkline } from './trackRecordMotifs';
import type { CalibrationRead, SharpenTrend, TrackRecordModel } from './trackRecordModel';

function freshnessLabel(freshDays: number | null): string | null {
  if (freshDays === null) return null;
  if (freshDays === 0) return 'updated today';
  if (freshDays === 1) return 'last call yesterday';
  return `last call ${freshDays}d ago`;
}

export function WarmCalibration({ calibration, freshDays }: { calibration: CalibrationRead; freshDays: number | null }) {
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
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Your track record</span>
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
              <span className="text-[13px] font-bold text-foreground">turned out as you called</span>
              <span className="max-w-[18ch] text-[11.5px] leading-snug text-muted-foreground">
                These went the way you decided they would.
              </span>
            </span>
          </div>
          <p className="relative mt-3.5 text-[13px] leading-relaxed text-[#c2cad6]">
            Early days, but it is honest. <b className="font-bold text-accent">One more decision plays out</b> and I can
            start showing whether you are getting sharper.
          </p>
        </>
      )}

      {mode === 'firstMiss' && (
        // No fabricated upside. We acknowledge the first one went the other way, plainly and
        // without a deflating "0/N" hero, and point forward.
        <p className="relative mt-3.5 text-[14px] leading-relaxed text-[#c2cad6]">
          {calibration.scored === 1 ? 'Your first decision' : `Your first ${calibration.scored} decisions`} went the
          other way from how you called {calibration.scored === 1 ? 'it' : 'them'}. <b className="font-bold text-accent">Worth knowing.</b> A few more play out
          and the real pattern shows.
        </p>
      )}

      {mode === 'awaiting' && (
        // Banked decisions exist but none has played out enough to judge yet.
        <p className="relative mt-3.5 text-[14px] leading-relaxed text-[#c2cad6]">
          Your first decisions are saved here. As they play out, I will start showing how your calls turn out.
        </p>
      )}
    </motion.div>
  );
}

export function RichCalibration({
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
          Across {calibration.scored} {calibration.scored === 1 ? 'decision' : 'decisions'} that played out
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
          <span className="text-[13px] font-bold text-foreground">turned out as you called</span>
          <span className="max-w-[20ch] text-[11.5px] leading-snug text-muted-foreground">
            {calibration.read} of {calibration.scored} went the way you decided they would.
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
          <span className="font-bold text-accent">Where you called it right: </span>
          {insight}
        </p>
      )}
    </motion.div>
  );
}

/**
 * CalibrationSummary - picks the right calibration hero for the model's state.
 * Used by the Decisions track-record drawer (cold shows a short promise line;
 * warm/rich show the real hero). The standalone You surface renders the pieces
 * directly with its own layout.
 */
export function CalibrationSummary({ model, desktop = false }: { model: TrackRecordModel; desktop?: boolean }) {
  if (model.kind === 'warm') {
    return <WarmCalibration calibration={model.calibration} freshDays={model.freshDays} />;
  }
  if (model.kind === 'rich') {
    return (
      <RichCalibration
        calibration={model.calibration}
        trend={model.trend}
        freshDays={model.freshDays}
        insight={model.insight}
        desktop={desktop}
      />
    );
  }
  // cold: no scored calls yet - an honest promise, not a zero.
  return (
    <div className="rounded-[22px] border border-border bg-[linear-gradient(180deg,#101620,#0a0e12)] px-5 py-5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Your track record</span>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#c2cad6]">
        Your record starts with your first decision. Weigh one and I will track how it turns out, so over time you can
        see where your judgment is sharp.
      </p>
    </div>
  );
}
