import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';
import { useProposals } from '@/hooks/useProposals';
import { ProposalInbox } from '@/components/proposals/ProposalInbox';

/**
 * ProposalsPage - what the weekly pass suggests you change, yes or no.
 *
 * Reachable by URL only for now, and deliberately NOT in the nav, exactly like
 * /sort and /review. Which door this sits behind is a product call that has not
 * been made, and this screen only has anything on it once somebody has been
 * checking their work for a few weeks, so putting it in the primary spine now
 * would put an empty room in the middle of the product.
 *
 * It is the last surface in the chain and the only place a standard changes.
 * Everything before it is automated; the yes is not, and there is nowhere on
 * this screen to make it so.
 */
export default function ProposalsPage() {
  const { isMobile } = useDevice();
  const { proposals, loading, error, deciding, accept, reject } = useProposals();

  const body = (
    <ProposalInbox
      proposals={proposals}
      loading={loading}
      error={error}
      deciding={deciding}
      onAccept={(id) => void accept(id)}
      onReject={(id) => void reject(id)}
    />
  );

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Your standard" title="What I would change">
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
