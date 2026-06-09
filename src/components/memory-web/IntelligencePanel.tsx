/**
 * IntelligencePanel
 * Right-side panel for the desktop dashboard showing patterns,
 * active decisions, and a health score gauge.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Repeat,
  Lightbulb,
  MessageSquare,
  Star,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  UserPattern,
  UserDecision,
  MemoryWebStats,
  PatternType,
} from '@/types/memory';

const PATTERN_ICONS: Record<PatternType, typeof TrendingUp> = {
  preference: Star,
  anti_preference: Repeat,
  behavior: Lightbulb,
  blindspot: MessageSquare,
  strength: TrendingUp,
};

interface IntelligencePanelProps {
  patterns: UserPattern[];
  decisions: UserDecision[];
  stats: MemoryWebStats | null;
  onConfirmPattern?: (id: string) => void;
  onDismissPattern?: (id: string) => void;
  onSupersedeDecision?: (id: string) => void;
  onReverseDecision?: (id: string) => void;
}

function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-sm font-semibold text-foreground hover:text-accent transition-colors"
      >
        <span className="flex items-center gap-2">
          {title}
          {count !== undefined && (
            <span className="text-xs font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HealthScoreGauge({ score }: { score: number }) {
  const color =
    score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444';

  const gaugeData = [
    { name: 'score', value: score, fill: color },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            startAngle={225}
            endAngle={-45}
            data={gaugeData}
            barSize={8}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={4}
              background={{ fill: 'hsl(var(--secondary))' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Memory Health</p>
    </div>
  );
}

export function IntelligencePanel({
  patterns,
  decisions,
  stats,
  onConfirmPattern,
  onDismissPattern,
  onSupersedeDecision,
  onReverseDecision,
}: IntelligencePanelProps) {
  const activeDecisions = decisions.filter((d) => d.status === 'active');

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border overflow-y-auto">
      <div className="p-5">
        <h2 className="text-base font-semibold text-foreground mb-5">
          Intelligence
        </h2>

        <div className="space-y-5">
          {/* Health Score Gauge */}
          <CollapsibleSection title="Health Score" defaultOpen={true}>
            <div className="py-3 flex justify-center">
              <HealthScoreGauge score={stats?.health_score ?? 0} />
            </div>
          </CollapsibleSection>

          <div className="border-t border-border" />

          {/* Patterns */}
          <CollapsibleSection
            title="Patterns"
            count={patterns.length}
            defaultOpen={true}
          >
            <div className="space-y-2 pt-1 pb-2">
              {patterns.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No patterns detected yet. Keep adding context.
                </p>
              )}
              {patterns.map((pattern) => {
                const Icon =
                  PATTERN_ICONS[pattern.pattern_type] || TrendingUp;
                const confidencePct = Math.round(pattern.confidence * 100);

                return (
                  <motion.div
                    key={pattern.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-relaxed">
                          {pattern.pattern_text}
                        </p>
                        {/* Confidence bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                confidencePct > 70
                                  ? 'bg-emerald-500'
                                  : confidencePct > 40
                                  ? 'bg-amber-500'
                                  : 'bg-red-400'
                              )}
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {confidencePct}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">
                            {pattern.evidence_count} evidence
                          </span>
                          {pattern.status === 'emerging' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onConfirmPattern?.(pattern.id)}
                                className="p-1 rounded hover:bg-secondary text-emerald-500 transition-colors"
                                title="Confirm pattern"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => onDismissPattern?.(pattern.id)}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
                                title="Dismiss pattern"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CollapsibleSection>

          <div className="border-t border-border" />

          {/* Active Decisions */}
          <CollapsibleSection
            title="Active Decisions"
            count={activeDecisions.length}
            defaultOpen={true}
          >
            <div className="space-y-1 pt-1 pb-2">
              {activeDecisions.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No active decisions tracked.
                </p>
              )}
              {activeDecisions.map((decision, index) => (
                <motion.div
                  key={decision.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-4 py-2 group"
                >
                  {/* Timeline line */}
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                  {/* Timeline dot */}
                  <div className="absolute left-[-3px] top-3 w-[7px] h-[7px] rounded-full bg-accent border-2 border-card" />

                  <p className="text-xs text-foreground leading-relaxed">
                    {decision.decision_text}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full',
                        decision.source === 'voice'
                          ? 'bg-violet-500/10 text-violet-400'
                          : 'bg-blue-500/10 text-blue-400'
                      )}
                    >
                      {decision.source}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(decision.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action buttons on hover */}
                  <div className="hidden group-hover:flex items-center gap-1 mt-1.5">
                    <button
                      onClick={() => onSupersedeDecision?.(decision.id)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-secondary/50 transition-colors"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      Supersede
                    </button>
                    <button
                      onClick={() => onReverseDecision?.(decision.id)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-secondary/50 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reverse
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </aside>
  );
}
