import { useRef } from 'react';
import { AudioLines, Loader2, Pause, Play } from 'lucide-react';
import { useTodaysBriefing, useGenerateBriefing } from '@/hooks/useBriefing';
import { useBriefingContext } from '@/contexts/BriefingContext';
import { supabase } from '@/integrations/supabase/client';
import { isBriefingGenerating, isBriefingReady, type Briefing } from '@/types/briefing';
import { cn } from '@/lib/utils';

const PHASE_COPY = {
  idle: 'Getting ready',
  scanning: 'Scanning what moved',
  personalising: 'Making it yours',
  preparing: 'Shaping the brief',
} as const;

function durationLabel(seconds: number | null | undefined): string {
  if (!seconds || seconds < 1) return 'Audio ready';
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

interface BriefingHeaderButtonProps {
  className?: string;
  briefingOverride?: Briefing;
}

type BriefingLookupClient = {
  from: (table: 'briefings') => {
    select: (columns: '*') => {
      eq: (column: 'id', value: string) => {
        maybeSingle: () => Promise<{ data: Briefing | null }>;
      };
    };
  };
};

export function BriefingHeaderButton({ className, briefingOverride }: BriefingHeaderButtonProps) {
  const { briefing: todaysBriefing, refetch } = useTodaysBriefing();
  const { generate, generating, phase } = useGenerateBriefing();
  const {
    briefing: activeBriefing,
    playback,
    setBriefing,
    setSheetOpen,
  } = useBriefingContext();
  const startedRef = useRef(false);

  const availableBriefing = briefingOverride ?? todaysBriefing;
  const ready = isBriefingReady(availableBriefing);
  const busy = !briefingOverride && (generating || isBriefingGenerating(availableBriefing));
  const isActiveBriefing = ready && activeBriefing?.id === availableBriefing?.id;
  const isPlaying = isActiveBriefing && playback.isPlaying;
  const progress = isActiveBriefing && playback.duration > 0
    ? Math.min(100, (playback.currentTime / playback.duration) * 100)
    : 0;

  const handleClick = async () => {
    if (ready && availableBriefing) {
      setBriefing(availableBriefing);
      setSheetOpen(true);
      return;
    }
    if (busy || startedRef.current) return;

    startedRef.current = true;
    try {
      const briefingId = await generate('default');
      if (!briefingId) return;
      // `briefings` predates the generated Database type snapshot. Keep the
      // temporary escape hatch narrow and make the returned row explicit.
      const briefingLookup = supabase as unknown as BriefingLookupClient;
      const { data } = await briefingLookup
        .from('briefings')
        .select('*')
        .eq('id', briefingId)
        .maybeSingle();
      if (data) {
        setBriefing(data);
        setSheetOpen(true);
      } else {
        await refetch();
      }
    } finally {
      startedRef.current = false;
    }
  };

  const detail = busy
    ? PHASE_COPY[phase]
    : ready
      ? isPlaying
        ? `${durationLabel(playback.duration)} · playing`
        : durationLabel(availableBriefing?.audio_duration_seconds)
      : 'Start today\'s brief';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={
        busy
          ? 'Building your audio briefing'
          : ready
            ? 'Open your audio briefing'
            : 'Start your audio briefing'
      }
      aria-busy={busy}
      data-briefing-trigger
      title="Your audio briefing"
      className={cn(
        'group relative grid h-11 w-[108px] shrink-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-2 overflow-hidden rounded-xl border px-2 text-left transition-colors sm:w-[194px] sm:grid-cols-[34px_minmax(0,1fr)_34px] sm:gap-2.5 sm:px-2.5',
        ready
          ? 'border-accent/35 bg-accent/[0.045] shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.04),0_0_24px_-18px_hsl(var(--accent))] hover:border-accent/55'
          : 'border-border bg-card/70 hover:border-accent/30',
        busy && 'cursor-wait',
        className,
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full border border-accent/25 bg-accent/[0.09] text-accent shadow-[0_0_18px_-10px_hsl(var(--accent))] sm:h-[34px] sm:w-[34px]">
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : ready ? (
          <Play className="ml-px h-3.5 w-3.5 fill-current" />
        ) : (
          <AudioLines className="h-3.5 w-3.5" />
        )}
      </span>

      <span className="min-w-0">
        <strong className="font-ctrl-system block text-[8.5px] font-semibold uppercase tracking-[0.18em] text-foreground">
          Briefing
        </strong>
        <span className="block truncate text-[10px] leading-4 text-muted-foreground sm:text-[10.5px]">
          {detail}
        </span>
      </span>

      <span className="hidden h-6 items-end justify-center gap-[2px] text-accent sm:flex" aria-hidden="true">
        {[8, 14, 20, 11, 17, 8].map((height, index) => (
          <i
            key={`${height}-${index}`}
            className={cn(
              'block w-[2px] rounded-full bg-current opacity-45',
              isPlaying && 'animate-pulse opacity-85',
            )}
            style={{ height }}
          />
        ))}
      </span>

      <span className="absolute inset-x-2 bottom-0 h-px overflow-hidden bg-border sm:inset-x-2.5">
        <span
          className="block h-full bg-gradient-to-r from-pink-500 via-orange-400 to-accent transition-[width] duration-150"
          style={{ width: ready ? `${Math.max(progress, 4)}%` : busy ? '28%' : '0%' }}
        />
      </span>
    </button>
  );
}
