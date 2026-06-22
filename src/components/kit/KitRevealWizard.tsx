import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Download, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { KitPreset } from "@/content/kits";
import type { KitArtifactRow, KitMap, KitPlanDay, KitRedemptionRow } from "@/lib/kit";
import type { KitTool } from "@/content/kits";
import type { OrgChart } from "@/components/kit/OrgChartView";
import {
  KitBack,
  KitEyebrow,
  KitGhostButton,
  KitHeadline,
  KitLinkish,
  KitPrimaryButton,
  KitSub,
} from "@/components/kit/kitPrimitives";
import { KitWhatsInside, type WhatsInsideFile } from "@/components/kit/KitWhatsInside";
import { OrgChartView } from "@/components/kit/OrgChartView";
import { PersonalMapCard } from "@/components/kit/PersonalMapCard";
import { SevenDayPlan } from "@/components/kit/SevenDayPlan";
import { ShipSection } from "@/components/kit/ShipSection";
import { SendPackCard } from "@/components/kit/SendPackCard";
import { KitVoiceProfileCard } from "@/components/kit/KitVoiceProfileCard";

/**
 * The post-build reveal wizard (spec 2.5, Part 2): replaces the long additive
 * reveal scroll with one action per screen. An internal step machine inside
 * /kit/me (state, not routes), with Back / advance and AnimatePresence
 * transitions exactly like the intake.
 *
 * Screens, advance through:
 *   reveal  -> the hero (PDF card for vibe; OrgChartView for orgchart; the map
 *              card for picks kits). Two actions: Download PDF + See what's inside.
 *   inside  -> the file list, two buttons per file (Download / Copy). Mobile is a
 *              clean one-screen list; desktop also keeps it in the right pane.
 *   voice   -> "Make it sound like you" (KitVoiceProfileCard). Primary opens the
 *              voice sheet (does something other than proceed), so it earns a skip.
 *   keepit  -> Email by default (SendPackCard), profile a quiet one-time upsell.
 *   plan    -> the 7-day plan checklist (SevenDayPlan).
 *   ship    -> the calm celebratory "I shipped it" screen (ShipSection).
 *
 * Skip rule (per spec): only screens whose primary does something OTHER than
 * proceed get an explicit "skip" affordance (voice). Homework-style "primary
 * already proceeds" screens (keep-it, plan, ship) advance with the primary and
 * carry no separate skip.
 */

type Step = "reveal" | "inside" | "voice" | "keepit" | "plan" | "ship";

const STEP_ORDER: Step[] = ["reveal", "inside", "voice", "keepit", "plan", "ship"];

export interface KitRevealWizardProps {
  preset: KitPreset;
  redemption: KitRedemptionRow;
  tool: KitTool;
  toolName: string;
  /** The hero title (skill name or preset title). */
  heroTitle: string;
  heroSubtitle: string;
  /** The kit-specific hero render. */
  orgChart: OrgChart | null;
  kitMap: KitMap | null;
  planDays: KitPlanDay[] | null;
  testPrompt: string | null;
  /** The two-button file list (built from real artifacts in the parent). */
  files: WhatsInsideFile[];
  buildsRemaining: number;
  journey: { checkedDays: Record<number, boolean>; shippedAt: string | null };
  /** "Download PDF" opens the print route. */
  onOpenPdf: () => void;
  onToggleDay: (day: number, next: boolean) => void;
  onLogShip: (note: string) => Promise<boolean>;
  onNewSkillStarted: (buildId: string) => void;
  onQuotaExhausted: () => void;
  onEmailSent: () => void;
  /** Quiet escape hatch: open the Tune sheet (never a primary action). */
  onTune: () => void;
  /** The pass-expiry footer line (surfaced quietly on keep-it). */
  passFooter: string;
  /** When the pass is expired/forced, the quiet upgrade slot under keep-it. */
  edgeProSlot?: React.ReactNode;
}

export function KitRevealWizard(props: KitRevealWizardProps) {
  const {
    preset,
    redemption,
    tool,
    toolName,
    heroTitle,
    heroSubtitle,
    orgChart,
    kitMap,
    planDays,
    testPrompt,
    files,
    buildsRemaining,
    journey,
    onOpenPdf,
    onToggleDay,
    onLogShip,
    onNewSkillStarted,
    onQuotaExhausted,
    onEmailSent,
    onTune,
    passFooter,
    edgeProSlot,
  } = props;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const step = STEP_ORDER[stepIndex];

  const advance = () => {
    if (stepIndex >= STEP_ORDER.length - 1) return;
    setDirection(1);
    setStepIndex((i) => i + 1);
  };
  const back = () => {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((i) => i - 1);
  };

  // The desktop right pane shows "What's inside" from the reveal onward (the
  // living panel idea, spec 2.7). On mobile this pane is hidden; the "inside"
  // screen carries the same list.
  const showAside = step !== "ship";

  return (
    <div className="kit-portal" data-testid="kit-reveal-wizard">
      <div
        className={
          showAside
            ? "grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-8"
            : "mx-auto max-w-xl"
        }
      >
        {/* Right pane: What's inside (desktop only). */}
        {showAside && (
          <aside className="order-last hidden md:sticky md:top-4 md:block">
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "linear-gradient(180deg,#FBFDFB,#F4F7F3)",
                borderColor: "var(--kit-line)",
                boxShadow: "0 1px 2px rgba(16,28,30,.05)",
              }}
            >
              <KitWhatsInside files={files} toolName={toolName} />
            </div>
          </aside>
        )}

        <section className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
            >
              {step === "reveal" && (
                <RevealScreen
                  preset={preset}
                  heroTitle={heroTitle}
                  heroSubtitle={heroSubtitle}
                  toolName={toolName}
                  orgChart={orgChart}
                  kitMap={kitMap}
                  onOpenPdf={onOpenPdf}
                  onAdvance={advance}
                />
              )}

              {step === "inside" && (
                <InsideScreen
                  files={files}
                  toolName={toolName}
                  onBack={back}
                  onAdvance={advance}
                  onTune={onTune}
                />
              )}

              {step === "voice" && (
                <VoiceScreen preset={preset} onBack={back} onAdvance={advance} />
              )}

              {step === "keepit" && (
                <KeepItScreen
                  redemption={redemption}
                  tool={tool}
                  onEmailSent={onEmailSent}
                  onBack={back}
                  onAdvance={advance}
                  passFooter={passFooter}
                  edgeProSlot={edgeProSlot}
                />
              )}

              {step === "plan" && (
                <PlanScreen
                  planDays={planDays}
                  checkedDays={journey.checkedDays}
                  testPrompt={testPrompt}
                  onToggleDay={onToggleDay}
                  onBack={back}
                  onAdvance={advance}
                />
              )}

              {step === "ship" && (
                <ShipScreen
                  redemption={redemption}
                  shippedAt={journey.shippedAt}
                  buildsRemaining={buildsRemaining}
                  onLogShip={onLogShip}
                  onNewSkillStarted={onNewSkillStarted}
                  onQuotaExhausted={onQuotaExhausted}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* (a) REVEAL                                                          */
/* ------------------------------------------------------------------ */

function RevealScreen({
  preset,
  heroTitle,
  heroSubtitle,
  toolName,
  orgChart,
  kitMap,
  onOpenPdf,
  onAdvance,
}: {
  preset: KitPreset;
  heroTitle: string;
  heroSubtitle: string;
  toolName: string;
  orgChart: OrgChart | null;
  kitMap: KitMap | null;
  onOpenPdf: () => void;
  onAdvance: () => void;
}) {
  return (
    <div data-testid="kit-reveal" className="flex flex-col">
      <KitEyebrow className="text-center">Your kit is ready</KitEyebrow>

      {/* The kit-specific hero. orgchart -> the live chart; picks kits with a
          map -> the personal map card; everything else (vibe) -> the branded
          dark hero PDF card. */}
      {preset.slug === "orgchart" && orgChart ? (
        <div className="mt-1">
          <OrgChartView chart={orgChart} />
        </div>
      ) : kitMap && preset.slug !== "vibe-coding" ? (
        <div className="mt-1">
          <PersonalMapCard map={kitMap} />
        </div>
      ) : (
        <HeroPdfCard title={heroTitle} name={heroTitle} toolName={toolName} />
      )}

      <h1
        className="mt-5 text-center text-[20px] font-extrabold lowercase"
        style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em", color: "var(--kit-ink)" }}
      >
        {heroTitle}
      </h1>
      <p className="mx-auto mt-2 max-w-[42ch] text-center text-[14.5px]" style={{ color: "var(--kit-mut)" }}>
        {heroSubtitle}
      </p>

      <div className="mt-6 flex gap-2.5">
        <KitGhostButton onClick={onOpenPdf}>
          <Download className="h-4 w-4" />
          Download PDF
        </KitGhostButton>
        <KitPrimaryButton onClick={onAdvance}>
          See what's inside
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>
    </div>
  );
}

/** The branded dark hero PDF card, a literal port of the mock's `.pdf`. */
function HeroPdfCard({ title, name, toolName }: { title: string; name: string; toolName: string }) {
  return (
    <div
      className="relative mx-auto mt-3 overflow-hidden rounded-[14px] p-[18px_16px]"
      style={{
        width: 230,
        aspectRatio: "1 / 1.3",
        background: "linear-gradient(160deg,#16302e,#0c1f1d)",
        color: "#eafaf4",
        boxShadow: "0 30px 60px -24px rgba(10,158,132,.55), 0 0 0 1px rgba(255,255,255,.06)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-[-50px] top-[-40px] h-40 w-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(42,158,124,.5), transparent 70%)" }}
      />
      <div
        className="text-[8.5px] uppercase"
        style={{ fontFamily: "var(--kit-display)", letterSpacing: "0.12em", color: "#7fe6c8" }}
      >
        {title}
      </div>
      <h3 className="mt-2 text-[17px] font-extrabold leading-[1.12]" style={{ letterSpacing: "-0.02em" }}>
        {name}
      </h3>
      <div className="mt-[7px] h-[5px] w-[84%] rounded" style={{ background: "rgba(255,255,255,.1)" }} />
      <div className="mt-[7px] h-[5px] w-[62%] rounded" style={{ background: "rgba(255,255,255,.1)" }} />
      <div className="mt-[7px] h-[5px] w-[84%] rounded" style={{ background: "rgba(255,255,255,.1)" }} />
      <div className="absolute bottom-4 left-4 right-4 text-[9.5px]" style={{ color: "#a7c8bf" }}>
        Ready for any AI platform. Copy any file into {toolName}.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* (a.2) INSIDE (the file list; mobile one-screen, desktop also aside) */
/* ------------------------------------------------------------------ */

function InsideScreen({
  files,
  toolName,
  onBack,
  onAdvance,
  onTune,
}: {
  files: WhatsInsideFile[];
  toolName: string;
  onBack: () => void;
  onAdvance: () => void;
  onTune: () => void;
}) {
  return (
    <div>
      <KitEyebrow>Your files</KitEyebrow>
      <KitHeadline>Everything's in here.</KitHeadline>
      <KitSub>
        Two buttons per file. Download it, or copy it straight into {toolName}. Nothing to read on
        screen.
      </KitSub>

      <div className="mt-4">
        <KitWhatsInside files={files} toolName={toolName} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <KitBack onClick={onBack} />
        <KitPrimaryButton onClick={onAdvance}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>

      {/* Tune: the quiet escape hatch (never a primary action). */}
      <button
        type="button"
        onClick={onTune}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[12.5px] font-semibold"
        style={{ color: "var(--kit-faint)" }}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Not quite right? Redo a file
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* (b) VOICE                                                          */
/* ------------------------------------------------------------------ */

function VoiceScreen({
  preset,
  onBack,
  onAdvance,
}: {
  preset: KitPreset;
  onBack: () => void;
  onAdvance: () => void;
}) {
  const pitch = useMemo(() => {
    switch (preset.slug) {
      case "orgchart":
        return "The agents you stand up from your chart will write in your voice, not generic AI.";
      case "memory-identity":
        return "Your CTRL memory and the skills you build will speak in your voice.";
      case "vibe-coding":
        return "The skills you ship from CTRL will read in your voice.";
      case "autonomous-business":
        return "The automations you build in CTRL will sound like you, not a robot.";
      default:
        return undefined;
    }
  }, [preset.slug]);

  return (
    <div>
      <KitEyebrow>Make it sound like you</KitEyebrow>
      <KitHeadline>Want it to write in your voice?</KitHeadline>
      <KitSub>
        Five quick taps, or paste a paragraph you wrote. The skills you ship will read like you, not
        like a robot.
      </KitSub>

      <div className="mt-4">
        {/* The primary action lives inside this card (opens the voice sheet),
            which is why this screen earns an explicit "Maybe later" skip. */}
        <KitVoiceProfileCard pitch={pitch} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <KitBack onClick={onBack} />
        <KitPrimaryButton onClick={onAdvance}>
          Maybe later
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* (c) KEEP-IT (email default; profile a quiet one-time upsell)        */
/* ------------------------------------------------------------------ */

function KeepItScreen({
  redemption,
  tool,
  onEmailSent,
  onBack,
  onAdvance,
  passFooter,
  edgeProSlot,
}: {
  redemption: KitRedemptionRow;
  tool: KitTool;
  onEmailSent: () => void;
  onBack: () => void;
  onAdvance: () => void;
  passFooter: string;
  edgeProSlot?: React.ReactNode;
}) {
  return (
    <div>
      <KitEyebrow>Keep your kit</KitEyebrow>
      <KitHeadline>Where should we send it?</KitHeadline>
      <KitSub>
        Your kit, the PDF, and your training files (ready for any AI) in one email with instructions.
      </KitSub>

      <div className="mt-4">
        {/* Email is the zero-friction default; the waitlist join (the app is not
            in production yet) is the quiet follow-on, never pushed. */}
        <SendPackCard
          redemption={redemption}
          tool={tool}
          onSent={() => {
            onEmailSent();
            toast.success("On its way. You can keep going.");
          }}
        />
      </div>

      {/* The pass-expiry upgrade, surfaced quietly here (not a competing card). */}
      {edgeProSlot && <div className="mt-3">{edgeProSlot}</div>}

      <div className="mt-5 flex items-center gap-3">
        <KitBack onClick={onBack} />
        <KitPrimaryButton onClick={onAdvance}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>

      <p className="mt-3 text-center text-[11px]" style={{ color: "var(--kit-faint)" }}>
        {passFooter} Your kit stays viewable and downloadable forever.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* (d) PLAN                                                            */
/* ------------------------------------------------------------------ */

function PlanScreen({
  planDays,
  checkedDays,
  testPrompt,
  onToggleDay,
  onBack,
  onAdvance,
}: {
  planDays: KitPlanDay[] | null;
  checkedDays: Record<number, boolean>;
  testPrompt: string | null;
  onToggleDay: (day: number, next: boolean) => void;
  onBack: () => void;
  onAdvance: () => void;
}) {
  return (
    <div>
      <KitEyebrow>Your week</KitEyebrow>
      <KitHeadline>Thirty minutes a day. Day 1 is tonight.</KitHeadline>

      <div className="mt-4">
        {planDays ? (
          <SevenDayPlan
            days={planDays}
            checkedDays={checkedDays}
            onToggle={onToggleDay}
            testPrompt={testPrompt}
          />
        ) : (
          <p className="text-[14px]" style={{ color: "var(--kit-mut)" }}>
            Your plan is in your kit files and your email. Open day 1 tonight.
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <KitBack onClick={onBack} />
        <KitPrimaryButton onClick={onAdvance}>
          Got it
          <ArrowRight className="ml-2 h-4 w-4" />
        </KitPrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* (e) SHIP                                                            */
/* ------------------------------------------------------------------ */

function ShipScreen({
  redemption,
  shippedAt,
  buildsRemaining,
  onLogShip,
  onNewSkillStarted,
  onQuotaExhausted,
}: {
  redemption: KitRedemptionRow;
  shippedAt: string | null;
  buildsRemaining: number;
  onLogShip: (note: string) => Promise<boolean>;
  onNewSkillStarted: (buildId: string) => void;
  onQuotaExhausted: () => void;
}) {
  return (
    <div className="text-center">
      <div
        className="mx-auto flex h-[62px] w-[62px] items-center justify-center rounded-full"
        style={{
          background: "var(--kit-acc-soft)",
          border: "1px solid var(--kit-acc-line)",
          color: "var(--kit-acc-deep)",
        }}
      >
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <KitHeadline className="mt-4 text-center">That's your kit. It is yours now.</KitHeadline>
      <KitSub className="mx-auto text-center">
        Build the scrappy version tonight. When it runs, come back and tell us.
      </KitSub>

      <div className="mt-6">
        <ShipSection
          redemption={redemption}
          shippedAt={shippedAt}
          buildsRemaining={buildsRemaining}
          onLogShip={onLogShip}
          onNewSkillStarted={onNewSkillStarted}
          onQuotaExhausted={onQuotaExhausted}
        />
      </div>
    </div>
  );
}
