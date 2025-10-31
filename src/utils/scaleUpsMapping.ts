/**
 * Leadership Comparison Utility
 * 
 * Maps existing Leaders assessment responses to 6 individual leadership capabilities
 * to show how the executive compares to other leaders.
 */

export interface LeadershipDimension {
  dimension: string;
  level: 'Building Foundations' | 'Active Explorer' | 'Confident Practitioner' | 'AI Pioneer';
  reasoning: string;
}

export interface LeadershipComparison {
  dimensions: LeadershipDimension[];
  overallMaturity: string;
}

/**
 * Derives leadership comparison from existing assessment and deep profile data
 */
export function deriveLeadershipComparison(
  assessmentData: any,
  deepProfileData: any | null
): LeadershipComparison {
  // Extract scores from assessment data
  const scores = extractScores(assessmentData);
  
  const dimensions: LeadershipDimension[] = [
    mapAIFluency(scores, deepProfileData),
    mapDelegationMastery(scores, deepProfileData),
    mapStrategicVision(scores, deepProfileData),
    mapDecisionAgility(scores, deepProfileData),
    mapImpactOrientation(scores, deepProfileData),
    mapChangeLeadership(scores, deepProfileData)
  ];

  // Calculate overall maturity with peer comparison language
  const levelScores = dimensions.map(d => {
    switch (d.level) {
      case 'AI Pioneer': return 4;
      case 'Confident Practitioner': return 3;
      case 'Active Explorer': return 2;
      case 'Building Foundations': return 1;
      default: return 1;
    }
  });
  
  const avgScore = levelScores.reduce((a, b) => a + b, 0) / levelScores.length;
  const overallMaturity = avgScore >= 3.5 ? 'AI Pioneer - Top 10% of AI-fluent leaders' :
                         avgScore >= 2.5 ? 'Confident Practitioner - In top 25% of executives' :
                         avgScore >= 1.5 ? 'Active Explorer - Ahead of 50-60% of executives' :
                         'Building Foundations - Developing core AI leadership skills';

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
 * AI Fluency: How well you understand and speak AI
 * Based on: industry_impact (Q1) + awareness level
 */
function mapAIFluency(
  scores: Record<string, number>,
  deepProfileData: any | null
): LeadershipDimension {
  const industryScore = scores.industry_impact || 0;
  const hasInformationNeeds = deepProfileData?.informationNeeds?.length > 0;
  
  let level: LeadershipDimension['level'];
  let reasoning: string;
  
  if (industryScore === 5) {
    level = 'AI Pioneer';
    reasoning = 'You articulate AI\'s impact with exceptional clarity and can educate others on industry transformation';
  } else if (industryScore >= 4) {
    level = 'Confident Practitioner';
    reasoning = 'You have strong AI fluency and can confidently discuss its business implications';
  } else if (industryScore === 3 || hasInformationNeeds) {
    level = 'Active Explorer';
    reasoning = 'You\'re actively building your AI vocabulary and understanding of its potential';
  } else {
    level = 'Building Foundations';
    reasoning = 'You\'re in the early stages of developing your AI fluency - a great place to start';
  }
  
  return { dimension: 'AI Fluency', level, reasoning };
}

/**
 * Delegation Mastery: Your ability to delegate and empower through AI
 * Based on: business_acceleration (Q2) + delegateTasks + timeWaste (deep profile)
 */
function mapDelegationMastery(
  scores: Record<string, number>,
  deepProfileData: any | null
): LeadershipDimension {
  const bizAccelScore = scores.business_acceleration || 0;
  const timeWaste = deepProfileData?.timeWaste || 50;
  const hasDelegationPlan = deepProfileData?.delegateTasks?.length > 0;
  
  let level: LeadershipDimension['level'];
  let reasoning: string;
  
  if (bizAccelScore === 5 && timeWaste < 20 && hasDelegationPlan) {
    level = 'AI Pioneer';
    reasoning = 'You excel at strategic delegation and have freed up significant time for high-impact work';
  } else if (bizAccelScore >= 4 && timeWaste < 40) {
    level = 'Confident Practitioner';
    reasoning = 'You\'re actively delegating tasks to AI and reclaiming valuable time for strategic priorities';
  } else if (bizAccelScore === 3 || hasDelegationPlan) {
    level = 'Active Explorer';
    reasoning = 'You\'re identifying what to delegate - keep experimenting to find your time-saving wins';
  } else {
    level = 'Building Foundations';
    reasoning = 'You have significant opportunity to free up your time by delegating routine tasks to AI';
  }
  
  return { dimension: 'Delegation Mastery', level, reasoning };
}

/**
 * Strategic Vision: Your ability to connect AI to business outcomes
 * Based on: kpi_connection (Q5) + transformationGoal + external_positioning (Q4)
 */
function mapStrategicVision(
  scores: Record<string, number>,
  deepProfileData: any | null
): LeadershipDimension {
  const kpiScore = scores.kpi_connection || 0;
  const extPosScore = scores.external_positioning || 0;
  const hasTransformationGoal = deepProfileData?.transformationGoal?.length > 0;
  
  let level: LeadershipDimension['level'];
  let reasoning: string;
  
  const avgScore = (kpiScore + extPosScore) / 2;
  
  if (avgScore >= 4.5 && hasTransformationGoal) {
    level = 'AI Pioneer';
    reasoning = 'You translate AI capabilities into clear business value and inspire others with your vision';
  } else if (avgScore >= 4) {
    level = 'Confident Practitioner';
    reasoning = 'You consistently connect AI initiatives to measurable outcomes and strategic goals';
  } else if (avgScore >= 3) {
    level = 'Active Explorer';
    reasoning = 'You\'re learning to bridge AI capabilities with business impact - keep making those connections';
  } else {
    level = 'Building Foundations';
    reasoning = 'You have opportunity to strengthen the link between AI adoption and business results';
  }
  
  return { dimension: 'Strategic Vision', level, reasoning };
}

/**
 * Decision Agility: How quickly and effectively you make decisions
 * Based on: industry_impact (Q1) + informationNeeds + thinkingProcess (deep profile)
 */
function mapDecisionAgility(
  scores: Record<string, number>,
  deepProfileData: any | null
): LeadershipDimension {
  const industryScore = scores.industry_impact || 0;
  const hasDataNeeds = deepProfileData?.informationNeeds?.includes('Market trends and competitive analysis') ||
                       deepProfileData?.informationNeeds?.includes('Real-time business metrics and KPIs');
  const isAnalytical = deepProfileData?.thinkingProcess?.toLowerCase().includes('data') ||
                       deepProfileData?.thinkingProcess?.toLowerCase().includes('analytic');
  
  let level: LeadershipDimension['level'];
  let reasoning: string;
  
  if (industryScore === 5 && hasDataNeeds) {
    level = 'AI Pioneer';
    reasoning = 'You make informed decisions rapidly using AI-powered intelligence and real-time data';
  } else if (industryScore >= 4 || (industryScore === 3 && isAnalytical)) {
    level = 'Confident Practitioner';
    reasoning = 'You leverage data effectively to accelerate your decision-making process';
  } else if (industryScore === 3 || hasDataNeeds) {
    level = 'Active Explorer';
    reasoning = 'You\'re building your decision-making speed by improving your access to insights';
  } else {
    level = 'Building Foundations';
    reasoning = 'You can accelerate your decision velocity by leveraging AI-powered intelligence tools';
  }
  
  return { dimension: 'Decision Agility', level, reasoning };
}

/**
 * Impact Orientation: Your focus on measurable outcomes
 * Based on: kpi_connection (Q5) + workBreakdown (planning/decisions %)
 */
function mapImpactOrientation(
  scores: Record<string, number>,
  deepProfileData: any | null
): LeadershipDimension {
  const kpiScore = scores.kpi_connection || 0;
  const planningPct = deepProfileData?.workBreakdown?.planning || 0;
  const decisionsPct = deepProfileData?.workBreakdown?.decisions || 0;
  const strategicWork = planningPct + decisionsPct;
  
  let level: LeadershipDimension['level'];
  let reasoning: string;
  
  if (kpiScore === 5 && strategicWork >= 40) {
    level = 'AI Pioneer';
    reasoning = 'You rigorously track outcomes and spend most of your time on high-impact strategic work';
  } else if (kpiScore >= 4 || (kpiScore === 3 && strategicWork >= 30)) {
    level = 'Confident Practitioner';
    reasoning = 'You actively measure results and maintain focus on work that drives meaningful outcomes';
  } else if (kpiScore === 3 || strategicWork >= 20) {
    level = 'Active Explorer';
    reasoning = 'You\'re developing your measurement discipline and prioritizing impact-driven activities';
  } else {
    level = 'Building Foundations';
    reasoning = 'You have opportunity to strengthen your focus on tracking and achieving measurable results';
  }
  
  return { dimension: 'Impact Orientation', level, reasoning };
}

/**
 * Change Leadership: Your ability to inspire and lead AI transformation
 * Based on: coaching_champions (Q6) + team_alignment (Q3) + external_positioning (Q4)
 */
function mapChangeLeadership(
  scores: Record<string, number>,
  deepProfileData: any | null
): LeadershipDimension {
  const coachingScore = scores.coaching_champions || 0;
  const teamAlignScore = scores.team_alignment || 0;
  const extPosScore = scores.external_positioning || 0;
  
  const avgScore = (coachingScore + teamAlignScore + extPosScore) / 3;
  
  let level: LeadershipDimension['level'];
  let reasoning: string;
  
  if (avgScore >= 4.5) {
    level = 'AI Pioneer';
    reasoning = 'You\'re recognized as an AI champion and effectively inspire others to embrace transformation';
  } else if (avgScore >= 4) {
    level = 'Confident Practitioner';
    reasoning = 'You actively cultivate AI adoption and empower your team to explore new capabilities';
  } else if (avgScore >= 3) {
    level = 'Active Explorer';
    reasoning = 'You\'re growing your influence as a change agent and building support for AI initiatives';
  } else {
    level = 'Building Foundations';
    reasoning = 'You\'re starting to develop your voice and confidence as an AI transformation leader';
  }
  
  return { dimension: 'Change Leadership', level, reasoning };
}
