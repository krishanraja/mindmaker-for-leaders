import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Check, X, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionCall, type UserCall } from '@/hooks/useDecisionCall';

type Engine = ReturnType<typeof useDecisionEngine>;

const TYPE_LABEL: Record<string, string> = {
  factual: 'A fact to check',
  market: 'About the market',
  causal: 'Cause and effect',
  assumption: 'An assumption',
  forecast: 'A prediction',
};

const OPTIONS: { value: UserCall; label: string; icon: React.ReactNode }[] = [
  { value: 'accept', label: 'I agree', icon: <Check className="h-4 w-4" /> },
  { value: 'reject', label: 'I disagree', icon: <X className="h-4 w-4" /> },
  { value: 'unsure', label: 'Not sure', icon: <HelpCircle className="h-4 w-4" /> },
];

/**
 * Critical-evaluation muscle: before CTRL's recommendation is revealed, the user
 * makes their own call on the claim that carries the decision (the breakpoint,
 * else the first load-bearing claim). CTRL's verdict is deliberately hidden here
 * so the judgment is genuinely theirs. Fail-open: revealing is never blocked by a
 * save error, an already-recorded call, or a missing claim.
 */
export function CriticalCallStep({ engine, onDone }: { engine: Engine; onDone: () => void }) {
  const { getCallsForCase, recordCall } = useDecisionCall();
  const caseId = engine.decisionCase?.id ?? null;
  const breakpointId = engine.decisionCase?.breakpoint_assumption_id ?? null;

  const loadBearing = useMemo(
    () => engine.claims.filter((c) => c.is_load_bearing),
    [engine.claims],
  );
  const primary = useMemo(() => {
    if (loadBearing.length === 0) return null;
    return loadBearing.find((c) => c.id === breakpointId) ?? loadBearing[0];
  }, [loadBearing, breakpointId]);
  const others = useMemo(
    () => loadBearing.filter((c) => c.id !== primary?.id),
    [loadBearing, primary],
  );

  const [ready, setReady] = useState(false);
  const [call, setCall] = useState<UserCall | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [saving, setSaving] = useState(false);

  // Skip if there is nothing to call on, or the user already called on this case.
  useEffect(() => {
    let active = true;
    if (!caseId || !primary) {
      onDone();
      return;
    }
    getCallsForCase(caseId).then((existing) => {
      if (!active) return;
      if (existing.length > 0) onDone();
      else setReady(true);
    });
    return () => {
      active = false;
    };
  }, [caseId, primary, getCallsForCase, onDone]);

  if (!ready || !primary || !caseId) return null;

  const reveal = async () => {
    if (!call) return;
    setSaving(true);
    try {
      await recordCall(caseId, primary.id, call, reasoning);
    } catch {
      // fail-open: never trap the user behind a save error
    } finally {
      setSaving(false);
      onDone();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-accent">
              <Scale className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Make the call</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              This is what the decision rests on. Before you see what I think, make your own call.
            </h3>
            <p className="text-sm text-muted-foreground">{TYPE_LABEL[primary.type] ?? 'The key point'}</p>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <p className="text-sm text-foreground">{primary.text}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setCall(o.value)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-medium transition-colors',
                  call === o.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                )}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>

          <Textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Why? (optional)"
            className="min-h-[72px] resize-none text-sm"
            aria-label="Your reasoning"
          />

          {others.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Also part of this decision</p>
              <ul className="space-y-1">
                {others.map((c) => (
                  <li key={c.id} className="text-xs text-muted-foreground">
                    - {c.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={reveal} disabled={!call || saving} size="lg" className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Lock in my answer and see what I think
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
