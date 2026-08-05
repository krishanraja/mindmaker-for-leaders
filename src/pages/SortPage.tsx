import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';
import { useSort } from '@/hooks/useSort';
import { SortPreamble } from '@/components/sort/SortPreamble';
import { SortRunner } from '@/components/sort/SortRunner';
import { SortManipCheck } from '@/components/sort/SortManipCheck';
import { SortRevealPanel } from '@/components/sort/SortRevealPanel';
import { Surface, Eyebrow } from '@/components/system/surface';
import { cn } from '@/lib/utils';

/**
 * SortPage - the check: about thirty short pieces of work, one at a time.
 *
 * Reachable by URL only for now. It is deliberately NOT in the nav: which door
 * this sits behind is a later call, and putting a twenty minute instrument in
 * the primary spine before that is decided would be guessing with the one flow
 * the rest of the chain depends on people finishing.
 *
 * One door, the authed app (CH-20). There is no kit variant: a graded corpus
 * written under an anonymous session that nobody will ever attach an email to
 * is unattributable the moment that browser is cleared, and the graded corpus
 * is the durable asset here.
 *
 * Session first (CH-21): the whole deck in one sitting, because the beats and
 * the number at the end are the product moment. The drip stays the fallback if
 * completion turns out not to hold in practice.
 *
 * Shell: DesktopShell on desktop with the reveal panel as the right pane;
 * MobileFrame on phones, no page scroll, with the reveal panel as a compact
 * strip pinned under the card rather than a sheet that covers the work.
 */

/** The surfaces with a public shelf behind them, plus an honest escape hatch. */
const SURFACE_CHOICES: Array<{ value: string; label: string }> = [
  { value: 'client updates', label: 'Client updates' },
  { value: 'board updates', label: 'Board or investor updates' },
  { value: 'linkedin posts', label: 'Posts you publish' },
];

type Phase = 'intro' | 'preamble' | 'running';

export default function SortPage() {
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const sort = useSort();
  const [phase, setPhase] = useState<Phase>('intro');
  const [surface, setSurface] = useState('');
  const [otherSurface, setOtherSurface] = useState('');
  const [showOther, setShowOther] = useState(false);

  const chosenSurface = showOther ? otherSurface.trim() : surface;

  const begin = () => {
    if (!chosenSurface) return;
    setPhase('preamble');
    void sort.startSort(chosenSurface);
  };

  const retry = () => {
    setPhase('intro');
  };

  const body = (() => {
    if (phase === 'intro') {
      return (
        <SortIntro
          surface={surface}
          onPick={(value) => {
            setShowOther(false);
            setSurface(value);
          }}
          showOther={showOther}
          otherSurface={otherSurface}
          onShowOther={() => {
            setShowOther(true);
            setSurface('');
          }}
          onOtherChange={setOtherSurface}
          canStart={Boolean(chosenSurface)}
          onStart={begin}
        />
      );
    }

    if (phase === 'preamble') {
      return (
        <SortPreamble
          stage={sort.stage}
          ready={sort.status === 'ready'}
          error={sort.status === 'failed' ? sort.error : null}
          onContinue={() => setPhase('running')}
          onRetry={retry}
        />
      );
    }

    if (sort.manipPrompt) {
      return (
        <SortManipCheck
          key={sort.manipPrompt.pairId}
          first={sort.manipPrompt.first}
          second={sort.manipPrompt.second}
          submitting={sort.manipSubmitting}
          revealed={sort.manipRevealed}
          dimension={sort.revealedDimension}
          onSubmit={(answer) => void sort.submitManipAnswer(answer)}
          onSkip={sort.skipManip}
          onContinue={sort.dismissManip}
        />
      );
    }

    if (sort.isComplete) {
      return (
        <div className="flex h-full min-h-0 flex-col justify-center gap-4 overflow-y-auto">
          <SortRevealPanel
            variant="full"
            lines={sort.lines}
            gradedCount={sort.lines.length}
            total={sort.total}
            canShowKill={sort.canShowKill}
            splitRate={sort.splitRate}
            selfAgreement={sort.selfAgreement}
            detail={sort.detail}
            unsavedGrades={sort.unsavedGrades}
          />
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-2xl border border-border bg-card/60 px-4 py-3 text-[14.5px] font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-secondary/50"
          >
            Done
          </button>
        </div>
      );
    }

    if (!sort.current) {
      return (
        <div className="flex h-full min-h-0 flex-col justify-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {sort.error ?? 'There is nothing here to look at.'}
          </p>
        </div>
      );
    }

    return (
      <SortRunner
        key={sort.current.id}
        item={sort.current}
        screen={sort.screen}
        total={sort.total}
        lastVerdict={sort.lastVerdict}
        onGrade={sort.grade}
        onHold={sort.holdAdvance}
        onAmendWhy={sort.amendWhy}
        onNext={sort.advance}
      />
    );
  })();

  const showPanel = phase === 'running' && !sort.isComplete;

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Your standard" title="The check">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-1 lg:gap-7">
            <div className="flex h-full min-h-0 min-w-0 flex-col lg:mx-auto lg:w-full lg:max-w-[560px]">
              {body}
            </div>
            {showPanel && (
              <aside className="hidden lg:block lg:self-start lg:pt-1">
                <SortRevealPanel
                  variant="rail"
                  lines={sort.lines}
                  gradedCount={sort.lines.length}
                  total={sort.total}
                  canShowKill={sort.canShowKill}
                  splitRate={sort.splitRate}
                  selfAgreement={sort.selfAgreement}
                  detail={sort.detail}
                  unsavedGrades={sort.unsavedGrades}
                />
              </aside>
            )}
          </div>
        </div>
      </DesktopShell>
    );
  }

  return (
    <MobileFrame padding="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <div className="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-col gap-2.5">
        <div className="min-h-0 flex-1">{body}</div>
        {showPanel && (
          <SortRevealPanel
            variant="strip"
            lines={sort.lines}
            gradedCount={sort.lines.length}
            total={sort.total}
            canShowKill={sort.canShowKill}
            splitRate={sort.splitRate}
            selfAgreement={sort.selfAgreement}
            detail={sort.detail}
            unsavedGrades={sort.unsavedGrades}
          />
        )}
      </div>
    </MobileFrame>
  );
}

interface SortIntroProps {
  surface: string;
  onPick: (value: string) => void;
  showOther: boolean;
  otherSurface: string;
  onShowOther: () => void;
  onOtherChange: (value: string) => void;
  canStart: boolean;
  onStart: () => void;
}

/** The calm start screen: what this is, how long, and the one thing to pick. */
function SortIntro({
  surface,
  onPick,
  showOther,
  otherSurface,
  onShowOther,
  onOtherChange,
  canStart,
  onStart,
}: SortIntroProps) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-5">
      <div>
        <Eyebrow>About twenty minutes</Eyebrow>
        <h2 className="mt-1.5 text-[20px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          I show you work. You tell me what you would send.
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          About thirty short pieces, one at a time. Two answers each, and a line about why if you
          have one. It is quicker to react to something than to describe yourself, which is why this
          works and a questionnaire does not.
        </p>
      </div>

      <Surface className="p-4">
        <p className="text-[14px] font-semibold text-foreground">
          What kind of work should I show you?
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {SURFACE_CHOICES.map((choice) => {
            const active = !showOther && surface === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => onPick(choice.value)}
                className={cn(
                  'w-full rounded-2xl border px-3.5 py-3 text-left text-[14px] font-medium transition-colors',
                  active
                    ? 'border-accent/50 bg-accent/10 text-foreground'
                    : 'border-border bg-card/40 text-muted-foreground hover:border-accent/30 hover:bg-secondary/50 hover:text-foreground',
                )}
              >
                {choice.label}
              </button>
            );
          })}

          {showOther ? (
            <input
              type="text"
              autoFocus
              value={otherSurface}
              onChange={(e) => onOtherChange(e.target.value)}
              placeholder="Say what it is, in your words"
              maxLength={120}
              className="w-full rounded-2xl border border-accent/40 bg-card/40 px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={onShowOther}
              className="self-start text-[12.5px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Something else
            </button>
          )}
        </div>
      </Surface>

      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className={cn(
          'w-full rounded-2xl px-4 py-3.5 text-[15px] font-bold transition-colors',
          canStart
            ? 'bg-accent text-accent-foreground hover:bg-accent/90'
            : 'cursor-not-allowed border border-border bg-card/40 text-muted-foreground',
        )}
      >
        Start
      </button>
    </div>
  );
}
