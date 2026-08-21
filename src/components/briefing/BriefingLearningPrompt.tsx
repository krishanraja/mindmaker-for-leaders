import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mic, MicOff, Pencil, Undo2 } from 'lucide-react';
import { useMemorySettings } from '@/hooks/useMemoryQueries';
import { useUserMemory } from '@/hooks/useUserMemory';
import { useVoice } from '@/hooks/useVoice';
import { cn } from '@/lib/utils';
import type { PendingVerification } from '@/types/memory';
import type { BlindSpotExperiment, BlindSpotExperimentOutcome } from '@/types/blindSpot';
import { supabase } from '@/integrations/supabase/client';

type LearningMode = 'question' | 'capture' | 'proposal' | 'saving' | 'saved' | 'skipped';

const SAVE_UNDO_WINDOW_MS = 5000;

interface BriefingLearningPromptProps {
  briefingId: string;
  promptOverride?: PendingVerification;
  experimentOverride?: BlindSpotExperiment;
  memoryEnabledOverride?: boolean;
}

function BlindSpotExperimentCheckIn({ experiment }: { experiment: BlindSpotExperiment }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<BlindSpotExperimentOutcome | null>(null);
  const [saved, setSaved] = useState<BlindSpotExperimentOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (outcome: BlindSpotExperimentOutcome) => {
    setSaving(outcome);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('blind-spot', { body: {
      action: 'experiment-check-in', experimentId: experiment.id, outcome, note: note.trim() || null,
    } });
    if (invokeError || !data?.ok) {
      setError('That did not save. Your answer is still here.');
      setSaving(null);
      return;
    }
    setSaved(outcome);
    setSaving(null);
  };

  if (saved) {
    const message = saved === 'positive'
      ? 'Useful. I’ll treat that outcome as another grounded observation.'
      : saved === 'not_yet'
        ? 'Understood. I’ll ask once more before this expires.'
        : 'Noted. That is an outcome, not proof that the original read was wrong.';
    return <div role="status" className="rounded-[20px] border border-accent/25 bg-accent/[0.045] px-4 py-4 text-[13px] leading-relaxed text-foreground">{message}</div>;
  }

  return (
    <div className="rounded-[20px] border border-border bg-card/60 px-4 py-4">
      <p className="font-ctrl-system text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--node-challenge))]">A private check-in</p>
      <h3 className="font-ctrl-display mt-2 text-[18px] font-semibold leading-tight text-foreground">{experiment.check_in_prompt}</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">You tried: {experiment.title}</p>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} placeholder="Optional note" className="mt-3 w-full resize-none rounded-xl border border-border bg-background/70 px-3 py-2 text-[12px] text-foreground outline-none focus:ring-2 focus:ring-ring" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => void submit('positive')} disabled={Boolean(saving)} className="min-h-11 rounded-xl bg-accent px-2 text-[11px] font-bold text-accent-foreground disabled:opacity-50">{saving === 'positive' ? 'Saving...' : 'It helped'}</button>
        <button type="button" onClick={() => void submit('not_really')} disabled={Boolean(saving)} className="min-h-11 rounded-xl border border-border px-2 text-[11px] font-semibold text-foreground disabled:opacity-50">Not really</button>
        <button type="button" onClick={() => void submit('not_yet')} disabled={Boolean(saving) || experiment.defer_count > 0} className="min-h-11 rounded-xl border border-border px-2 text-[11px] font-semibold text-muted-foreground disabled:opacity-40">Not yet</button>
      </div>
      {error && <p role="alert" className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export function BriefingLearningPrompt({
  briefingId,
  promptOverride,
  experimentOverride,
  memoryEnabledOverride,
}: BriefingLearningPromptProps) {
  const { data: memorySettings } = useMemorySettings();
  const {
    pendingVerifications,
    verifyFact,
    isLoading,
    error: memoryError,
  } = useUserMemory();
  const nextPrompt = promptOverride ?? pendingVerifications[0] ?? null;
  const [prompt, setPrompt] = useState<PendingVerification | null>(null);
  const [mode, setMode] = useState<LearningMode>('question');
  const [draft, setDraft] = useState('');
  const [proposal, setProposal] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dueExperiment, setDueExperiment] = useState<BlindSpotExperiment | null>(experimentOverride ?? null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPrompt(null);
    setMode('question');
    setDraft('');
    setProposal('');
    setSaveError(null);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, [briefingId]);

  useEffect(() => {
    if (experimentOverride) {
      setDueExperiment(experimentOverride);
      return;
    }
    let active = true;
    void supabase.functions.invoke<{ experiment: BlindSpotExperiment | null }>('blind-spot', { body: { action: 'due-experiment' } })
      .then(({ data, error }) => {
        if (active && !error) setDueExperiment(data?.experiment ?? null);
      });
    return () => { active = false; };
  }, [briefingId, experimentOverride]);

  useEffect(() => {
    if (!prompt && nextPrompt) setPrompt(nextPrompt);
  }, [nextPrompt, prompt]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const commit = useCallback(async (nextValue?: string) => {
    if (!prompt) return;
    setMode('saving');
    const ok = await verifyFact(prompt.id, nextValue);
    if (ok) {
      setMode('saved');
      setSaveError(null);
    } else {
      setMode(nextValue ? 'proposal' : 'question');
      setSaveError('That did not save. Try once more.');
    }
  }, [prompt, verifyFact]);

  const queueSave = useCallback((nextValue?: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveError(null);
    setMode('saved');
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void commit(nextValue);
    }, SAVE_UNDO_WINDOW_MS);
  }, [commit]);

  const undoQueuedSave = () => {
    if (!saveTimerRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    setMode(proposal ? 'proposal' : 'question');
  };

  const propose = useCallback((value: string) => {
    const next = value.trim();
    if (!next) return;
    setProposal(next);
    setDraft(next);
    setSaveError(null);
    setMode('proposal');
  }, []);

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
    onTranscript: propose,
  });

  if (dueExperiment) return <BlindSpotExperimentCheckIn experiment={dueExperiment} />;

  const startVoiceCorrection = () => {
    resetRecording();
    setSaveError(null);
    setMode('capture');
    void startRecording();
  };

  const memoryEnabled = memoryEnabledOverride ?? memorySettings?.store_memory_enabled ?? true;
  if ((!promptOverride && isLoading) || !prompt || !memoryEnabled) return null;

  if (mode === 'skipped') {
    return (
      <div className="rounded-[20px] border border-border bg-card/50 px-4 py-4">
        <p className="font-ctrl-system text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Nothing saved</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          I will leave this as-is and ask another time.
        </p>
      </div>
    );
  }

  if (mode === 'saved' || mode === 'saving') {
    const canUndo = mode === 'saved' && Boolean(saveTimerRef.current);
    return (
      <div className="rounded-[20px] border border-accent/25 bg-accent/[0.045] px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/12 text-accent">
            {mode === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-ctrl-display text-[16px] font-semibold text-foreground">
              {mode === 'saving' ? 'Saving that now.' : 'I will carry that forward.'}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {proposal || prompt.fact_value}
            </p>
          </div>
          {canUndo && (
            <button
              type="button"
              onClick={undoQueuedSave}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'proposal') {
    return (
      <div className="rounded-[20px] border border-border bg-card/60 px-4 py-4">
        <p className="font-ctrl-system text-[9px] uppercase tracking-[0.18em] text-accent">Before I remember it</p>
        <h3 className="font-ctrl-display mt-2 text-[18px] font-semibold leading-tight text-foreground">I heard this.</h3>
        <p className="mt-2 rounded-xl border border-border bg-background/70 px-3 py-3 text-[13px] leading-relaxed text-foreground">
          {proposal}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
          <button type="button" onClick={() => queueSave(proposal)} className="min-h-11 rounded-xl bg-foreground px-3 text-[12px] font-semibold text-background">Keep it</button>
          <button type="button" onClick={() => setMode('capture')} className="min-h-11 rounded-xl border border-border px-3 text-[12px] font-semibold text-foreground hover:bg-muted"><Pencil className="mr-1.5 inline h-3.5 w-3.5" />Edit</button>
          <button type="button" onClick={() => setMode('question')} className="min-h-11 rounded-xl border border-border px-3 text-[12px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Not this</button>
        </div>
        {saveError && <p role="alert" className="mt-2 text-[11px] text-destructive">{saveError}</p>}
      </div>
    );
  }

  if (mode === 'capture') {
    return (
      <div className="rounded-[20px] border border-border bg-card/60 px-4 py-4">
        <p className="font-ctrl-system text-[9px] uppercase tracking-[0.18em] text-accent">One thing before you go</p>
        <h3 className="font-ctrl-display mt-2 text-[18px] font-semibold leading-tight text-foreground">What should I understand instead?</h3>
        {isRecording ? (
          <button type="button" onClick={stopRecording} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl border border-pink-500/30 bg-pink-500/[0.06] px-3 text-left">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pink-500 text-white"><MicOff className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-foreground">I am listening</span>
              <span className="block truncate text-[11px] text-muted-foreground">{browserCaptionPreview || `Tap when you are done. ${Math.max(0, 25 - duration)}s left.`}</span>
            </span>
          </button>
        ) : (
          <div className="mt-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="What changed?"
              rows={3}
              className="font-ctrl-text w-full resize-none rounded-xl border border-border bg-background/70 px-3 py-3 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/50"
            />
            <div className="mt-2 grid grid-cols-[1fr_44px] gap-2">
              <button type="button" onClick={() => propose(draft)} disabled={!draft.trim() || isProcessing} className="min-h-11 rounded-xl bg-foreground px-3 text-[12px] font-semibold text-background disabled:opacity-40">
                {isProcessing ? 'Catching that...' : 'Show me first'}
              </button>
              <button type="button" onClick={startVoiceCorrection} aria-label="Say what changed" className="grid h-11 w-11 place-items-center rounded-xl border border-border text-accent hover:border-accent/35"><Mic className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        {(voiceError || memoryError || saveError) && (
          <p role="alert" className="mt-2 text-[11px] text-destructive">{voiceError?.message || memoryError || saveError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-border bg-card/60 px-4 py-4">
      <span className="mb-3 block h-px w-11 bg-gradient-to-r from-pink-500 to-orange-400" />
      <p className="font-ctrl-system text-[9px] uppercase tracking-[0.18em] text-pink-300/80">One thing before you go</p>
      <h3 className="font-ctrl-display mt-2 text-[18px] font-semibold leading-tight text-foreground">Is this still true?</h3>
      <p className="mt-2 text-[13px] font-medium leading-relaxed text-foreground">
        <span className="text-muted-foreground">{prompt.fact_label}: </span>{prompt.fact_value}
      </p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
        This changes what I prioritize in your briefings and decisions.
      </p>
      <div className="mt-3 grid grid-cols-[1fr_1fr_44px] gap-2">
        <button type="button" onClick={() => queueSave()} className="min-h-11 rounded-xl border border-border px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted">Yes</button>
        <button type="button" onClick={() => setMode('capture')} className="min-h-11 rounded-xl border border-border px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted">Changed</button>
        <button type="button" onClick={startVoiceCorrection} aria-label="Say what changed" className={cn('grid h-11 w-11 place-items-center rounded-xl border border-border text-accent transition-colors hover:border-accent/35')}><Mic className="h-4 w-4" /></button>
      </div>
      <button type="button" onClick={() => setMode('skipped')} className="mt-1 min-h-11 px-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground">Not now</button>
      {saveError && <p role="alert" className="mt-1 text-[11px] text-destructive">{saveError}</p>}
    </div>
  );
}
