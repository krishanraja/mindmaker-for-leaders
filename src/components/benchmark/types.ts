import { Crown, Star, Target, TrendingUp } from 'lucide-react';

export const tierConfig = {
  'AI-Orchestrator': {
    icon: Crown,
    gradient: 'from-yellow-400 to-yellow-600',
    badgeStyle: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  'AI-Confident': {
    icon: Star,
    gradient: 'from-blue-400 to-blue-600',
    badgeStyle: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'AI-Aware': {
    icon: Target,
    gradient: 'from-green-400 to-green-600',
    badgeStyle: 'bg-green-100 text-green-800 border-green-300',
  },
  'AI-Emerging': {
    icon: TrendingUp,
    gradient: 'from-gray-400 to-gray-600',
    badgeStyle: 'bg-gray-100 text-gray-800 border-gray-300',
  },
};

export const dimensionLabels: Record<string, string> = {
  ai_fluency: 'AI Fluency',
  decision_velocity: 'Decision Velocity',
  experimentation_cadence: 'Experimentation Cadence',
  delegation_augmentation: 'Delegation & Augmentation',
  alignment_communication: 'Alignment & Communication',
  risk_governance: 'Risk & Governance',
};

export const shortDimensionLabels: Record<string, string> = {
  ai_fluency: 'AI Fluency',
  decision_velocity: 'Decision Velocity',
  experimentation_cadence: 'Experimentation',
  delegation_augmentation: 'Delegation',
  alignment_communication: 'Alignment',
  risk_governance: 'Risk Management',
};

export const leverInsights: Record<string, { why: string; action: string; outcome: string }> = {
  ai_fluency: {
    why: 'AI Fluency is your foundation. Without hands-on tool mastery, strategic decisions lack grounding and team adoption stalls.',
    action: 'Commit to 30 minutes daily practicing AI tools in your actual workflow. Start with meeting prep automation.',
    outcome: `Within 2 weeks, you'll reclaim 3-5 hours weekly and have credibility to drive team adoption.`
  },
  decision_velocity: {
    why: 'Slow decisions compound. Every delayed choice costs momentum and gives competitors time to move.',
    action: 'Use AI to pre-analyze options before meetings. Generate tradeoff matrices and stakeholder impact assessments.',
    outcome: 'Cut decision time by 40% and make higher-quality calls with quantified risks.'
  },
  experimentation_cadence: {
    why: 'Without regular pilots, you\'re theorizing instead of learning. Competitors are building real AI muscle.',
    action: 'Launch a 2-week pilot on one repetitive process this month. Measure time saved and iterate.',
    outcome: 'Build confidence through proof points and establish a systematic testing rhythm.'
  },
  delegation_augmentation: {
    why: 'Every hour you spend on automatable work is an hour not spent on strategy. This gap scales linearly with time.',
    action: 'Identify your top 3 time-wasters and automate the most repetitive one using AI tools.',
    outcome: 'Reclaim 5-8 hours weekly and model effective AI delegation for your team.'
  },
  alignment_communication: {
    why: 'Misaligned stakeholders create friction that slows every initiative. Clear communication is your force multiplier.',
    action: 'Build AI-powered templates for stakeholder updates that address their specific priorities.',
    outcome: 'Reduce alignment meetings by 30% and accelerate initiative approvals.'
  },
  risk_governance: {
    why: 'Unmanaged AI risk creates future crises. Early guardrails cost hours now but prevent months of cleanup later.',
    action: 'Draft a one-page AI usage policy covering data sensitivity, approval workflows, and tool standards.',
    outcome: 'Prevent shadow AI proliferation and build foundation for scaled adoption.'
  }
};
