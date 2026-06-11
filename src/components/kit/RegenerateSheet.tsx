import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { KitPreset } from "@/content/kits";
import { invokeKit } from "@/lib/kit";
import type { KitRedemptionRow } from "@/lib/kit";
import { cn } from "@/lib/utils";

interface ComposeResponse {
  build_id?: string;
  quota_exhausted?: boolean;
  pass_expired?: boolean;
  rate_limited?: boolean;
}

/**
 * The tune-it sheet: say what should change, pick which artifacts to redo
 * (all by default; "Tune this" on a card pre-scopes it to one), regenerate.
 */
export function RegenerateSheet({
  open,
  onOpenChange,
  preset,
  redemption,
  prefillIds,
  onStarted,
  onPassExpired,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: KitPreset;
  redemption: KitRedemptionRow;
  /** When opened from a card's "Tune this", only that artifact starts selected. */
  prefillIds: string[] | null;
  onStarted: (buildId: string) => void;
  onPassExpired: () => void;
}) {
  const regenerable = useMemo(
    () =>
      preset.artifacts
        .filter((spec) => spec.strategy !== "static")
        .sort((a, b) => a.order - b.order),
    [preset],
  );

  const [feedback, setFeedback] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the selection each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setSelected(prefillIds?.length ? prefillIds : regenerable.map((spec) => spec.id));
    setError(null);
  }, [open, prefillIds, regenerable]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const allSelected = selected.length === regenerable.length;
    const { payload, errorMessage } = await invokeKit<ComposeResponse>("kit-compose", {
      redemption_id: redemption.id,
      kind: "regenerate",
      ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      ...(allSelected ? {} : { only_artifact_ids: selected }),
    });
    setSubmitting(false);
    if (payload?.build_id) {
      setFeedback("");
      onOpenChange(false);
      onStarted(payload.build_id);
      return;
    }
    if (payload?.pass_expired) {
      onOpenChange(false);
      onPassExpired();
      return;
    }
    setError(
      payload?.rate_limited
        ? "Too many builds in a row. Give it a minute, then try again."
        : (errorMessage ?? "The rebuild did not start. Try again."),
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Tune your kit</SheetTitle>
          <SheetDescription>
            Say what should change and pick what gets rebuilt. Everything else stays put.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-4">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should change? e.g. make it shorter, use my team's language, focus on the weekly report..."
            className="min-h-[90px] resize-none text-sm"
            aria-label="Regeneration feedback"
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Rebuild these</p>
            <div className="flex flex-wrap gap-1.5">
              {regenerable.map((spec) => {
                const on = selected.includes(spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggle(spec.id)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      on
                        ? "border-accent bg-accent/[0.08] text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {on && <Check className="h-3 w-3 text-accent" />}
                    {spec.title}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            size="lg"
            className="w-full"
            onClick={() => void submit()}
            disabled={submitting || selected.length === 0}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
