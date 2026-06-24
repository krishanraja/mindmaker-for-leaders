// Fixture-render harness (dev/QC). Renders each surface's presentational components against
// the RANGE of content they must hold - so every state can be screenshot + checked before it
// reaches a user (no auth, no data round-trip). Not linked in nav; remove when the redesign is done.
import { useState, type ReactNode } from 'react';
import { DecisionCard } from '@/components/track-record/DecisionCard';
import { TrackRecordView } from '@/components/track-record/TrackRecordView';
import { TrackRecordSkeleton } from '@/components/track-record/TrackRecordSkeleton';
import { buildTrackRecordModel } from '@/components/track-record/trackRecordModel';
import { ConsiderationStone } from '@/components/decision-map/ConsiderationStone';
import { MemoryItemCard } from '@/components/memory/MemoryItemCard';
import { ContestPanel } from '@/components/contest/ContestPanel';
import { HomeFeed } from '@/components/cockpit/HomeFeed';
import { StoneRead } from '@/components/decision-map/StoneRead';
import { BriefingHero } from '@/components/briefing/BriefingHero';
import { AutomatorSuggestions } from '@/components/automator/AutomatorSuggestions';
import { AutomatorCascade } from '@/components/automator/AutomatorCascade';
import { AutomatorSkillReady } from '@/components/automator/AutomatorSkillReady';
import {
  builtYourWayChips,
  cascadeFor,
  type CascadePicks,
  type DeliverableCandidate,
} from '@/components/automator/automatorModel';
import type { BriefingRead } from '@/components/briefing/briefingRead';
import type { TrackRecordRow } from '@/types/track-record';
import type { DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';
import type { UserMemoryFact } from '@/types/memory';
import type { ContestKind, ContestResult, ContestTarget } from '@/types/contest';
import type { CockpitData, DeckCard } from '@/types/cockpit';
import type { SkillData } from '@/types/skill';

const noop = () => {};

const TRACK_FIXTURES: { label: string; row: TrackRecordRow }[] = [
  {
    label: 'played out, read it right, sharpened',
    row: { decision_id: '1', statement: 'Switch our primary AI vendor to the cheaper frontier model?', status: 'decided', decision_kind: 'binary', decided_at: new Date(Date.now() - 6 * 86400000).toISOString(), resolution: 'proceed', played_out: 'true', process_quality: 5, breakpoint_call: 'accept', breakpoint_verdict: 'supported', importance_adjustments: 7 },
  },
  {
    label: "didn't hold, gut differed",
    row: { decision_id: '2', statement: 'Build our own agent stack in-house?', status: 'decided', decision_kind: 'binary', decided_at: new Date(Date.now() - 30 * 86400000).toISOString(), resolution: 'hold', played_out: 'false', process_quality: 2, breakpoint_call: 'accept', breakpoint_verdict: 'contested', importance_adjustments: 3 },
  },
  {
    label: 'not yet played out (the thumb) + calibration',
    row: { decision_id: '3', statement: 'Move customer support to an AI agent first?', status: 'active', decision_kind: 'gtm', decided_at: new Date(Date.now() - 2 * 86400000).toISOString(), resolution: null, played_out: null, process_quality: null, breakpoint_call: 'reject', breakpoint_verdict: 'contested', importance_adjustments: 0 },
  },
  {
    label: 'unsure call (no calibration signal), no outcome',
    row: { decision_id: '4', statement: 'Replatform onto the new agent framework?', status: 'active', decision_kind: 'other', decided_at: new Date().toISOString(), resolution: null, played_out: null, process_quality: null, breakpoint_call: 'unsure', breakpoint_verdict: 'unverified', importance_adjustments: 0 },
  },
  {
    label: 'long statement + no breakpoint data',
    row: { decision_id: '5', statement: 'Should we continue investing in our internal infrastructure or migrate entirely to third-party managed services for better scaling and lower operational overhead?', status: 'active', decision_kind: 'investment', decided_at: new Date(Date.now() - 200 * 86400000).toISOString(), resolution: null, played_out: null, process_quality: null, breakpoint_call: null, breakpoint_verdict: null, importance_adjustments: 0 },
  },
];

// Whole-state fixtures for the You tab (TrackRecordView), driven through the REAL model
// builder so the harness shows exactly what the live page derives. cold = no rows, warm =
// a couple of scored calls (no trend yet), rich = many scored calls across time (a real
// hit-rate + an honest up-trend). Day offsets are wide so the aging labels read naturally.
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const trRow = (
  id: string,
  daysAgo: number,
  played: TrackRecordRow['played_out'],
  call: TrackRecordRow['breakpoint_call'],
  verdict: TrackRecordRow['breakpoint_verdict'],
  statement: string,
): TrackRecordRow => ({
  decision_id: id, statement, status: played ? 'decided' : 'active', decision_kind: 'binary', decided_at: day(daysAgo),
  resolution: played ? 'proceed' : null, played_out: played, process_quality: 4, breakpoint_call: call, breakpoint_verdict: verdict, importance_adjustments: played === 'true' ? 3 : 0,
});

const WARM_ROWS: TrackRecordRow[] = [
  trRow('w1', 9, 'true', 'accept', 'supported', 'Let an agent own first-draft proposals before hiring another rep.'),
  trRow('w2', 2, null, 'accept', 'pending', 'Run the research agent unattended overnight.'),
  trRow('w3', 5, 'true', 'reject', 'contested', 'Hold off on the new orchestration vendor until pricing settles.'),
];

// Rich: enough scored calls across a long window that the earlier half reads worse than the
// recent half (a genuine, honest up-trend). Mix in a watching call and two that did not hold.
const RICH_ROWS: TrackRecordRow[] = [
  trRow('r1', 6, null, 'accept', 'pending', 'Let the research agent run unattended overnight.'),
  trRow('r2', 35, 'true', 'accept', 'supported', 'Ship the assistant on our own data before buying the vendor seat.'),
  trRow('r3', 49, 'true', 'reject', 'contested', 'Put a human approval gate on any agent that touches a credit decision.'),
  trRow('r4', 63, 'false', 'accept', 'supported', 'Hold the price through the new-model launch.'),
  trRow('r5', 77, 'true', 'accept', 'supported', 'Route escalations through the support agent first.'),
  trRow('r6', 110, 'true', 'reject', 'contested', 'Wait on a full rebuild until the agent framework stabilises.'),
  trRow('r7', 140, 'false', 'accept', 'contested', 'Wait on orchestration tooling until the standards settle.'),
  trRow('r8', 170, 'true', 'accept', 'supported', 'Pilot the support agent on tier-2 tickets first.'),
  trRow('r9', 200, 'false', 'reject', 'supported', 'Pause the data-migration until the new hire lands.'),
];

function claim(p: Partial<DecisionClaim> & { id: string; text: string; verdict: DecisionClaim['verdict'] }): DecisionClaim {
  return { type: 'market', is_load_bearing: false, confidence: 0.6, rationale: null, reaction_value: null, reaction_descriptor: null, reaction_kind: null, reaction_evidence_id: null, ...p };
}

const ev = (id: string, claimId: string, stance: DecisionEvidence['stance'], title: string, url: string | null): DecisionEvidence => ({
  id, claim_id: claimId, source_url: url, source_title: title, excerpt: null, stance, retriever: 'perplexity', retrieved_at: null, relevance_score: 0.8,
});

const STONE_FIXTURES: { label: string; claim: DecisionClaim; evidence: DecisionEvidence[] }[] = [
  {
    label: 'Holds, load-bearing, 2 independent sources',
    claim: claim({ id: 'c1', text: 'Is renting cheaper than building?', verdict: 'supported', is_load_bearing: true, rationale: 'Frontier model pricing fell ~40% this year; multiple providers now undercut self-hosting at this volume.' }),
    evidence: [ev('e1', 'c1', 'supports', 'Reuters: token prices down 40%', 'https://reuters.com/a'), ev('e2', 'c1', 'supports', 'The Information', 'https://theinformation.com/b'), ev('e3', 'c1', 'refutes', 'A vendor blog', 'https://oneblog.com/c')],
  },
  {
    label: 'Thin, single source (corroboration-governed)',
    claim: claim({ id: 'c2', text: 'Will switching costs stay low later?', verdict: 'unverified', rationale: 'Only one source addressed lock-in, and weakly.' }),
    evidence: [ev('e4', 'c2', 'supports', 'someblog.dev', 'https://someblog.dev/x')],
  },
  {
    label: 'Contested',
    claim: claim({ id: 'c3', text: 'Are open models at frontier parity for our tasks?', verdict: 'contested', is_load_bearing: true }),
    evidence: [ev('e5', 'c3', 'supports', 'Meta Research', 'https://ai.meta.com/p'), ev('e6', 'c3', 'refutes', 'Benchmark study', 'https://arxiv.org/q')],
  },
  {
    label: 'Only you (unverifiable -> locked)',
    claim: claim({ id: 'c4', text: 'Is your data clean enough to train on?', verdict: 'unverifiable', is_load_bearing: true, rationale: 'Internal data quality - no external source can settle this.' }),
    evidence: [],
  },
  {
    label: 'Checking + very long claim text (wrap)',
    claim: claim({ id: 'c5', text: 'Will the regulatory environment around model provenance and data residency shift enough in the next two quarters to change the build-vs-buy calculus materially?', verdict: 'pending' }),
    evidence: [],
  },
];

function fact(p: Partial<UserMemoryFact> & { fact_label: string; fact_value: string; fact_category: UserMemoryFact['fact_category'] }): UserMemoryFact {
  return {
    id: p.fact_label, user_id: 'u', fact_key: p.fact_label, confidence_score: 0.85, is_high_stakes: false,
    verification_status: 'verified', source_type: 'voice', is_current: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(), updated_at: new Date().toISOString(), ...p,
  };
}

const MEMORY_FIXTURES: { label: string; memory: UserMemoryFact }[] = [
  {
    label: 'core context (importance 9), verified',
    memory: fact({ fact_label: 'Primary objective', fact_value: 'Reach $1M ARR by end of next year, currently at $340K and growing ~12% MoM.', fact_category: 'objective', importance: 9 }),
  },
  {
    label: 'core context blocker (importance 8) - has the automate zap',
    memory: fact({ fact_label: 'Biggest bottleneck', fact_value: 'Manual lead qualification eats ~10 hours a week of the founder\'s time.', fact_category: 'blocker', importance: 8, is_high_stakes: true }),
  },
  {
    label: 'below threshold (importance 6), inferred + low confidence - no marker',
    memory: fact({ fact_label: 'Prefers async comms', fact_value: 'Tends to favour written updates over meetings.', fact_category: 'preference', importance: 6, verification_status: 'inferred', confidence_score: 0.55 }),
  },
  {
    label: 'no importance (pre-brain row) - no marker',
    memory: fact({ fact_label: 'Company', fact_value: 'Runs a 12-person B2B SaaS in the compliance space.', fact_category: 'business', source_type: 'form' }),
  },
  {
    label: 'core context identity, long value (clamp) + context',
    memory: fact({ fact_label: 'Role and mandate', fact_value: 'Founder and CEO, also acting head of product and de-facto head of sales until the next two hires land; owns the board relationship and the fundraising narrative end to end.', fact_category: 'identity', importance: 10, fact_context: 'said on the onboarding call' }),
  },
];

const CONTEST_TARGET: ContestTarget = { target_type: 'decision_claim', target_id: 'x', element: '~40% cheaper to rent than build', surface: '/cockpit' };
const CONTEST_FIXTURES: { label: string; target: ContestTarget; kind: ContestKind | null; note: string; result: ContestResult | null }[] = [
  { label: 'pick a kind (nothing selected yet)', target: CONTEST_TARGET, kind: null, note: '', result: null },
  { label: 'factual selected + a note', target: CONTEST_TARGET, kind: 'factual', note: 'This looks too high vs what vendors actually quote us.', result: null },
  { label: 'sent - factual HONORED (fed the brain)', target: CONTEST_TARGET, kind: 'factual', note: '', result: { report_id: 'r1', honored: true, verdict: 'contested' } },
  { label: 'sent - visual bug (operational, not honored)', target: { target_type: 'ui_element', element: 'bet row icon', surface: '/cockpit' }, kind: 'visual', note: '', result: { report_id: 'r2', honored: false, verdict: null } },
];

const COCKPIT_BETS: CockpitData['bets'] = [
  { id: 'b1', question: 'Buy the agent stack, or build our own?', state: 'countered', freshness: 'cost moved 6d ago' },
  { id: 'b2', question: 'Move customer support to an AI agent first?', state: 'explore', freshness: 'new model landed 2d ago' },
  { id: 'b3', question: 'Build the data moat now, or wait?', state: 'quiet', freshness: 'no fresh signal' },
  { id: 'b4', question: 'Replatform onto the new agent framework?', state: 'quiet', freshness: 'no fresh signal' },
];
// The redesigned Home is greeting + the "worth a look" DECK + the value actions,
// composed as a fit-to-viewport flex column (no page scroll; CockpitView owns
// the frame). The harness exercises the DECK's content range (mixed, near-empty,
// empty) inside a phone-height box so the fit reads true.
const COCKPIT_DECK: DeckCard[] = [
  { id: 'd1', kind: 'signal', eyebrow: 'From your world', headline: 'A call you are weighing just moved.', say: 'On a call you are weighing: Buy the agent stack, or build our own?', betId: 'b1' },
  { id: 'd2', kind: 'news', eyebrow: 'Worth a look', category: 'AI COSTS', headline: 'Running AI got about 40% cheaper this month.', say: 'Renting an agent now costs less than building one - good news if you are weighing build vs buy.', magnitude: { value: '40%', kind: 'sourced' } },
  { id: 'd3', kind: 'news', eyebrow: 'Worth a look', category: 'MODELS', headline: 'A new open model matched the paid frontier on coding.', say: 'You could cut your model bill without losing quality on the work you actually do.', magnitude: { value: '~10x', kind: 'modelled' } },
  { id: 'd4', kind: 'signal', eyebrow: 'From your world', headline: 'Your brain learned 3 new things this week.', say: 'Fresh context from your decisions and notes is now in the loop.' },
];
const COCKPIT_BASE: Omit<CockpitData, 'deck'> = { hero: { kind: 'quiet', headline: '' }, bets: COCKPIT_BETS, liveCount: 4, needsYouCount: 1, homeState: 'warm', ownSignalCount: 2 };
const COCKPIT_FIXTURES: { label: string; data: CockpitData }[] = [
  { label: 'warm - mixed news + your own signals + the 3 doors', data: { ...COCKPIT_BASE, deck: COCKPIT_DECK } },
  { label: 'rich - dense triage (own signals woven)', data: { ...COCKPIT_BASE, homeState: 'rich', deck: COCKPIT_DECK } },
  { label: 'cold - one card left (near caught-up)', data: { ...COCKPIT_BASE, homeState: 'cold', ownSignalCount: 0, deck: [COCKPIT_DECK[1]] } },
];

const BRIEFING_FIXTURES: { label: string; read: BriefingRead }[] = [
  {
    label: 'countered + modelled number (flagship)',
    read: {
      bet: 'Buy the agent stack, or build our own?',
      betState: 'countered',
      magnitude: { value: '10x', kind: 'est.' },
      headline: 'A free model matched the paid frontier at a tenth the cost.',
      considerations: [
        { label: 'Cost gap', state: 'moved', tag: 'signal' },
        { label: 'Your data', state: 'you', tag: 'krishs_take' },
        { label: 'Switching', state: 'you', tag: 'krishs_take' },
        { label: 'Capability', state: 'thin', tag: 'krishs_take' },
        { label: 'Lock-in', state: 'you', tag: 'krishs_take' },
      ],
      movedCount: 1,
      youCount: 3,
      sourceCount: 23,
      segmentCount: 8,
    },
  },
  {
    label: 'no honest number -> words lead (explore)',
    read: {
      bet: 'Move customer support to an AI agent first?',
      betState: 'explore',
      magnitude: null,
      headline: 'A rival just shipped the agent you were going to build.',
      sub: 'It is live, and your window to be first just narrowed.',
      considerations: [
        { label: 'Competitor', state: 'moved', tag: 'signal' },
        { label: 'Your roadmap', state: 'you', tag: 'krishs_take' },
        { label: 'Support load', state: 'thin', tag: 'krishs_take' },
      ],
      movedCount: 1,
      youCount: 1,
      sourceCount: 11,
      segmentCount: 6,
    },
  },
  {
    label: 'quiet day (no spine)',
    read: {
      betState: 'quiet',
      magnitude: null,
      headline: 'A calm read today. Nothing pressing moved on your bets.',
      considerations: [],
      movedCount: 0,
      youCount: 0,
      sourceCount: 4,
      segmentCount: 4,
    },
  },
];

// ── Automator (Build a skill) fixtures ─────────────────────────────────────
const AUTOMATOR_CANDIDATES: DeliverableCandidate[] = [
  {
    id: 'a1', title: 'Your weekly investor update', mined: true, archetype: 'report',
    reasonLead: 'You write one most Mondays', reasonRest: ' - CTRL has seen it in 6 of your last 8 weeks.',
    effortChip: '~45 min each', frequencyChip: 'repeats weekly',
  },
  {
    id: 'a2', title: 'Turn a discovery call into a first proposal', mined: true, archetype: 'proposal',
    reasonLead: 'You do this a few times a week', reasonRest: ' - same shape each time: notes in, proposal out.',
    effortChip: '~30 min each', frequencyChip: 'several a week',
  },
  {
    id: 'a3', title: 'Your monthly board one-pager', mined: false, archetype: 'report',
    reasonLead: 'High effort, same structure', reasonRest: ' every month - the kind of slog a skill removes.',
    effortChip: '~2 hrs', frequencyChip: 'repeats monthly',
  },
];

// A proposal candidate drives the cascade content for the cascade fixtures.
// The redesigned cascade is 3 steps: trigger -> steps -> output.
const CASCADE_CANDIDATE = AUTOMATOR_CANDIDATES[1];
const CASCADE_STEPS = cascadeFor(CASCADE_CANDIDATE);
const CASCADE_PICKS: CascadePicks = {
  trigger: CASCADE_STEPS[0].options[0].id,
  steps: CASCADE_STEPS[1].options[0].id,
  output: CASCADE_STEPS[2].options[0].id,
};

const READY_SKILL: SkillData = {
  name: 'discovery-call-to-proposal',
  description:
    'Turns a discovery call transcript into a first proposal in your voice. Use whenever you say draft the proposal, write up the proposal, or turn this call into a proposal.',
  body: '## When this skill activates\n...',
  references: [],
  test_prompts: [],
  gotchas: [],
  archetype: 'reporting-engine',
};
const READY_CHIPS = builtYourWayChips(CASCADE_STEPS, CASCADE_PICKS);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function PreviewPage() {
  const [open, setOpen] = useState<Record<string, boolean>>({ c1: true, c4: true });
  return (
    // animated={false} renders each component at its final state (no entrance fade) so the
    // static screenshot is clean - headless Chrome pauses framer-motion entrance animations.
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Surface fixtures</h1>
        <p className="mb-8 text-xs text-muted-foreground">Every state each component must hold. Screenshot + check for cram / clip / overflow.</p>

        <Section title="Automator - Suggestions (screen 1)">
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">mined + curated mix, brain badge on</p>
            <div className="rounded-2xl border border-border bg-background p-3">
              <AutomatorSuggestions
                candidates={AUTOMATOR_CANDIDATES}
                loading={false}
                hasMined
                onPick={noop}
                onCustomDeliverable={noop}
                animated={false}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">curated only (thin brain), no badge</p>
            <div className="rounded-2xl border border-border bg-background p-3">
              <AutomatorSuggestions
                candidates={AUTOMATOR_CANDIDATES.map((c) => ({ ...c, mined: false }))}
                loading={false}
                hasMined={false}
                onPick={noop}
                onCustomDeliverable={noop}
                animated={false}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">loading skeletons</p>
            <div className="rounded-2xl border border-border bg-background p-3">
              <AutomatorSuggestions
                candidates={[]}
                loading
                hasMined={false}
                onPick={noop}
                onCustomDeliverable={noop}
                animated={false}
              />
            </div>
          </div>
        </Section>

        <Section title="Automator - Cascade (screen 2)">
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">step 1 (options): how do you do this now?</p>
            <div className="h-[560px] rounded-2xl border border-border bg-background p-3">
              <AutomatorCascade
                candidate={CASCADE_CANDIDATE}
                steps={CASCADE_STEPS}
                stepIndex={0}
                picks={{ how: CASCADE_STEPS[0].options[0].id }}
                direction={1}
                isGenerating={false}
                onSelect={noop}
                onBack={noop}
                onNext={noop}
                animated={false}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">step 4 (samples): which sounds most like you?</p>
            <div className="h-[560px] rounded-2xl border border-border bg-background p-3">
              <AutomatorCascade
                candidate={CASCADE_CANDIDATE}
                steps={CASCADE_STEPS}
                stepIndex={3}
                picks={{ tone: 'warm' }}
                direction={1}
                isGenerating={false}
                onSelect={noop}
                onBack={noop}
                onNext={noop}
                animated={false}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">last step, building (generating)</p>
            <div className="h-[560px] rounded-2xl border border-border bg-background p-3">
              <AutomatorCascade
                candidate={CASCADE_CANDIDATE}
                steps={CASCADE_STEPS}
                stepIndex={4}
                picks={CASCADE_PICKS}
                direction={1}
                isGenerating
                onSelect={noop}
                onBack={noop}
                onNext={noop}
                animated={false}
              />
            </div>
          </div>
        </Section>

        <Section title="Automator - Skill ready (screen 3)">
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">payoff + built-your-way chips + library peek</p>
            <div className="rounded-2xl border border-border bg-background p-3">
              <AutomatorSkillReady
                skill={READY_SKILL}
                chips={READY_CHIPS}
                whatItDoes="Turns a discovery call transcript into a first proposal in your voice."
                library={[
                  { id: 'new', label: 'Discovery -> proposal' },
                  { id: 'l2', label: 'Weekly investor update' },
                  { id: 'l3', label: 'Board one-pager' },
                ]}
                onRun={noop}
                onExport={noop}
                onSeeAll={noop}
                onBuildAnother={noop}
                animated={false}
              />
            </div>
          </div>
        </Section>

        <Section title="Home 2028 (mobile swipe feed) - HomeFeed">
          {COCKPIT_FIXTURES.map((f) => (
            <div key={f.label}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              {/* phone-height box: HomeFeed is a fit-to-viewport flex column */}
              <div className="h-[760px] rounded-2xl border border-border bg-background p-3">
                <HomeFeed
                  variant="mobile"
                  data={f.data}
                  loading={false}
                  greeting="Good morning, Krish."
                  onOpenCard={noop}
                />
              </div>
            </div>
          ))}
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">loading - in-shell branded skeleton</p>
            <div className="h-[760px] rounded-2xl border border-border bg-background p-3">
              <HomeFeed
                variant="mobile"
                data={COCKPIT_FIXTURES[0].data}
                loading
                greeting="Good morning, Krish."
                onOpenCard={noop}
              />
            </div>
          </div>
        </Section>

        <Section title="Stone Read (number-or-words hero) - StoneRead">
          {STONE_FIXTURES.map((f) => (
            <div key={f.claim.id}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              <div className="rounded-2xl border border-border bg-background p-3">
                <StoneRead claim={f.claim} evidence={f.evidence} call={null} onSetCall={noop} onGoDeeper={noop} animated={false} />
              </div>
            </div>
          ))}
        </Section>

        <Section title="Briefing hero - BriefingHero">
          {BRIEFING_FIXTURES.map((f) => (
            <div key={f.label}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              <div className="rounded-2xl border border-border bg-background p-3">
                <BriefingHero read={f.read} ctaLabel="Generate today's briefing" onCta={noop} onGoDeeper={noop} animated={false} />
              </div>
            </div>
          ))}
        </Section>

        <Section title="Track Record - DecisionCard">
          {TRACK_FIXTURES.map((f) => (
            <div key={f.row.decision_id}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              <DecisionCard row={f.row} onRecord={noop} busy={false} animated={false} />
            </div>
          ))}
        </Section>

        <Section title="Track Record - TrackRecordView (whole-state: cold / warm / rich / loading)">
          {[
            { label: 'cold - the promise (no banked calls, never zeros)', rows: [] as TrackRecordRow[] },
            { label: 'warm - first pattern (mobile column)', rows: WARM_ROWS },
            { label: 'rich - earned record (mobile column)', rows: RICH_ROWS },
          ].map((f) => {
            const model = buildTrackRecordModel(f.rows);
            return (
              <div key={`m-${f.label}`}>
                <p className="mb-1 text-[10px] text-muted-foreground/70">mobile - {f.label}</p>
                <div className="mx-auto w-[412px] max-w-full rounded-2xl border border-border bg-background p-4">
                  <div className="flex min-h-[560px] flex-col">
                    <TrackRecordView model={model} desktop={false} onWeigh={noop} animated={false} />
                  </div>
                </div>
              </div>
            );
          })}
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground/70">mobile - loading (in-shell skeleton)</p>
            <div className="mx-auto w-[412px] max-w-full rounded-2xl border border-border bg-background p-4">
              <div className="flex min-h-[560px] flex-col">
                <TrackRecordSkeleton />
              </div>
            </div>
          </div>
          {/* Desktop blocks break out of the mobile-width harness column to a realistic
              ~1080px main width (DesktopShell main at 1366), so the two-zone layout is
              previewable honestly. data-tr-desktop marks them for the screenshot tool. */}
          {[
            { label: 'desktop - cold (the promise, room to breathe)', rows: [] as TrackRecordRow[], h: 'h-[520px]' },
            { label: 'desktop - warm (calm single column)', rows: WARM_ROWS, h: 'h-[440px]' },
            { label: 'desktop - rich (two-zone)', rows: RICH_ROWS, h: 'h-[460px]' },
          ].map((f) => {
            const model = buildTrackRecordModel(f.rows);
            return (
              <div key={`d-${f.label}`} data-tr-desktop className="relative left-1/2 w-[1080px] max-w-[92vw] -translate-x-1/2">
                <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
                <div className="rounded-2xl border border-border bg-background p-6">
                  <div className={`flex ${f.h} flex-col`}>
                    <TrackRecordView model={model} desktop onWeigh={noop} animated={false} />
                  </div>
                </div>
              </div>
            );
          })}
          <div data-tr-desktop className="relative left-1/2 w-[1080px] max-w-[92vw] -translate-x-1/2">
            <p className="mb-1 text-[10px] text-muted-foreground/70">desktop - loading (in-shell skeleton)</p>
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="flex h-[420px] flex-col">
                <TrackRecordSkeleton desktop />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Decision Map - ConsiderationStone">
          {STONE_FIXTURES.map((f) => (
            <div key={f.claim.id}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              <ConsiderationStone
                claim={f.claim}
                evidence={f.evidence}
                expanded={!!open[f.claim.id]}
                onToggle={() => setOpen((o) => ({ ...o, [f.claim.id]: !o[f.claim.id] }))}
                animated={false}
              />
            </div>
          ))}
        </Section>

        <Section title="Memory Web - MemoryItemCard">
          {MEMORY_FIXTURES.map((f) => (
            <div key={f.memory.id}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              <MemoryItemCard memory={f.memory} onEdit={noop} onDelete={noop} animated={false} />
            </div>
          ))}
        </Section>

        <Section title="Contest this - ContestPanel">
          {CONTEST_FIXTURES.map((f) => (
            <div key={f.label}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              <div className="overflow-hidden rounded-2xl border border-border bg-background">
                <ContestPanel
                  target={f.target}
                  selectedKind={f.kind}
                  onSelectKind={noop}
                  note={f.note}
                  onNoteChange={noop}
                  onSubmit={noop}
                  result={f.result}
                  onClose={noop}
                  animated={false}
                />
              </div>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
