import { Loader2, Zap } from "lucide-react";
import { EDGE_PRO_PRICE_LABEL } from "@/constants/billing";
import { useEdgeSubscription } from "@/hooks/useEdgeSubscription";
import { cn } from "@/lib/utils";

/**
 * The Edge Pro door inside the kit portal.
 *
 * Two things about this component are deliberate.
 *
 * FIRST, WHERE IT RENDERS. It used to appear only when a pass expired or a
 * build quota ran out, which meant the ordinary kit graduate, the one who
 * finished the whole thing and liked it, never saw a way to pay (CH-19). The
 * keep-it step now renders it beside the email option on the happy path. The
 * waitlist stays exactly where it was: it is the secondary action, not the
 * replaced one.
 *
 * SECOND, WHAT IT SAYS. docs/PRICING.md is canon and it says building is free
 * and unlimited while the LIVE pull of your skills into any AI is the paid
 * line. The old copy here sold "unlimited builds", which was wrong twice: the
 * free tier already has unlimited Automator builds, and nothing in the kit pass
 * consults `edge_subscriptions`, so subscribing does not top up
 * `skill_quota` either. Both variants now sell the thing that is actually
 * behind the wall, and the quota variant says plainly where more building
 * happens instead.
 *
 * Styling is `.kit-portal`: the `--kit-*` custom properties, not ctrl-ds
 * tokens. This card only ever renders inside the kit, and a ctrl emerald button
 * on the kit's paper-light card reads as a component from another product.
 */

export type EdgeProCardVariant = "quota" | "graduate";

const COPY: Record<EdgeProCardVariant, { title: string; body: string; cta: string }> = {
  quota: {
    title: "Keep building",
    body:
      `Your kit, your downloads, and your plan stay yours. This pass is what ran out, not your ` +
      `access: building skills in CTRL is free and uncapped. Edge Pro, ${EDGE_PRO_PRICE_LABEL}, ` +
      `is the tier where your own AI pulls those skills live on every call.`,
    cta: "Start Edge Pro",
  },
  graduate: {
    title: "Want your AI to pull this live?",
    body:
      `Everything you just built stays yours and free. Edge Pro, ${EDGE_PRO_PRICE_LABEL}, is for ` +
      `when you want your own AI to pull your skills straight out of CTRL on every call, plus ` +
      `unlimited decision weighs and a second model arguing against the first.`,
    cta: "Start Edge Pro",
  },
};

export function EdgeProCard({
  onDismiss,
  variant = "quota",
  className,
}: {
  onDismiss?: () => void;
  variant?: EdgeProCardVariant;
  className?: string;
}) {
  const { isProcessing, subscribe } = useEdgeSubscription();
  const copy = COPY[variant];

  const start = async () => {
    const url = await subscribe();
    if (url) window.location.href = url;
  };

  return (
    <div
      className={cn("space-y-3 rounded-2xl border p-5", className)}
      style={{
        background: "var(--kit-acc-soft)",
        borderColor: "var(--kit-acc-line)",
      }}
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4" style={{ color: "var(--kit-acc-deep)" }} />
        <h3 className="text-[14px] font-bold" style={{ color: "var(--kit-ink)" }}>
          {copy.title}
        </h3>
      </div>
      <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--kit-mut)" }}>
        {copy.body}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void start()}
          disabled={isProcessing}
          className="inline-flex flex-1 items-center justify-center rounded-[13px] px-4 py-3 text-[14.5px] font-extrabold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: "linear-gradient(180deg, var(--kit-acc), var(--kit-acc-deep))",
            boxShadow: isProcessing ? "none" : "0 12px 26px -14px rgba(10,158,132,.85)",
          }}
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {copy.cta}
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex flex-1 items-center justify-center rounded-[13px] px-4 py-3 text-[14.5px] font-semibold"
            style={{ color: "var(--kit-mut)" }}
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
