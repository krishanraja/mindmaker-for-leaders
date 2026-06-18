import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { useUserPains } from "@/hooks/useUserPains";
import type { SkillSeed } from "@/types/skill";

/**
 * Edge view entry for the Skill Builder. Skill building is free for now, so
 * every leader gets the automatable pain chips that seed the Automator plus a
 * build-from-scratch path. Tap a chip -> /context opens the Automator
 * pre-anchored in the leader's own words.
 */
export function AutomatePainCard() {
  const navigate = useNavigate();
  const { pains, loading } = useUserPains(4);

  const openBuilder = (seed?: SkillSeed) => {
    navigate("/context", {
      state: seed?.text
        ? { seed, openSkillBuilder: true }
        : { openSkillBuilder: true },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-card to-accent/[0.03] p-4 space-y-3"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent/15">
          <Zap className="w-4 h-4 text-accent" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Automate a recurring pain
          </h3>
          <p className="text-xs text-muted-foreground leading-snug">
            Tap a concrete pain. CTRL opens the Automator pre-anchored in your words.
          </p>
        </div>
      </div>

      {!loading && pains.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pains.map((pain) => (
            <button
              key={`${pain.kind}-${pain.fact_id ?? pain.decision_id ?? pain.text.slice(0, 12)}`}
              type="button"
              onClick={() => openBuilder(pain)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-accent/25 bg-accent/[0.08] text-foreground hover:border-accent/40 hover:bg-accent/[0.12] transition-colors max-w-full"
            >
              <Zap className="w-3 h-3 text-accent shrink-0" />
              <span className="truncate">{pain.label || pain.text.slice(0, 36)}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => openBuilder()}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-dashed border-accent/30 hover:border-accent/50 hover:bg-accent/5 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">Build from scratch</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Pick a deliverable from your brain or name your own.
          </p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </button>
    </motion.div>
  );
}
