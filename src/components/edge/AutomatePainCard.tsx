import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Lock, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTier } from "@/hooks/useTier";
import { useAutomatorQuota } from "@/hooks/useAutomatorQuota";
import { useUserPains } from "@/hooks/useUserPains";
import type { SkillSeed } from "@/types/skill";

interface AutomatePainCardProps {
  onUpgrade: () => void;
}

/**
 * Edge view entry point for the Automator. Surfaces the leader's automatable
 * pains (recurring workflows only - the useUserPains filter excludes
 * strategic-level blockers) as tappable chips. The chips lead with the
 * leader's actual language and seed the Automator's cascade.
 *
 * Tier-aware:
 *   - free with quota remaining: green path -> use the monthly free skill
 *   - free with quota exhausted: upgrade card
 *   - edge_pro: unlimited path -> straight into the Automator
 */
export function AutomatePainCard({ onUpgrade }: AutomatePainCardProps) {
  const navigate = useNavigate();
  const { isEdgePro } = useTier();
  const { used, limit, remaining, canExport, loading: quotaLoading } = useAutomatorQuota();
  const { pains, loading: painsLoading } = useUserPains({ limit: 3, includeAll: false });

  const isExhausted = !isEdgePro && !canExport && !quotaLoading;

  const headline = useMemo(() => {
    if (isEdgePro) return "Build another skill";
    if (isExhausted) return "Upgrade for unlimited Automator skills";
    return "Your free Automator skill this month";
  }, [isEdgePro, isExhausted]);

  const subline = useMemo(() => {
    if (isEdgePro) return "Unlimited on Edge Pro. Voice a pain or pick one of your recurring ones.";
    if (isExhausted)
      return `You used your free skill this month (${used}/${limit}). Edge Pro unlocks unlimited.`;
    return "One free Automator skill per month. Turn a recurring workflow into a Claude skill in 90 seconds.";
  }, [isEdgePro, isExhausted, used, limit]);

  const handleTap = (seed?: SkillSeed) => {
    if (isExhausted) {
      onUpgrade();
      return;
    }
    navigate("/context", { state: { openSkillBuilder: true, seed } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        "rounded-2xl border p-4 space-y-3",
        isExhausted
          ? "border-border bg-card"
          : "border-accent/20 bg-gradient-to-br from-accent/5 via-card to-amber-500/5",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
              isExhausted
                ? "bg-secondary"
                : "bg-gradient-to-br from-amber-500/20 to-orange-500/20",
            )}
          >
            {isExhausted ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : isEdgePro ? (
              <Sparkles className="h-4 w-4 text-amber-500" />
            ) : (
              <Zap className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{headline}</h3>
              {!isEdgePro && !isExhausted && (
                <span className="inline-flex items-center rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  {remaining}/{limit} free
                </span>
              )}
              {isEdgePro && (
                <span className="inline-flex items-center rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  Unlimited
                </span>
              )}
            </div>
            <p className="text-xs leading-snug text-muted-foreground">{subline}</p>
          </div>
        </div>
      </div>

      {pains.length > 0 && !painsLoading && !isExhausted && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recurring pains in your brain
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pains.map((pain) => (
              <button
                key={pain.fact_id ?? pain.decision_id ?? pain.label}
                type="button"
                onClick={() => handleTap(pain)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
              >
                {pain.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => handleTap()}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border-2 border-dashed px-3 py-2.5 text-left transition-colors",
          isExhausted
            ? "border-border hover:border-foreground/20 hover:bg-foreground/5"
            : "border-accent/30 hover:border-accent/50 hover:bg-accent/5",
        )}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Mic className="h-4 w-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">
            {isExhausted ? "Upgrade to Edge Pro" : "Voice a recurring pain"}
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {isExhausted
              ? "$29/mo for unlimited Automator skills, daily briefing and decision engine."
              : "Tap and describe something you do every week."}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      </button>
    </motion.div>
  );
}
