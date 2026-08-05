import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';
import { useReview } from '@/hooks/useReview';
import { ReviewSurface } from '@/components/review/ReviewSurface';

/**
 * ReviewPage - paste real work, get it checked against your own standard.
 *
 * Reachable by URL only for now, and deliberately NOT in the nav, exactly like
 * /sort. Which door this sits behind is a product call that has not been made,
 * and putting it in the primary spine before that decision would be guessing
 * with the surface the whole learning loop depends on.
 *
 * It is also the only place in the product that writes to the ledger (CH-01),
 * so its traffic is the falsification test for the whole self-serve loop: if
 * leaders will not paste work back to be checked, the ledger stays empty and
 * the write path has to move to the MCP tools instead. That is measurable in
 * four weeks and it is measurable only once this screen exists.
 */
export default function ReviewPage() {
  const { isMobile } = useDevice();
  const review = useReview();

  const body = (
    <ReviewSurface
      status={review.status}
      stage={review.stage}
      error={review.error}
      result={review.result}
      responses={review.responses}
      onSubmit={(text, surface) => void review.submit(text, surface)}
      onRespond={(item, response) => void review.respond(item, response)}
      onRespondUncovered={(note, index, response) =>
        void review.respondUncovered(note, index, response)}
      onReset={review.reset}
    />
  );

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Your standard" title="Check my work">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-col">{body}</div>
        </div>
      </DesktopShell>
    );
  }

  return (
    <MobileFrame padding="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <div className="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-col">{body}</div>
    </MobileFrame>
  );
}
