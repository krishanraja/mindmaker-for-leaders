import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { CtrlMonogram } from '@/components/brand/CtrlMonogram';
import { useDevice } from '@/hooks/useDevice';
import { supabase } from '@/integrations/supabase/client';

interface BlindSpotCandidate {
  insight: string;
  evidence: string[];
  question: string;
  experiment: string;
  confidence: number;
  insufficientEvidence: boolean;
}

interface GenerateResponse {
  candidate?: BlindSpotCandidate;
  error?: string;
}

function BlindSpotContent() {
  const [candidate, setCandidate] = useState<BlindSpotCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);

  const load = useCallback(async (exclude: string[] = []) => {
    setLoading(true);
    setConfirmed(false);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<GenerateResponse>('blind-spot', {
        body: { action: 'generate', exclude },
      });
      if (invokeError) throw invokeError;
      if (!data?.candidate) throw new Error(data?.error || 'No blind spot returned');
      setCandidate(data.candidate);
    } catch {
      setError('I could not look for a blind spot right now. Your data is safe. Try again shortly.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = useCallback(async () => {
    if (!candidate || candidate.insufficientEvidence || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const { error: invokeError } = await supabase.functions.invoke('blind-spot', {
        body: { action: 'confirm', candidate },
      });
      if (invokeError) throw invokeError;
      setConfirmed(true);
    } catch {
      setError('I could not save that reflection. Try once more.');
    } finally {
      setConfirming(false);
    }
  }, [candidate, confirming]);

  const tryAnother = useCallback(() => {
    const nextExcluded = candidate?.insight ? [...excluded, candidate.insight].slice(-3) : excluded;
    setExcluded(nextExcluded);
    void load(nextExcluded);
  }, [candidate?.insight, excluded, load]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-5 text-center" role="status" aria-live="polite">
        <CtrlMonogram size={88} animated />
        <p className="mt-7 font-mymu-serif text-xl text-foreground">Looking for the useful tension.</p>
        <p className="mt-2 text-sm text-muted-foreground">Checking what you intended against what keeps recurring.</p>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-lg flex-col items-center justify-center px-5 text-center">
        <Eye className="h-9 w-9 text-rose-400" />
        <p className="mt-5 font-mymu-serif text-xl text-foreground">{error}</p>
        <button type="button" onClick={() => void load(excluded)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (!candidate) return null;

  return (
    <div className="mx-auto w-full max-w-2xl pb-10">
      <AnimatePresence mode="wait">
        <motion.article
          key={candidate.insight}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32 }}
          className="overflow-hidden rounded-3xl border border-rose-400/20 bg-card"
        >
          <div className="border-b border-border/70 bg-gradient-to-br from-rose-500/[0.09] via-orange-400/[0.04] to-transparent px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex items-center gap-2 text-rose-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">One thing worth noticing</span>
            </div>
            <h1 className="mt-5 max-w-[28ch] font-mymu-serif text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-foreground">
              {candidate.insight}
            </h1>
          </div>

          <div className="space-y-7 px-6 py-6 sm:px-8 sm:py-8">
            {candidate.evidence.length > 0 && (
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">What made me wonder</p>
                <ul className="mt-3 space-y-3">
                  {candidate.evidence.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground/78">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/70" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl bg-secondary/55 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">A question, not a verdict</p>
              <p className="mt-3 font-mymu-serif text-xl leading-snug text-foreground">{candidate.question}</p>
            </section>

            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Try this in 15 minutes</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/78">{candidate.experiment}</p>
            </section>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            {confirmed ? (
              <div className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-4 text-sm text-foreground">
                <Check className="h-5 w-5 shrink-0 text-accent" />
                Saved. CTRL will watch for this gently, not treat it as a permanent label.
              </div>
            ) : candidate.insufficientEvidence ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">Answering this once gives CTRL a useful starting point. It will wait for repeated evidence before calling anything a pattern.</p>
                <button type="button" onClick={tryAnother} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <RefreshCw className="h-4 w-4" /> Check again later
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={confirm} disabled={confirming} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">
                  {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  That lands. Help me notice it.
                </button>
                <button type="button" onClick={tryAnother} className="min-h-11 rounded-2xl border border-border px-5 py-3.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Not quite</button>
              </div>
            )}
          </div>
        </motion.article>
      </AnimatePresence>
      <p className="mx-auto mt-5 max-w-lg text-center text-[11px] leading-relaxed text-muted-foreground/65">CTRL only saves this as a pattern if you confirm it. Generated observations are not treated as truth.</p>
    </div>
  );
}

export default function BlindSpot() {
  const { isMobile } = useDevice();
  if (isMobile) {
    return (
      <MobileFrame scroll hideScrollbar padding="px-4 pt-4 pb-24">
        <BlindSpotContent />
      </MobileFrame>
    );
  }
  return (
    <DesktopShell eyebrow="Reflection" title="Blind spot" fit={false}>
      <BlindSpotContent />
    </DesktopShell>
  );
}
