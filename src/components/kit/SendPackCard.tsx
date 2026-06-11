import { useState } from "react";
import { ChevronDown, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { emitKitEvent } from "@/lib/track";
import { invokeKit, markPackSent } from "@/lib/kit";
import type { KitRedemptionRow } from "@/lib/kit";
import type { KitTool } from "@/content/kits";
import { cn } from "@/lib/utils";

/**
 * Honest email capture at the moment of value: the pack lands in their inbox
 * plus two check-ins, nothing else. After a successful send, an optional
 * password row upgrades the anonymous session in place.
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
  const { isAnonymous, upgradeAnonymousSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

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

  const savePassword = async () => {
    if (!sentTo || password.length < 6) {
      toast.error("Use a password of at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      const result = await upgradeAnonymousSession(sentTo, password);
      if (result.success) {
        setPasswordSaved(true);
        toast.success("Saved. Your kit now opens anywhere you sign in.");
      } else {
        toast.error(result.error ?? "Could not save that. Try again.");
      }
    } catch {
      toast.error("Could not save that. Try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className={cn("space-y-3 rounded-2xl border border-border bg-card p-5", className)}>
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">Send my pack</h3>
      </div>

      {!sentTo ? (
        <>
          <p className="text-sm text-muted-foreground">
            Your kit lives in this browser right now. Drop your email and the whole pack lands in
            your inbox, plus a check-in on day 3 and day 7. That is all the email does.
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
          {isAnonymous && !passwordSaved && (
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground [&[data-state=open]>svg]:rotate-180">
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Add a password to open this anywhere
                </span>
                <ChevronDown className="h-4 w-4 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void savePassword();
                    }}
                    placeholder="Create a password"
                    aria-label="Password"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => void savePassword()}
                    disabled={savingPassword}
                    className="sm:w-auto"
                  >
                    {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          {passwordSaved && (
            <p className="text-sm text-accent">Account saved. This kit is yours anywhere now.</p>
          )}
        </>
      )}
    </div>
  );
}
