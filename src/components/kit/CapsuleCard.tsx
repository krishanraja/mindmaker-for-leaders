import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { emitKitEvent } from "@/lib/track";
import { invokeKit } from "@/lib/kit";
import type { KitRedemptionRow } from "@/lib/kit";

interface CapsuleResponse {
  ok?: boolean;
  facts_extracted?: number;
  facts_stored?: number;
  suggest_regenerate?: boolean;
}

/**
 * The homework comes home: paste the AI's context capsule and the kit learns
 * who it is for. Optional by design and honest about it.
 */
export function CapsuleCard({
  redemption,
  onRegenerate,
}: {
  redemption: KitRedemptionRow;
  onRegenerate: () => void;
}) {
  const [capsule, setCapsule] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestRegenerate, setSuggestRegenerate] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const { payload, errorMessage } = await invokeKit<CapsuleResponse>("kit-capsule-ingest", {
      redemption_id: redemption.id,
      capsule_text: capsule.trim(),
    });
    setSubmitting(false);
    if (payload?.ok) {
      emitKitEvent("kit_capsule_pasted", {
        class_slug: redemption.class_slug,
        redemption_id: redemption.id,
      });
      const stored = payload.facts_stored ?? 0;
      toast.success(
        stored > 0
          ? `Learned ${stored} new thing${stored === 1 ? "" : "s"} about you.`
          : "Read it. Nothing new to add, your kit already knows this.",
      );
      setSuggestRegenerate(!!payload.suggest_regenerate);
      setCapsule("");
      return;
    }
    toast.error(errorMessage ?? "That did not go through. Try again.");
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">Paste your AI's homework</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Drop the answer your AI gave to the homework prompt and CTRL folds what it knows about
        you into the kit.
      </p>
      <Textarea
        value={capsule}
        onChange={(e) => setCapsule(e.target.value)}
        placeholder="Paste the full reply here..."
        className="min-h-[110px] resize-none text-sm"
        aria-label="Context capsule"
      />
      <Button
        size="lg"
        className="w-full"
        onClick={() => void submit()}
        disabled={submitting || capsule.trim().length < 20}
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sharpen my kit
      </Button>
      {suggestRegenerate && (
        <Button variant="outline" size="lg" className="w-full" onClick={onRegenerate}>
          Regenerate with what it learned
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Optional. Your kit works without it; this step makes it sound like you.
      </p>
    </div>
  );
}
