import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";

/**
 * Kit side-door upgrade: the anonymous student who already saved a voice
 * profile can upgrade in place to a named CTRL Free account. kit_redemptions,
 * user_memory, and voice_profile.* rows all stay linked - the auth.uid()
 * does not change across upgradeAnonymousSession().
 */
export function SaveProfileCard() {
  const navigate = useNavigate();
  const { isAnonymous, upgradeAnonymousSession } = useAuth();
  const { hasProfile, loading: profileLoading } = useVoiceProfile();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (profileLoading) return null;
  if (!isAnonymous) return null;
  if (!hasProfile) return null;

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (password.length < 12) {
      toast.error("Password must be at least 12 characters.");
      return;
    }
    setSubmitting(true);
    const result = await upgradeAnonymousSession(trimmedEmail, password);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not save your profile. Try again.");
      return;
    }
    toast.success("CTRL account saved. Your kit and voice profile come with you.");
    navigate("/dashboard?welcome=free");
  };

  return (
    <div className="space-y-3 rounded-2xl border border-accent/40 bg-accent/[0.05] p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Save your profile - free CTRL account</h3>
        <p className="text-sm text-muted-foreground">
          Your kit, voice profile and Memory Web carry over. One free Automator skill per month, plus
          read-write Memory Web - no card required.
        </p>
      </div>
      <div className="space-y-2">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="pl-9"
            aria-label="Email"
            disabled={submitting}
          />
        </div>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            className="pl-9"
            aria-label="Password"
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </div>
      </div>
      <Button size="lg" className="w-full" onClick={() => void submit()} disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save profile and open CTRL
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      <p className="text-xs text-muted-foreground">
        Free includes Memory Web (read-write), Voice Profile and one Automator skill per month. Edge
        Pro ($29/mo) unlocks unlimited skills plus the daily briefing and decision engine.
      </p>
    </div>
  );
}
