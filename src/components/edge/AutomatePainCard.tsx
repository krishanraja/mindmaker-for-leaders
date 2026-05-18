import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Lock, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomatePainCardProps {
  isPaidUser: boolean;
  onUpgrade: () => void;
}

/**
 * Edge view entry point for the Skill Builder. Voice-first CTA only - the
 * pain-chip variant was removed because it surfaced strategic blockers from
 * user_memory (e.g. "Retention Challenge") that aren't realistically
 * automatable. Concrete pain selection now lives inside SkillCaptureSheet
 * itself, sourced from the same useUserPains hook.
 *
 * Tap → navigate('/context', { state: { openSkillBuilder: true } }) where
 * ContextExport opens SkillCaptureSheet unseeded in voice-first mode.
 */
export function AutomatePainCard({ isPaidUser, onUpgrade }: AutomatePainCardProps) {
  const navigate = useNavigate();

  const handleTap = () => {
    if (!isPaidUser) {
      onUpgrade();
      return;
    }
    navigate("/context", { state: { openSkillBuilder: true } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        "rounded-2xl border p-4 space-y-3",
        isPaidUser
          ? "border-accent/20 bg-gradient-to-br from-accent/5 via-card to-amber-500/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
            isPaidUser
              ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
              : "bg-secondary",
          )}>
            {isPaidUser ? (
              <Zap className="w-4 h-4 text-amber-500" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Automate a recurring pain
              </h3>
              {!isPaidUser && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">
                  Pro
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              In about 60 seconds we'll turn it into a Claude skill that runs whenever you say the trigger.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleTap}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-dashed transition-colors text-left",
          isPaidUser
            ? "border-accent/30 hover:border-accent/50 hover:bg-accent/5"
            : "border-border hover:border-foreground/20 hover:bg-foreground/5",
        )}
      >
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Mic className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">
            Voice a recurring pain
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Tap and describe something you do every week.
          </p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </button>
    </motion.div>
  );
}
