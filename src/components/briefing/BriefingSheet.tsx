import { useEffect, useRef } from 'react';
import { ChevronDown, Loader2, Pause, Play, RefreshCw, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useBriefingContext } from '@/contexts/BriefingContext';
import { useSubmitFeedback, usePollAudio } from '@/hooks/useBriefing';
import { usePinnedDecision } from '@/hooks/usePinnedDecision';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useDevice } from '@/hooks/useDevice';
import { BRIEFING_TYPES } from '@/types/briefing';
import type { PlaybackSpeed } from '@/types/briefing';
import type { PendingVerification } from '@/types/memory';
import type { BlindSpotExperiment } from '@/types/blindSpot';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { SegmentCard } from './SegmentCard';
import { BriefingConversation } from './BriefingConversation';
import { BriefingLearningPrompt } from './BriefingLearningPrompt';

const SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

interface BriefingSheetProps {
  learningPromptOverride?: PendingVerification;
  experimentPromptOverride?: BlindSpotExperiment;
}

export function BriefingSheet({ learningPromptOverride, experimentPromptOverride }: BriefingSheetProps = {}) {
  const {
    briefing,
    setBriefing,
    playback,
    isSheetOpen,
    setSheetOpen,
    play,
    togglePlay,
    seek,
    setSpeed,
  } = useBriefingContext();
  const { isMobile } = useDevice();
  const { submitFeedback } = useSubmitFeedback();
  const { matchesHeadline } = usePinnedDecision();
  const { watchedCompanies, watchCompany } = useWatchlist();

  const { audioUrl, polling, synthError, start, clearError } = usePollAudio();
  const synthStartedFor = useRef<string | null>(null);
  const wantAutoplay = useRef(false);
  const preparingAudio = polling && Boolean(briefing && !briefing.audio_url);

  useEffect(() => {
    if (!isSheetOpen || !briefing) return;
    wantAutoplay.current = true;
    if (briefing.audio_url) return;
    if (synthStartedFor.current !== briefing.id) {
      synthStartedFor.current = briefing.id;
      clearError();
      start(briefing.id);
    }
  }, [briefing, clearError, isSheetOpen, start]);

  useEffect(() => {
    if (audioUrl && briefing && audioUrl !== briefing.audio_url) {
      setBriefing({ ...briefing, audio_url: audioUrl });
    }
  }, [audioUrl, briefing, setBriefing]);

  useEffect(() => {
    if (!isSheetOpen || !briefing?.audio_url || !wantAutoplay.current) return;
    wantAutoplay.current = false;
    const timer = setTimeout(() => play(), 80);
    return () => clearTimeout(timer);
  }, [briefing?.audio_url, isSheetOpen, play]);

  const retryAudio = () => {
    if (!briefing) return;
    clearError();
    wantAutoplay.current = true;
    synthStartedFor.current = briefing.id;
    start(briefing.id);
  };

  const handleSpeedToggle = () => {
    const currentIndex = SPEEDS.indexOf(playback.speed);
    setSpeed(SPEEDS[(currentIndex + 1) % SPEEDS.length]);
    haptics.light();
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - rect.left) / rect.width) * playback.duration);
  };

  const handleFeedback = (
    segmentIndex: number,
    payload: { reaction: 'useful' | 'not_useful'; lens_item_id?: string | null; dwell_ms?: number },
  ) => {
    if (!briefing) return;
    submitFeedback(briefing.id, segmentIndex, payload.reaction, {
      lensItemId: payload.lens_item_id ?? null,
      dwellMs: payload.dwell_ms,
    });
    haptics.light();
  };

  const progress = playback.duration > 0
    ? (playback.currentTime / playback.duration) * 100
    : 0;
  const typeConfig = briefing
    ? BRIEFING_TYPES.find((type) => type.type === (briefing.briefing_type || 'default'))
    : null;
  const title = typeConfig?.type === 'default'
    ? "Today's brief"
    : typeConfig?.label || 'Your brief';

  return (
    <Sheet open={Boolean(isSheetOpen && briefing)} onOpenChange={(open) => { if (!open) setSheetOpen(false); }}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        onCloseAutoFocus={(event) => {
          const trigger = document.querySelector<HTMLButtonElement>('button[data-briefing-trigger]');
          if (!trigger) return;
          event.preventDefault();
          window.requestAnimationFrame(() => trigger.focus());
        }}
        className={cn(
          'flex gap-0 overflow-hidden border-border bg-background p-0 [&>button]:hidden',
          isMobile
            ? 'h-[calc(100svh-12px)] w-full max-w-none rounded-t-[22px] border-t'
            : 'h-full w-[462px] max-w-[min(462px,100vw)] border-l sm:max-w-[462px]',
        )}
      >
        {briefing && (
          <div className="flex h-full min-h-0 w-full flex-col">
            <header className="flex min-h-[58px] flex-shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
              <div className="min-w-0">
                <p className="font-ctrl-system text-[8.5px] font-semibold uppercase tracking-[0.18em] text-accent">CTRL / Briefing</p>
                <SheetTitle className="font-ctrl-display mt-1 truncate text-[15px] font-semibold text-foreground">{title}</SheetTitle>
                <SheetDescription className="sr-only">Listen to your personalized briefing, ask a question, and verify one useful piece of context.</SheetDescription>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
                aria-label="Close briefing"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-hide sm:px-4 sm:py-4">
              <div className="space-y-3">
                <section className="relative overflow-hidden rounded-[22px] border border-border bg-[radial-gradient(circle_at_50%_12%,hsl(var(--accent)/0.12),transparent_42%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--background)))] px-4 py-4 text-center">
                  <p className="font-ctrl-system text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground">
                    {preparingAudio ? 'Preparing your audio' : playback.isPlaying ? 'Playing your brief' : 'Your audio brief'}
                  </p>

                  <div className="relative mx-auto mt-3 grid h-[68px] w-[68px] place-items-center rounded-full border border-accent/20 bg-background/80 shadow-[0_0_36px_-18px_hsl(var(--accent))]">
                    <span
                      className="absolute inset-1 rounded-full border border-accent/25"
                      style={{ background: `conic-gradient(hsl(var(--accent)) ${Math.max(progress, 4)}%, transparent 0)` }}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={preparingAudio ? undefined : togglePlay}
                      disabled={preparingAudio}
                      aria-label={preparingAudio ? 'Preparing your audio' : playback.isPlaying ? 'Pause briefing' : 'Play briefing'}
                      className="relative z-10 grid h-[54px] w-[54px] place-items-center rounded-full border border-accent/20 bg-card text-accent transition-transform active:scale-95 disabled:cursor-wait"
                    >
                      {preparingAudio ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : playback.isPlaying ? (
                        <Pause className="h-5 w-5 fill-current" />
                      ) : (
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                      )}
                    </button>
                  </div>

                  <h3 className="font-ctrl-display mt-3 text-[20px] font-semibold leading-tight text-foreground">Your judgment stays in the loop.</h3>
                  <p className="mx-auto mt-1 max-w-[34ch] text-[11.5px] leading-relaxed text-muted-foreground">
                    A useful few minutes, shaped around what you are actually trying to move.
                  </p>

                  {synthError && (
                    <button
                      type="button"
                      onClick={retryAudio}
                      className="mx-auto mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-orange-400/25 bg-orange-400/[0.06] px-3 text-[11px] font-semibold text-orange-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Try the audio again
                    </button>
                  )}

                  <button
                    type="button"
                    className="group mt-1 h-11 w-full cursor-pointer py-5"
                    onClick={handleProgressClick}
                    aria-label={`Seek briefing, ${formatTime(playback.currentTime)} of ${formatTime(playback.duration)}`}
                  >
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-accent transition-[width] duration-150" style={{ width: `${progress}%` }} />
                    </div>
                  </button>
                  <div className="font-ctrl-system flex justify-between text-[8.5px] text-muted-foreground">
                    <span>{formatTime(playback.currentTime)}</span>
                    <button type="button" onClick={handleSpeedToggle} className="-my-4 grid h-11 w-11 place-items-center rounded-lg text-[9px] font-semibold text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground" aria-label={`Playback speed ${playback.speed} times`}>{playback.speed}x</button>
                    <span>{formatTime(playback.duration)}</span>
                  </div>
                </section>

                {!preparingAudio && !synthError && <BriefingConversation briefingId={briefing.id} />}
                <BriefingLearningPrompt
                  briefingId={briefing.id}
                  promptOverride={learningPromptOverride}
                  experimentOverride={experimentPromptOverride}
                  memoryEnabledOverride={learningPromptOverride || experimentPromptOverride ? true : undefined}
                />

                {briefing.segments.length > 0 && (
                  <details className="group rounded-[18px] border border-border bg-card/40">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                      <span>Briefing notes · {briefing.segments.length}</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 border-t border-border px-2 py-3">
                      {briefing.segments.map((segment, index) => (
                        <SegmentCard
                          key={`${briefing.id}-${index}`}
                          segment={segment}
                          index={index}
                          isActive={index === playback.currentSegmentIndex}
                          onFeedback={(payload) => handleFeedback(index, payload)}
                          onWatchCompany={watchCompany}
                          watchedCompanies={watchedCompanies}
                          briefingId={briefing.id}
                          relevantToPinnedDecision={matchesHeadline(segment.headline)}
                        />
                      ))}
                    </div>
                  </details>
                )}
              </div>
              <div className="h-[env(safe-area-inset-bottom,0px)]" />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
