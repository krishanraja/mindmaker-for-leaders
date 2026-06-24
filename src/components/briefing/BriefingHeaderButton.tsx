// BriefingHeaderButton - the unmistakable "your audio digest" control, in the
// top bar so the daily briefing is reachable from any tab.
//
// A labelled pill (icon + word), never a bare icon, so it is obvious what it
// does. Two honest, explicit clicks:
//   1st click (no briefing yet) : MAKE it - generates today's briefing in the
//      background; the pill shows "Building..." with a spinner.
//   2nd click (once ready)      : PLAY it - opens the audio drawer and plays.
// When ready it turns accent-green and reads "Play", with a soft pulse so the
// eye lands on it. No app jargon.

import { useRef } from 'react';
import { Headphones, Loader2, Play } from 'lucide-react';
import { useTodaysBriefing, useGenerateBriefing } from '@/hooks/useBriefing';
import { useBriefingContext } from '@/contexts/BriefingContext';
import { isBriefingGenerating, isBriefingReady } from '@/types/briefing';
import { cn } from '@/lib/utils';

export function BriefingHeaderButton({ className }: { className?: string }) {
  const { briefing: defaultBriefing, refetch } = useTodaysBriefing();
  const { generate, generating } = useGenerateBriefing();
  const { setBriefing, setSheetOpen } = useBriefingContext();

  const ready = isBriefingReady(defaultBriefing);
  const busy = generating || isBriefingGenerating(defaultBriefing);

  // Guard so a double-tap on "Build" doesn't fire two generations.
  const startedRef = useRef(false);

  const handleClick = () => {
    // Ready -> play (open the drawer; it plays + synthesizes audio if needed).
    if (ready && defaultBriefing) {
      setBriefing(defaultBriefing);
      setSheetOpen(true);
      return;
    }
    // Building -> nothing to do; the spinner already shows progress.
    if (busy) return;
    // Idle -> first click MAKES today's briefing.
    if (startedRef.current) return;
    startedRef.current = true;
    void generate('default')
      .then(() => refetch())
      .finally(() => { startedRef.current = false; });
  };

  const label = busy ? 'Building' : ready ? 'Play' : 'Briefing';
  const Icon = busy ? Loader2 : ready ? Play : Headphones;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        busy
          ? 'Building your audio briefing'
          : ready
          ? 'Play your audio briefing'
          : 'Make your audio briefing'
      }
      title="Your audio briefing"
      className={cn(
        'relative flex h-8 min-w-[104px] items-center justify-center gap-1.5 rounded-full pl-2.5 pr-3 text-[12.5px] font-semibold transition-colors',
        ready
          ? 'bg-accent text-accent-foreground shadow-[0_0_0_3px_hsl(var(--accent)/0.18)] hover:brightness-110'
          : 'border border-border bg-card/60 text-foreground hover:border-accent/40 hover:text-accent',
        className,
      )}
    >
      <Icon
        className={cn(
          'h-[15px] w-[15px]',
          busy && 'animate-spin',
          ready && 'translate-x-px fill-current',
        )}
        strokeWidth={ready ? 0 : 2}
      />
      <span>{label}</span>
      {ready && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
      )}
    </button>
  );
}
