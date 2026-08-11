import { Check, Clock3, Loader2, MessageCircleQuestion, X } from 'lucide-react';
import { AdvisorAction, ConfirmedState, EvidenceStrength, PrivateStateLabel, TensionRelationship } from './BlindSpotPrimitives';
import type { BlindSpotCandidateV2 } from '@/types/blindSpot';

export interface BlindSpotInstrumentProps {
  candidate: BlindSpotCandidateV2;
  status?: 'ready' | 'confirming' | 'accepted' | 'rejected' | 'stale-evidence';
  error?: string | null;
  onConfirm: () => void;
  onReject: () => void;
  onTalk: () => void;
}

export function BlindSpotInstrument({ candidate, status = 'ready', error, onConfirm, onReject, onTalk }: BlindSpotInstrumentProps) {
  const experiment = candidate.experiment;
  const isPattern = candidate.kind === 'pattern' && experiment !== null;
  return (
    <article aria-labelledby="blind-spot-read" className="mx-auto flex h-full min-h-0 w-full max-w-[980px] flex-col overflow-hidden rounded-[24px] border border-border/80 bg-[linear-gradient(155deg,hsl(var(--card)),hsl(var(--background))_75%)] shadow-2xl shadow-black/25">
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3 sm:px-6">
        <PrivateStateLabel />
        <span className="hidden font-ctrl-system text-[8px] uppercase tracking-[0.12em] text-muted-foreground sm:block">Grounded in your records</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="grid shrink-0 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--node-challenge))]">My read</p>
            <h1 id="blind-spot-read" className="mt-1 max-w-[25ch] font-ctrl-display text-[clamp(1.45rem,4.5vw,2.35rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-foreground text-balance">{candidate.headline}</h1>
            <p className="mt-2 max-w-[66ch] text-xs leading-relaxed text-muted-foreground sm:text-sm">{candidate.explanation}</p>
          </div>
          <EvidenceStrength strength={candidate.evidenceStrength} />
        </header>

        <div className="min-h-0 flex-1">
          <TensionRelationship intention={candidate.intention} recurrence={candidate.recurrence} />
        </div>

        {isPattern && experiment ? (
          <section aria-labelledby="experiment-title" className="grid shrink-0 gap-3 rounded-2xl border border-accent/20 bg-accent/[0.045] p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-accent"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{experiment.durationMinutes}-minute test</p>
              <h2 id="experiment-title" className="mt-1 text-sm font-semibold text-foreground">{experiment.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{experiment.instruction}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1 sm:justify-end">
              {status === 'accepted' ? <ConfirmedState /> : status === 'rejected' ? (
                <p role="status" className="max-w-sm text-xs leading-relaxed text-muted-foreground">I’ll leave this alone until the evidence changes.</p>
              ) : (
                <>
                  <button type="button" onClick={onConfirm} disabled={status === 'confirming' || status === 'stale-evidence'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                    {status === 'confirming' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                    Try this
                  </button>
                  <button type="button" onClick={onReject} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4" aria-hidden="true" /> Not quite</button>
                  <AdvisorAction onClick={onTalk} />
                </>
              )}
            </div>
          </section>
        ) : (
          <section className="grid shrink-0 gap-3 rounded-2xl border border-border bg-secondary/45 p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden="true" />A question, not a claim</p>
              <p className="mt-1 text-sm font-medium leading-snug text-foreground">{candidate.question}</p>
            </div>
            <AdvisorAction onClick={onTalk} />
          </section>
        )}

        {(error || status === 'stale-evidence') && <p role="alert" className="shrink-0 text-xs text-destructive">{error || 'The evidence changed. I need to reread it before saving anything.'}</p>}
      </div>
    </article>
  );
}
