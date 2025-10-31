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
  score: number; // 0-100, precise score within level
  nextStep: string; // Actionable recommendation
  rank?: number; // Relative ranking (1-6)
  percentile?: number; // Comparison to peers
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

  // Add ranking and percentile to each dimension
  const sortedByScore = [...dimensions].sort((a, b) => b.score - a.score);
  dimensions.forEach((dim) => {
    const rank = sortedByScore.findIndex(d => d.dimension === dim.dimension) + 1;
    dim.rank = rank;
    
    // Calculate percentile based on score
    if (dim.score >= 75) dim.percentile = 85;
    else if (dim.score >= 50) dim.percentile = 65;
    else if (dim.score >= 25) dim.percentile = 45;
    else dim.percentile = 25;
  });

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
  let score: number;
  let nextStep: string;
  
  if (industryScore === 5) {
    level = 'AI Pioneer';
    score = 75 + (industryScore * 4); // 95
    reasoning = `Your industry impact awareness (${industryScore}/5) shows exceptional AI fluency. You can articulate AI's transformative potential and educate executive peers on strategic implications.`;
    nextStep = 'Publish thought leadership content or speak at industry events to amplify your AI vision';
  } else if (industryScore >= 4) {
    level = 'Confident Practitioner';
    score = 50 + (industryScore * 5); // 60-70
    reasoning = `Your industry impact awareness (${industryScore}/5) demonstrates strong AI fluency. You confidently discuss business implications and can translate technical concepts for stakeholders.`;
    nextStep = 'Mentor 2-3 executives on AI fundamentals to deepen your expertise through teaching';
  } else if (industryScore === 3 || hasInformationNeeds) {
    level = 'Active Explorer';
    score = 25 + (industryScore * 6) + (hasInformationNeeds ? 5 : 0); // 28-48
    reasoning = `Your industry impact awareness (${industryScore}/5) shows solid understanding${hasInformationNeeds ? ', and you\'re actively seeking knowledge' : ''}. To reach Practitioner level, focus on articulating AI's ROI in business terms.`;
    nextStep = 'Complete 3 AI case studies in your industry and present findings to your leadership team';
  } else {
    level = 'Building Foundations';
    score = 10 + (industryScore * 4); // 10-18
    reasoning = `Your industry impact awareness (${industryScore}/5) indicates early-stage AI fluency. This is a strong foundation to build from—many executives are starting here.`;
    nextStep = 'Dedicate 30 minutes daily to AI news and complete an executive AI fundamentals course';
  }
  
  return { dimension: 'AI Fluency', level, reasoning, score, nextStep };
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
  let score: number;
  let nextStep: string;
  
  if (bizAccelScore === 5 && timeWaste < 20 && hasDelegationPlan) {
    level = 'AI Pioneer';
    score = 88 + (100 - timeWaste) / 10; // 88-96
    reasoning = `Your business acceleration rating (${bizAccelScore}/5) and low time waste (${timeWaste}%) show mastery of strategic delegation. You've freed up ${100 - timeWaste}% of your time for high-leverage work.`;
    nextStep = 'Document your delegation playbook and train your leadership team on your time-optimization system';
  } else if (bizAccelScore >= 4 && timeWaste < 40) {
    level = 'Confident Practitioner';
    score = 52 + (bizAccelScore * 3) + (50 - timeWaste) / 2; // 62-72
    reasoning = `Your business acceleration rating (${bizAccelScore}/5) with ${timeWaste}% time waste shows you're actively reclaiming ${100 - timeWaste}% of capacity. You're delegating effectively and seeing results.`;
    nextStep = 'Identify your top 3 remaining time-drains and pilot AI solutions for each this month';
  } else if (bizAccelScore === 3 || hasDelegationPlan) {
    level = 'Active Explorer';
    score = 28 + (bizAccelScore * 4) + (hasDelegationPlan ? 8 : 0); // 36-48
    reasoning = `Your business acceleration rating (${bizAccelScore}/5) shows experimentation${hasDelegationPlan ? ', and you\'ve identified delegation targets' : ''}. Current time waste (${timeWaste}%) reveals opportunity to reclaim ${Math.min(30, timeWaste - 20)}+ hours monthly.`;
    nextStep = 'Choose one repetitive task this week and fully delegate it to AI—measure the time saved';
  } else {
    level = 'Building Foundations';
    score = 12 + (bizAccelScore * 3); // 12-24
    reasoning = `Your business acceleration rating (${bizAccelScore}/5) and ${timeWaste}% time waste indicate untapped potential. Most executives at this stage can reclaim 15-20 hours monthly through AI delegation.`;
    nextStep = 'Audit your calendar: identify 5 recurring tasks under 30 minutes that AI could handle';
  }
  
  return { dimension: 'Delegation Mastery', level, reasoning, score, nextStep };
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
  let score: number;
  let nextStep: string;
  
  const avgScore = (kpiScore + extPosScore) / 2;
  
  if (avgScore >= 4.5 && hasTransformationGoal) {
    level = 'AI Pioneer';
    score = 78 + (avgScore * 4); // 86-98
    reasoning = `Your KPI tracking strength (${kpiScore}/5) and external positioning (${extPosScore}/5) show exceptional strategic vision. You translate AI capabilities into clear business value${hasTransformationGoal ? ' and have defined your transformation roadmap' : ''}.`;
    nextStep = 'Present your AI-ROI framework to the board and secure budget for a flagship transformation initiative';
  } else if (avgScore >= 4) {
    level = 'Confident Practitioner';
    score = 54 + (avgScore * 4); // 62-74
    reasoning = `Your KPI tracking (${kpiScore}/5) and external positioning (${extPosScore}/5) demonstrate you consistently connect AI initiatives to measurable outcomes and can articulate strategic value to stakeholders.`;
    nextStep = 'Build a one-page AI business case template linking capabilities to revenue/cost KPIs';
  } else if (avgScore >= 3) {
    level = 'Active Explorer';
    score = 30 + (avgScore * 5) + (hasTransformationGoal ? 6 : 0); // 36-51
    reasoning = `Your KPI tracking (${kpiScore}/5) and external positioning (${extPosScore}/5) show you're learning to bridge AI capabilities with business impact${hasTransformationGoal ? ', and you\'ve set a transformation goal' : '. Focus on articulating ROI'}.`;
    nextStep = 'Map one AI use case to specific KPIs and present projected impact to your leadership team';
  } else {
    level = 'Building Foundations';
    score = 14 + (avgScore * 4); // 14-28
    reasoning = `Your KPI tracking strength (${kpiScore}/5) and external positioning (${extPosScore}/5) indicate opportunity to strengthen your strategic AI-to-business translation skills. This is a critical capability for executive AI leaders.`;
    nextStep = 'Interview 3 business leaders about their KPIs and identify where AI could move the needle';
  }
  
  return { dimension: 'Strategic Vision', level, reasoning, score, nextStep };
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
  let score: number;
  let nextStep: string;
  
  if (industryScore === 5 && hasDataNeeds) {
    level = 'AI Pioneer';
    score = 82 + (industryScore * 3); // 92-97
    reasoning = `Your industry impact awareness (${industryScore}/5) combined with active data-seeking behavior shows you make informed decisions rapidly. You leverage AI-powered intelligence and real-time data to accelerate decision velocity.`;
    nextStep = 'Build an AI decision-support dashboard that synthesizes real-time insights for your top 3 decision types';
  } else if (industryScore >= 4 || (industryScore === 3 && isAnalytical)) {
    level = 'Confident Practitioner';
    score = 56 + (industryScore * 4) + (isAnalytical ? 6 : 0); // 62-74
    reasoning = `Your industry impact awareness (${industryScore}/5)${isAnalytical ? ' and analytical thinking style' : ''} show you leverage data effectively to accelerate decisions. You balance speed with informed judgment.`;
    nextStep = 'Track decision cycle time for 3 key choices this month—identify where AI could compress timelines by 40%';
  } else if (industryScore === 3 || hasDataNeeds) {
    level = 'Active Explorer';
    score = 32 + (industryScore * 4) + (hasDataNeeds ? 8 : 0); // 36-52
    reasoning = `Your industry impact awareness (${industryScore}/5) shows you're building decision-making speed${hasDataNeeds ? ' by actively seeking better data access' : ''}. Focus on reducing information-gathering time to accelerate choices.`;
    nextStep = 'Implement one AI tool that delivers instant insights for a recurring decision you make weekly';
  } else {
    level = 'Building Foundations';
    score = 16 + (industryScore * 4); // 16-28
    reasoning = `Your industry impact awareness (${industryScore}/5) indicates opportunity to accelerate decision velocity. Most executives at this stage can reduce decision time by 30-50% using AI-powered intelligence.`;
    nextStep = 'Map your 5 most common decisions and identify which require real-time data vs. analysis';
  }
  
  return { dimension: 'Decision Agility', level, reasoning, score, nextStep };
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
  let score: number;
  let nextStep: string;
  
  if (kpiScore === 5 && strategicWork >= 40) {
    level = 'AI Pioneer';
    score = 80 + (kpiScore * 3) + (strategicWork / 5); // 88-98
    reasoning = `Your KPI tracking strength (${kpiScore}/5) and ${strategicWork}% time on strategic work (planning + decisions) show rigorous outcome tracking. You spend ${strategicWork}% of capacity on high-leverage activities.`;
    nextStep = 'Create an executive impact dashboard tracking leading indicators for your top 3 strategic priorities';
  } else if (kpiScore >= 4 || (kpiScore === 3 && strategicWork >= 30)) {
    level = 'Confident Practitioner';
    score = 54 + (kpiScore * 4) + (strategicWork / 4); // 61-76
    reasoning = `Your KPI tracking strength (${kpiScore}/5) with ${strategicWork}% strategic work allocation shows you actively measure results and maintain focus on impact-driven activities.`;
    nextStep = 'Increase strategic work time by 10% this quarter by delegating 3 low-impact recurring tasks to AI';
  } else if (kpiScore === 3 || strategicWork >= 20) {
    level = 'Active Explorer';
    score = 30 + (kpiScore * 5) + (strategicWork / 3); // 36-52
    reasoning = `Your KPI tracking strength (${kpiScore}/5) and ${strategicWork}% strategic time show you're developing measurement discipline. Focus on increasing your high-impact work percentage.`;
    nextStep = 'Define 3 outcome metrics for your AI initiatives and review them weekly to build tracking habits';
  } else {
    level = 'Building Foundations';
    score = 14 + (kpiScore * 4) + (strategicWork / 5); // 14-30
    reasoning = `Your KPI tracking strength (${kpiScore}/5) with ${strategicWork}% strategic work indicates opportunity to strengthen outcome focus. Executives at this stage often lack clear success metrics.`;
    nextStep = "Choose one initiative this week and define 2 measurable outcomes you'll track monthly";
  }
  
  return { dimension: 'Impact Orientation', level, reasoning, score, nextStep };
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
  let score: number;
  let nextStep: string;
  
  if (avgScore >= 4.5) {
    level = 'AI Pioneer';
    score = 76 + (avgScore * 4); // 86-96
    reasoning = `Your combined leadership ratings (coaching ability: ${coachingScore}/5, team alignment: ${teamAlignScore}/5, external positioning: ${extPosScore}/5) show you're recognized as an AI champion who inspires transformation.`;
    nextStep = 'Launch a cross-functional AI Champions program and certify 10 change agents across the organization';
  } else if (avgScore >= 4) {
    level = 'Confident Practitioner';
    score = 52 + (avgScore * 5); // 62-74
    reasoning = `Your leadership ratings (coaching: ${coachingScore}/5, team alignment: ${teamAlignScore}/5, external positioning: ${extPosScore}/5) show you actively cultivate AI adoption and empower your team to explore new capabilities with confidence.`;
    nextStep = 'Host monthly AI show-and-tell sessions where team members demo their AI experiments and wins';
  } else if (avgScore >= 3) {
    level = 'Active Explorer';
    score = 28 + (avgScore * 6); // 34-50
    reasoning = `Your leadership ratings (coaching: ${coachingScore}/5, team alignment: ${teamAlignScore}/5, external positioning: ${extPosScore}/5) show you're growing your influence as a change agent and building support for AI initiatives.`;
    nextStep = 'Share one AI success story with your team this week and invite them to pilot similar approaches';
  } else {
    level = 'Building Foundations';
    score = 12 + (avgScore * 5); // 12-30
    reasoning = `Your combined leadership ratings (coaching ability: ${coachingScore}/5, team alignment: ${teamAlignScore}/5, external positioning: ${extPosScore}/5) show you're starting to develop your voice as an AI transformation leader.`;
    nextStep = 'Identify 2 early adopters on your team and champion their AI experiments publicly';
  }
  
  return { dimension: 'Change Leadership', level, reasoning, score, nextStep };
}
