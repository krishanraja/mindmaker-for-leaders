import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  ChevronRight,
  FileText,
  Layers,
  MessageSquare,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AutomatorArchetype,
  DeliverableCandidate,
} from "./automatorModel";

/**
 * AutomatorSuggestions - screen 1 of the Build-a-skill flow.
 *
 * "Pick something you do over and over." Shows 3-4 concrete RECURRING
 * DELIVERABLE candidates (mined from the brain or curated by role), each with a
 * "why we picked this" reason and effort/frequency chips, a "pulled from your
 * brain" badge when any are mined, plus a "Something else" escape hatch.
 *
 * Mock: prototypes/automator-v1.html. Tokens only; emerald accent.
 */

interface AutomatorSuggestionsProps {
  candidates: DeliverableCandidate[];
  loading: boolean;
  hasMined: boolean;
  onPick: (candidate: DeliverableCandidate) => void;
  onCustomDeliverable: (name: string) => void;
  animated?: boolean;
}

const ARCHETYPE_ICON: Record<AutomatorArchetype, typeof FileText> = {
  report: FileText,
  proposal: MessageSquare,
  summary: Layers,
  outreach: MessageSquare,
  custom: FileText,
};

export function AutomatorSuggestions({
  candidates,
  loading,
  hasMined,
  onPick,
  onCustomDeliverable,
  animated = true,
}: AutomatorSuggestionsProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const canBuild = customName.trim().length >= 3;
  const submitCustom = () => {
    if (canBuild) onCustomDeliverable(customName.trim());
  };
  return (
    <div className="space-y-4">
      {/* Intro */}
      <div>
        <h1 className="text-balance text-[21px] font-bold leading-tight tracking-[-0.02em] text-foreground">
          Pick something you do over and over.
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
          CTRL will learn how you do it, then write you an agent that does it for
          you. Start with one of these - they come from what CTRL knows about
          your work.
        </p>
      </div>

      {/* Mined badge - only when at least one candidate came from the brain */}
      {hasMined && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.08] px-2.5 py-1 text-[10.5px] font-semibold text-accent">
          <Brain className="h-3 w-3" />
          Pulled from your brain
        </span>
      )}

      {/* Candidate list */}
      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[104px] rounded-[16px] border border-border bg-card/60 skeleton-shimmer"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {candidates.map((c, i) => {
            const Icon = ARCHETYPE_ICON[c.archetype];
            const isTop = i === 0;
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => onPick(c)}
                initial={animated ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: animated ? i * 0.05 : 0, duration: 0.2 }}
                className={cn(
                  "group flex items-start gap-3.5 rounded-[16px] border p-[15px] text-left transition-colors",
                  isTop
                    ? "border-accent/30 bg-[linear-gradient(180deg,#101c18,#0a0f12)]"
                    : "border-border bg-card hover:border-accent/30",
                )}
              >
                {/* Leading glyph - emerald disc (the offered deliverable) */}
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border border-accent/30 bg-accent/[0.08] text-accent">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-balance text-[15.5px] font-bold leading-snug tracking-[-0.01em] text-foreground">
                    {c.title}
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-muted-foreground">
                    <span className="font-semibold text-accent">{c.reasonLead}</span>
                    {c.reasonRest}
                  </span>
                  <span className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-[6px] border border-border px-[7px] py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      {c.effortChip}
                    </span>
                    <span className="rounded-[6px] border border-border px-[7px] py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      {c.frequencyChip}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-accent">
                      Build this
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Something else - reveals a clean inline input (no native prompt) */}
      {!showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="flex w-full items-center gap-3 rounded-[14px] border border-dashed border-border p-[14px] text-left transition-colors hover:border-accent/40"
        >
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] border border-border text-muted-foreground">
            <Plus className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-foreground">Something else</span>
            <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
              Name a task you repeat and we will build it together.
            </span>
          </span>
          <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" />
        </button>
      ) : (
        <div className="rounded-[14px] border border-accent/30 bg-card p-[14px]">
          <label className="mb-2 block text-[12px] font-semibold text-foreground">What do you do over and over?</label>
          <input
            autoFocus
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCustom();
            }}
            placeholder="e.g. my weekly investor update"
            className="w-full rounded-[10px] border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCustom(false);
                setCustomName("");
              }}
              className="rounded-[10px] border border-border px-3.5 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canBuild}
              onClick={submitCustom}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2.5 text-[14px] font-bold text-accent-foreground transition-opacity disabled:opacity-40"
            >
              Build this <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <p className="px-2 text-center text-[11px] leading-relaxed text-muted-foreground/70">
        Suggested from what CTRL knows about your work and role. The more it
        learns about you, the sharper these get.
      </p>
    </div>
  );
}
