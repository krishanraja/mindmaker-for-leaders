import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Briefing, PlaybackSpeed, BriefingPlaybackState } from '@/types/briefing';

interface BriefingContextValue {
  briefing: Briefing | null;
  setBriefing: (b: Briefing | null) => void;
  playback: BriefingPlaybackState;
  isSheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  isMiniPlayerVisible: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const BriefingContext = createContext<BriefingContextValue | null>(null);

export function BriefingProvider({ children }: { children: React.ReactNode }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isMiniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [playback, setPlayback] = useState<BriefingPlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    currentSegmentIndex: 0,
    hasListened: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Track whether we've already attempted a refresh for this src so a
  // permanent storage failure doesn't loop. Resets on briefing change.
  const refreshAttemptedRef = useRef(false);
  useEffect(() => {
    refreshAttemptedRef.current = false;
  }, [briefing?.id, briefing?.audio_url]);

  // Sync audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setPlayback(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        currentSegmentIndex: getSegmentIndex(audio.currentTime, briefing),
      }));
    };

    const onLoadedMetadata = () => {
      const measured = Number.isFinite(audio.duration) ? audio.duration : 0;
      const duration = measured > 0
        ? measured
        : briefing?.audio_duration_seconds ?? 0;
      setPlayback(prev => ({ ...prev, duration }));
    };

    const onPlay = () => {
      setPlayback(prev => ({ ...prev, isPlaying: true, hasListened: true }));
    };

    const onPause = () => {
      setPlayback(prev => ({ ...prev, isPlaying: false }));
    };

    const onEnded = () => {
      setPlayback(prev => ({ ...prev, isPlaying: false }));
      setMiniPlayerVisible(false);
    };

    // 24h signed URLs expire silently. When the audio element fails to load
    // its source, ask synthesize-briefing for a fresh signed URL (the
    // backend re-signs without re-running TTS when the storage object
    // exists). One attempt per (briefing, url); a permanent failure
    // surfaces as the error continuing to fire and no further refreshes.
    const onError = async () => {
      if (!briefing?.id) return;
      if (refreshAttemptedRef.current) return;
      refreshAttemptedRef.current = true;
      console.warn('Briefing audio failed to load; requesting fresh signed URL');
      try {
        const wasPlaying = !audio.paused;
        const resumeAt = audio.currentTime;
        const { data, error } = await supabase.functions.invoke(
          'synthesize-briefing',
          { body: { briefing_id: briefing.id } },
        );
        if (error || !data?.audio_url || data.audio_url === briefing.audio_url) {
          // Either provider error, rate-limited, or the same URL. Don't
          // loop; let the failure surface.
          return;
        }
        // Replace the source URL on the briefing so the <audio> remounts
        // with the fresh URL. Resume from where the user was.
        setBriefing({ ...briefing, audio_url: data.audio_url });
        // Wait one tick for the new src to bind, then attempt to resume.
        setTimeout(() => {
          if (resumeAt > 0) audio.currentTime = resumeAt;
          if (wasPlaying) audio.play().catch(() => {});
        }, 50);
      } catch (e) {
        console.warn('Audio recovery failed:', e);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [briefing]);

  const play = useCallback(() => {
    // A blocked/failed play() rejects its promise; swallow it quietly so it
    // never throws, but never silently pretend it worked either (the caller
    // surfaces a retry when audio is genuinely missing).
    audioRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (audioRef.current?.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current?.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setPlayback(prev => ({ ...prev, speed }));
  }, []);

  // Show mini player when sheet closes but audio is playing
  const handleSheetOpen = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open && playback.isPlaying) {
      setMiniPlayerVisible(true);
    }
    if (open) {
      setMiniPlayerVisible(false);
    }
  }, [playback.isPlaying]);

  return (
    <BriefingContext.Provider
      value={{
        briefing,
        setBriefing,
        playback,
        isSheetOpen,
        setSheetOpen: handleSheetOpen,
        isMiniPlayerVisible,
        play,
        pause,
        togglePlay,
        seek,
        setSpeed,
        audioRef,
      }}
    >
      {children}
      {/* Hidden audio element */}
      {briefing?.audio_url && (
        <audio ref={audioRef} src={briefing.audio_url} preload="auto" />
      )}
    </BriefingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBriefingContext() {
  const ctx = useContext(BriefingContext);
  if (!ctx) throw new Error('useBriefingContext must be used within BriefingProvider');
  return ctx;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getSegmentIndex(currentTime: number, briefing: Briefing | null): number {
  if (!briefing?.segments?.length || !briefing.audio_duration_seconds) return 0;
  const segmentDuration = briefing.audio_duration_seconds / briefing.segments.length;
  return Math.min(
    Math.floor(currentTime / segmentDuration),
    briefing.segments.length - 1
  );
}
