/**
 * decision-views
 *
 * Shared presentational pieces for the Decision Engine, extracted from
 * PressureTestPanel so they can be reused outside the /decision page (e.g. the
 * session-one "first artifact" step in onboarding). Behaviour is unchanged -
 * these are the same components, just importable.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VoiceInput } from '@/components/ui/voice-input';
import {
  ShieldCheck, AlertTriangle, HelpCircle, CircleDashed, Loader2, ChevronDown,
  Target, Scale, ListChecks, GitBranch, RotateCcw, Send, Zap, Users, Plus, Bell, Mic, Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useDecisionEngine, type DecisionClaim, type Verdict, type DecisionEvidence, type DecisionTension,
} from '@/hooks/useDecisionEngine';
import { type DecisionCaseSummary, type OpenAlert } from '@/hooks/useDecisionInbox';

// ----- shared atoms ---------------------------------------------------------

const VERDICT_STYLE: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  supported: { label: 'Supported', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', Icon: ShieldCheck },
  contested: { label: 'Contested', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30', Icon: AlertTriangle },
  unverified: { label: 'Unverified', cls: 'text-muted-foreground bg-foreground/5 border-border', Icon: HelpCircle },
  unverifiable: { label: 'Assumption', cls: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30', Icon: CircleDashed },
  pending: { label: 'Checking', cls: 'text-muted-foreground bg-secondary border-border', Icon: Loader2 },
};

const STAGE_ORDER = ['decomposing', 'verifying', 'cross_examining', 'advising', 'complete'];
const STAGE_LABEL: Record<string, string> = {
  decomposing: 'Breaking it down', verifying: 'Checking the evidence', cross_examining: 'Cross-examining', advising: 'Weighing it up', complete: 'Done',
};

const TENSION_GROUPS: Record<DecisionTension['kind'], string> = {
  vs_profile: 'Tensions with your context',
  vs_evidence: 'Tensions with the evidence',
  model_disagreement: 'Where the models disagree',
  internal: 'Internal contradictions',
};

// How each piece of evidence relates to the claim it was retrieved for. Making
// this explicit (rather than implied by styling) is the point of the verify
// layer: the user sees what actually backs - or undercuts - each claim.
const STANCE_STYLE: Record<DecisionEvidence['stance'], { label: string; cls: string }> = {
  supports: { label: 'Supports', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  refutes: { label: 'Refutes', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
  neutral: { label: 'Context', cls: 'text-muted-foreground bg-foreground/5 border-border' },
};
const STANCE_ORDER: Record<DecisionEvidence['stance'], number> = { supports: 0, neutral: 1, refutes: 2 };

const KIND_LABEL: Record<string, string> = {
  binary: 'Binary call', directional: 'Directional', investment: 'Investment',
  hiring: 'Hiring', gtm: 'Go-to-market', other: 'Decision',
};
function kindLabel(kind: string | null): string | null {
  if (!kind) return null;
  return KIND_LABEL[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1);
}

// AI-native only (docs/MAIN-APP-POLISH-SPEC.md section 0): every example is about
// building, orchestrating, productizing, or selling AI. General-business prompts
// ("move upmarket", "hire a VP of Sales") are gone; if a leader types one anyway,
// the engine's reframe stage pulls it to its AI-native version.
const DECISION_EXAMPLES = [
  'We should stand up an agent to handle tier-1 support before hiring more reps.',
  'We should switch our highest-volume agent to a cheaper model now that quality has closed the gap.',
  'We should productize our internal AI research workflow as a paid feature.',
];

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 66 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>How much to trust this</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <motion.div className={`h-full rounded-full ${tone}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

function ClaimRow({ claim, evidence, isBreakpoint }: { claim: DecisionClaim; evidence: DecisionEvidence[]; isBreakpoint: boolean }) {
  const [open, setOpen] = useState(false);
  const v = VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.pending;
  return (
    <div className={`rounded-xl border p-4 ${isBreakpoint ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-foreground/5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{claim.type}</span>
            {claim.is_load_bearing && <span className="text-[10px] uppercase tracking-wide text-amber-400 font-semibold">Load-bearing</span>}
            {isBreakpoint && <Badge className="bg-amber-600 text-white text-[10px] border-0">Breakpoint</Badge>}
          </div>
          <p className="text-sm text-foreground leading-snug">{claim.text}</p>
          {claim.rationale && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{claim.rationale}</p>}
        </div>
        <span className={`flex items-center gap-1 shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${v.cls}`}>
          <v.Icon className={`h-3 w-3 ${claim.verdict === 'pending' ? 'animate-spin' : ''}`} />
          {v.label}
          {claim.confidence != null && <span className="opacity-70">{Math.round(claim.confidence * 100)}%</span>}
        </span>
      </div>
      {evidence.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            {evidence.length} source{evidence.length === 1 ? '' : 's'}
          </button>
          <AnimatePresence>
            {open && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 space-y-2">
                {[...evidence].sort((a, b) => STANCE_ORDER[a.stance] - STANCE_ORDER[b.stance]).map((e) => {
                  const st = STANCE_STYLE[e.stance] ?? STANCE_STYLE.neutral;
                  return (
                    <li key={e.id} className="text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                        <a href={e.source_url ?? '#'} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">{e.source_title || e.source_url || e.retriever}</a>
                        <span className="text-muted-foreground/60">· {e.retriever}</span>
                        {e.retrieved_at && <span className="text-muted-foreground/50">· as of {new Date(e.retrieved_at).toLocaleDateString()}</span>}
                      </div>
                      {e.excerpt && <p className="text-muted-foreground mt-0.5 line-clamp-2 text-pretty">{e.excerpt}</p>}
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// A calm, full-bleed "thinking" view: one focal line that advances through the
// stages, with claims surfacing as they are verified. Used while the pipeline
// runs so the user watches one thing, not a dashboard.
export function ThinkingView({ stage, claims }: { stage: string; claims: DecisionClaim[] }) {
  const idx = STAGE_ORDER.indexOf(stage === 'error' ? 'complete' : stage);
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="mb-5">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Scale className="h-6 w-6 text-primary" />
        </div>
      </motion.div>
      <p className="text-base font-semibold text-foreground">{STAGE_LABEL[stage] ?? 'Working'}</p>
      <div className="mt-3 flex items-center gap-1.5">
        {STAGE_ORDER.slice(0, 4).map((s, i) => (
          <span key={s} className={`h-1.5 rounded-full transition-all ${i <= idx ? 'w-6 bg-primary' : 'w-3 bg-secondary'}`} />
        ))}
      </div>
      {claims.length > 0 && (
        <div className="mt-6 w-full max-w-sm space-y-1.5 text-left">
          {claims.map((c) => {
            const v = VERDICT_STYLE[c.verdict] ?? VERDICT_STYLE.pending;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground line-clamp-1 flex-1">{c.text}</span>
                <v.Icon className={`h-3.5 w-3.5 shrink-0 ${v.cls.split(' ')[0]} ${c.verdict === 'pending' ? 'animate-spin' : ''}`} />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// The full verdict. Shared between mobile (stacked, scroll) and desktop (right pane).
export function DecisionResult({ engine, onReset }: { engine: ReturnType<typeof useDecisionEngine>; onReset: () => void }) {
  const { decisionCase, claims, evidence, tensions, isComplete, error } = engine;
  if (!decisionCase) return null;
  const stage = decisionCase.stage;
  const evByClaim = (id: string) => evidence.filter((e) => e.claim_id === id);

  if ((stage === 'decomposing' || stage === 'verifying' || stage === 'cross_examining' || stage === 'advising') && !isComplete) {
    return (
      <Card className="border-primary/20 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 pt-4">
            <p className="text-sm text-muted-foreground line-clamp-1">{decisionCase.title || decisionCase.statement}</p>
            <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw className="h-4 w-4" /></Button>
          </div>
          <ThinkingView stage={stage} claims={claims} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-foreground text-balance">{decisionCase.title || 'Your decision'}</h3>
                {kindLabel(decisionCase.decision_kind) && (
                  <Badge variant="secondary" className="text-[10px] font-medium shrink-0">{kindLabel(decisionCase.decision_kind)}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed text-pretty">{decisionCase.statement}</p>
              {decisionCase.reframed && decisionCase.reframed_statement && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-primary/80">We reframed this to the AI-native version</p>
                  <p className="text-sm text-foreground mt-1 leading-relaxed text-pretty">{decisionCase.reframed_statement}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {decisionCase.reframe_note || 'CTRL pressure-tests the AI-native version of a decision, never general business advice.'}
                  </p>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onReset} className="shrink-0"><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {stage === 'error' && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /><p className="text-sm font-medium">This could not complete.</p></div>
            <p className="text-xs text-muted-foreground mt-2">{error || decisionCase.error_detail}</p>
          </CardContent>
        </Card>
      )}

      {isComplete && decisionCase.recommendation && (
        <Card className="border-primary/20">
          <CardContent className="p-5 space-y-5">
            {decisionCase.confidence != null && <ConfidenceMeter value={decisionCase.confidence} />}
            {decisionCase.last_verified_at && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-pretty">
                  Monitored: CTRL re-checks the load-bearing claims and flags you if the evidence shifts. Last checked{' '}
                  {formatDistanceToNow(new Date(decisionCase.last_verified_at), { addSuffix: true })}.
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-primary" /><h4 className="font-semibold text-foreground">The call</h4></div>
              <p className="text-sm text-foreground leading-relaxed">{decisionCase.recommendation}</p>
            </div>
            {decisionCase.counter_case && (
              <div>
                <div className="flex items-center gap-2 mb-2"><Scale className="h-4 w-4 text-amber-500" /><h4 className="font-semibold text-foreground">The counter-case</h4></div>
                <p className="text-sm text-muted-foreground leading-relaxed">{decisionCase.counter_case}</p>
              </div>
            )}
            {decisionCase.validate_next && decisionCase.validate_next.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2"><ListChecks className="h-4 w-4 text-primary" /><h4 className="font-semibold text-foreground">Validate before you commit</h4></div>
                <ul className="space-y-1.5">
                  {decisionCase.validate_next.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="text-primary mt-0.5">·</span>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {claims.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4"><GitBranch className="h-4 w-4 text-primary" /><h4 className="font-semibold text-foreground">What it rests on</h4><span className="text-xs text-muted-foreground">{claims.length} claims</span></div>
            <div className="space-y-2.5">
              {claims.map((c) => <ClaimRow key={c.id} claim={c} evidence={evByClaim(c.id)} isBreakpoint={decisionCase.breakpoint_assumption_id === c.id} />)}
            </div>
          </CardContent>
        </Card>
      )}

      <PanelCard tensions={tensions} />

      {tensions.some((t) => t.kind !== 'model_disagreement') && (
        <Card>
          <CardContent className="p-5 space-y-4">
            {Object.entries(tensions.filter((t) => t.kind !== 'model_disagreement').reduce<Record<string, DecisionTension[]>>((acc, t) => { (acc[t.kind] ??= []).push(t); return acc; }, {})).map(([kind, group]) => (
              <div key={kind}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="font-semibold text-foreground">{TENSION_GROUPS[kind as DecisionTension['kind']] ?? 'Tensions'}</h4>
                </div>
                <ul className="space-y-1.5">{group.map((t) => <li key={t.id} className="text-sm text-muted-foreground text-pretty">{t.description}</li>)}</ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// The cross-examination panel, promoted out of the generic tensions list. When
// the multi-model review split, that disagreement is a first-class signal - it
// is the clearest sign the recommendation deserves lower confidence - so it gets
// its own card rather than reading as a footnote.
function PanelCard({ tensions }: { tensions: DecisionTension[] }) {
  const panel = tensions.filter((t) => t.kind === 'model_disagreement');
  if (panel.length === 0) return null;
  return (
    <Card className="border-indigo-500/30 bg-indigo-500/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-indigo-400" /><h4 className="font-semibold text-foreground">The review panel split</h4></div>
        <p className="text-xs text-muted-foreground mb-3 text-pretty">Several models stress-tested this independently. Where they disagree, treat the call as lower-confidence.</p>
        <ul className="space-y-1.5">{panel.map((t) => <li key={t.id} className="text-sm text-muted-foreground text-pretty">{t.description}</li>)}</ul>
      </CardContent>
    </Card>
  );
}

export function CaptureView({ value, onChange, onStart, starting, autoFocus, heading, subhead }: { value: string; onChange: (v: string) => void; onStart: () => void; starting: boolean; autoFocus?: boolean; heading?: string; subhead?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5"><Scale className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold text-foreground">{heading ?? 'Pressure test a decision'}</h3></div>
      <p className="text-sm text-muted-foreground mb-4">{subhead ?? 'Say the decision you are weighing. CTRL breaks it into the claims it rests on, checks each against real evidence, and tells you where it breaks.'}</p>
      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20 mb-3">
        <Mic className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground flex-1">Speak it out loud</span>
        <VoiceInput placeholder="Record" maxDuration={90} onTranscript={(t) => onChange(value ? `${value}\n\n${t}` : t)} />
      </div>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g., We should move upmarket to enterprise next quarter..." className="min-h-[110px]" autoFocus={autoFocus} />
      <div className="flex flex-wrap gap-1.5 mt-3">
        {DECISION_EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => onChange(ex)} className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2.5 py-1 transition-colors text-left">{ex.slice(0, 40)}...</button>
        ))}
      </div>
      <Button onClick={onStart} disabled={value.trim().length < 8 || starting} className="w-full mt-4" size="lg">
        {starting ? 'Starting...' : 'Pressure test this'}<Send className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

export function AlertBanner({ alerts, onReRun, onDismiss }: { alerts: OpenAlert[]; onReRun: (a: OpenAlert) => void; onDismiss: (a: OpenAlert) => void }) {
  if (alerts.length === 0) return null;
  const a = alerts[0];
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-amber-500/40 bg-amber-500/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0"><Bell className="h-4 w-4 text-amber-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{a.headline}</p>
              {a.detail && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.detail}</p>}
              <div className="flex items-center gap-2 mt-2.5">
                <Button size="sm" onClick={() => onReRun(a)}>Re-run this decision</Button>
                <Button size="sm" variant="ghost" onClick={() => onDismiss(a)}>Dismiss</Button>
              </div>
            </div>
            {alerts.length > 1 && <span className="text-[11px] text-amber-400 font-medium shrink-0">+{alerts.length - 1} more</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function RecentRail({ cases, activeId, onSelect, onNew }: { cases: DecisionCaseSummary[]; activeId: string | null; onSelect: (id: string) => void; onNew: () => void }) {
  return (
    <div className="space-y-2">
      <Button onClick={onNew} variant="outline" className="w-full justify-start"><Plus className="h-4 w-4 mr-2" />New pressure test</Button>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-1 pt-2">Your decisions</p>
      {cases.length === 0 && <p className="text-xs text-muted-foreground px-1">Nothing yet. Pressure test your first decision.</p>}
      {cases.map((c) => {
        const active = c.id === activeId;
        return (
          <button key={c.id} onClick={() => onSelect(c.id)} className={`w-full text-left rounded-lg border p-3 transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground line-clamp-1">{c.title || c.statement}</p>
              {c.confidence != null && <span className="text-[11px] text-muted-foreground shrink-0">{Math.round(c.confidence * 100)}%</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {kindLabel(c.decision_kind) && <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0">{kindLabel(c.decision_kind)}</Badge>}
              <p className="text-[11px] text-muted-foreground">{c.stage === 'complete' ? 'Pressure tested' : c.stage === 'error' ? 'Did not complete' : 'In progress'}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function UpgradeCard({ message, onUpgrade, processing }: { message: string | null; onUpgrade: () => void; processing: boolean }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-2"><Zap className="h-5 w-5 text-primary" /><h3 className="text-base font-semibold text-foreground">Edge Pro</h3></div>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <Button onClick={onUpgrade} disabled={processing} size="lg" className="w-full sm:w-auto">{processing ? 'Opening checkout...' : 'Upgrade to Edge Pro'}</Button>
      </CardContent>
    </Card>
  );
}
