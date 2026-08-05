import { useRef } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileText,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillInstallGuide } from "@/components/edge/SkillInstallGuide";
import { SkillDelivery } from "@/components/skill/SkillDelivery";
import type { BuiltYourWayChip } from "./automatorModel";
import type { SkillData, SkillQualityGate, SkillReleaseBlock } from "@/types/skill";

/**
 * AutomatorSkillReady - screen 3 of the Build-a-skill flow.
 *
 * The payoff: a check + "Your skill is ready", a skill card with "Built your
 * way" chips reflecting the cascade choices, then the honest delivery block
 * (SkillDelivery: where this stands, one trigger phrase to try, and the action
 * this device can actually finish), the install steps, a "Saved to Your skills"
 * library peek, and a "Build another skill" nudge.
 *
 * The delivery block is deliberately not a badge and not a "Run it now": the
 * package is a file until someone installs it, and this screen is where
 * pretending otherwise would be cheapest and most expensive.
 *
 * Mock: prototypes/skill-ready.html. Tokens only; emerald accent.
 */

/** A library tile - the just-built skill (isNew) plus the leader's others. */
export interface LibraryPeekItem {
  id: string;
  /** Short label, e.g. "Discovery -> proposal". */
  label: string;
}

interface AutomatorSkillReadyProps {
  skill: SkillData;
  /** "Built your way" chips from the cascade picks. */
  chips: BuiltYourWayChip[];
  /** A plain-language one-liner describing what the skill does, in their voice. */
  whatItDoes: string;
  /** The library peek - the new skill is always first (isNew). */
  library: LibraryPeekItem[];
  /**
   * The quality gate computed at generation. Advisory findings render as a
   * quiet list so the leader can decide whether to rebuild; it was previously
   * computed, persisted, returned, and never shown.
   */
  qualityGate?: SkillQualityGate | null;
  /**
   * The release block from the build. Absent means no measurement was recorded,
   * which renders as Draft with the sentence saying so - never as a blank space
   * a reader fills in optimistically.
   */
  release?: SkillReleaseBlock | null;
  onRun: () => void;
  onExport: () => void;
  onSeeAll: () => void;
  onBuildAnother: () => void;
  animated?: boolean;
}

export function AutomatorSkillReady({
  skill,
  chips,
  whatItDoes,
  library,
  qualityGate,
  release,
  onRun,
  onExport: _onExport,
  onSeeAll,
  onBuildAnother,
  animated = true,
}: AutomatorSkillReadyProps) {
  const advisories = (qualityGate?.checks ?? []).filter((c) => !c.passed);
  const installRef = useRef<HTMLDivElement | null>(null);
  // Friendly display name: the generated skill name is lowercase-hyphenated, so
  // present the candidate's words where we have them (passed via whatItDoes is
  // the verb; the name shown here is the skill.name humanised).
  const displayName = humaniseSkillName(skill.name);

  return (
    <div className="space-y-4">
      {/* Done banner */}
      <motion.div
        className="pt-1 text-center"
        initial={animated ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <span className="mx-auto mb-3.5 grid h-[52px] w-[52px] place-items-center rounded-full border border-accent/30 bg-accent/[0.08] text-accent glow-accent-sm">
          <Check className="h-[26px] w-[26px]" strokeWidth={2.4} />
        </span>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
          Your skill is ready.
        </h1>
        <p className="mx-auto mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground">
          Built from your answers in under a minute. It works the way you do, in
          your voice.
        </p>
      </motion.div>

      {/* Skill card */}
      <div className="rounded-[18px] border border-accent/30 bg-[linear-gradient(180deg,#101c18,#0a0f12)] p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-accent text-accent-foreground">
            <FileText className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 text-[16px] font-bold tracking-[-0.01em] text-foreground">
            {displayName}
          </span>
        </div>
        <p className="m-0 text-[12.5px] leading-relaxed text-muted-foreground">
          {whatItDoes}
        </p>

        {chips.length > 0 && (
          <>
            <div className="mb-2 mt-3.5 text-[9px] font-semibold uppercase tracking-[0.07em] text-accent/80">
              &#9679; Built your way
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip.key}
                  className="rounded-[7px] border border-border bg-background/60 px-2.5 py-1 text-[10.5px] font-medium text-foreground/90"
                >
                  <span className="mr-1 font-semibold text-accent">
                    {chip.key}:
                  </span>
                  {chip.value}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Advisory quality findings - honest, quiet, never blocking */}
      {advisories.length > 0 && (
        <div className="rounded-[14px] border border-amber-500/25 bg-amber-500/[0.05] p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            {advisories.length} thing{advisories.length === 1 ? "" : "s"} worth a look
          </div>
          <ul className="space-y-1">
            {advisories.slice(0, 4).map((c) => (
              <li key={c.id} className="text-[11.5px] leading-snug text-muted-foreground">
                {c.label}
                {c.detail ? <span className="text-muted-foreground/60"> - {c.detail}</span> : null}
              </li>
            ))}
            {advisories.length > 4 && (
              <li className="text-[11px] text-muted-foreground/60">
                and {advisories.length - 4} more
              </li>
            )}
          </ul>
          <p className="mt-1.5 text-[10.5px] text-muted-foreground/60">
            The skill still works. Rebuild if any of these matter to you.
          </p>
        </div>
      )}

      {/* Where it stands, one thing to try, and the action this device can
          finish. The skill is never described as live because it was built. */}
      <SkillDelivery
        skillName={skill.name}
        release={release}
        testPrompts={skill.test_prompts}
        onDownload={onRun}
        onInstall={() =>
          installRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      {/* How to install - readable BEFORE downloading, no unzip required */}
      <div ref={installRef}>
        <SkillInstallGuide skillName={skill.name} />
      </div>

      {/* Saved to Your skills - library peek */}
      <div className="rounded-[16px] border border-border bg-card p-[15px]">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[13px] font-bold text-foreground">
            Saved to <span className="text-accent">Your skills</span>
          </span>
          <button
            type="button"
            onClick={onSeeAll}
            className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent"
          >
            See all
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex gap-2.5">
          {library.slice(0, 3).map((item, i) => {
            const isNew = i === 0;
            return (
              <div
                key={item.id}
                className={cn(
                  "min-w-0 flex-1 rounded-[11px] border p-2.5 text-center",
                  isNew
                    ? "border-accent/30 bg-accent/[0.06]"
                    : "border-border bg-background/60",
                )}
              >
                <span
                  className={cn(
                    "mx-auto mb-2 grid h-6 w-6 place-items-center rounded-[7px]",
                    isNew
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <span
                  className={cn(
                    "block text-[9.5px] leading-tight",
                    isNew ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Build another */}
      <button
        type="button"
        onClick={onBuildAnother}
        className="mx-auto flex items-center justify-center gap-1.5 py-1 text-[13px] font-semibold text-foreground/90 transition-colors hover:text-foreground"
      >
        <Plus className="h-4 w-4 text-accent" />
        Build another skill
      </button>
    </div>
  );
}

/** Turn "writing-board-updates" into "Writing board updates" for display. */
function humaniseSkillName(name: string): string {
  const spaced = (name || "").replace(/-/g, " ").trim();
  if (!spaced) return "Your new skill";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
