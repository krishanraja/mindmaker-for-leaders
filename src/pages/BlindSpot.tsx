import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, RefreshCw, ShieldCheck } from 'lucide-react';
import { BlindSpotInstrument } from '@/components/blind-spot/BlindSpotInstrument';
import { BlindSpotAdvisorSheet, BlindSpotRejectionSheet } from '@/components/blind-spot/BlindSpotSheets';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';
import { supabase } from '@/integrations/supabase/client';
import type { BlindSpotCandidateV2, BlindSpotGenerateResponse } from '@/types/blindSpot';

interface SignedCandidate {
  candidate: BlindSpotCandidateV2;
  candidateToken: string;
  anchorFingerprint: string;
}

function BlindSpotLoading() {
  return (
    <div role="status" aria-live="polite" className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <div className="relative grid h-20 w-20 place-items-center rounded-3xl border border-border bg-card">
        <Eye className="h-8 w-8 text-[hsl(var(--node-challenge))]" aria-hidden="true" />
        <span className="absolute inset-0 animate-ping rounded-3xl border border-[hsl(var(--node-challenge)/0.18)] motion-reduce:animate-none" />
      </div>
      <p className="mt-6 font-ctrl-display text-lg font-semibold text-foreground">Looking for the useful tension.</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">Checking what you intended against what keeps recurring.</p>
    </div>
  );
}

function QuietState({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <ShieldCheck className="h-9 w-9 text-accent" aria-hidden="true" />
      <h1 className="mt-5 font-ctrl-display text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {retry && <button type="button" onClick={retry} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RefreshCw className="h-4 w-4" /> Try again</button>}
    </div>
  );
}

function BlindSpotContent() {
  const [signed, setSigned] = useState<SignedCandidate | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'confirming' | 'accepted' | 'rejected' | 'suppressed' | 'error' | 'stale-evidence'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const confirmationKey = useRef(crypto.randomUUID());

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setSigned(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<BlindSpotGenerateResponse>('blind-spot', { body: { action: 'generate' } });
      if (invokeError) throw invokeError;
      if (data?.suppressed) {
        setStatus('suppressed');
        return;
      }
      if (!data?.candidate || !data.candidateToken || !data.anchorFingerprint) throw new Error(data?.error || 'No read returned');
      setSigned({ candidate: data.candidate, candidateToken: data.candidateToken, anchorFingerprint: data.anchorFingerprint });
      confirmationKey.current = crypto.randomUUID();
      setStatus('ready');
    } catch {
      setStatus('error');
      setError('I could not look at this cleanly right now. Nothing was saved.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const confirm = async () => {
    if (!signed || status === 'confirming') return;
    setStatus('confirming');
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('blind-spot', { body: {
      action: 'confirm', ...signed, idempotencyKey: confirmationKey.current,
    } });
    if (invokeError || !data?.ok) {
      const message = String(data?.error || '');
      const stale = /changed|longer|reread/i.test(message);
      setStatus(stale ? 'stale-evidence' : 'ready');
      setError(message || 'I could not save that reflection. The read is still here.');
      return;
    }
    setStatus('accepted');
  };

  if (status === 'loading') return <BlindSpotLoading />;
  if (status === 'error') return <QuietState title="The read can wait." body={error || 'Nothing was saved.'} retry={() => void load()} />;
  if (status === 'suppressed') return <QuietState title="Nothing to press on today." body="You corrected the last read. I’ll leave it alone until the underlying evidence changes." />;
  if (status === 'rejected') return <QuietState title="Understood." body="I’ll leave that read alone until the evidence changes. Your correction remains private to your account." />;
  if (!signed) return null;

  return (
    <>
      <BlindSpotInstrument
        candidate={signed.candidate}
        status={status}
        error={error}
        onConfirm={() => void confirm()}
        onReject={() => setRejectionOpen(true)}
        onTalk={() => setAdvisorOpen(true)}
      />
      <BlindSpotRejectionSheet open={rejectionOpen} onOpenChange={setRejectionOpen} signed={signed} onRejected={() => setStatus('rejected')} />
      <BlindSpotAdvisorSheet open={advisorOpen} onOpenChange={setAdvisorOpen} signed={signed} />
    </>
  );
}

export default function BlindSpot() {
  const { isMobile } = useDevice();
  if (isMobile) {
    return (
      <MobileFrame scroll hideScrollbar padding="px-3 pt-3 pb-24">
        <BlindSpotContent />
      </MobileFrame>
    );
  }
  return (
    <DesktopShell eyebrow="CTRL instrument" title="Blind spot" fit>
      <BlindSpotContent />
    </DesktopShell>
  );
}
