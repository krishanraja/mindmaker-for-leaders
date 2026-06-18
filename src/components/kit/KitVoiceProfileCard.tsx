import { useState } from "react";
import { PenLine, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceStyleProfileSheet } from "@/components/edge/VoiceStyleProfileSheet";
import { useVoiceProfile } from "@/hooks/useVoiceProfile";
import { voiceProfileSummary } from "@/types/voiceProfile";

/**
 * Kit portal card: capture voice profile before bridging to full CTRL.
 * Persists on the same auth.uid() when the student upgrades via SendPackCard.
 */
export function KitVoiceProfileCard({ onSaved }: { onSaved?: () => void }) {
  const { profile, hasProfile, loading } = useVoiceProfile();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5 kit-shadow-sm">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">Save how you write</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Five quick picks - no typing. CTRL stores your voice in your Memory Web so skills
          and exports sound like you, not generic AI.
        </p>
        {hasProfile && profile && !loading ? (
          <div className="flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Voice saved</p>
              <p className="text-xs text-muted-foreground">{voiceProfileSummary(profile)}</p>
            </div>
          </div>
        ) : null}
        <Button
          variant={hasProfile ? "outline" : "default"}
          size="lg"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          {hasProfile ? "Update my voice" : "Set my voice (60 seconds)"}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Free. Carries over when you add a password and open CTRL.
        </p>
      </div>

      <VoiceStyleProfileSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        source="kit"
        onSaved={onSaved}
      />
    </>
  );
}
