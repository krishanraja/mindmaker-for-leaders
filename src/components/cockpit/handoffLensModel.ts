import { z } from 'zod';
import { starterDecisionForLane } from '@/lib/starterDecisions';

export const handoffSignalSchema = z.object({
  entryVariant: z.string().nullish(),
  q2: z.string().nullish(),
  q4: z.string().nullish(),
  anxietyLane: z.string().nullish(),
  companyDomain: z.string().nullish(),
  archetypeTitle: z.string().nullish(),
  source: z.string().nullish(),
  personName: z.string().nullish(),
  roleTitle: z.string().nullish(),
  linkedinUrl: z.string().url().nullish(),
  companyName: z.string().nullish(),
  companySummary: z.string().nullish(),
  companyLogoUrl: z.string().url().nullish(),
  companySignals: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    source: z.string(),
    publishedAt: z.string().nullable().optional(),
    excerpt: z.string().optional(),
    sourceCount: z.number().optional(),
    verified: z.boolean().optional(),
  })).max(3).nullish(),
  dossierStrength: z.record(z.string(), z.unknown()).nullish(),
  dossierConfirmedAt: z.string().datetime().nullish(),
});

export type HandoffSignal = z.infer<typeof handoffSignalSchema>;

export interface HandoffLensModel {
  laneLabel: string;
  focusPhrase: string;
  headline: string;
  interpretation: string;
  starterDecision: string;
}

interface LaneCopy {
  label: string;
  phrase: string;
  headline: string;
  bias: string;
}

const LANE_COPY: Record<string, LaneCopy> = {
  orchestration: {
    label: 'Orchestration',
    phrase: 'getting AI agents wired into how your team actually works',
    headline: 'Wire agents into the work. Keep judgment human.',
    bias: 'orchestration, team design and proof that the work actually moved',
  },
  org: {
    label: 'Org and talent',
    phrase: 'what AI changes about your team and headcount',
    headline: 'Redesign the work. Keep the people decisions human.',
    bias: 'team design, role changes and evidence before headcount moves',
  },
  economics: {
    label: 'AI economics',
    phrase: 'the build-versus-buy and cost maths on AI',
    headline: 'Follow the maths. Keep the decision bigger than cost.',
    bias: 'cost shifts, build-versus-buy calls and the proof behind them',
  },
  tools: {
    label: 'Tools and vendors',
    phrase: 'which AI tools to standardise on',
    headline: 'Standardise the stack. Keep optionality where it matters.',
    bias: 'vendor moves, switching costs and where standardisation earns its place',
  },
  product: {
    label: 'Product and go-to-market',
    phrase: 'rebuilding how you go to market with AI',
    headline: 'Rebuild the route to market. Keep the customer signal close.',
    bias: 'AI-native products, distribution shifts and real adoption proof',
  },
  governance: {
    label: 'Governance',
    phrase: 'the policy and guardrails for AI use',
    headline: 'Put guardrails around the work. Keep the useful speed.',
    bias: 'practical policy, accountability and the rules that change a live decision',
  },
  security: {
    label: 'Security and risk',
    phrase: 'your AI security exposure',
    headline: 'Let agents act. Keep the blast radius small.',
    bias: 'agent risk, permission boundaries and failures that deserve action',
  },
  model: {
    label: 'Models and capability',
    phrase: 'which models to bet on',
    headline: 'Bet on capabilities. Keep the stack portable.',
    bias: 'capability shifts, model trade-offs and the cost of getting locked in',
  },
  proof: {
    label: 'Proof and adoption',
    phrase: 'proving AI is actually paying off',
    headline: 'Demand proof. Keep the theatre out.',
    bias: 'adoption evidence, operating results and claims that survive inspection',
  },
};

const DEFAULT_LANE: LaneCopy = {
  label: 'Your starting lens',
  phrase: 'the AI shift in your business',
  headline: 'Put AI into the work. Keep judgment human.',
  bias: 'the AI changes that alter a real decision in your business',
};

const EXTRA_SELF_COPY: Record<string, string> = {
  think: 'more space to think',
  do: 'doing over watching',
  talk: 'another useful voice in the room',
  watch: 'better signal over more noise',
};

const FUTURE_COPY: Record<string, string> = {
  same: 'a company that stays close to how it works today',
  leaner: 'a deliberately leaner company',
  hybrid: 'a hybrid company over a fully autonomous one',
  autonomous: 'a more autonomous company',
};

export function handoffLensFor(signal: HandoffSignal): HandoffLensModel {
  const laneKey = (signal.anxietyLane ?? '').toLowerCase();
  const lane = LANE_COPY[laneKey] ?? DEFAULT_LANE;
  const extraSelf = EXTRA_SELF_COPY[(signal.q2 ?? '').toLowerCase()] ?? 'a clearer view of what deserves you';
  const future = FUTURE_COPY[(signal.q4 ?? '').toLowerCase()] ?? 'a company where AI has an earned role';

  return {
    laneLabel: lane.label,
    focusPhrase: lane.phrase,
    headline: lane.headline,
    interpretation: `You chose ${extraSelf}, and ${future}. I will bias CTRL towards ${lane.bias}.`,
    starterDecision: starterDecisionForLane(laneKey),
  };
}
