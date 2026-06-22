import { useState } from "react";
import { CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitKitEvent } from "@/lib/track";
import { invokeKit, markPackSent } from "@/lib/kit";
import type { KitRedemptionRow } from "@/lib/kit";
import type { KitTool } from "@/content/kits";
import { cn } from "@/lib/utils";

/**
 * Honest email capture at the moment of value: the pack lands in their inbox
 * plus two check-ins, nothing else.
 *
 * The full CTRL app is not in production yet, so instead of upgrading the
 * anonymous session into a live account (a direct sign-up), the post-send step
 * offers a spot on the waitlist. Joining is recorded centrally and notifies the
 * founder via the `kit-waitlist-join` edge function.
 */
export function SendPackCard({
  redemption,
  tool,
  onSent,
  className,
}: {
  redemption: KitRedemptionRow;
  tool: KitTool;
  onSent: (email: string) => void;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const send = async () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSending(true);
    const { payload, errorMessage } = await invokeKit<{ ok?: boolean; already_sent?: boolean }>(
      "send-kit-pack",
      { redemption_id: redemption.id, email: trimmed, tool },
    );
    setSending(false);
    if (payload?.ok) {
      markPackSent();
      setSentTo(trimmed);
      toast.success(
        payload.already_sent ? "Already on its way. Check your inbox." : "Pack sent. Check your inbox.",
      );
      emitKitEvent("kit_email_captured", {
        class_slug: redemption.class_slug,
        redemption_id: redemption.id,
      });
      onSent(trimmed);
      return;
    }
    toast.error(errorMessage ?? "The pack did not send. Try again.");
  };

  const joinWaitlist = async () => {
    if (!sentTo) return;
    setJoining(true);
    const { payload, errorMessage } = await invokeKit<{ ok?: boolean; already_joined?: boolean }>(
      "kit-waitlist-join",
      {
        redemption_id: redemption.id,
        email: sentTo,
        class_slug: redemption.class_slug,
        tool,
        source: "kit",
      },
    );
    setJoining(false);
    if (payload?.ok) {
      setJoined(true);
      toast.success(
        payload.already_joined
          ? "You're already on the list. We'll be in touch."
          : "You're on the list. We'll email you when your spot opens.",
      );
      emitKitEvent("kit_waitlist_joined", {
        class_slug: redemption.class_slug,
        redemption_id: redemption.id,
      });
      return;
    }
    toast.error(errorMessage ?? "Could not add you right now. Try again.");
  };

  return (
    <div className={cn("space-y-3 rounded-2xl border border-border bg-card p-5 kit-shadow-sm", className)}>
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">Send my pack</h3>
      </div>

      {!sentTo ? (
        <>
          <p className="text-sm text-muted-foreground">
            Your kit lives in this browser right now. Drop your email and the whole pack lands in
            your inbox, plus a check-in on day 3 and day 7.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="you@company.com"
              aria-label="Email"
              className="flex-1"
            />
            <Button onClick={() => void send()} disabled={sending} className="sm:w-auto">
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send my pack
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Sent to <span className="font-medium text-foreground">{sentTo}</span>. Day 3 and day
            7 check-ins will follow.
          </p>

          {/* The full app is still being polished, so we offer early access via
              the waitlist rather than dropping people straight into it. */}
          {!joined ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Want early access to the full CTRL app?
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                We're putting the finishing touches on it. Join the waitlist and we'll email{" "}
                <span className="font-medium text-foreground">{sentTo}</span> the moment your spot
                opens.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2.5 w-full sm:w-auto"
                onClick={() => void joinWaitlist()}
                disabled={joining}
              >
                {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join the waitlist
              </Button>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-accent">
              <CheckCircle2 className="h-4 w-4" />
              You're on the waitlist. We'll be in touch.
            </p>
          )}
        </>
      )}
    </div>
  );
}
