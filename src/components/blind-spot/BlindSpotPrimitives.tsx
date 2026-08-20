import { ArrowRight, Flame, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BlindSpotAnchor, BlindSpotEvidenceStrength } from '@/types/blindSpot';

export function PrivateStateLabel() {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/82">
      <LockKeyhole className="h-3.5 w-3.5 text-[hsl(var(--node-challenge))]" aria-hidden="true" />
      <span>Between us</span><span aria-hidden="true" className="text-muted-foreground/50">·</span>
      <span className="font-medium normal-case tracking-normal text-muted-foreground">Private to you</span>
    </div>
  );
}

export function EvidenceStrength({ strength }: { strength: BlindSpotEvidenceStrength }) {
  const weeks = strength.windowDays == null ? null : Math.max(1, Math.round(strength.windowDays / 7));
  const label = `${strength.signalCount} signals · ${strength.sourceTypeCount} sources${weeks ? ` · ${weeks} weeks` : ''}`;
  return (
    <div className="flex items-center gap-3" aria-label={`Evidence strength: ${label}`}>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <span key={index} className={cn('h-1.5 w-5 rounded-full', index < Math.min(3, strength.signalCount) ? 'bg-[hsl(var(--node-challenge))]' : 'bg-border')} />
        ))}
      </div>
      <span className="font-ctrl-system text-[9px] uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
    </div>
  );
}

function displayDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(parsed);
}

export function EvidenceAnchorCard({ anchor, compact = false }: { anchor: BlindSpotAnchor; compact?: boolean }) {
  const sourceLine = `${anchor.label} · ${displayDate(anchor.observedAt)}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={cn(
          'group w-full rounded-xl border border-border/80 bg-background/45 text-left transition-colors hover:border-[hsl(var(--node-challenge)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          compact ? 'min-h-11 px-3 py-2' : 'min-h-[68px] px-4 py-3',
        )}>
          <span className="block font-ctrl-system text-[8px] uppercase tracking-[0.1em] text-muted-foreground">{sourceLine}</span>
          <span className={cn('mt-1 block text-foreground/86', compact ? 'line-clamp-1 text-[11px]' : 'line-clamp-2 text-xs leading-relaxed')}>“{anchor.excerpt}”</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl border-border bg-card [&>button]:grid [&>button]:h-11 [&>button]:w-11 [&>button]:place-items-center">
        <DialogHeader>
          <p className="font-ctrl-system text-[9px] uppercase tracking-[0.15em] text-[hsl(var(--node-challenge))]">Verified anchor</p>
          <DialogTitle>Your source, in context</DialogTitle>
          <DialogDescription>{sourceLine}</DialogDescription>
        </DialogHeader>
        <blockquote className="border-l-2 border-[hsl(var(--node-challenge)/0.65)] pl-4 text-sm leading-relaxed text-foreground/88">“{anchor.excerpt}”</blockquote>
      </DialogContent>
    </Dialog>
  );
}

export function TensionRelationship({ intention, recurrence }: { intention: BlindSpotAnchor | null; recurrence: BlindSpotAnchor[] }) {
  return (
    <section aria-label="The tension between your intention and what keeps recurring" className="grid min-h-0 grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] gap-2 rounded-2xl border border-border/70 bg-card/55 p-3 sm:gap-4 sm:p-5">
      <div className="min-w-0">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">What you said matters</p>
        {intention ? <EvidenceAnchorCard anchor={intention} /> : <p className="text-xs leading-relaxed text-muted-foreground">No current intention is verified yet.</p>}
      </div>
      <div className="flex flex-col items-center justify-center" aria-hidden="true">
        <span className="h-full min-h-6 w-px bg-gradient-to-b from-transparent via-[hsl(var(--node-challenge)/0.75)] to-transparent" />
        <span className="my-1 h-2.5 w-2.5 rotate-45 border border-[hsl(var(--node-challenge))] bg-card shadow-[0_0_12px_hsl(var(--node-challenge)/0.45)]" />
        <span className="h-full min-h-6 w-px bg-gradient-to-b from-[hsl(var(--node-challenge)/0.75)] to-transparent" />
      </div>
      <div className="min-w-0">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">What keeps recurring</p>
        <div className="space-y-2">
          {recurrence.slice(0, 3).map((anchor) => <EvidenceAnchorCard key={`${anchor.sourceKind}:${anchor.sourceId}`} anchor={anchor} compact />)}
          {recurrence.length === 0 && <p className="text-xs leading-relaxed text-muted-foreground">I need another signal before calling this a pattern.</p>}
        </div>
      </div>
    </section>
  );
}

export function AdvisorAction({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Talk this through
    </button>
  );
}

export function ConfirmedState({ onBurn, burning }: { onBurn?: () => void; burning?: boolean } = {}) {
  return (
    <div className="grid gap-2">
      <div role="status" className="flex min-h-14 items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 text-sm text-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <span><strong>Kept in view.</strong> I’ll bring the experiment back in a future briefing.</span>
        <ArrowRight className="ml-auto h-4 w-4 text-accent" aria-hidden="true" />
      </div>
      {/* A saved pattern is a dated, evidenced record of something a leader
          finds hard. Saying where it lives, and offering to remove it, is the
          difference between a private instrument and a permanent file. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          This stays in your account. No one else can see it.
        </p>
        {onBurn && (
          <button
            type="button"
            onClick={onBurn}
            disabled={burning}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {burning ? 'Burning...' : 'Burn this read'}
          </button>
        )}
      </div>
    </div>
  );
}
