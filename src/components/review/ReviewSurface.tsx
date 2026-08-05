import { useState } from 'react';
import { Check, X, Quote } from 'lucide-react';
import { Surface, Eyebrow } from '@/components/system/surface';
import {
  judgementKey,
  STAGE_COPY,
  type ReviewJudgement,
  type ReviewResponse,
  type ReviewResult,
  type ReviewStage,
  type ReviewStatus,
  type ReviewVerdict,
} from '@/hooks/useReview';
import { cn } from '@/lib/utils';

/**
 * ReviewSurface - paste real work, get it read against your own standard, and
 * say whether each note landed.
 *
 * This screen is the reason Phase 4 exists (CH-01). The ledger had no writer:
 * once a skill is installed it runs inside somebody else's assistant and CTRL
 * observes nothing, so the weekly learning pass had nothing to read. Here the
 * review is the work and the ledger row is the by-product. Agree and Not right
 * ARE the row. There is no feedback form anywhere on this screen and there is
 * not going to be one, because every loop that needs a separate act of
 * feedback-giving dies.
 *
 * Plain language throughout (spec 6.6). The person never sees SCRUB, CRITIQUE,
 * provenance, lens or stage 7a. They see "checked against your rules". A leader
 * should never have to learn this product's own vocabulary to use it.
 */

interface ReviewSurfaceProps {
  status: ReviewStatus;
  stage: ReviewStage | null;
  error: string | null;
  result: ReviewResult | null;
  responses: Record<string, ReviewResponse>;
  onSubmit: (body: string, surface?: string) => void;
  onRespond: (item: ReviewJudgement, response: ReviewResponse) => void;
  onRespondUncovered: (
    note: { note: string; quote: string | null },
    index: number,
    response: ReviewResponse,
  ) => void;
  onReset: () => void;
}

const MIN_CHARS = 120;

export function ReviewSurface({
  status,
  stage,
  error,
  result,
  responses,
  onSubmit,
  onRespond,
  onRespondUncovered,
  onReset,
}: ReviewSurfaceProps) {
  if (status === 'running' || status === 'starting') {
    return <RunningView stage={stage} />;
  }

  if (status === 'ready' && result) {
    return (
      <ResultView
        result={result}
        responses={responses}
        onRespond={onRespond}
        onRespondUncovered={onRespondUncovered}
        onReset={onReset}
      />
    );
  }

  return <PasteView error={status === 'failed' ? error : null} onSubmit={onSubmit} />;
}

// ---------------------------------------------------------------------------
// Paste
// ---------------------------------------------------------------------------

function PasteView({
  error,
  onSubmit,
}: {
  error: string | null;
  onSubmit: (body: string, surface?: string) => void;
}) {
  const [body, setBody] = useState('');
  const [surface, setSurface] = useState('');
  const ready = body.trim().length >= MIN_CHARS;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <Eyebrow>Before you send it</Eyebrow>
        <h2 className="mt-1.5 text-[20px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          Paste the thing. I will check it against your rules.
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          A draft, an update, a post, a proposal. I quote the exact line before I say anything about
          it, and where I have nothing of yours to check against I will tell you rather than guess.
        </p>
      </div>

      <Surface className="flex min-h-0 flex-1 flex-col p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste your work here"
          className="min-h-[180px] flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
          <input
            type="text"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="What kind of thing is it?"
            maxLength={60}
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <span className="flex-none text-[11.5px] text-muted-foreground">
            {ready ? 'Ready' : `${Math.max(0, MIN_CHARS - body.trim().length)} more`}
          </span>
        </div>
      </Surface>

      {error && <p className="text-[12.5px] leading-snug text-amber-500">{error}</p>}

      <button
        type="button"
        onClick={() => onSubmit(body, surface.trim() || undefined)}
        disabled={!ready}
        className={cn(
          'w-full flex-none rounded-2xl px-4 py-3.5 text-[15px] font-bold transition-colors',
          ready
            ? 'bg-accent text-accent-foreground hover:bg-accent/90'
            : 'cursor-not-allowed border border-border bg-card/40 text-muted-foreground',
        )}
      >
        Check it
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

const STEPS: ReviewStage[] = ['loading', '7a', 'lenses', 'meta'];

/**
 * The real stages, narrated. Not a spinner: the run state exists precisely so
 * this screen can say what is actually happening, and a fake progress bar over
 * a minute of work is the thing the run-state table was added to replace.
 */
function RunningView({ stage }: { stage: ReviewStage | null }) {
  const current = stage && STEPS.includes(stage) ? STEPS.indexOf(stage) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-5">
      <div>
        <Eyebrow>Reading it</Eyebrow>
        <h2 className="mt-1.5 text-[19px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          {STAGE_COPY[stage ?? 'loading']}
        </h2>
      </div>
      <Surface className="p-4">
        <ol className="flex flex-col gap-2.5">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span
                className={cn(
                  'h-2 w-2 flex-none rounded-full transition-colors',
                  index < current && 'bg-accent',
                  index === current && 'bg-accent animate-pulse',
                  index > current && 'bg-border',
                )}
              />
              <span
                className={cn(
                  'text-[13px] leading-snug transition-colors',
                  index <= current ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {STAGE_COPY[step]}
              </span>
            </li>
          ))}
        </ol>
      </Surface>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Three separate reads, none of which sees the others, and then one pass over all three. It
        takes about a minute.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result: the output contract, in plain words
// ---------------------------------------------------------------------------

function ResultView({
  result,
  responses,
  onRespond,
  onRespondUncovered,
  onReset,
}: {
  result: ReviewResult;
  responses: Record<string, ReviewResponse>;
  onRespond: (item: ReviewJudgement, response: ReviewResponse) => void;
  onRespondUncovered: (
    note: { note: string; quote: string | null },
    index: number,
    response: ReviewResponse,
  ) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-2">
      {/* CHECKED / AGAINST */}
      <div>
        <Eyebrow>What I read</Eyebrow>
        <h2 className="mt-1.5 text-[19px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          {result.checked}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Checked against: {result.against}.
        </p>
      </div>

      {/* THE ONE THING */}
      {result.oneThing && (
        <Surface accent className="p-4">
          <Eyebrow>The one thing</Eyebrow>
          <p className="mt-1.5 text-[14.5px] font-semibold leading-snug text-foreground">
            {result.oneThing}
          </p>
        </Surface>
      )}

      {/* JUDGEMENT */}
      <section className="flex flex-col gap-2.5">
        <Eyebrow>Where it lands</Eyebrow>
        {result.judgement.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Nothing here could be scored against a rule of yours.
          </p>
        ) : (
          result.judgement.map((item) => (
            <JudgementCard
              key={judgementKey(item)}
              item={item}
              response={responses[judgementKey(item)]}
              onRespond={onRespond}
            />
          ))
        )}
      </section>

      {/* REVISED */}
      {result.revised.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <Eyebrow>The rewrite</Eyebrow>
          {result.revised.map((fix, index) => (
            <Surface key={`${fix.criterionName}-${index}`} className="p-4">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {fix.criterionName}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground line-through decoration-muted-foreground/40">
                {fix.quote}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-foreground">{fix.replacement}</p>
            </Surface>
          ))}
        </section>
      )}

      {/* MECHANICAL */}
      <section className="flex flex-col gap-2.5">
        <Eyebrow>Things I can just count</Eyebrow>
        {result.mechanical.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">Nothing to flag.</p>
        ) : (
          <Surface className="divide-y divide-border p-0">
            {result.mechanical.map((finding, index) => (
              <div key={`${finding.id}-${index}`} className="px-4 py-3">
                <p className="text-[13px] font-semibold leading-snug text-foreground">
                  {finding.label}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  "{finding.quote}"
                </p>
              </div>
            ))}
          </Surface>
        )}
      </section>

      {/* Uncovered: the most valuable rows in the ledger */}
      {result.uncovered.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <Eyebrow>Not covered by your rules</Eyebrow>
          {result.uncovered.map((note, index) => (
            <Surface key={`uncovered-${index}`} className="p-4">
              <p className="text-[13.5px] leading-relaxed text-foreground">{note.note}</p>
              {note.quote && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  "{note.quote}"
                </p>
              )}
              <ResponseRow
                response={responses[`uncovered:${index}`]}
                onRespond={(value) => onRespondUncovered(note, index, value)}
              />
            </Surface>
          ))}
        </section>
      )}

      {/* Where two reads disagreed */}
      {result.escalations.length > 0 && (
        <section className="flex flex-col gap-2">
          <Eyebrow>Two reads disagreed</Eyebrow>
          {result.escalations.map((item, index) => (
            <p key={`escalation-${index}`} className="text-[13px] leading-relaxed text-muted-foreground">
              {item.criterionName ? `${item.criterionName}: ` : ''}
              {item.note}
            </p>
          ))}
        </section>
      )}

      {/* The honesty block: what did not run, and why */}
      {result.notes.length > 0 && (
        <section className="flex flex-col gap-2">
          <Eyebrow>Worth knowing</Eyebrow>
          {result.notes.map((note, index) => (
            <p key={`note-${index}`} className="text-[12.5px] leading-relaxed text-muted-foreground">
              {note}
            </p>
          ))}
        </section>
      )}

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        I report, you decide. Nothing here blocks anything.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="w-full flex-none rounded-2xl border border-border bg-card/60 px-4 py-3 text-[14.5px] font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-secondary/50"
      >
        Check something else
      </button>
    </div>
  );
}

const VERDICT_STYLE: Record<ReviewVerdict, { label: string; className: string }> = {
  breaks: { label: 'Breaks', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  borderline: { label: 'Borderline', className: 'border-amber-500/40 bg-amber-500/10 text-amber-500' },
  holds: { label: 'Holds', className: 'border-accent/40 bg-accent/10 text-accent' },
  'insufficient evidence': {
    label: 'Could not point at it',
    className: 'border-border bg-card/40 text-muted-foreground',
  },
};

function JudgementCard({
  item,
  response,
  onRespond,
}: {
  item: ReviewJudgement;
  response: ReviewResponse | undefined;
  onRespond: (item: ReviewJudgement, response: ReviewResponse) => void;
}) {
  const style = VERDICT_STYLE[item.verdict];
  const scorable = item.verdict !== 'insufficient evidence';
  const unrepaired = item.adjustments.some((a) => a.rule === 'unrepaired');

  return (
    <Surface className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            style.className,
          )}
        >
          {style.label}
        </span>
        <span className="text-[13.5px] font-semibold text-foreground">{item.criterionName}</span>
        <span className="text-[11.5px] text-muted-foreground">
          {item.label === 'your rule' ? 'your rule' : "my check, not your rule"}
        </span>
      </div>

      {item.quote ? (
        <p className="mt-2.5 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
          <Quote className="mt-0.5 h-3.5 w-3.5 flex-none text-muted-foreground/60" />
          <span>{item.quote}</span>
        </p>
      ) : (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          I could not point at a line in your work for this one, so I did not score it.
        </p>
      )}

      {item.sentence && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-foreground">{item.sentence}</p>
      )}

      {item.changeToHolds && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          What would fix it: {item.changeToHolds}
        </p>
      )}

      {unrepaired && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-amber-500">
          I could not write a rewrite for this one that I would stand behind.
        </p>
      )}

      {scorable && <ResponseRow response={response} onRespond={(value) => onRespond(item, value)} />}
    </Surface>
  );
}

/**
 * The two quiet actions. This row IS the ledger write, which is why it sits on
 * every scored verdict and why there is no form anywhere else on the screen.
 */
function ResponseRow({
  response,
  onRespond,
}: {
  response: ReviewResponse | undefined;
  onRespond: (response: ReviewResponse) => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
      <ResponseButton
        active={response === 'agree'}
        onClick={() => onRespond('agree')}
        icon={<Check className="h-3.5 w-3.5" />}
        label="Agree"
        activeClass="border-accent/50 bg-accent/10 text-accent"
      />
      <ResponseButton
        active={response === 'push_back'}
        onClick={() => onRespond('push_back')}
        icon={<X className="h-3.5 w-3.5" />}
        label="Not right"
        activeClass="border-amber-500/50 bg-amber-500/10 text-amber-500"
      />
      {response && (
        <span className="ml-auto text-[11.5px] text-muted-foreground">
          {response === 'agree' ? 'Noted' : 'Noted, I will watch this one'}
        </span>
      )}
    </div>
  );
}

function ResponseButton({
  active,
  onClick,
  icon,
  label,
  activeClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
        active
          ? activeClass
          : 'border-border bg-card/40 text-muted-foreground hover:border-accent/30 hover:bg-secondary/50 hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
