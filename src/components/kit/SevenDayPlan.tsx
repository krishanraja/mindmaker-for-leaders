import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import type { KitPlanDay } from "@/lib/kit";
import { cn } from "@/lib/utils";

/**
 * The 7-day journey checklist. Day 1 opens expanded with the first test
 * prompt so tonight's ten minutes are one tap away. Checks persist through
 * kit_journey_events (latest event per day wins), handled by the parent.
 */
export function SevenDayPlan({
  days,
  checkedDays,
  onToggle,
  testPrompt,
}: {
  days: KitPlanDay[];
  checkedDays: Record<number, boolean>;
  onToggle: (day: number, next: boolean) => void;
  /** Test prompt 1 from the first skill, surfaced inside day 1. */
  testPrompt?: string | null;
}) {
  const [expandedDay, setExpandedDay] = useState<number | null>(days[0]?.day ?? 1);
  const done = days.filter((d) => checkedDays[d.day]).length;

  const copyTestPrompt = async () => {
    if (!testPrompt) return;
    try {
      await navigator.clipboard.writeText(testPrompt);
      toast.success("Copied. Run it the moment the skill is installed.");
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card kit-shadow-sm">
      <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Your seven days</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {done} of {days.length} done
        </span>
      </div>
      <ul className="divide-y divide-border">
        {days.map((day) => {
          const checked = !!checkedDays[day.day];
          const expanded = expandedDay === day.day;
          return (
            <li key={day.day} data-testid="journey-day" className="px-5 py-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => onToggle(day.day, value === true)}
                  aria-label={`Day ${day.day}: ${day.title}`}
                  className="h-5 w-5 rounded-md data-[state=checked]:border-accent data-[state=checked]:bg-accent"
                />
                <button
                  type="button"
                  onClick={() => setExpandedDay(expanded ? null : day.day)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                  aria-expanded={expanded}
                >
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-medium leading-snug",
                        checked && "text-muted-foreground line-through decoration-border",
                      )}
                    >
                      Day {day.day}. {day.title}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {day.minutes} min
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                    />
                  </span>
                </button>
              </div>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pb-1 pl-8 pt-2">
                      <p className="text-sm leading-relaxed text-foreground/80">{day.action}</p>
                      {day.day === days[0]?.day && testPrompt && (
                        <div className="space-y-2 rounded-xl bg-secondary/60 p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Test prompt 1, ready to paste
                          </p>
                          <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                            {testPrompt}
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyTestPrompt()}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent/80"
                          >
                            <Copy className="h-3 w-3" />
                            Copy test prompt
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
