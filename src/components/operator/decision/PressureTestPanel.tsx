import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VoiceInput } from '@/components/ui/voice-input';
import {
  ShieldCheck, AlertTriangle, HelpCircle, CircleDashed, Loader2, ChevronDown,
  Target, Scale, ListChecks, GitBranch, RotateCcw, Send, Sparkles, Users,
} from 'lucide-react';
import {
  useDecisionEngine, type DecisionClaim, type Verdict, type DecisionEvidence, type DecisionTension,
} from '@/hooks/useDecisionEngine';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';

const VERDICT_STYLE: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  supported: { label: 'Supported', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: ShieldCheck },
  contested: { label: 'Contested', cls: 'text-amber-700 bg-amber-50 border-amber-200', Icon: AlertTriangle },
  unverified: { label: 'Unverified', cls: 'text-slate-600 bg-slate-100 border-slate-200', Icon: HelpCircle },
  unverifiable: { label: 'Assumption', cls: 'text-indigo-700 bg-indigo-50 border-indigo-200', Icon: CircleDashed },
  pending: { label: 'Checking', cls: 'text-muted-foreground bg-secondary border-border', Icon: Loader2 },
};

const STAGES = [
  { key: 'decomposing', label: 'Decomposing' },
  { key: 'verifying', label: 'Verifying' },
  { key: 'cross_examining', label: 'Cross-examining' },
  { key: 'advising', label: 'Advising' },
  { key: 'complete', label: 'Done' },
];

const TENSION_GROUPS: Record<DecisionTension['kind'], string> = {
  vs_profile: 'Tensions with your context',
  vs_evidence: 'Tensions with the evidence',
  model_disagreement: 'Where the models disagree',
  internal: 'Internal contradictions',
};

function StageStepper({ stage }: { stage: string }) {
  const order = ['decomposing', 'verifying', 'cross_examining', 'advising', 'complete'];
  const current = order.indexOf(stage === 'error' ? 'complete' : stage);
  return (
    <div className="flex items-center gap-2 text-xs">
      {STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 font-medium ${
                active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground/50'
              }`}
            >
              {active && stage !== 'complete' && <Loader2 className="h-3 w-3 animate-spin" />}
              {s.label}
            </span>
            {i < STAGES.length - 1 && <span className="text-muted-foreground/30">/</span>}
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 66 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Overall confidence</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function ClaimRow({ claim, evidence, isBreakpoint }: { claim: DecisionClaim; evidence: DecisionEvidence[]; isBreakpoint: boolean }) {
  const [open, setOpen] = useState(false);
  const v = VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.pending;
  const hasEvidence = evidence.length > 0;
  return (
    <div className={`rounded-xl border p-4 ${isBreakpoint ? 'border-amber-300 bg-amber-50/40' : 'border-border bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{claim.type}</span>
            {claim.is_load_bearing && (
              <span className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Load-bearing</span>
            )}
            {isBreakpoint && (
              <Badge className="bg-amber-600 text-white text-[10px] border-0">Breakpoint</Badge>
            )}
          </div>
          <p className="text-sm text-foreground leading-snug">{claim.text}</p>
          {claim.rationale && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{claim.rationale}</p>
          )}
        </div>
        <span className={`flex items-center gap-1 shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${v.cls}`}>
          <v.Icon className={`h-3 w-3 ${claim.verdict === 'pending' ? 'animate-spin' : ''}`} />
          {v.label}
          {claim.confidence != null && <span className="opacity-70">{Math.round(claim.confidence * 100)}%</span>}
        </span>
      </div>
      {hasEvidence && (
        <div className="mt-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            {evidence.length} source{evidence.length === 1 ? '' : 's'}
          </button>
          <AnimatePresence>
            {open && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2 space-y-1.5"
              >
                {evidence.map((e) => (
                  <li key={e.id} className="text-xs">
                    <a
                      href={e.source_url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      {e.source_title || e.source_url || e.retriever}
                    </a>
                    <span className="text-muted-foreground/60"> · {e.retriever}</span>
                    {e.excerpt && <p className="text-muted-foreground mt-0.5 line-clamp-2">{e.excerpt}</p>}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const EXAMPLES = [
  'We should move upmarket to enterprise next quarter because ACVs are higher and SMB churn is unsustainable.',
  'We should switch our primary AI vendor from OpenAI to Anthropic to cut inference costs.',
  'We should hire a VP of Sales now rather than promote from within.',
];

export function PressureTestPanel() {
  const [statement, setStatement] = useState('');
  const { start, reset, starting, isRunning, isComplete, error, upgradeRequired, upgradeMessage, decisionCase, claims, evidence, tensions } = useDecisionEngine();
  const { subscribe, isProcessing } = useEdgeSubscription();

  const handleUpgrade = async () => {
    const url = await subscribe();
    if (url) window.location.href = url;
  };

  const evByClaim = (claimId: string) => evidence.filter((e) => e.claim_id === claimId);
  const stage = decisionCase?.stage ?? 'decomposing';
  const showResults = Boolean(decisionCase) && (isRunning || isComplete || stage === 'error');

  return (
    <div className="space-y-5">
      {upgradeRequired && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Edge Pro</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{upgradeMessage}</p>
            <Button onClick={handleUpgrade} disabled={isProcessing} size="lg" className="w-full sm:w-auto">
              {isProcessing ? 'Opening checkout...' : 'Upgrade to Edge Pro'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!showResults && !upgradeRequired && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-1.5">
              <Scale className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Pressure Test</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              State a decision or business case. CTRL breaks it into the claims it rests on, checks each against real evidence, and tells you where it breaks.
            </p>

            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20 mb-3">
              <span className="text-xs text-muted-foreground flex-1">Prefer to speak? Record it:</span>
              <VoiceInput
                placeholder="Record"
                maxDuration={90}
                onTranscript={(t) => setStatement((prev) => (prev ? `${prev}\n\n${t}` : t))}
              />
            </div>

            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="e.g., We should move upmarket to enterprise next quarter..."
              className="min-h-[110px]"
            />

            <div className="flex flex-wrap gap-1.5 mt-3">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setStatement(ex)}
                  className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2.5 py-1 transition-colors text-left"
                >
                  {ex.slice(0, 42)}...
                </button>
              ))}
            </div>

            <Button
              onClick={() => start(statement)}
              disabled={statement.trim().length < 8 || starting}
              className="w-full mt-4"
              size="lg"
            >
              {starting ? 'Starting...' : 'Pressure test this'}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {showResults && decisionCase && (
        <>
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{decisionCase.title || 'Your decision'}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{decisionCase.statement}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { reset(); setStatement(''); }} className="shrink-0">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <StageStepper stage={stage} />
            </CardContent>
          </Card>

          {stage === 'error' && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">The pressure test could not complete.</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{error || decisionCase.error_detail}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => start(decisionCase.statement)}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}

          {claims.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-foreground">What it rests on</h4>
                  <span className="text-xs text-muted-foreground">{claims.length} claims</span>
                </div>
                <div className="space-y-2.5">
                  {claims.map((c) => (
                    <ClaimRow
                      key={c.id}
                      claim={c}
                      evidence={evByClaim(c.id)}
                      isBreakpoint={decisionCase.breakpoint_assumption_id === c.id}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {isComplete && decisionCase.recommendation && (
            <Card className="border-primary/20">
              <CardContent className="p-6 space-y-5">
                {decisionCase.confidence != null && <ConfidenceMeter value={decisionCase.confidence} />}

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-foreground">Recommendation</h4>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{decisionCase.recommendation}</p>
                </div>

                {decisionCase.counter_case && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-amber-500" />
                      <h4 className="font-semibold text-foreground">The counter-case</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{decisionCase.counter_case}</p>
                  </div>
                )}

                {decisionCase.validate_next && decisionCase.validate_next.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ListChecks className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-foreground">Validate before you commit</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {decisionCase.validate_next.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">·</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tensions.length > 0 &&
                  Object.entries(
                    tensions.reduce<Record<string, DecisionTension[]>>((acc, t) => {
                      (acc[t.kind] ??= []).push(t);
                      return acc;
                    }, {}),
                  ).map(([kind, group]) => (
                    <div key={kind}>
                      <div className="flex items-center gap-2 mb-2">
                        {kind === 'model_disagreement' ? (
                          <Users className="h-4 w-4 text-indigo-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <h4 className="font-semibold text-foreground">
                          {TENSION_GROUPS[kind as DecisionTension['kind']] ?? 'Tensions'}
                        </h4>
                      </div>
                      <ul className="space-y-1.5">
                        {group.map((t) => (
                          <li key={t.id} className="text-sm text-muted-foreground">{t.description}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
