import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import type { KitMap } from "@/lib/kit";

/**
 * The capstone card: where they are, what they are building, the path. Built
 * to be screenshot-worthy; their build name carries the accent.
 */
export function PersonalMapCard({ map }: { map: KitMap }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 kit-shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/[0.07]"
      />
      <p className="kit-eyebrow mb-4 flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-accent" />
        Your personal map
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-sm font-medium">
          {map.stage}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xl font-semibold tracking-tight text-accent sm:text-2xl">
          {map.firstBuild}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border px-2.5 py-0.5">
          Building in {map.tool}
        </span>
        <span className="rounded-full border border-border px-2.5 py-0.5">{map.tier}</span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/80">{map.path}</p>
    </motion.div>
  );
}
