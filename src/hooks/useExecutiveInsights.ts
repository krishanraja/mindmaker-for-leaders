import { useState, useCallback } from 'react';

interface ExecutiveInsight {
  id: string;
  type: 'quick_win' | 'strategic_opportunity' | 'risk_mitigation' | 'competitive_advantage';
  title: string;
  description: string;
  businessImpact: string;
  timeframe: string;
  roiEstimate?: string;
  priority: 'critical' | 'high' | 'medium';
  actionSteps: string[];
}

interface ReadinessMatrix {
  business: number;
  technical: number;
  organizational: number;
  strategic: number;
}

interface AssessmentData {
  executiveSummary: string;
  overallScore: number;
  readinessMatrix: ReadinessMatrix;
  industryBenchmark: number;
  competitivePosition: 'leader' | 'advanced' | 'developing' | 'lagging';
}

export const useExecutiveInsights = () => {
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);

  const generateExecutiveInsights = useCallback((
    conversationData: any,
    userResponses: Record<string, string>,
    companySize?: string,
    industry?: string,
    role?: string
  ) => {
    const responses = Object.values(userResponses);
    const joinedResponses = responses.join(' ').toLowerCase();

    // Calculate readiness scores based on responses
    const businessReadiness = calculateBusinessReadiness(userResponses);
    const technicalReadiness = calculateTechnicalReadiness(userResponses);
    const organizationalReadiness = calculateOrganizationalReadiness(userResponses);
    const strategicReadiness = calculateStrategicReadiness(userResponses);

    const overallScore = Math.round((businessReadiness + technicalReadiness + organizationalReadiness + strategicReadiness) / 4);

    // Generate insights based on analysis
    const newInsights: ExecutiveInsight[] = [];

    // Quick Wins Analysis
    if (joinedResponses.includes('email') || joinedResponses.includes('administrative')) {
      newInsights.push({
        id: 'qw-email-automation',
        type: 'quick_win',
        title: 'Email Intelligence & Automation',
        description: 'Deploy AI-powered email prioritization and response suggestions to reduce email processing time by 40-60%.',
        businessImpact: '2-3 hours/day time savings, improved response quality',
        timeframe: '1-2 weeks',
        roiEstimate: '300-500% within 30 days',
        priority: 'high',
        actionSteps: [
          'Implement AI email categorization',
          'Deploy smart response templates',
          'Set up priority flagging system'
        ]
      });
    }

    if (joinedResponses.includes('meeting') || joinedResponses.includes('interruption')) {
      newInsights.push({
        id: 'qw-meeting-optimization',
        type: 'quick_win',
        title: 'AI Meeting Intelligence',
        description: 'Implement automated meeting summaries, action item extraction, and calendar optimization to reclaim 5-8 hours weekly.',
        businessImpact: 'Reduce meeting time by 25%, improve follow-through by 60%',
        timeframe: '2-3 weeks',
        roiEstimate: '200-400% productivity gain',
        priority: 'high',
        actionSteps: [
          'Deploy meeting transcription & summarization',
          'Automate action item tracking',
          'Implement calendar optimization'
        ]
      });
    }

    // Strategic Opportunities
    if (businessReadiness > 60) {
      newInsights.push({
        id: 'so-decision-intelligence',
        type: 'strategic_opportunity',
        title: 'Executive Decision Intelligence Platform',
        description: 'Build comprehensive AI dashboard that aggregates market data, internal metrics, and predictive analytics for faster, data-driven decision making.',
        businessImpact: 'Accelerate decision speed by 40%, improve accuracy by 25%',
        timeframe: '3-6 months',
        roiEstimate: '15-30% improvement in strategic outcomes',
        priority: 'high',
        actionSteps: [
          'Audit current data sources',
          'Design unified analytics platform',
          'Implement predictive models',
          'Train executive team'
        ]
      });
    }

    if (joinedResponses.includes('competitive') || joinedResponses.includes('market')) {
      newInsights.push({
        id: 'so-competitive-intelligence',
        type: 'strategic_opportunity',
        title: 'AI-Powered Competitive Intelligence',
        description: 'Automated monitoring and analysis of competitor activities, market trends, and customer sentiment to maintain strategic advantage.',
        businessImpact: 'Early warning system for market shifts, 2x faster competitive response',
        timeframe: '4-8 months',
        roiEstimate: '10-25% market share protection/growth',
        priority: 'medium',
        actionSteps: [
          'Set up automated market monitoring',
          'Build competitor analysis dashboard',
          'Implement sentiment tracking',
          'Create alert systems'
        ]
      });
    }

    // Risk Mitigation
    if (technicalReadiness < 50) {
      newInsights.push({
        id: 'rm-technical-foundation',
        type: 'risk_mitigation',
        title: 'Technical Infrastructure Assessment',
        description: 'Critical evaluation of current technical capabilities to prevent AI implementation failures and security vulnerabilities.',
        businessImpact: 'Prevent 60-80% of common AI deployment issues',
        timeframe: '2-4 weeks assessment',
        priority: 'critical',
        actionSteps: [
          'Conduct technical readiness audit',
          'Identify infrastructure gaps',
          'Develop upgrade roadmap',
          'Implement security protocols'
        ]
      });
    }

    if (organizationalReadiness < 60) {
      newInsights.push({
        id: 'rm-change-management',
        type: 'risk_mitigation',
        title: 'AI Adoption Change Management',
        description: 'Structured approach to managing organizational resistance and ensuring successful AI tool adoption across teams.',
        businessImpact: 'Increase adoption success rate from 30% to 85%',
        timeframe: '6-12 weeks',
        priority: 'high',
        actionSteps: [
          'Assess organizational readiness',
          'Design change management program',
          'Train change champions',
          'Implement feedback loops'
        ]
      });
    }

    // Competitive Advantage
    if (overallScore > 70) {
      newInsights.push({
        id: 'ca-ai-first-culture',
        type: 'competitive_advantage',
        title: 'AI-First Organization Transformation',
        description: 'Position as industry leader by embedding AI into every business process and decision-making framework.',
        businessImpact: '2-5 year competitive moat, 15-40% operational efficiency gains',
        timeframe: '12-18 months',
        roiEstimate: '25-50% sustainable competitive advantage',
        priority: 'high',
        actionSteps: [
          'Develop AI governance framework',
          'Create AI Center of Excellence',
          'Implement company-wide AI training',
          'Build proprietary AI capabilities'
        ]
      });
    }

    // Generate executive summary
    const executiveSummary = generateExecutiveSummary(overallScore, insights.length, companySize, industry);

    // Determine competitive position
    const competitivePosition = getCompetitivePosition(overallScore);

    // Set industry benchmark (simplified for demo)
    const industryBenchmark = getIndustryBenchmark(industry);

    const assessmentData: AssessmentData = {
      executiveSummary,
      overallScore,
      readinessMatrix: {
        business: businessReadiness,
        technical: technicalReadiness,
        organizational: organizationalReadiness,
        strategic: strategicReadiness
      },
      industryBenchmark,
      competitivePosition
    };

    setInsights(newInsights);
    setAssessmentData(assessmentData);

    return { insights: newInsights, assessmentData };
  }, []);

  return {
    insights,
    assessmentData,
    generateExecutiveInsights,
    setInsights,
    setAssessmentData
  };
};

// Helper functions for scoring
function calculateBusinessReadiness(responses: Record<string, string>): number {
  let score = 50; // Base score
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();

  // Positive indicators
  if (joinedResponses.includes('budget') || joinedResponses.includes('investment')) score += 20;
  if (joinedResponses.includes('ceo') || joinedResponses.includes('founder') || joinedResponses.includes('president')) score += 15;
  if (joinedResponses.includes('immediate') || joinedResponses.includes('urgent')) score += 10;
  if (joinedResponses.includes('strategic') || joinedResponses.includes('competitive')) score += 10;

  // Negative indicators
  if (joinedResponses.includes('no budget') || joinedResponses.includes('tight budget')) score -= 20;
  if (joinedResponses.includes('over a year') || joinedResponses.includes('no timeline')) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function calculateTechnicalReadiness(responses: Record<string, string>): number {
  let score = 40; // Lower base for technical
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();

  // AI experience indicators
  if (joinedResponses.includes('using ai') || joinedResponses.includes('ai tools')) score += 25;
  if (joinedResponses.includes('chatgpt') || joinedResponses.includes('claude')) score += 15;
  if (joinedResponses.includes('integrated ai') || joinedResponses.includes('ai throughout')) score += 30;
  
  // Technical capability indicators
  if (joinedResponses.includes('cloud') || joinedResponses.includes('saas')) score += 10;
  if (joinedResponses.includes('no ai') || joinedResponses.includes('none at all')) score -= 20;

  return Math.max(0, Math.min(100, score));
}

function calculateOrganizationalReadiness(responses: Record<string, string>): number {
  let score = 45; // Base score
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();

  // Team readiness indicators
  if (joinedResponses.includes('ready to try') || joinedResponses.includes('experimenting')) score += 25;
  if (joinedResponses.includes('curious') || joinedResponses.includes('interested')) score += 15;
  if (joinedResponses.includes('skeptical') || joinedResponses.includes('resistant')) score -= 20;
  
  // Decision-making indicators
  if (joinedResponses.includes('make final decisions') || joinedResponses.includes('influence decisions')) score += 15;
  if (joinedResponses.includes('implement what others decide')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function calculateStrategicReadiness(responses: Record<string, string>): number {
  let score = 50; // Base score
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();

  // Strategic thinking indicators
  if (joinedResponses.includes('automate') || joinedResponses.includes('efficiency')) score += 15;
  if (joinedResponses.includes('competitive') || joinedResponses.includes('advantage')) score += 20;
  if (joinedResponses.includes('growth') || joinedResponses.includes('scale')) score += 15;
  
  // Learning and adaptation
  if (joinedResponses.includes('hands-on') || joinedResponses.includes('experimentation')) score += 10;
  if (joinedResponses.includes('reports') || joinedResponses.includes('slow to adopt')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function generateExecutiveSummary(overallScore: number, insightCount: number, companySize?: string, industry?: string): string {
  if (overallScore >= 80) {
    return `Your organization demonstrates exceptional AI readiness with strong leadership buy-in and technical capabilities. You're positioned to achieve significant competitive advantages through strategic AI implementation, with potential for 25-40% operational efficiency gains and market leadership positioning within 12-18 months.`;
  } else if (overallScore >= 60) {
    return `Your organization shows solid AI readiness with good foundational elements in place. With focused implementation of our recommended quick wins and strategic initiatives, you can expect 15-30% efficiency improvements and strong ROI within 6-12 months. Key focus areas include strengthening technical infrastructure and change management processes.`;
  } else if (overallScore >= 40) {
    return `Your organization is in the early stages of AI readiness with significant opportunities for improvement. By addressing foundational gaps and implementing our phased approach, you can achieve 10-20% efficiency gains within 6-9 months. Priority focus on organizational readiness and basic AI tool adoption will set the stage for future strategic initiatives.`;
  } else {
    return `Your organization requires foundational development in AI readiness across multiple dimensions. Our recommended approach focuses on risk mitigation, basic capability building, and cultural preparation. With proper investment in infrastructure and change management, you can expect initial 5-15% efficiency gains within 9-12 months while building toward strategic AI capabilities.`;
  }
}

function getCompetitivePosition(score: number): 'leader' | 'advanced' | 'developing' | 'lagging' {
  if (score >= 80) return 'leader';
  if (score >= 60) return 'advanced';
  if (score >= 40) return 'developing';
  return 'lagging';
}

function getIndustryBenchmark(industry?: string): number {
  // Simplified industry benchmarks
  const benchmarks: Record<string, number> = {
    'technology': 75,
    'financial': 70,
    'healthcare': 55,
    'manufacturing': 50,
    'retail': 60,
    'consulting': 65,
    'default': 58
  };
  
  return benchmarks[industry?.toLowerCase() || 'default'];
}