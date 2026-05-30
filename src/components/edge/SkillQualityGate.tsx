import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillQualityGate as SkillQualityGateType } from "@/types/skill";

interface SkillQualityGateProps {
  qualityGate: SkillQualityGateType;
  className?: string;
}

/**
 * Visual checklist showing which Section-7 quality gate checks the generated
 * skill passes. Failures are advisory, not blocking - they tell the leader
 * which parts of the skill are likely to behave imperfectly so they can
 * decide whether to regenerate.
 */
export function SkillQualityGate({ qualityGate, className }: SkillQualityGateProps) {
  const { checks, summary } = qualityGate;
  const allPassed = summary.passed === summary.total;

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <div className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border",
        allPassed ? "bg-emerald-50" : "bg-amber-50/40",
      )}>
        <div className="flex items-center gap-2">
          {allPassed ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          <h3 className="text-sm font-medium text-foreground">Quality checks</h3>
        </div>
        <span className={cn(
          "text-xs font-medium",
          allPassed ? "text-emerald-700" : "text-amber-700",
        )}>
          {summary.passed}/{summary.total} passed
        </span>
      </div>

      <ul className="divide-y divide-border">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-3 px-4 py-2.5">
            <div className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5",
              check.passed ? "bg-emerald-500/10" : "bg-red-500/10",
            )}>
              {check.passed ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <X className="h-3 w-3 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm",
                check.passed ? "text-foreground" : "text-foreground font-medium",
              )}>
                {check.label}
              </p>
              {check.detail && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{check.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
