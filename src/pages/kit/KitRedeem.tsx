import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Hammer, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KitPortalLayout } from "@/components/kit/KitPortalLayout";
import { useAuth } from "@/hooks/useAuth";
import { getPreset, getPresetByCodePrefix } from "@/content/kits";
import { emitKitEvent } from "@/lib/track";
import { invokeKit, readKitHint, writeKitHint } from "@/lib/kit";

interface RedeemResponse {
  result?: "ok" | "invalid" | "expired";
  redemption?: {
    id: string;
    class_slug: string;
    preset_version: string;
    expires_at: string;
    skill_quota: number;
    skills_used: number;
  };
  maven_url?: string;
  class_slug?: string;
  rate_limited?: boolean;
}

type Phase =
  | { name: "entry"; message?: string }
  | { name: "redeeming" }
  | { name: "expired"; mavenUrl: string | null };

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

/**
 * The front door of the Kit Engine. A student scans a QR mid-class, lands
 * here with ?code=, and the page renders instantly with optimistic class
 * branding while the anonymous session boots and the redeem fires itself.
 */
export default function KitRedeem() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCode = (searchParams.get("code") ?? "").trim().toUpperCase();

  const { isLoading, isAuthenticated, hasSession, createAnonymousSession } = useAuth();
  const anonStarted = useRef(false);
  const autoRedeemStarted = useRef(false);

  const [codeInput, setCodeInput] = useState(urlCode);
  const [phase, setPhase] = useState<Phase>(urlCode ? { name: "redeeming" } : { name: "entry" });
  const hint = useMemo(readKitHint, []);

  // Optimistic branding from the code prefix, before redeem resolves.
  const preset = getPresetByCodePrefix(codeInput || urlCode);

  // Ensure a session (anonymous is fine) so the redeem is attributable.
  // Never blocks the page (BuildLap idiom).
  useEffect(() => {
    if (isLoading || hasSession || isAuthenticated || anonStarted.current) return;
    anonStarted.current = true;
    createAnonymousSession().catch(() => {
      anonStarted.current = false;
    });
  }, [isLoading, hasSession, isAuthenticated, createAnonymousSession]);

  const redeem = useCallback(
    async (code: string) => {
      setPhase({ name: "redeeming" });
      const { payload, errorMessage } = await invokeKit<RedeemResponse>("kit-redeem", { code });

      if (payload?.result === "ok" && payload.redemption) {
        writeKitHint({
          code,
          redemption_id: payload.redemption.id,
          class_slug: payload.redemption.class_slug,
        });
        emitKitEvent("kit_redeemed", {
          class_slug: payload.redemption.class_slug,
          code,
          redemption_id: payload.redemption.id,
        });
        navigate("/kit/me/intake");
        return;
      }

      if (payload?.result === "expired") {
        const slugPreset = payload.class_slug ? getPreset(payload.class_slug) : null;
        setPhase({
          name: "expired",
          mavenUrl: payload.maven_url ?? slugPreset?.mavenUrl ?? null,
        });
        return;
      }

      if (payload?.rate_limited) {
        setPhase({
          name: "entry",
          message: "Too many tries. Give it a minute, then enter the code again.",
        });
        return;
      }

      setPhase({
        name: "entry",
        message:
          payload?.result === "invalid"
            ? "That code did not match a class. Check the slide and try again."
            : (errorMessage ?? "Something went wrong. Try again."),
      });
    },
    [navigate],
  );

  // Auto-redeem the URL code once a session exists.
  useEffect(() => {
    if (!urlCode || autoRedeemStarted.current || !hasSession) return;
    autoRedeemStarted.current = true;
    void redeem(urlCode);
  }, [urlCode, hasSession, redeem]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4 || phase.name === "redeeming") return;
    void redeem(code);
  };

  return (
    <KitPortalLayout classTitle={preset?.classTitle ?? null}>
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.08 }}
        className="space-y-8"
      >
        {/* Class branding: instant, optimistic, calm. */}
        <motion.div variants={fadeUp} className="space-y-3 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Ticket className="h-3.5 w-3.5" />
            {preset ? preset.classTitle : "Class follow-up"}
          </div>
          <h1 className="kit-headline text-3xl sm:text-4xl">
            {preset ? preset.title : "Your class kit"}
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            {preset ? preset.tagline : "Built from what you said in class, ready in minutes."}
          </p>
        </motion.div>

        {phase.name === "redeeming" && (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center gap-3 py-10 text-center"
          >
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Checking your code...</p>
          </motion.div>
        )}

        {phase.name === "entry" && (
          <motion.form variants={fadeUp} onSubmit={submit} className="mx-auto max-w-sm space-y-3">
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="CLASS-CODE"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Class code"
              className="h-14 text-center text-xl font-semibold uppercase tracking-[0.18em]"
            />
            <p className="text-center text-sm text-muted-foreground">
              Your code is on the class slide
            </p>
            {phase.message && (
              <p role="alert" className="text-center text-sm text-destructive">
                {phase.message}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={codeInput.trim().length < 4}
            >
              Open my kit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.form>
        )}

        {phase.name === "expired" && (
          <motion.div
            variants={fadeUp}
            className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center"
          >
            <h2 className="text-xl font-semibold tracking-tight">This class code has ended</h2>
            <p className="text-sm text-muted-foreground">
              Codes live for the class run and a little after. The work does not stop here
              though, you have two good moves.
            </p>
            <div className="space-y-2">
              {phase.mavenUrl && (
                <Button asChild size="lg" className="w-full">
                  <a href={phase.mavenUrl} target="_blank" rel="noopener noreferrer">
                    Catch the next class
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate("/build")}
              >
                <Hammer className="mr-2 h-4 w-4" />
                Build a free kit anyway
              </Button>
            </div>
          </motion.div>
        )}

        {hint && phase.name !== "expired" && (
          <motion.div variants={fadeUp} className="text-center">
            <button
              type="button"
              onClick={() => navigate("/kit/me")}
              className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Already have a kit? Open it
            </button>
          </motion.div>
        )}
      </motion.div>
    </KitPortalLayout>
  );
}
