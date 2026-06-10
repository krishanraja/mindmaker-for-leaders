import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { invokeKit, daysBetween } from "@/lib/kit";
import type { KitRedemptionRow } from "@/lib/kit";

interface ComposeResponse {
  build_id?: string;
  quota_exhausted?: boolean;
  pass_expired?: boolean;
}

/**
 * The standing "I shipped it" affordance, the celebration when they do, and
 * the shipped-mode banner that points at the next build.
 */
export function ShipSection({
  redemption,
  shippedAt,
  buildsRemaining,
  onLogShip,
  onNewSkillStarted,
  onQuotaExhausted,
}: {
  redemption: KitRedemptionRow;
  /** Timestamp of the shipped event, or null when not yet shipped. */
  shippedAt: string | null;
  buildsRemaining: number;
  /** Parent persists the event and emits analytics. Resolves false on failure. */
  onLogShip: (note: string) => Promise<boolean>;
  onNewSkillStarted: (buildId: string) => void;
  onQuotaExhausted: () => void;
}) {
  const [shipOpen, setShipOpen] = useState(false);
  const [note, setNote] = useState("");
  const [logging, setLogging] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const [nextOpen, setNextOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [building, setBuilding] = useState(false);
  const [nextError, setNextError] = useState<string | null>(null);

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 1500);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  const logShip = async () => {
    setLogging(true);
    const ok = await onLogShip(note.trim());
    setLogging(false);
    if (ok) {
      setShipOpen(false);
      setNote("");
      setCelebrating(true);
    }
  };

  const buildNext = async () => {
    setBuilding(true);
    setNextError(null);
    const { payload, errorMessage } = await invokeKit<ComposeResponse>("kit-compose", {
      redemption_id: redemption.id,
      kind: "new_skill",
      transcript: transcript.trim(),
    });
    setBuilding(false);
    if (payload?.build_id) {
      setNextOpen(false);
      setTranscript("");
      onNewSkillStarted(payload.build_id);
      return;
    }
    if (payload?.quota_exhausted) {
      setNextOpen(false);
      onQuotaExhausted();
      return;
    }
    setNextError(errorMessage ?? "The build did not start. Try again.");
  };

  return (
    <>
      {shippedAt ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="space-y-4 rounded-2xl border border-accent/40 bg-accent/[0.06] p-6 text-center"
        >
          <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight">
              You shipped in {daysBetween(redemption.redeemed_at, shippedAt)}{" "}
              {daysBetween(redemption.redeemed_at, shippedAt) === 1 ? "day" : "days"}.
            </h3>
            <p className="text-muted-foreground">Most people never do.</p>
          </div>
          <Button size="lg" className="w-full" onClick={() => setNextOpen(true)}>
            <Rocket className="mr-2 h-4 w-4" />
            Build your next one
          </Button>
        </motion.div>
      ) : (
        <Button
          size="xl"
          variant="accent"
          className="w-full"
          onClick={() => setShipOpen(true)}
        >
          <Rocket className="mr-2 h-5 w-5" />
          I shipped it
        </Button>
      )}

      {/* Log-it sheet */}
      <Sheet open={shipOpen} onOpenChange={setShipOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Call it shipped</SheetTitle>
            <SheetDescription>
              Scrappy counts. Ugly counts. Used once by one person counts.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 pt-4">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void logShip();
              }}
              placeholder="What did you ship? (optional, one line)"
              aria-label="What did you ship?"
            />
            <Button size="lg" className="w-full" onClick={() => void logShip()} disabled={logging}>
              {logging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log it
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Next-build sheet */}
      <Sheet open={nextOpen} onOpenChange={setNextOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Build your next one</SheetTitle>
            <SheetDescription>
              Describe the next repetitive thing a tool should be doing for you.{" "}
              {buildsRemaining} build{buildsRemaining === 1 ? "" : "s"} left on your pass.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 pt-4">
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Talk it through: the steps, the tools, how often..."
              className="min-h-[110px] resize-none text-sm"
              aria-label="Describe your next workflow"
            />
            {nextError && <p className="text-sm text-destructive">{nextError}</p>}
            <Button
              size="lg"
              className="w-full"
              onClick={() => void buildNext()}
              disabled={building || transcript.trim().length < 20}
            >
              {building && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Build it
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Celebration: accent flood + springing check, no extra deps */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-accent"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.92, 0] }}
              transition={{ duration: 1.4, times: [0, 0.25, 1], ease: "easeOut" }}
            />
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: [0, 1.15, 1], rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="relative"
            >
              <CheckCircle2 className="h-24 w-24 text-white drop-shadow-lg" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
