import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Loader2, MessageSquare, Mic, MicOff, Play, Send, Volume2, X } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { useBriefingContext } from '@/contexts/BriefingContext';
import { invokeEdgeFunction } from '@/lib/api';
import { friendlyBriefingConversationError } from '@/lib/briefingConversation';
import { cn } from '@/lib/utils';

interface ConversationReply {
  question: string;
  answer: string;
  answerable: boolean;
  citations: Array<{ segment_index: number; headline: string; source: string }>;
  audio_base64: string | null;
  audio_mime: string | null;
}

interface HistoryTurn {
  question: string;
  answer: string;
}

function audioUrlFromBase64(base64: string, mime: string): string {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export function BriefingConversation({ briefingId }: { briefingId: string }) {
  const { pause } = useBriefingContext();
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [reply, setReply] = useState<ConversationReply | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const [draft, setDraft] = useState('');
  const [answerAudioUrl, setAnswerAudioUrl] = useState<string | null>(null);
  const [answerPlaying, setAnswerPlaying] = useState(false);
  const answerAudioRef = useRef<HTMLAudioElement | null>(null);

  const clearAnswerAudio = useCallback(() => {
    answerAudioRef.current?.pause();
    answerAudioRef.current = null;
    setAnswerPlaying(false);
    setAnswerAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  useEffect(() => clearAnswerAudio, [clearAnswerAudio]);

  const ask = useCallback(async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (question.length < 3 || asking) return;
    pause();
    clearAnswerAudio();
    setAsking(true);
    setError(null);
    setReply(null);
    try {
      const next = await invokeEdgeFunction<ConversationReply>('briefing-conversation', {
        briefing_id: briefingId,
        question,
        history,
        audio: true,
      }, 55_000);
      setDraft('');
      setReply(next);
      setHistory((current) => [...current, { question: next.question, answer: next.answer }].slice(-4));
      if (next.audio_base64) {
        const url = audioUrlFromBase64(next.audio_base64, next.audio_mime || 'audio/mpeg');
        setAnswerAudioUrl(url);
        const audio = new Audio(url);
        answerAudioRef.current = audio;
        audio.onplay = () => setAnswerPlaying(true);
        audio.onended = () => setAnswerPlaying(false);
        audio.onpause = () => setAnswerPlaying(false);
        void audio.play().catch(() => {
          // Browser autoplay can expire while the answer is generated. The
          // visible play control remains available in that case.
        });
      }
    } catch (caught) {
      setDraft(question);
      setError(friendlyBriefingConversationError(caught));
    } finally {
      setAsking(false);
    }
  }, [asking, briefingId, clearAnswerAudio, history, pause]);

  const {
    isRecording,
    isProcessing,
    duration,
    error: voiceError,
    browserCaptionPreview,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({
    maxDuration: 25,
    persistRecording: false,
    onTranscript: ask,
  });

  const startTalking = useCallback(() => {
    pause();
    clearAnswerAudio();
    setReply(null);
    setError(null);
    setShowText(false);
    resetRecording();
    void startRecording();
  }, [clearAnswerAudio, pause, resetRecording, startRecording]);

  const playAnswer = useCallback(() => {
    if (!answerAudioUrl) return;
    let audio = answerAudioRef.current;
    if (!audio) {
      audio = new Audio(answerAudioUrl);
      answerAudioRef.current = audio;
      audio.onplay = () => setAnswerPlaying(true);
      audio.onended = () => setAnswerPlaying(false);
      audio.onpause = () => setAnswerPlaying(false);
    }
    if (answerPlaying) audio.pause();
    else void audio.play();
  }, [answerAudioUrl, answerPlaying]);

  const submitText = () => {
    if (!draft.trim()) return;
    const question = draft;
    setDraft('');
    setShowText(false);
    void ask(question);
  };

  if (isRecording) {
    return (
      <button type="button" onClick={stopRecording} className="flex min-h-14 w-full items-center gap-3 rounded-[20px] border border-pink-500/30 bg-pink-500/[0.06] px-4 py-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500 text-white"><MicOff className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-foreground">I&apos;m listening</span>
          <span className="block truncate text-[11px] text-muted-foreground">{browserCaptionPreview || `Tap when you are done. ${Math.max(0, 25 - duration)}s left.`}</span>
        </span>
      </button>
    );
  }

  if (isProcessing || asking) {
    return (
      <div className="flex min-h-14 w-full items-center gap-3 rounded-[20px] border border-accent/20 bg-accent/[0.05] px-4 py-3" role="status" aria-live="polite">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"><Loader2 className="h-4 w-4 animate-spin" /></span>
        <span>
          <span className="block text-xs font-semibold text-foreground">{isProcessing ? 'Catching your question' : 'Thinking it through'}</span>
          <span className="block text-[11px] text-muted-foreground">Using this briefing, not filling the gaps with guesses.</span>
        </span>
      </div>
    );
  }

  if (reply) {
    return (
      <div className="rounded-[20px] border border-border bg-card/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">You asked: {reply.question}</p>
          <button type="button" onClick={() => setReply(null)} aria-label="Close answer" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3.5 w-3.5" /></button>
        </div>
        <p className="font-ctrl-text mt-3 text-[15px] leading-relaxed text-foreground">{reply.answer}</p>
        {reply.citations.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-border/60 pt-3">
            {reply.citations.map((citation) => (
              <p key={`${citation.segment_index}-${citation.headline}`} className="text-[10px] leading-relaxed text-muted-foreground">
                From {citation.headline}{citation.source ? `, ${citation.source}` : ''}
              </p>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {answerAudioUrl && (
            <button type="button" onClick={playAnswer} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-[11px] font-semibold text-background">
              {answerPlaying ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {answerPlaying ? 'Speaking' : 'Hear the answer'}
            </button>
          )}
          <button type="button" onClick={startTalking} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-[11px] font-semibold text-foreground hover:bg-secondary/60">
            <Mic className="h-3.5 w-3.5" /> Ask another
          </button>
        </div>
      </div>
    );
  }

  if (showText || voiceError) {
    return (
      <div className="rounded-[20px] border border-border bg-card/70 p-3">
        {voiceError && <p className="mb-2 text-[11px] text-muted-foreground">{voiceError.message}</p>}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submitText(); }}
            autoFocus
            placeholder="What do you want to understand?"
            className="font-ctrl-text min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
          />
          <button type="button" onClick={submitText} disabled={!draft.trim()} aria-label="Ask CTRL" className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-border bg-card/60 p-2">
      {error && (
        <div className="flex items-center gap-3 px-2 pb-1 pt-2" role="alert">
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">{error}</p>
          {draft.trim() && (
            <button
              type="button"
              onClick={() => void ask(draft)}
              className="min-h-11 shrink-0 rounded-xl border border-border px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-secondary/60"
            >
              Try again
            </button>
          )}
        </div>
      )}
      <div className={cn('flex min-h-14 w-full items-center gap-2 rounded-2xl px-2.5 text-left text-foreground')}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"><MessageSquare className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="font-ctrl-display block text-[13px] font-semibold">Talk to this briefing</span>
          <span className="hidden truncate text-[10.5px] text-muted-foreground min-[360px]:block">Ask, disagree, or add what changed</span>
        </span>
        <button type="button" onClick={() => setShowText(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Type a question"><Keyboard className="h-4 w-4" /></button>
        <button type="button" onClick={startTalking} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/[0.07] px-3 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/[0.12]">Talk</button>
      </div>
    </div>
  );
}
