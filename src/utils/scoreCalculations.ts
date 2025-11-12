/**
 * Calculate numeric score from Likert scale answer
 * @param answer - Answer string (e.g., "5 - Strongly Agree")
 * @returns Numeric score (1-5)
 */
export const extractScoreFromAnswer = (answer: string): number => {
  const match = answer.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
};

/**
 * Calculate leadership score from assessment data
 * @param assessmentData - Assessment responses
 * @returns Leadership score (0-30)
 */
export const calculateLeadershipScore = (assessmentData: any): number => {
  const categories = [
    'industry_impact',
    'business_acceleration',
    'team_alignment',
    'external_positioning',
    'kpi_connection',
    'coaching_champions'
  ];

  const total = categories.reduce((sum, category) => {
    const answer = assessmentData[category];
    if (!answer) return sum;
    return sum + extractScoreFromAnswer(answer);
  }, 0);

  return total;
};

/**
 * Get leadership tier from score
 * @param score - Leadership score (0-30)
 * @returns Tier object with name, color, and description
 */
export const getLeadershipTier = (score: number) => {
  if (score >= 25) {
    return {
      name: 'AI-Driven Leader',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      borderColor: 'border-purple-200 dark:border-purple-800',
      description: 'Leading the AI transformation in your industry'
    };
  } else if (score >= 19) {
    return {
      name: 'AI Growth Strategist',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      description: 'Strategically scaling AI across your organization'
    };
  } else if (score >= 13) {
    return {
      name: 'AI Explorer',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      description: 'Building momentum with AI initiatives'
    };
  } else {
    return {
      name: 'AI Curious',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-800',
      description: 'Starting your AI leadership journey'
    };
  }
};

/**
 * Calculate percentile rank from score
 * @param score - Leadership score (0-30)
 * @returns Percentile (0-100)
 */
export const calculatePercentile = (score: number): number => {
  // Map score to percentile (0-30 to 0-100)
  const percentile = Math.round((score / 30) * 100);
  return Math.max(0, Math.min(100, percentile));
};

/**
 * Get score interpretation message
 * @param score - Leadership score (0-30)
 * @returns Interpretation message
 */
export const getScoreInterpretation = (score: number): string => {
  const tier = getLeadershipTier(score);
  const percentile = calculatePercentile(score);
  
  return `You're in the top ${100 - percentile}% of leaders assessed. ${tier.description}.`;
};
