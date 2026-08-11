import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Send, Square } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useVoice } from '@/hooks/useVoice';
import { supabase } from '@/integrations/supabase/client';
import type { BlindSpotCandidateV2, BlindSpotRejectionReason } from '@/types/blindSpot';

interface SignedCandidateProps {
  candidate: BlindSpotCandidateV2;
  candidateToken: string;
  anchorFingerprint: string;
}

export function BlindSpotRejectionSheet({ open, onOpenChange, signed, onRejected }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signed: SignedCandidateProps;
  onRejected: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [correction, setCorrection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onTranscript = useCallback((value: string) => setCorrection(value), []);
  const voice = useVoice({ maxDuration: 90, persistRecording: false, onTranscript });

  const reject = async (reason: BlindSpotRejectionReason) => {
    setSaving(true);
    setError(null);
    const { error: invokeError } = await supabase.functions.invoke('blind-spot', { body: {
      action: 'reject', ...signed, reason,
    } });
    if (invokeError) {
      setError('I could not save that correction. Nothing else changed.');
      setSaving(false);
      return;
    }
    if (correction.trim()) {
      await supabase.functions.invoke('extract-user-context', { body: { transcript: correction.trim(), source: 'blind_spot_correction' } });
    }
    setSaving(false);
    onOpenChange(false);
    onRejected();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-2xl rounded-t-3xl border-border bg-card px-5 pb-7 [&>button]:grid [&>button]:h-11 [&>button]:w-11 [&>button]:place-items-center sm:left-1/2 sm:-translate-x-1/2">
        <SheetHeader className="text-left">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--node-challenge))]">Not quite</p>
          <SheetTitle>What did I miss?</SheetTitle>
          <SheetDescription>One tap is enough. I’ll leave this alone until the evidence changes.</SheetDescription>
        </SheetHeader>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {([
            ['wrong_pattern', 'Wrong pattern'],
            ['evidence_stale', 'Evidence is stale'],
            ['missing_context', 'Missing context'],
          ] as const).map(([reason, label]) => (
            <button key={reason} type="button" disabled={saving} onClick={() => void reject(reason)} className="min-h-11 rounded-xl border border-border bg-background/50 px-4 text-sm font-semibold text-foreground hover:border-[hsl(var(--node-challenge)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{label}</button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <textarea value={correction} onChange={(event) => setCorrection(event.target.value)} rows={2} maxLength={500} placeholder="Optional: add the context I missed" className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          <button type="button" onClick={voice.isRecording ? voice.stopRecording : () => void voice.startRecording()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={voice.isRecording ? 'Stop voice correction' : 'Add a voice correction'}>
            {voice.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : voice.isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
        {(error || voice.error) && <p role="alert" className="mt-3 text-xs text-destructive">{error || 'Voice is unavailable. You can type instead.'}</p>}
      </SheetContent>
    </Sheet>
  );
}

interface AdvisorTurn { question: string; answer: string }

export function BlindSpotAdvisorSheet({ open, onOpenChange, signed }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signed: SignedCandidateProps;
}) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<AdvisorTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onTranscript = useCallback((value: string) => setQuestion(value), []);
  const voice = useVoice({ maxDuration: 90, persistRecording: false, onTranscript });

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const send = async () => {
    const clean = question.trim();
    if (clean.length < 3 || sending) return;
    setSending(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('blind-spot', { body: {
      action: 'conversation', ...signed, question: clean, history: turns.slice(-4), audio: true,
    } });
    if (invokeError || !data?.answer) {
      setError('I lost the thread for a moment. Ask that once more.');
    } else {
      setTurns((current) => [...current, { question: clean, answer: String(data.answer) }]);
      setQuestion('');
      if (data.audio_base64) {
        audioRef.current?.pause();
        audioRef.current = new Audio(`data:${data.audio_mime || 'audio/mpeg'};base64,${data.audio_base64}`);
        void audioRef.current.play().catch(() => undefined);
      }
    }
    setSending(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[88dvh] max-w-2xl flex-col rounded-t-3xl border-border bg-card px-5 pb-7 [&>button]:grid [&>button]:h-11 [&>button]:w-11 [&>button]:place-items-center sm:left-1/2 sm:-translate-x-1/2">
        <SheetHeader className="text-left">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--node-challenge))]">Between us</p>
          <SheetTitle>Talk this through</SheetTitle>
          <SheetDescription>I’ll stay inside the evidence you can see.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
          {turns.length === 0 && <p className="rounded-xl bg-secondary/50 p-4 text-sm leading-relaxed text-muted-foreground">What feels wrong, incomplete, or unexpectedly accurate about this read?</p>}
          {turns.map((turn, index) => <div key={`${turn.question}-${index}`} className="space-y-2"><p className="ml-8 rounded-xl bg-accent/10 p-3 text-sm text-foreground">{turn.question}</p><p className="mr-8 rounded-xl border border-border p-3 text-sm leading-relaxed text-foreground/86">{turn.answer}</p></div>)}
        </div>
        <div className="mt-4 flex gap-2">
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} maxLength={700} placeholder="Ask about this read" className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          <button type="button" onClick={voice.isRecording ? voice.stopRecording : () => void voice.startRecording()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={voice.isRecording ? 'Stop speaking' : 'Speak instead'}>{voice.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : voice.isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
          <button type="button" onClick={() => void send()} disabled={sending || question.trim().length < 3} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground disabled:opacity-45" aria-label="Send question">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
        </div>
        {(error || voice.error) && <p role="alert" className="mt-3 text-xs text-destructive">{error || 'Voice is unavailable. You can type instead.'}</p>}
      </SheetContent>
    </Sheet>
  );
}
