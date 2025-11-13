/**
 * DATA FLOW AUDIT & VALIDATION
 * 
 * This file documents and validates the complete data flow through the AI Leadership Assessment
 * to ensure data hygiene and consistency across all components.
 */

import { extractScoreFromAnswer, calculateLeadershipScore, getLeadershipTier } from './scoreCalculations';

/**
 * ASSESSMENT DATA FLOW:
 * 
 * 1. USER INPUT (UnifiedAssessment.tsx)
 *    - 6 Likert scale questions (1-5)
 *    - Categories: industry_impact, business_acceleration, team_alignment, 
 *                  external_positioning, kpi_connection, coaching_champions
 * 
 * 2. SCORE CALCULATION (scoreCalculations.ts)
 *    - Raw score: Sum of all 6 answers (6-30 range)
 *    - Tier assignment: 
 *      * 25-30: AI-Driven Leader
 *      * 19-24: AI Growth Strategist  
 *      * 13-18: AI Explorer
 *      * 6-12: AI Curious
 * 
 * 3. LEADERSHIP DIMENSIONS (scaleUpsMapping.ts)
 *    - Derives 6 dimensional scores from assessment data:
 *      * AI Fluency (based on industry_impact)
 *      * Delegation Mastery (based on business_acceleration)
 *      * Strategic Vision (based on external_positioning)
 *      * Decision Agility (based on team_alignment)
 *      * Impact Orientation (based on kpi_connection)
 *      * Change Leadership (based on coaching_champions)
 *    - Each dimension: 0-100 score with level (Building/Explorer/Confident/Pioneer)
 * 
 * 4. AI INSIGHTS GENERATION (generate-personalized-insights Edge Function)
 *    - Input: assessmentData + contactData + deepProfileData
 *    - LLM generates: 
 *      * Growth readiness (with level)
 *      * Leadership stage (with next steps)
 *      * Key focus area
 *      * 3 roadmap initiatives (tagged with dimensions)
 *    - Validation: Removes technical strings, truncates long text, ensures consistency
 * 
 * 5. PEER COMPARISON (PeerBubbleChart.tsx)
 *    - Uses top 3 dimensional scores
 *    - Generates 500 synthetic peers with realistic distribution
 *    - Ensures minimum 10% ahead of user (even if user scores 100%)
 *    - Calculates percentile rank
 * 
 * 6. RESULTS DISPLAY (AILeadershipBenchmark.tsx, UnifiedResults.tsx)
 *    - Score tab: Full personalized insights + dimensional breakdown
 *    - Compare tab: Peer bubble chart + benchmark statistics
 *    - Prompts tab: Personalized AI prompt library
 */

/**
 * Validate assessment data structure and scores
 */
export const validateAssessmentData = (assessmentData: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalScore: number;
    normalizedScore: number;
    tier: string;
    categoryScores: Record<string, number>;
  };
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const categoryScores: Record<string, number> = {};

  const requiredCategories = [
    'industry_impact',
    'business_acceleration', 
    'team_alignment',
    'external_positioning',
    'kpi_connection',
    'coaching_champions'
  ];

  // Check all required categories present
  let totalScore = 0;
  for (const category of requiredCategories) {
    if (!assessmentData[category]) {
      errors.push(`Missing required category: ${category}`);
      continue;
    }

    const score = extractScoreFromAnswer(assessmentData[category]);
    
    if (score < 1 || score > 5) {
      errors.push(`Invalid score for ${category}: ${score} (must be 1-5)`);
    }

    categoryScores[category] = score;
    totalScore += score;
  }

  // Validate total score range
  if (totalScore < 6 || totalScore > 30) {
    errors.push(`Total score ${totalScore} out of valid range (6-30)`);
  }

  // Calculate normalized score
  const normalizedScore = Math.round((totalScore / 30) * 100);

  // Warnings for unusual patterns
  if (Object.values(categoryScores).every(s => s === 5)) {
    warnings.push('All scores are 5/5 - ensure peer comparison shows leaders ahead');
  }

  if (Object.values(categoryScores).every(s => s === 1)) {
    warnings.push('All scores are 1/5 - unusual pattern, verify user intent');
  }

  const tier = getLeadershipTier(totalScore);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalScore,
      normalizedScore,
      tier: tier.name,
      categoryScores
    }
  };
};

/**
 * Validate leadership dimensions consistency
 */
export const validateLeadershipDimensions = (
  dimensions: any[],
  assessmentData: any
): {
  isValid: boolean;
  errors: string[];
  dimensionStats: any[];
} => {
  const errors: string[] = [];
  const dimensionStats: any[] = [];

  if (!dimensions || dimensions.length !== 6) {
    errors.push(`Expected 6 dimensions, got ${dimensions?.length || 0}`);
    return { isValid: false, errors, dimensionStats };
  }

  const expectedDimensions = [
    'AI Fluency',
    'Delegation Mastery', 
    'Strategic Vision',
    'Decision Agility',
    'Impact Orientation',
    'Change Leadership'
  ];

  for (const dim of dimensions) {
    if (!expectedDimensions.includes(dim.dimension)) {
      errors.push(`Unexpected dimension: ${dim.dimension}`);
    }

    if (dim.score < 0 || dim.score > 100) {
      errors.push(`${dim.dimension} score ${dim.score} out of range (0-100)`);
    }

    if (!['Building Foundations', 'Active Explorer', 'Confident Practitioner', 'AI Pioneer'].includes(dim.level)) {
      errors.push(`${dim.dimension} has invalid level: ${dim.level}`);
    }

    dimensionStats.push({
      dimension: dim.dimension,
      score: dim.score,
      level: dim.level,
      percentile: dim.percentile || 0,
      rank: dim.rank || 0
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    dimensionStats
  };
};

/**
 * Validate AI-generated insights
 */
export const validatePersonalizedInsights = (insights: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!insights.growthReadiness?.level) {
    errors.push('Missing growthReadiness level');
  }

  if (!insights.leadershipStage?.stage) {
    errors.push('Missing leadershipStage stage');
  }

  if (!insights.keyFocus?.category) {
    errors.push('Missing keyFocus category');
  }

  // Validate roadmap initiatives
  if (!insights.roadmapInitiatives || !Array.isArray(insights.roadmapInitiatives)) {
    errors.push('Missing or invalid roadmapInitiatives array');
  } else {
    if (insights.roadmapInitiatives.length !== 3) {
      warnings.push(`Expected 3 roadmap initiatives, got ${insights.roadmapInitiatives.length}`);
    }

    insights.roadmapInitiatives.forEach((init: any, idx: number) => {
      // Check title length
      if (init.title && init.title.length > 25) {
        warnings.push(`Initiative ${idx + 1} title too long: "${init.title}" (${init.title.length} chars)`);
      }

      // Check for technical strings in basedOn
      if (init.basedOn && Array.isArray(init.basedOn)) {
        init.basedOn.forEach((item: string) => {
          if (/_/.test(item) || /^[A-Z_]+$/.test(item)) {
            errors.push(`Initiative ${idx + 1} contains technical string in basedOn: "${item}"`);
          }
        });
      }

      // Check scaleUpsDimensions present
      if (!init.scaleUpsDimensions || !Array.isArray(init.scaleUpsDimensions) || init.scaleUpsDimensions.length === 0) {
        errors.push(`Initiative ${idx + 1} missing scaleUpsDimensions tags`);
      }

      // Validate dimension names
      const validDimensions = [
        'AI Fluency',
        'Delegation Mastery',
        'Strategic Vision', 
        'Decision Agility',
        'Impact Orientation',
        'Change Leadership'
      ];

      if (init.scaleUpsDimensions) {
        init.scaleUpsDimensions.forEach((dim: string) => {
          if (!validDimensions.includes(dim)) {
            errors.push(`Initiative ${idx + 1} has invalid dimension: "${dim}"`);
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Comprehensive data flow audit
 */
export const auditDataFlow = (
  assessmentData: any,
  leadershipComparison: any,
  personalizedInsights: any
): {
  overallValid: boolean;
  assessmentValidation: ReturnType<typeof validateAssessmentData>;
  dimensionsValidation: ReturnType<typeof validateLeadershipDimensions>;
  insightsValidation: ReturnType<typeof validatePersonalizedInsights>;
  summary: string;
} => {
  const assessmentValidation = validateAssessmentData(assessmentData);
  const dimensionsValidation = validateLeadershipDimensions(
    leadershipComparison?.dimensions || [],
    assessmentData
  );
  const insightsValidation = validatePersonalizedInsights(personalizedInsights);

  const allErrors = [
    ...assessmentValidation.errors,
    ...dimensionsValidation.errors,
    ...insightsValidation.errors
  ];

  const allWarnings = [
    ...assessmentValidation.warnings,
    ...insightsValidation.warnings
  ];

  const overallValid = allErrors.length === 0;

  let summary = `Data Flow Audit Complete:\n`;
  summary += `- Assessment: ${assessmentValidation.isValid ? '✓ Valid' : '✗ Invalid'}\n`;
  summary += `- Dimensions: ${dimensionsValidation.isValid ? '✓ Valid' : '✗ Invalid'}\n`;
  summary += `- Insights: ${insightsValidation.isValid ? '✓ Valid' : '✗ Invalid'}\n`;
  summary += `- Errors: ${allErrors.length}\n`;
  summary += `- Warnings: ${allWarnings.length}`;

  if (!overallValid) {
    console.error('Data flow validation failed:', {
      errors: allErrors,
      warnings: allWarnings
    });
  } else if (allWarnings.length > 0) {
    console.warn('Data flow has warnings:', allWarnings);
  } else {
    console.log('✓ Data flow validation passed');
  }

  return {
    overallValid,
    assessmentValidation,
    dimensionsValidation,
    insightsValidation,
    summary
  };
};