/**
 * SCALE UPS Dimension Mapping Utility
 * 
 * Maps existing Leaders assessment responses to 6 business dimensions
 * from SCALE UPS without adding new user-facing questions.
 */

export interface ScaleUpsDimension {
  dimension: string;
  level: 'Manual-Bound' | 'Experimenter' | 'Accelerator' | 'Category Breaker';
  reasoning: string;
}

export interface ScaleUpsLens {
  dimensions: ScaleUpsDimension[];
  overallMaturity: string;
}

/**
 * Derives SCALE UPS lens from existing assessment and deep profile data
 */
export function deriveScaleUpsLens(
  assessmentData: any,
  deepProfileData: any | null
): ScaleUpsLens {
  // Extract scores from assessment data
  const scores = extractScores(assessmentData);
  
  const dimensions: ScaleUpsDimension[] = [
    mapCustomerIntelligence(scores, deepProfileData),
    mapWorkflowAutomation(scores, deepProfileData),
    mapGrowthSystems(scores, deepProfileData),
    mapStrategicSpeed(scores, deepProfileData),
    mapBusinessImpactTracking(scores, deepProfileData),
    mapCompetitiveEdge(scores, deepProfileData)
  ];

  // Calculate overall maturity
  const levelScores = dimensions.map(d => {
    switch (d.level) {
      case 'Category Breaker': return 4;
      case 'Accelerator': return 3;
      case 'Experimenter': return 2;
      case 'Manual-Bound': return 1;
      default: return 1;
    }
  });
  
  const avgScore = levelScores.reduce((a, b) => a + b, 0) / levelScores.length;
  const overallMaturity = avgScore >= 3.5 ? 'Category Breaker trajectory' :
                         avgScore >= 2.5 ? 'Accelerator mindset' :
                         avgScore >= 1.5 ? 'Experimenter phase' :
                         'Building foundation';

  return { dimensions, overallMaturity };
}

/**
 * Extract numeric scores from assessment responses
 */
function extractScores(assessmentData: any): Record<string, number> {
  const scores: Record<string, number> = {};
  
  Object.entries(assessmentData).forEach(([key, value]: [string, any]) => {
    if (typeof value === 'string') {
      const match = value.match(/^(\d+)/);
      if (match) {
        scores[key] = parseInt(match[1]);
      }
    }
  });
  
  return scores;
}

/**
 * Customer Intelligence: Understanding and leveraging customer data
 * Based on: external_positioning (Q4) + stakeholders (deep profile)
 */
function mapCustomerIntelligence(
  scores: Record<string, number>,
  deepProfileData: any | null
): ScaleUpsDimension {
  const extPosScore = scores.external_positioning || 0;
  const hasStakeholderData = deepProfileData?.stakeholders?.length > 0;
  const stakeholderCount = deepProfileData?.stakeholders?.length || 0;
  
  let level: ScaleUpsDimension['level'];
  let reasoning: string;
  
  if (extPosScore === 5 && stakeholderCount >= 4) {
    level = 'Category Breaker';
    reasoning = 'Deep stakeholder alignment with integrated AI-driven customer insights';
  } else if (extPosScore >= 4 || (extPosScore === 3 && stakeholderCount >= 3)) {
    level = 'Accelerator';
    reasoning = 'Strong external positioning with systematic stakeholder engagement';
  } else if (extPosScore === 3 || hasStakeholderData) {
    level = 'Experimenter';
    reasoning = 'Building customer intelligence capabilities and stakeholder awareness';
  } else {
    level = 'Manual-Bound';
    reasoning = 'Limited customer data integration; manual stakeholder management';
  }
  
  return { dimension: 'Customer Intelligence', level, reasoning };
}

/**
 * Workflow Automation: Streamlining operational processes
 * Based on: business_acceleration (Q2) + timeWaste + delegateTasks (deep profile)
 */
function mapWorkflowAutomation(
  scores: Record<string, number>,
  deepProfileData: any | null
): ScaleUpsDimension {
  const bizAccelScore = scores.business_acceleration || 0;
  const timeWaste = deepProfileData?.timeWaste || 50;
  const hasDelegationPlan = deepProfileData?.delegateTasks?.length > 0;
  
  let level: ScaleUpsDimension['level'];
  let reasoning: string;
  
  if (bizAccelScore === 5 && timeWaste < 20 && hasDelegationPlan) {
    level = 'Category Breaker';
    reasoning = 'Highly automated workflows with clear AI delegation strategy';
  } else if (bizAccelScore >= 4 && timeWaste < 40) {
    level = 'Accelerator';
    reasoning = 'Active automation initiatives reducing operational inefficiency';
  } else if (bizAccelScore === 3 || hasDelegationPlan) {
    level = 'Experimenter';
    reasoning = 'Identifying automation opportunities; early workflow optimization';
  } else {
    level = 'Manual-Bound';
    reasoning = 'High manual effort; limited process automation or delegation';
  }
  
  return { dimension: 'Workflow Automation', level, reasoning };
}

/**
 * Growth Systems: Revenue acceleration mechanisms
 * Based on: business_acceleration (Q2) + kpi_connection (Q5) + transformationGoal
 */
function mapGrowthSystems(
  scores: Record<string, number>,
  deepProfileData: any | null
): ScaleUpsDimension {
  const bizAccelScore = scores.business_acceleration || 0;
  const kpiScore = scores.kpi_connection || 0;
  const hasGrowthGoal = deepProfileData?.transformationGoal?.toLowerCase().includes('revenue') ||
                        deepProfileData?.transformationGoal?.toLowerCase().includes('growth') ||
                        deepProfileData?.transformationGoal?.toLowerCase().includes('sales');
  
  let level: ScaleUpsDimension['level'];
  let reasoning: string;
  
  const avgScore = (bizAccelScore + kpiScore) / 2;
  
  if (avgScore >= 4.5 && hasGrowthGoal) {
    level = 'Category Breaker';
    reasoning = 'Systematic revenue acceleration with AI-powered growth systems';
  } else if (avgScore >= 4) {
    level = 'Accelerator';
    reasoning = 'Clear business acceleration path with KPI-driven growth initiatives';
  } else if (avgScore >= 3) {
    level = 'Experimenter';
    reasoning = 'Exploring growth levers; connecting AI to business outcomes';
  } else {
    level = 'Manual-Bound';
    reasoning = 'Traditional growth approach; limited AI-driven acceleration';
  }
  
  return { dimension: 'Growth Systems', level, reasoning };
}

/**
 * Strategic Speed: Decision-making velocity
 * Based on: industry_impact (Q1) + informationNeeds + thinkingProcess (deep profile)
 */
function mapStrategicSpeed(
  scores: Record<string, number>,
  deepProfileData: any | null
): ScaleUpsDimension {
  const industryScore = scores.industry_impact || 0;
  const hasDataNeeds = deepProfileData?.informationNeeds?.includes('Market trends and competitive analysis') ||
                       deepProfileData?.informationNeeds?.includes('Real-time business metrics and KPIs');
  const isAnalytical = deepProfileData?.thinkingProcess?.toLowerCase().includes('data') ||
                       deepProfileData?.thinkingProcess?.toLowerCase().includes('analytic');
  
  let level: ScaleUpsDimension['level'];
  let reasoning: string;
  
  if (industryScore === 5 && hasDataNeeds) {
    level = 'Category Breaker';
    reasoning = 'AI-accelerated decision velocity with real-time intelligence';
  } else if (industryScore >= 4 || (industryScore === 3 && isAnalytical)) {
    level = 'Accelerator';
    reasoning = 'Structured decision-making with data-driven insights';
  } else if (industryScore === 3 || hasDataNeeds) {
    level = 'Experimenter';
    reasoning = 'Building strategic speed through better information access';
  } else {
    level = 'Manual-Bound';
    reasoning = 'Slower decision cycles; limited strategic intelligence tools';
  }
  
  return { dimension: 'Strategic Speed', level, reasoning };
}

/**
 * Business Impact Tracking: KPI-driven measurement
 * Based on: kpi_connection (Q5) + workBreakdown (planning/decisions %)
 */
function mapBusinessImpactTracking(
  scores: Record<string, number>,
  deepProfileData: any | null
): ScaleUpsDimension {
  const kpiScore = scores.kpi_connection || 0;
  const planningPct = deepProfileData?.workBreakdown?.planning || 0;
  const decisionsPct = deepProfileData?.workBreakdown?.decisions || 0;
  const strategicWork = planningPct + decisionsPct;
  
  let level: ScaleUpsDimension['level'];
  let reasoning: string;
  
  if (kpiScore === 5 && strategicWork >= 40) {
    level = 'Category Breaker';
    reasoning = 'Rigorous KPI tracking with high strategic planning allocation';
  } else if (kpiScore >= 4 || (kpiScore === 3 && strategicWork >= 30)) {
    level = 'Accelerator';
    reasoning = 'Active KPI monitoring with structured measurement frameworks';
  } else if (kpiScore === 3 || strategicWork >= 20) {
    level = 'Experimenter';
    reasoning = 'Developing measurement discipline; early KPI connections';
  } else {
    level = 'Manual-Bound';
    reasoning = 'Limited impact tracking; measurement gaps in AI initiatives';
  }
  
  return { dimension: 'Business Impact Tracking', level, reasoning };
}

/**
 * Competitive Edge: Market differentiation
 * Based on: external_positioning (Q4) + coaching_champions (Q6) + team_alignment (Q3)
 */
function mapCompetitiveEdge(
  scores: Record<string, number>,
  deepProfileData: any | null
): ScaleUpsDimension {
  const extPosScore = scores.external_positioning || 0;
  const coachingScore = scores.coaching_champions || 0;
  const teamAlignScore = scores.team_alignment || 0;
  
  const avgScore = (extPosScore + coachingScore + teamAlignScore) / 3;
  
  let level: ScaleUpsDimension['level'];
  let reasoning: string;
  
  if (avgScore >= 4.5) {
    level = 'Category Breaker';
    reasoning = 'Market-leading AI positioning with strong internal champions';
  } else if (avgScore >= 4) {
    level = 'Accelerator';
    reasoning = 'Building competitive moat through AI capabilities and culture';
  } else if (avgScore >= 3) {
    level = 'Experimenter';
    reasoning = 'Developing AI differentiation; growing internal expertise';
  } else {
    level = 'Manual-Bound';
    reasoning = 'Competitive parity at risk; limited AI market differentiation';
  }
  
  return { dimension: 'Competitive Edge', level, reasoning };
}
