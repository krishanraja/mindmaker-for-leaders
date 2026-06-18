import { useState } from "react";
import { Mic, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceStyleProfileSheet } from "./VoiceStyleProfileSheet";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";

/**
 * The Kit-surface entry into the voice profile capture. Shown above SendPackCard
 * once the kit has shipped and no profile rows exist yet. The same card flips to
 * a "Saved" success state after the sheet returns - that success state is also
 * the trigger for the side-door upgrade card.
 */
export function VoiceProfileCard({ onSaved }: { onSaved?: () => void }) {
  const { hasProfile, loading } = useVoiceProfile();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  if (hasProfile) {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          Voice profile locked in
        </div>
        <p className="text-sm text-muted-foreground">
          Every skill the Automator builds next will sound like you - sign-off, rhythm, rules and all.
        </p>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Tune it
        </Button>
        <VoiceStyleProfileSheet open={open} onOpenChange={setOpen} onSaved={onSaved} />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-accent/30 bg-accent/[0.04] p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">Make every future skill sound like you</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Three quick picks. No essays, no document uploads. The Automator uses this for every skill
        it builds for you from here on.
      </p>
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        <Mic className="mr-2 h-4 w-4" />
        Lock in my voice (90 seconds)
      </Button>
      <VoiceStyleProfileSheet open={open} onOpenChange={setOpen} onSaved={onSaved} />
    </div>
  );
}
