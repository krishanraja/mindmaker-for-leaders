import { DiagnosticData, DiagnosticScores } from '../components/DiagnosticTool';

export interface ROIMetrics {
  monthlyOpportunityCost: number;
  timeWastedHours: number;
  revenueOpportunityMissed: number;
  teamProductivityDrag: number;
  annualImpactPotential: number;
}

export interface ImpactArea {
  name: string;
  currentWaste: string;
  potentialSavings: string;
  monthlyValue: number;
  description: string;
  progressValue: number;
}

// Industry benchmarks for calculations
const EXECUTIVE_HOURLY_RATE = 350; // Average for senior leaders
const DECISION_DELAY_COST_MULTIPLIER = 0.15; // 15% revenue impact per month delay
const TEAM_PRODUCTIVITY_MULTIPLIER = 2.5; // Average team size impact
const AI_EFFICIENCY_GAIN = 0.4; // 40% efficiency improvement with AI

export function calculateROIMetrics(data: DiagnosticData, scores: DiagnosticScores): ROIMetrics {
  // Calculate time waste from low productivity
  const deepWorkDeficit = Math.max(0, 40 - (data.deepWorkHours || 0)); // Should be 40+ hours
  const meetingOverhead = Math.max(0, (data.meetingHours || 0) - 15); // Optimal is 10-15 hours
  const adminWaste = Math.max(0, (data.adminHours || 0) - 5); // Should be <5 hours
  
  const timeWastedHours = deepWorkDeficit + meetingOverhead + adminWaste;
  
  // Calculate decision delay costs
  const decisionDelayHours = Math.max(0, (data.hoursToDecision || 0) - 2); // Optimal is <2 hours
  const decisionCostImpact = decisionDelayHours * EXECUTIVE_HOURLY_RATE * DECISION_DELAY_COST_MULTIPLIER;
  
  // Calculate missed AI efficiency gains
  const currentAICopilots = data.aiCopilots?.length || 0;
  const optimalAICopilots = 4; // Benchmark for high performers
  const aiGapCost = (optimalAICopilots - currentAICopilots) * 8 * EXECUTIVE_HOURLY_RATE * AI_EFFICIENCY_GAIN;
  
  // Calculate team productivity drag
  const influenceGap = Math.max(0, 80 - scores.influenceQuotient) / 100;
  const teamDragCost = influenceGap * TEAM_PRODUCTIVITY_MULTIPLIER * 40 * EXECUTIVE_HOURLY_RATE;
  
  const monthlyOpportunityCost = Math.round(
    (timeWastedHours * EXECUTIVE_HOURLY_RATE * 4) + // Weekly waste * 4 weeks
    decisionCostImpact +
    aiGapCost +
    teamDragCost
  );
  
  return {
    monthlyOpportunityCost,
    timeWastedHours: Math.round(timeWastedHours),
    revenueOpportunityMissed: Math.round(decisionCostImpact),
    teamProductivityDrag: Math.round(teamDragCost),
    annualImpactPotential: monthlyOpportunityCost * 12
  };
}

export function calculateImpactAreas(data: DiagnosticData, scores: DiagnosticScores): ImpactArea[] {
  const roiMetrics = calculateROIMetrics(data, scores);
  
  return [
    {
      name: "Time Reclamation Opportunity",
      currentWaste: `${roiMetrics.timeWastedHours}h wasted weekly`,
      potentialSavings: `Reclaim ${Math.round(roiMetrics.timeWastedHours * 0.8)}h/week`,
      monthlyValue: Math.round(roiMetrics.timeWastedHours * EXECUTIVE_HOURLY_RATE * 4 * 0.8),
      description: "AI-powered workflow optimization and automation",
      progressValue: scores.productivityMultiplier
    },
    {
      name: "Decision Velocity Impact",
      currentWaste: `${Math.round((data.hoursToDecision || 0) - 2)}h average delay`,
      potentialSavings: `90% faster decisions`,
      monthlyValue: Math.round(roiMetrics.revenueOpportunityMissed * 0.9),
      description: "AI-enhanced decision support and data synthesis",
      progressValue: scores.decisionAgility
    },
    {
      name: "Stakeholder Alignment ROI",
      currentWaste: `${100 - scores.influenceQuotient}% influence gap`,
      potentialSavings: `3x faster buy-in`,
      monthlyValue: Math.round(roiMetrics.teamProductivityDrag * 0.7),
      description: "AI-optimized communication and persuasion strategies",
      progressValue: scores.influenceQuotient
    },
    {
      name: "Competitive Advantage Gap",
      currentWaste: `${Math.round((100 - scores.growthMindset) * 0.3)} months behind`,
      potentialSavings: `6x faster skill acquisition`,
      monthlyValue: Math.round(roiMetrics.monthlyOpportunityCost * 0.2),
      description: "AI-accelerated learning and capability development",
      progressValue: scores.growthMindset
    },
    {
      name: "Risk Mitigation Value",
      currentWaste: `${100 - scores.governanceConfidence}% risk exposure`,
      potentialSavings: `Prevent $50K+ in AI missteps`,
      monthlyValue: 4200, // Conservative risk prevention value
      description: "AI governance framework and risk management",
      progressValue: scores.governanceConfidence
    }
  ];
}

export function getROIPersonaDescription(scores: DiagnosticScores, roiMetrics: ROIMetrics): string {
  if (scores.influenceQuotient > 70 && scores.decisionAgility < 50) {
    return `High-Impact Decision Maker leaving $${Math.round(roiMetrics.monthlyOpportunityCost / 1000)}K/month on the table`;
  }
  if (scores.productivityMultiplier > 80) {
    return `Productivity Leader with untapped $${Math.round(roiMetrics.annualImpactPotential / 1000)}K annual potential`;
  }
  if (scores.growthMindset > 75) {
    return `Growth Catalyst missing $${Math.round(roiMetrics.monthlyOpportunityCost * 0.6 / 1000)}K in competitive advantage`;
  }
  return `Emerging AI Leader with $${Math.round(roiMetrics.annualImpactPotential / 1000)}K+ optimization opportunity`;
}

export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}