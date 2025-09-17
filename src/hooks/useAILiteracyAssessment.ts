import { useState, useCallback } from 'react';

interface AILiteracyInsight {
  id: string;
  type: 'learning_path' | 'skill_gap' | 'quick_win' | 'recommended_tool';
  title: string;
  description: string;
  learningImpact: string;
  timeframe: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: 'critical' | 'high' | 'medium';
  actionSteps: string[];
}

interface LiteracyMatrix {
  fundamentals: number;
  practical_application: number;
  ethical_understanding: number;
  strategic_thinking: number;
}

interface AILiteracyData {
  summary: string;
  overallScore: number;
  literacyLevel: 'Beginner' | 'Developing' | 'Proficient' | 'Advanced';
  literacyMatrix: LiteracyMatrix;
  industryBenchmark: number;
  growthPotential: 'high' | 'medium' | 'low';
}

export const useAILiteracyAssessment = () => {
  const [insights, setInsights] = useState<AILiteracyInsight[]>([]);
  const [assessmentData, setAssessmentData] = useState<AILiteracyData | null>(null);

  const generateAILiteracyInsights = useCallback((
    conversationData: any,
    userResponses: Record<string, string>,
    companySize?: string,
    industry?: string,
    role?: string
  ) => {
    const responses = Object.values(userResponses);
    const joinedResponses = responses.join(' ').toLowerCase();

    // Calculate literacy scores based on actual responses
    const fundamentalsScore = calculateFundamentalsScore(userResponses);
    const practicalScore = calculatePracticalApplicationScore(userResponses);
    const ethicalScore = calculateEthicalUnderstandingScore(userResponses);
    const strategicScore = calculateStrategicThinkingScore(userResponses);

    const overallScore = Math.round((fundamentalsScore + practicalScore + ethicalScore + strategicScore) / 4);

    // Generate insights based on analysis
    const newInsights: AILiteracyInsight[] = [];

    // Learning Paths based on current level
    if (fundamentalsScore < 50) {
      newInsights.push({
        id: 'lp-ai-basics',
        type: 'learning_path',
        title: 'AI Fundamentals Learning Path',
        description: 'Build a solid foundation in AI concepts, terminology, and basic applications to improve your literacy baseline.',
        learningImpact: 'Essential for effective AI tool usage and decision-making',
        timeframe: '2-4 weeks',
        difficulty: 'beginner',
        priority: 'critical',
        actionSteps: [
          'Complete "AI for Everyone" course',
          'Learn key AI terminology and concepts',
          'Understand machine learning basics',
          'Practice with simple AI tools'
        ]
      });
    }

    if (practicalScore < 60) {
      newInsights.push({
        id: 'qw-tool-practice',
        type: 'quick_win',
        title: 'Hands-on AI Tool Practice',
        description: 'Start using AI tools in your daily workflow to build practical experience and confidence.',
        learningImpact: 'Immediate improvement in productivity and AI comfort level',
        timeframe: '1-2 weeks',
        difficulty: 'beginner',
        priority: 'high',
        actionSteps: [
          'Use ChatGPT for writing tasks',
          'Try Grammarly for document editing',
          'Experiment with AI image tools',
          'Practice prompt engineering'
        ]
      });
    }

    // Skill Gap Analysis
    if (ethicalScore < 70) {
      newInsights.push({
        id: 'sg-ethics',
        type: 'skill_gap',
        title: 'AI Ethics and Responsible Use',
        description: 'Develop understanding of AI bias, privacy concerns, and ethical decision-making frameworks.',
        learningImpact: 'Critical for responsible AI implementation and risk mitigation',
        timeframe: '3-6 weeks',
        difficulty: 'intermediate',
        priority: 'high',
        actionSteps: [
          'Study AI bias and fairness concepts',
          'Learn about data privacy regulations',
          'Understand algorithmic transparency',
          'Develop ethical AI guidelines'
        ]
      });
    }

    if (strategicScore > 60) {
      newInsights.push({
        id: 'rt-advanced-tools',
        type: 'recommended_tool',
        title: 'Advanced AI Integration',
        description: 'Explore sophisticated AI tools and integration strategies for maximum organizational impact.',
        learningImpact: 'Enables strategic AI adoption and competitive advantage',
        timeframe: '4-8 weeks',
        difficulty: 'advanced',
        priority: 'medium',
        actionSteps: [
          'Evaluate enterprise AI platforms',
          'Design AI integration workflows',
          'Train team on advanced tools',
          'Measure ROI and impact'
        ]
      });
    }

    // Communication and collaboration skills
    if (joinedResponses.includes('explain') || joinedResponses.includes('teach')) {
      newInsights.push({
        id: 'lp-ai-communication',
        type: 'learning_path',
        title: 'AI Communication Skills',
        description: 'Learn to effectively communicate about AI with technical and non-technical stakeholders.',
        learningImpact: 'Improved ability to drive AI adoption and explain complex concepts',
        timeframe: '2-3 weeks',
        difficulty: 'intermediate',
        priority: 'medium',
        actionSteps: [
          'Practice explaining AI in simple terms',
          'Learn visual communication techniques',
          'Develop AI presentation skills',
          'Create AI education materials'
        ]
      });
    }

    // Generate literacy summary
    const summary = generateLiteracySummary(overallScore, insights.length, role);

    // Determine literacy level
    const literacyLevel = getLiteracyLevel(overallScore);

    // Set growth potential
    const growthPotential = getGrowthPotential(overallScore, userResponses);

    // Set industry benchmark for AI literacy
    const industryBenchmark = getAILiteracyBenchmark(industry);

    const assessmentData: AILiteracyData = {
      summary,
      overallScore,
      literacyLevel,
      literacyMatrix: {
        fundamentals: fundamentalsScore,
        practical_application: practicalScore,
        ethical_understanding: ethicalScore,
        strategic_thinking: strategicScore
      },
      industryBenchmark,
      growthPotential
    };

    setInsights(newInsights);
    setAssessmentData(assessmentData);

    return { insights: newInsights, assessmentData };
  }, []);

  return {
    insights,
    assessmentData,
    generateAILiteracyInsights,
    setInsights,
    setAssessmentData
  };
};

// Helper functions for AI literacy scoring
function calculateFundamentalsScore(responses: Record<string, string>): number {
  let score = 30; // Base score
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();

  // Positive indicators for understanding fundamentals
  if (joinedResponses.includes('machine learning') || joinedResponses.includes('ml')) score += 20;
  if (joinedResponses.includes('neural network') || joinedResponses.includes('algorithm')) score += 15;
  if (joinedResponses.includes('data') || joinedResponses.includes('training')) score += 10;
  if (joinedResponses.includes('model') || joinedResponses.includes('prediction')) score += 10;

  // Negative indicators
  if (joinedResponses.includes('no idea') || joinedResponses.includes('never heard')) score -= 20;
  if (joinedResponses.includes('confused') || joinedResponses.includes('don\'t understand')) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function calculatePracticalApplicationScore(responses: Record<string, string>): number {
  let score = 25; // Lower base for practical skills
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();

  // Tool usage indicators
  if (joinedResponses.includes('chatgpt') || joinedResponses.includes('claude')) score += 25;
  if (joinedResponses.includes('copilot') || joinedResponses.includes('notion ai')) score += 20;
  if (joinedResponses.includes('midjourney') || joinedResponses.includes('dall-e')) score += 15;
  if (joinedResponses.includes('daily') || joinedResponses.includes('regularly')) score += 15;
  
  // No usage indicators
  if (joinedResponses.includes('never used') || joinedResponses.includes('no experience')) score -= 20;

  return Math.max(0, Math.min(100, score));
}

function calculateEthicalUnderstandingScore(responses: Record<string, string>): number {
  let score = 35; // Base score
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();

  // Ethical awareness indicators
  if (joinedResponses.includes('bias') || joinedResponses.includes('fairness')) score += 25;
  if (joinedResponses.includes('privacy') || joinedResponses.includes('data protection')) score += 20;
  if (joinedResponses.includes('transparency') || joinedResponses.includes('explainable')) score += 15;
  if (joinedResponses.includes('responsible') || joinedResponses.includes('ethical')) score += 10;
  
  // Lack of ethical consideration
  if (joinedResponses.includes('doesn\'t matter') || joinedResponses.includes('not important')) score -= 25;

  return Math.max(0, Math.min(100, score));
}

function calculateStrategicThinkingScore(responses: Record<string, string>): number {
  let score = 40; // Base score
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();

  // Strategic thinking indicators
  if (joinedResponses.includes('efficiency') || joinedResponses.includes('automation')) score += 20;
  if (joinedResponses.includes('competitive') || joinedResponses.includes('advantage')) score += 20;
  if (joinedResponses.includes('workflow') || joinedResponses.includes('process')) score += 15;
  if (joinedResponses.includes('future') || joinedResponses.includes('long-term')) score += 10;
  
  // Tactical only thinking
  if (joinedResponses.includes('just use it') || joinedResponses.includes('quick fix')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function generateLiteracySummary(overallScore: number, insightCount: number, role?: string): string {
  if (overallScore >= 80) {
    return `You demonstrate advanced AI literacy with strong understanding across all key areas. You're well-positioned to lead AI initiatives and mentor others. Focus on staying current with emerging technologies and helping your organization develop AI capabilities.`;
  } else if (overallScore >= 60) {
    return `You show solid AI literacy with good foundational knowledge and practical experience. With targeted learning in specific areas, you can become an AI champion in your organization. Focus on building deeper expertise and expanding your tool proficiency.`;
  } else if (overallScore >= 40) {
    return `You have developing AI literacy with some understanding of basic concepts. There's significant opportunity to improve through structured learning and hands-on practice. Focus on building fundamentals and gaining practical experience with AI tools.`;
  } else {
    return `You're at the beginning of your AI literacy journey. This is a great starting point! Focus on learning AI fundamentals, exploring basic tools, and understanding how AI can benefit your work. With consistent effort, you'll see rapid improvement.`;
  }
}

function getLiteracyLevel(score: number): 'Beginner' | 'Developing' | 'Proficient' | 'Advanced' {
  if (score >= 80) return 'Advanced';
  if (score >= 60) return 'Proficient';
  if (score >= 40) return 'Developing';
  return 'Beginner';
}

function getGrowthPotential(score: number, responses: Record<string, string>): 'high' | 'medium' | 'low' {
  const joinedResponses = Object.values(responses).join(' ').toLowerCase();
  
  // High growth potential indicators
  if (joinedResponses.includes('eager') || joinedResponses.includes('excited')) return 'high';
  if (joinedResponses.includes('learning') || joinedResponses.includes('experimenting')) return 'high';
  
  // Medium indicators
  if (score < 60 && joinedResponses.includes('interested')) return 'medium';
  
  return score < 40 ? 'high' : 'medium'; // Lower scores often have higher growth potential
}

function getAILiteracyBenchmark(industry?: string): number {
  // AI literacy benchmarks by industry
  const benchmarks: Record<string, number> = {
    'technology': 65,
    'financial': 55,
    'healthcare': 45,
    'education': 50,
    'marketing': 55,
    'consulting': 60,
    'default': 50
  };
  
  return benchmarks[industry?.toLowerCase() || 'default'];
}