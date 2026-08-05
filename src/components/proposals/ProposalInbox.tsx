import { Check, X } from 'lucide-react';
import { Surface, Eyebrow } from '@/components/system/surface';
import { SkeletonCard } from '@/components/system/SkeletonCard';
import type { Proposal } from '@/hooks/useProposals';

/**
 * ProposalInbox - what the last five weeks of checking suggests you change,
 * one yes or no at a time.
 *
 * Plain language throughout. The person never sees "Type A", "two strikes",
 * "ledger", "false positive" or "drift". They see what happened, in their own
 * quotes, and what it would change. A leader should never have to learn this
 * product's vocabulary to answer a question about their own rules.
 *
 * There is one primary action per card and it has two halves. No bulk accept,
 * no "apply all", no default and no dismiss-everything: automate everything up
 * to the yes and nothing past it. The most important thing on this screen is
 * that saying no is exactly as cheap as saying yes.
 */

interface ProposalInboxProps {
  proposals: Proposal[];
  loading: boolean;
  error: string | null;
  deciding: Record<string, boolean>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function ProposalInbox({
  proposals,
  loading,
  error,
  deciding,
  onAccept,
  onReject,
}: ProposalInboxProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <SkeletonCard variant="feed" />
        <SkeletonCard variant="feed" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-center gap-3">
        <Eyebrow>Your rules</Eyebrow>
        <h2 className="text-[19px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          Nothing to change this week
        </h2>
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          I only bring you something when the same thing has come up twice. Once is a bad
          Tuesday; twice is a pattern. When it happens I will have the exact change written
          out and you will only have to say yes or no.
        </p>
        {error && <p className="text-[12.5px] leading-snug text-amber-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-2">
      <header className="flex-none">
        <Eyebrow>Your rules</Eyebrow>
        <h2 className="mt-1.5 text-[19px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          {proposals.length === 1
            ? 'One thing to decide'
            : `${proposals.length} things to decide`}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Each of these came up more than once while I was checking your work. Nothing changes
          until you say so.
        </p>
      </header>

      {error && <p className="flex-none text-[12.5px] leading-snug text-amber-500">{error}</p>}

      <section className="flex flex-col gap-3">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            busy={Boolean(deciding[proposal.id])}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </section>
    </div>
  );
}

/** What kind of thing this is, in words rather than a taxonomy. */
function kindLabel(proposal: Proposal): string {
  if (proposal.type === 'uncovered') return 'A rule you do not have yet';
  if (proposal.type === 'false_positive') return 'A rule that got in your way';
  return 'A rule that has gone quiet';
}

/** The size obligation, said plainly. Every accepted change carries a deletion. */
function sizeLine(proposal: Proposal): string {
  const delta = proposal.size_delta ?? proposal.evidence.size?.delta ?? 0;
  if (delta > 0) return `This adds ${delta === 1 ? 'a rule' : `${delta} rules`}.`;
  if (delta < 0) return `This removes ${Math.abs(delta) === 1 ? 'a rule' : `${Math.abs(delta)} rules`}.`;
  return 'This adds nothing new.';
}

function ProposalCard({
  proposal,
  busy,
  onAccept,
  onReject,
}: {
  proposal: Proposal;
  busy: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const obligation = proposal.evidence.size?.paired_obligation;
  const lines = proposal.evidence.lines ?? [];
  const isQuestion = proposal.type === 'drift';
  const question = proposal.evidence.question ?? null;

  return (
    <Surface className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-card/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {kindLabel(proposal)}
        </span>
        {proposal.surface && (
          <span className="text-[11.5px] text-muted-foreground">on your {proposal.surface} work</span>
        )}
      </div>

      <p className="mt-2.5 text-[14.5px] font-semibold leading-snug text-foreground">
        {proposal.headline}
      </p>

      {isQuestion ? (
        question && (
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">{question}</p>
        )
      ) : (
        proposal.delta_text && (
          <pre className="mt-2.5 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-card/40 p-3 font-sans text-[12.5px] leading-relaxed text-foreground">
            {proposal.delta_text}
          </pre>
        )
      )}

      {lines.length > 0 && !isQuestion && (
        <div className="mt-3 flex flex-col gap-1.5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            What happened
          </p>
          {lines.slice(0, 4).map((line, index) => (
            <p
              key={`${line.week}-${index}`}
              className="text-[12.5px] leading-relaxed text-muted-foreground"
            >
              {line.quote ? `"${line.quote}"` : 'No passage was recorded for this one.'}
            </p>
          ))}
        </div>
      )}

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">If this turns out to be wrong: </span>
        {proposal.if_wrong}
      </p>

      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{sizeLine(proposal)} </span>
        {obligation}
      </p>

      <div className="mt-3.5 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAccept(proposal.id)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-[13.5px] font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {isQuestion ? 'It is done, retire it' : 'Yes, change it'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onReject(proposal.id)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-4 py-2.5 text-[13.5px] font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-secondary/50 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          {isQuestion ? 'Keep it, it still matters' : 'No, leave it'}
        </button>
      </div>
    </Surface>
  );
}
