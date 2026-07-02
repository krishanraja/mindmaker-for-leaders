/**
 * decision-views
 *
 * Shared presentational pieces for the Decision Engine, extracted from
 * PressureTestPanel so they can be reused outside the /decision page (e.g. the
 * session-one "first artifact" step in onboarding).
 *
 * The result is a fit-to-viewport instrument (docs/MAIN-APP-POLISH-SPEC.md
 * section 3): the verdict, the reframe, and confidence lead; the depth (the
 * claims it rests on, the evidence behind each, the tensions) opens one tap
 * away in tabs and a sheet, so there is one thing in focus at a time and no
 * long page scroll.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VoiceInput } from '@/components/ui/voice-input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, AlertTriangle, HelpCircle, CircleDashed, Loader2, ChevronRight,
  Target, Scale, ListChecks, GitBranch, RotateCcw, Send, Zap, Users, Plus, Bell, Mic, Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useDecisionEngine, type DecisionClaim, type Verdict, type DecisionEvidence, type DecisionTension,
} from '@/hooks/useDecisionEngine';
import { type DecisionCaseSummary, type OpenAlert } from '@/hooks/useDecisionInbox';
import { SkeletonCard, LoadingCaption } from '@/components/system/SkeletonCard';
import { DecisionCapture } from '@/components/operator/decision/DecisionCapture';

// ----- shared atoms ---------------------------------------------------------

const VERDICT_STYLE: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  supported: { label: 'Checks out', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', Icon: ShieldCheck },
  contested: { label: "Doesn't add up", cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30', Icon: AlertTriangle },
  unverified: { label: 'Not confirmed', cls: 'text-muted-foreground bg-foreground/5 border-border', Icon: HelpCircle },
  unverifiable: { label: 'Your call', cls: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30', Icon: CircleDashed },
  pending: { label: 'Checking', cls: 'text-muted-foreground bg-secondary border-border', Icon: Loader2 },
};

const STAGE_ORDER = ['decomposing', 'verifying', 'cross_examining', 'advising', 'complete'];
const STAGE_LABEL: Record<string, string> = {
  decomposing: 'Breaking it down', verifying: 'Checking the evidence', cross_examining: 'Arguing both sides', advising: 'Weighing it up', complete: 'Done',
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
  supports: { label: 'Agrees', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  refutes: { label: 'Disagrees', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
  neutral: { label: 'Background', cls: 'text-muted-foreground bg-foreground/5 border-border' },
};
const STANCE_ORDER: Record<DecisionEvidence['stance'], number> = { supports: 0, neutral: 1, refutes: 2 };

const KIND_LABEL: Record<string, string> = {
  binary: 'Yes or no', directional: 'Which way', investment: 'Investment',
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

// One claim as a tappable row. Tapping opens its evidence in a sheet (depth one
// tap away), rather than expanding inline and growing the page.
function ClaimRow({ claim, evidenceCount, isBreakpoint, onOpen }: { claim: DecisionClaim; evidenceCount: number; isBreakpoint: boolean; onOpen: () => void }) {
  const v = VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.pending;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full text-left rounded-xl border p-3.5 transition-colors',
        isBreakpoint ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/[0.14]' : 'border-border bg-foreground/5 hover:bg-foreground/[0.08]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {claim.is_load_bearing && <span className="text-[10px] uppercase tracking-wide text-amber-400 font-semibold">Load-bearing</span>}
            {isBreakpoint && <Badge className="bg-amber-600 text-white text-[10px] border-0">The hinge</Badge>}
          </div>
          <p className="text-sm text-foreground leading-snug text-pretty">{claim.text}</p>
        </div>
        <span className={`flex items-center gap-1 shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${v.cls}`}>
          <v.Icon className={`h-3 w-3 ${claim.verdict === 'pending' ? 'animate-spin' : ''}`} />
          {v.label}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <span>{evidenceCount > 0 ? `${evidenceCount} source${evidenceCount === 1 ? '' : 's'}` : 'No outside sources yet'}</span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  );
}

// The evidence sheet for one claim - opens from a tapped claim. This is the
// "depth on tap" surface: the claim, its rationale, and every source behind it.
function ClaimSheet({ claim, evidence, onClose }: { claim: DecisionClaim | null; evidence: DecisionEvidence[]; onClose: () => void }) {
  const open = claim !== null;
  const v = claim ? (VERDICT_STYLE[claim.verdict] ?? VERDICT_STYLE.pending) : null;
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl scrollbar-hide sm:max-w-lg sm:mx-auto">
        {claim && v && (
          <div className="space-y-4 pt-1">
            <SheetTitle className="sr-only">Evidence for: {claim.text}</SheetTitle>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${v.cls}`}>
                  <v.Icon className={`h-3 w-3 ${claim.verdict === 'pending' ? 'animate-spin' : ''}`} />
                  {v.label}
                </span>
                {claim.confidence != null && <span className="text-xs text-muted-foreground">{Math.round(claim.confidence * 100)}% sure</span>}
              </div>
              <p className="text-sm text-foreground leading-relaxed text-pretty">{claim.text}</p>
              {claim.rationale && <p className="text-xs text-muted-foreground mt-2 leading-relaxed text-pretty">{claim.rationale}</p>}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
                {evidence.length > 0 ? 'What I found' : 'Where this comes from'}
              </p>
              {evidence.length === 0 ? (
                <p className="text-xs text-muted-foreground">No outside source settles this one yet. It may be something only you can answer.</p>
              ) : (
                <ul className="space-y-2.5">
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
                        {e.excerpt && <p className="text-muted-foreground mt-0.5 text-pretty">{e.excerpt}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
      <p className="mt-1 text-xs text-muted-foreground">This takes a moment. We are reading real sources, not guessing.</p>
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

// The reframe banner. Kept verbatim in intent (docs/MAIN-APP-POLISH-SPEC.md
// section 0): when a leader brings a general-business question, CTRL shows the
// AI-native version it actually weighed, honestly, rather than silently swapping.
function ReframeBanner({ statement, note }: { statement: string; note: string | null }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-primary/80">We reframed this to the AI-native version</p>
      <p className="text-sm text-foreground mt-1 leading-relaxed text-pretty">{statement}</p>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        {note || 'CTRL weighs the AI-native version of a decision, never general business advice.'}
      </p>
    </div>
  );
}

type ResultTab = 'call' | 'claims' | 'tensions';

// The full verdict, rebuilt as a fit-to-viewport instrument. A fixed head (the
// decision + reframe), a tab strip, then one bounded pane showing the active tab.
// One thing in focus at a time; the page never grows past the viewport.
export function DecisionResult({ engine, onReset }: { engine: ReturnType<typeof useDecisionEngine>; onReset: () => void }) {
  const { decisionCase, claims, evidence, tensions, isComplete, error } = engine;
  const [tab, setTab] = useState<ResultTab>('call');
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  if (!decisionCase) return null;
  const stage = decisionCase.stage;
  const evByClaim = (id: string) => evidence.filter((e) => e.claim_id === id);

  // Still running: hand the whole instrument to the calm thinking view.
  if ((stage === 'decomposing' || stage === 'verifying' || stage === 'cross_examining' || stage === 'advising') && !isComplete) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between gap-3 pb-3">
          <p className="text-sm text-muted-foreground line-clamp-1">{decisionCase.title || decisionCase.statement}</p>
          <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <ThinkingView stage={stage} claims={claims} />
        </div>
      </div>
    );
  }

  const realTensions = tensions.filter((t) => t.kind !== 'model_disagreement');
  const panelTensions = tensions.filter((t) => t.kind === 'model_disagreement');
  const tensionCount = tensions.length;

  const TABS: { id: ResultTab; label: string; count?: number }[] = [
    { id: 'call', label: 'My answer' },
    { id: 'claims', label: 'What this is based on', count: claims.length },
    ...(tensionCount > 0 ? [{ id: 'tensions' as ResultTab, label: 'Tensions', count: tensionCount }] : []),
  ];

  const openClaim = openClaimId ? claims.find((c) => c.id === openClaimId) ?? null : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* HEAD - the decision + the reframe, always in view */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground text-balance line-clamp-2">{decisionCase.title || 'Your decision'}</h3>
            {kindLabel(decisionCase.decision_kind) && (
              <Badge variant="secondary" className="text-[10px] font-medium shrink-0">{kindLabel(decisionCase.decision_kind)}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 text-pretty">{decisionCase.statement}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="shrink-0" title="Weigh another decision"><RotateCcw className="h-4 w-4" /></Button>
      </div>

      {decisionCase.reframed && decisionCase.reframed_statement && (
        <div className="pt-3">
          <ReframeBanner statement={decisionCase.reframed_statement} note={decisionCase.reframe_note ?? null} />
        </div>
      )}

      {stage === 'error' ? (
        <div className="flex-1 min-h-0 flex items-center justify-center px-4">
          <Card className="border-amber-500/30 bg-amber-500/10 w-full max-w-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /><p className="text-sm font-medium">This could not finish.</p></div>
              <p className="text-xs text-muted-foreground mt-2">{error || decisionCase.error_detail}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>Try another decision</Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* TAB STRIP - one focus at a time */}
          <div className="flex items-center gap-1 pt-3 pb-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                )}
              >
                {t.label}{t.count != null && <span className="ml-1 opacity-60">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* THE ONE PANE - bounded, internal scroll only if depth needs it */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pt-2 pb-1">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {tab === 'call' && (
                  <CallPane decisionCase={decisionCase} isComplete={isComplete} />
                )}
                {tab === 'claims' && (
                  <div className="space-y-2">
                    {claims.length === 0 && <p className="text-sm text-muted-foreground">The claims will appear here once they are checked.</p>}
                    {claims.map((c) => (
                      <ClaimRow
                        key={c.id}
                        claim={c}
                        evidenceCount={evByClaim(c.id).length}
                        isBreakpoint={decisionCase.breakpoint_assumption_id === c.id}
                        onOpen={() => setOpenClaimId(c.id)}
                      />
                    ))}
                  </div>
                )}
                {tab === 'tensions' && (
                  <TensionsPane realTensions={realTensions} panelTensions={panelTensions} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}

      <ClaimSheet claim={openClaim} evidence={openClaim ? evByClaim(openClaim.id) : []} onClose={() => setOpenClaimId(null)} />
    </div>
  );
}

// The verdict pane: confidence, the call, the counter-case, what to validate.
function CallPane({ decisionCase, isComplete }: { decisionCase: NonNullable<ReturnType<typeof useDecisionEngine>['decisionCase']>; isComplete: boolean }) {
  if (!isComplete || !decisionCase.recommendation) {
    return <p className="text-sm text-muted-foreground">The call will appear here once the weighing is done.</p>;
  }
  return (
    <div className="space-y-5">
      {decisionCase.confidence != null && <ConfidenceMeter value={decisionCase.confidence} />}
      {decisionCase.last_verified_at && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span className="text-pretty">
            We keep watching: CTRL re-checks the claims this rests on and flags you if the evidence shifts. Last checked{' '}
            {formatDistanceToNow(new Date(decisionCase.last_verified_at), { addSuffix: true })}.
          </span>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-primary" /><h4 className="font-semibold text-foreground">My answer</h4></div>
        <p className="text-sm text-foreground leading-relaxed text-pretty">{decisionCase.recommendation}</p>
      </div>
      {decisionCase.counter_case && (
        <div>
          <div className="flex items-center gap-2 mb-2"><Scale className="h-4 w-4 text-amber-500" /><h4 className="font-semibold text-foreground">The other side</h4></div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{decisionCase.counter_case}</p>
        </div>
      )}
      {decisionCase.validate_next && decisionCase.validate_next.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2"><ListChecks className="h-4 w-4 text-primary" /><h4 className="font-semibold text-foreground">Check these before you commit</h4></div>
          <ul className="space-y-1.5">
            {decisionCase.validate_next.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="text-primary mt-0.5">·</span>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TensionsPane({ realTensions, panelTensions }: { realTensions: DecisionTension[]; panelTensions: DecisionTension[] }) {
  if (realTensions.length === 0 && panelTensions.length === 0) {
    return <p className="text-sm text-muted-foreground">No tensions surfaced. The claims line up with each other and your context.</p>;
  }
  return (
    <div className="space-y-5">
      {panelTensions.length > 0 && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-indigo-400" /><h4 className="font-semibold text-foreground">The review panel split</h4></div>
          <p className="text-xs text-muted-foreground mb-3 text-pretty">Several models stress-tested this on their own. Where they disagree, treat the call as less certain.</p>
          <ul className="space-y-1.5">{panelTensions.map((t) => <li key={t.id} className="text-sm text-muted-foreground text-pretty">{t.description}</li>)}</ul>
        </div>
      )}
      {Object.entries(realTensions.reduce<Record<string, DecisionTension[]>>((acc, t) => { (acc[t.kind] ??= []).push(t); return acc; }, {})).map(([kind, group]) => (
        <div key={kind}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-foreground">{TENSION_GROUPS[kind as DecisionTension['kind']] ?? 'Tensions'}</h4>
          </div>
          <ul className="space-y-1.5">{group.map((t) => <li key={t.id} className="text-sm text-muted-foreground text-pretty">{t.description}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

export function CaptureView({ value, onChange, onStart, starting, autoFocus, heading, subhead }: { value: string; onChange: (v: string) => void; onStart: () => void; starting: boolean; autoFocus?: boolean; heading?: string; subhead?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5"><Scale className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold text-foreground">{heading ?? 'Weigh a decision with CTRL'}</h3></div>
      <p className="text-sm text-muted-foreground mb-4 text-pretty">{subhead ?? 'Tell CTRL the AI-native move you are weighing. It breaks the decision into the things it rests on, checks each against real sources, and shows you where it holds and where it breaks.'}</p>
      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20 mb-3">
        <Mic className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground flex-1">Prefer to talk it out? Say it out loud.</span>
        <VoiceInput placeholder="Record" maxDuration={90} onTranscript={(t) => onChange(value ? `${value}\n\n${t}` : t)} />
      </div>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g., We should let an agent own first-draft proposals before we hire another salesperson..." className="min-h-[110px]" autoFocus={autoFocus} />
      <p className="text-[11px] text-muted-foreground mt-3 mb-1.5">Not sure where to start? Try one of these:</p>
      <div className="flex flex-wrap gap-1.5">
        {DECISION_EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => onChange(ex)} className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2.5 py-1 transition-colors text-left">{ex.slice(0, 40)}...</button>
        ))}
      </div>
      <Button onClick={onStart} disabled={value.trim().length < 8 || starting} className="w-full mt-4" size="lg">
        {starting ? 'Starting...' : 'Weigh this decision'}<Send className="ml-2 h-4 w-4" />
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
                <Button size="sm" onClick={() => onReRun(a)}>Weigh it again</Button>
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
      <Button onClick={onNew} variant="outline" className="w-full justify-start"><Plus className="h-4 w-4 mr-2" />Weigh a new decision</Button>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-1 pt-2">Your decisions</p>
      {cases.length === 0 && <p className="text-xs text-muted-foreground px-1">Nothing here yet. Weigh your first decision to get started.</p>}
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
              <p className="text-[11px] text-muted-foreground">{c.stage === 'complete' ? 'Weighed' : c.stage === 'error' ? 'Did not finish' : 'In progress'}</p>
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

// ----- 2028 Decisions tab states (prototypes/decisions-2028.html) -----------
// COLD, LOADING, and the error close-out, built to the approved mock. These power
// the rebuilt Decisions tab (PressureTestPanel); onboarding keeps DecisionResult /
// CaptureView above. The mock's RUNNING / WARM / RESULT live in their own files
// (DecisionRunning / DecisionBoard / DecisionResultView).

/**
 * COLD: the one ask. A quiet identity line, then ONE input card (DecisionCapture)
 * that holds type-or-talk, the example as ghost text, and one "Weigh it" CTA.
 * Mobile centres the invite + input as a calm group; desktop gives it room.
 */
export function DecisionCold({
  value, onChange, onStart, starting, isDesktop = false, returning = false, openCount = 0, onOpenDecisions,
}: {
  value: string;
  onChange: (v: string) => void;
  onStart: () => void;
  starting: boolean;
  isDesktop?: boolean;
  /** The leader has weighed before: ask for the NEXT call instead of the first. */
  returning?: boolean;
  /** Open (active) decisions reachable behind a quiet link, never auto-loaded. */
  openCount?: number;
  onOpenDecisions?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center">
      <div className={cn(isDesktop && 'mx-auto w-full max-w-[620px]')}>
        <h1 className={cn('font-extrabold tracking-tight text-foreground', isDesktop ? 'text-[23px]' : 'text-[22px]')}>
          {returning ? "What's the next big call on your plate?" : 'Weigh your first decision.'}
        </h1>
        <p className={cn('mt-2 leading-relaxed text-muted-foreground text-pretty', isDesktop ? 'max-w-[48ch] text-sm' : 'text-[13px]')}>
          {returning
            ? "Say it or type it. I'll pull it apart before you commit."
            : "Tell me the decision you're weighing. I'll break it into the points it rests on, check each one against real sources, and show you what's solid and what's shaky."}
        </p>
        <div className="mt-4">
          <DecisionCapture value={value} onChange={onChange} onStart={onStart} starting={starting} autoFocus={isDesktop} isDesktop={isDesktop} />
        </div>
        {openCount > 0 && onOpenDecisions && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onOpenDecisions}
              className="text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Open decisions ({openCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * LOADING: the branded in-shell skeleton (not a raw spinner). Reuses the shared
 * SkeletonCard + LoadingCaption so the Decisions tab warms up like every other
 * surface (CTRL-SYSTEM-SPEC.md s6 "loading is purposeful, branded, anticipatory").
 */
export function DecisionLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center">
      <SkeletonCard variant="lead" />
      <div className="pt-4"><LoadingCaption>Opening your decisions</LoadingCaption></div>
    </div>
  );
}

/**
 * The honest close-out when a run could not finish. Calm, not alarming; one way
 * forward (weigh another).
 */
export function DecisionErrorView({ message, onReset }: { message: string | null; onReset: () => void }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-2">
      <Card className="w-full max-w-md border-amber-500/30 bg-amber-500/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /><p className="text-sm font-medium">This could not finish.</p></div>
          <p className="mt-2 text-xs text-muted-foreground text-pretty">{message || 'That check hit an error. Try another decision.'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>Weigh another decision</Button>
        </CardContent>
      </Card>
    </div>
  );
}
