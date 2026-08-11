import { useId } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { handoffLensFor, type HandoffSignal } from './handoffLensModel';

export interface FirstLensProps {
  variant: 'mobile' | 'desktop';
  signal: HandoffSignal;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
  onWeigh: (decision: string) => void;
}

export function FirstLens({
  variant,
  signal,
  saving,
  error,
  onConfirm,
  onDismiss,
  onWeigh,
}: FirstLensProps) {
  const desktop = variant === 'desktop';
  const lens = handoffLensFor(signal);

  return (
    <div
      data-testid="first-lens"
      className={cn(
        'relative mx-auto flex w-full min-w-0 flex-col',
        desktop ? 'h-full max-w-[1160px] overflow-hidden' : 'pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-8 top-[78px] w-px bg-gradient-to-b from-accent via-accent/35 to-accent/5',
          desktop ? 'left-[17px]' : 'left-[14px]',
        )}
      />

      <header
        className={cn(
          'shrink-0 border-b border-border/80',
          desktop
            ? 'flex min-h-[88px] items-end justify-between gap-8 pb-5 pl-[54px]'
            : 'pb-4 pl-[33px] pt-3',
        )}
      >
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.17em] text-accent">Your CTRL is ready</p>
          <h1
            className={cn(
              'mt-2 font-extrabold leading-[1.03] tracking-[-0.04em] text-foreground',
              desktop ? 'text-[clamp(1.8rem,2.7vw,2.65rem)]' : 'max-w-[13ch] text-[30px]',
            )}
          >
            I know what to watch for now.
          </h1>
        </div>
        {desktop && (
          <p className="max-w-[41ch] pb-0.5 text-right text-[13px] leading-relaxed text-muted-foreground">
            You gave me the shape of the problem. This is how I will put it to work.
          </p>
        )}
      </header>

      <section
        aria-labelledby="first-lens-heading"
        className={cn(
          'grid min-w-0 shrink-0',
          desktop ? 'min-h-0 flex-1 grid-cols-[54px_minmax(0,1fr)]' : 'grid-cols-[31px_minmax(0,1fr)]',
        )}
      >
        <TapeMarker label="Your lens" compact={!desktop} />
        <div className={cn('min-w-0', desktop ? 'min-h-0 py-4' : 'py-3')}>
          <article
            className={cn(
              'overflow-hidden rounded-[20px] border border-[#313b47]/90 bg-[linear-gradient(180deg,#0d1218,#090d12)] shadow-[0_40px_90px_-50px_rgba(0,0,0,0.96),0_0_0_1px_rgba(37,225,186,0.08)]',
              desktop ? 'grid h-full min-h-[340px] max-h-[520px] grid-cols-[minmax(360px,1.08fr)_minmax(310px,0.92fr)]' : 'block',
            )}
          >
            <LensVisual laneLabel={lens.laneLabel} compact={!desktop} />

            <div
              className={cn(
                'relative z-[1] flex min-w-0 flex-col justify-center',
                desktop
                  ? 'p-[clamp(1.75rem,3vw,3rem)] [@media(max-height:800px)]:p-6'
                  : 'px-[23px] pb-5 pt-[18px]',
              )}
            >
              <span className="order-1 inline-flex min-h-[27px] w-fit items-center rounded-full border border-accent/25 px-2.5 font-mono text-[8px] uppercase tracking-[0.14em] text-accent">
                Here is what I heard
              </span>
              <h2
                id="first-lens-heading"
                className={cn(
                  'order-2 mt-[17px] font-extrabold leading-[1.01] tracking-[-0.045em] text-foreground',
                  desktop
                    ? 'max-w-[16ch] text-[clamp(2rem,3vw,2.9rem)] [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:text-4xl'
                    : 'mt-3 text-[clamp(1.7rem,7.5vw,1.95rem)]',
                )}
              >
                {lens.headline}
              </h2>

              <p
                className={cn(
                  'text-[#b2bbc5]',
                  desktop
                    ? 'order-3 mt-[18px] max-w-[44ch] text-sm leading-[1.58] [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:text-[13px] [@media(max-height:800px)]:leading-[1.48]'
                    : 'order-4 mt-4 text-[13px] leading-[1.5]',
                )}
              >
                {lens.interpretation}
              </p>

              <div
                className={cn(
                  'gap-2.5',
                  desktop
                    ? 'order-4 mt-6 flex flex-wrap [@media(max-height:800px)]:mt-4'
                    : 'order-3 mt-3.5 grid grid-cols-[minmax(0,1.55fr)_minmax(92px,0.85fr)]',
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onConfirm}
                  disabled={saving}
                  className="inline-flex min-h-[48px] min-w-0 items-center justify-center gap-2 rounded-xl bg-[#f2eee4] px-4 text-[13px] font-extrabold text-[#101316] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-65"
                >
                  {saving ? (
                    <>
                      Starting here <Loader2 className="h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Yes, start here <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDismiss}
                  disabled={saving}
                  className="inline-flex min-h-[48px] min-w-0 items-center justify-center rounded-xl border border-[#2c343f] px-3 text-[13px] font-bold text-[#aab3bd] transition hover:border-border hover:text-foreground disabled:opacity-50"
                >
                  Not quite
                </Button>
              </div>

              <div className="order-5 mt-[18px] flex items-start gap-2 border-t border-[#202730] pt-4 text-[10px] leading-[1.45] text-[#717b86] [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:pt-3">
                <span className="mt-0.5 text-accent" aria-hidden="true">◇</span>
                <span>Your exact words stayed private. CTRL carried the pattern, not the transcript.</span>
              </div>

              {error && (
                <p className="order-6 mt-3 text-[11px] leading-relaxed text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section
        aria-labelledby="first-call-heading"
        className={cn(
          'grid min-w-0 shrink-0 border-t border-border/80',
          desktop ? 'grid-cols-[54px_minmax(0,1fr)]' : 'grid-cols-[31px_minmax(0,1fr)]',
        )}
      >
        <TapeMarker label="First call" compact={!desktop} small />
        <div
          className={cn(
            'grid min-w-0 items-center border-b border-border/80',
            desktop
              ? 'min-h-[104px] grid-cols-[96px_minmax(0,1fr)_auto] gap-6 py-3 pr-0 [@media(max-height:800px)]:min-h-[96px]'
              : 'grid-cols-[74px_minmax(0,1fr)] gap-x-3.5 gap-y-3 py-5',
          )}
        >
          <MiniLens />
          <div className="min-w-0">
            <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-accent">Ready to weigh</p>
            <h3
              id="first-call-heading"
              className={cn(
                'mt-2 font-bold leading-[1.12] tracking-[-0.03em] text-foreground',
                desktop ? 'max-w-[34ch] text-[clamp(1.2rem,2vw,1.72rem)]' : 'text-[20px]',
              )}
            >
              {lens.starterDecision}
            </h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              A useful first decision, drawn from the lens above.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onWeigh(lens.starterDecision)}
            disabled={saving}
            className={cn(
              'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 text-xs font-bold text-accent transition hover:bg-accent/10 disabled:opacity-50',
              !desktop && 'col-span-2 min-h-[48px] w-full',
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Weigh it <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </div>
      </section>

      {desktop && (
        <div className="flex shrink-0 items-center justify-between gap-5 py-3 pl-[54px] text-[10px] leading-relaxed text-muted-foreground [@media(max-height:800px)]:hidden">
          <span><strong className="font-semibold text-[#9aa4ae]">Tomorrow:</strong> your first personal briefing arrives here and by email.</span>
          <span className="font-mono uppercase tracking-[0.13em]">No dashboard work required</span>
        </div>
      )}
    </div>
  );
}

function TapeMarker({ label, compact, small = false }: { label: string; compact: boolean; small?: boolean }) {
  return (
    <div className="relative z-[2] grid content-start justify-items-center pt-[27px]">
      <span
        aria-hidden="true"
        className={cn(
          'rounded-full bg-accent',
          small
            ? 'h-[7px] w-[7px] border border-[#0b0f14] shadow-[0_0_0_1px_rgba(37,225,186,0.55)]'
            : 'h-[11px] w-[11px] border-2 border-[#0b0f14] shadow-[0_0_0_1px_#25e1ba,0_0_22px_rgba(37,225,186,0.38)]',
        )}
      />
      {!compact && (
        <span className="mt-3.5 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground [writing-mode:vertical-rl]">
          {label}
        </span>
      )}
    </div>
  );
}

function LensVisual({ laneLabel, compact }: { laneLabel: string; compact: boolean }) {
  const uid = useId().replace(/:/g, '');
  const gradient = `handoff-gradient-${uid}`;
  const glow = `handoff-glow-${uid}`;
  const largeGlow = `handoff-large-glow-${uid}`;

  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden bg-[#090d12] [background-image:radial-gradient(circle_at_52%_49%,rgba(37,225,186,0.12),transparent_30%),linear-gradient(rgba(37,225,186,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(37,225,186,0.025)_1px,transparent_1px)] [background-size:auto,34px_34px,34px_34px]',
        compact ? 'h-[190px] border-b border-[#2d3641]/80' : 'min-h-0 border-r border-[#2d3641]/80',
      )}
    >
      <span className="absolute left-5 top-5 z-[2] font-mono text-[8px] uppercase tracking-[0.14em] text-[#6f7985]">
        Signal carried forward
      </span>
      <svg
        className={cn(
          'absolute',
          compact ? 'inset-x-0 bottom-1 top-4 h-[170px] w-full' : 'inset-3 h-[calc(100%-1.5rem)] w-auto',
        )}
        viewBox="0 0 500 390"
        role="img"
        aria-labelledby={`lens-title-${uid} lens-desc-${uid}`}
      >
        <title id={`lens-title-${uid}`}>Your personal CTRL lens</title>
        <desc id={`lens-desc-${uid}`}>People, agents, proof and control connected around your judgment, with {laneLabel} as the starting theme.</desc>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="34%" stopColor="#f97316" />
            <stop offset="72%" stopColor="#25e1ba" />
          </linearGradient>
          <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={largeGlow} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="15" />
          </filter>
        </defs>

        <circle cx="250" cy="192" r="135" fill="none" stroke="#25303a" strokeWidth="1" strokeDasharray="2 10" />
        <circle cx="250" cy="192" r="99" fill="none" stroke="#25303a" strokeWidth="1" />
        <path d="M119 161 A135 135 0 0 1 348 97" fill="none" stroke={`url(#${gradient})`} strokeLinecap="round" strokeWidth="2.2" filter={`url(#${glow})`} />

        <text x="111" y="145" fill="#8b7687" fontFamily="ui-monospace,monospace" fontSize="7" letterSpacing="1.5">MAKE YOUR MIND UP</text>
        <text x="330" y="83" fill="#82909b" fontFamily="ui-monospace,monospace" fontSize="7" letterSpacing="1.35">{laneLabel.toUpperCase()}</text>

        <line x1="151" y1="126" x2="250" y2="192" stroke={`url(#${gradient})`} strokeWidth="1.6" />
        <line x1="350" y1="129" x2="250" y2="192" stroke="rgba(37,225,186,.33)" strokeWidth="1.2" />
        <line x1="349" y1="264" x2="250" y2="192" stroke="rgba(37,225,186,.33)" strokeWidth="1.2" />
        <line x1="151" y1="266" x2="250" y2="192" stroke="rgba(37,225,186,.33)" strokeWidth="1.2" />

        <LensNode x={151} y={126} label="PEOPLE" labelX={121} labelY={96} />
        <LensNode x={350} y={129} label="AGENTS" labelX={330} labelY={98} />
        <LensNode x={349} y={264} label="PROOF" labelX={329} labelY={300} />
        <LensNode x={151} y={266} label="CONTROL" labelX={122} labelY={301} />

        <circle cx="250" cy="192" r="40" fill="rgba(37,225,186,.27)" filter={`url(#${largeGlow})`} />
        <circle cx="250" cy="192" r="36" fill="#0c1517" stroke="#25e1ba" strokeWidth="2" />
        <circle cx="250" cy="179" r="4.5" fill="#aef6ea" />
        <text x="218" y="204" fill="#dffaf3" fontFamily="ui-monospace,monospace" fontSize="9" fontWeight="700" letterSpacing="1.7">JUDGMENT</text>
      </svg>
      <div className="absolute bottom-4 left-5 right-5 z-[2] flex items-center justify-between gap-3 text-[8px] text-[#626e79]">
        <span><strong className="font-semibold text-[#9aa5ae]">Starting bias</strong> · humans + agents</span>
        {!compact && <span>one warm signal, not your transcript</span>}
      </div>
    </div>
  );
}

function LensNode({ x, y, label, labelX, labelY }: { x: number; y: number; label: string; labelX: number; labelY: number }) {
  return (
    <g className="motion-safe:animate-pulse">
      <circle cx={x} cy={y} r="22" fill="#0a0f14" stroke="rgba(37,225,186,.86)" strokeWidth="1.7" />
      <circle cx={x} cy={y} r="3.8" fill="#aef6ea" />
      <text x={labelX} y={labelY} fill="#82909b" fontFamily="ui-monospace,monospace" fontSize="8" letterSpacing="1.6">{label}</text>
    </g>
  );
}

function MiniLens() {
  return (
    <div className="grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-[14px] border border-[#222c34] bg-[radial-gradient(circle,rgba(37,225,186,0.13),transparent_52%),#090d12] md:h-[72px] md:w-[96px]" aria-hidden="true">
      <svg viewBox="0 0 100 70" className="h-[52px] w-[67px] md:h-[58px] md:w-[82px]">
        <g stroke="rgba(37,225,186,.36)" strokeWidth="1">
          <line x1="50" y1="35" x2="20" y2="17" /><line x1="50" y1="35" x2="80" y2="17" />
          <line x1="50" y1="35" x2="20" y2="54" /><line x1="50" y1="35" x2="80" y2="54" />
        </g>
        <g fill="#090d12" stroke="#25e1ba" strokeWidth="1.6">
          <circle cx="20" cy="17" r="6" /><circle cx="80" cy="17" r="6" />
          <circle cx="20" cy="54" r="6" /><circle cx="80" cy="54" r="6" />
          <circle cx="50" cy="35" r="7" fill="#aef6ea" />
        </g>
      </svg>
    </div>
  );
}
