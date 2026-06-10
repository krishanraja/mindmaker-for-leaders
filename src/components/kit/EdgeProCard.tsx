import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EDGE_PRO_PRICE_LABEL } from "@/constants/billing";
import { useEdgeSubscription } from "@/hooks/useEdgeSubscription";

/**
 * The contextual upgrade card, shown when the pass ends or the build quota
 * runs out. No scarcity theatre: what they have stays theirs.
 */
export function EdgeProCard({ onDismiss }: { onDismiss?: () => void }) {
  const { isProcessing, subscribe } = useEdgeSubscription();

  const start = async () => {
    const url = await subscribe();
    if (url) window.location.href = url;
  };

  return (
    <div className="space-y-3 rounded-2xl border border-accent/30 bg-accent/[0.04] p-5">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">Keep building</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Your kit, your downloads, and your plan stay yours. Unlimited builds plus the full CTRL
        stack is Edge Pro, {EDGE_PRO_PRICE_LABEL}.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="flex-1" onClick={() => void start()} disabled={isProcessing}>
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Edge Pro
        </Button>
        {onDismiss && (
          <Button variant="ghost" size="lg" className="flex-1" onClick={onDismiss}>
            Not now
          </Button>
        )}
      </div>
    </div>
  );
}
