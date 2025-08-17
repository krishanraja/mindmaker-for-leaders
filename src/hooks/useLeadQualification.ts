import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeadQualificationData {
  budgetRange: string | null;
  timelineUrgency: 'immediate' | 'within_3_months' | 'within_6_months' | 'exploring' | null;
  decisionAuthority: 'full' | 'shared' | 'influencer' | 'researcher' | null;
  organizationSize: 'startup' | 'small' | 'medium' | 'enterprise' | null;
  aiMaturityLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  primaryPainPoints: string[];
  industryVertical: string | null;
  previousAIExperience: boolean | null;
  teamReadiness: 'high' | 'medium' | 'low' | null;
  implementationComplexity: 'simple' | 'moderate' | 'complex' | null;
}

export interface LeadScore {
  overall: number;
  qualification: {
    budget: number;
    authority: number;
    need: number;
    timeline: number;
  };
  readiness: {
    aiMaturity: number;
    teamReadiness: number;
    organizationSize: number;
  };
  engagement: {
    sessionDuration: number;
    messageCount: number;
    topicsExplored: number;
  };
  recommendations: ServiceRecommendation[];
}

export interface ServiceRecommendation {
  type: 'consultation' | 'workshop' | 'assessment' | 'implementation';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  nextSteps: string[];
}

export const useLeadQualification = () => {
  const [qualificationData, setQualificationData] = useState<LeadQualificationData>({
    budgetRange: null,
    timelineUrgency: null,
    decisionAuthority: null,
    organizationSize: null,
    aiMaturityLevel: null,
    primaryPainPoints: [],
    industryVertical: null,
    previousAIExperience: null,
    teamReadiness: null,
    implementationComplexity: null,
  });

  const [leadScore, setLeadScore] = useState<LeadScore | null>(null);

  const updateQualificationData = useCallback((updates: Partial<LeadQualificationData>) => {
    setQualificationData(prev => ({ ...prev, ...updates }));
  }, []);

  const calculateLeadScore = useCallback((
    qualification: LeadQualificationData,
    engagementData: {
      sessionDuration: number;
      messageCount: number;
      topicsExplored: number;
    }
  ): LeadScore => {
    // Budget scoring (0-25 points)
    const budgetScore = (() => {
      switch (qualification.budgetRange) {
        case 'enterprise_100k+': return 25;
        case 'medium_25k-100k': return 20;
        case 'small_10k-25k': return 15;
        case 'startup_5k-10k': return 10;
        case 'limited_under_5k': return 5;
        default: return 0;
      }
    })();

    // Authority scoring (0-25 points)
    const authorityScore = (() => {
      switch (qualification.decisionAuthority) {
        case 'full': return 25;
        case 'shared': return 20;
        case 'influencer': return 15;
        case 'researcher': return 10;
        default: return 0;
      }
    })();

    // Need/Pain Point scoring (0-25 points)
    const needScore = Math.min(qualification.primaryPainPoints.length * 5, 25);

    // Timeline scoring (0-25 points)
    const timelineScore = (() => {
      switch (qualification.timelineUrgency) {
        case 'immediate': return 25;
        case 'within_3_months': return 20;
        case 'within_6_months': return 15;
        case 'exploring': return 10;
        default: return 0;
      }
    })();

    // AI Maturity scoring (0-20 points)
    const aiMaturityScore = (() => {
      switch (qualification.aiMaturityLevel) {
        case 'intermediate': return 20; // Sweet spot - ready to implement
        case 'beginner': return 15; // Needs education first
        case 'advanced': return 10; // May not need basic services
        default: return 0;
      }
    })();

    // Team Readiness scoring (0-15 points)
    const teamReadinessScore = (() => {
      switch (qualification.teamReadiness) {
        case 'high': return 15;
        case 'medium': return 10;
        case 'low': return 5;
        default: return 0;
      }
    })();

    // Organization Size scoring (0-15 points)
    const orgSizeScore = (() => {
      switch (qualification.organizationSize) {
        case 'enterprise': return 15;
        case 'medium': return 12;
        case 'small': return 10;
        case 'startup': return 8;
        default: return 0;
      }
    })();

    // Engagement scoring (0-30 points total)
    const engagementScore = Math.min(
      (engagementData.sessionDuration / 60) * 2 + // 2 points per minute, max 10
      (engagementData.messageCount * 0.5) + // 0.5 points per message, max 10
      (engagementData.topicsExplored * 2), // 2 points per topic, max 10
      30
    );

    const qualificationSubtotal = budgetScore + authorityScore + needScore + timelineScore;
    const readinessSubtotal = aiMaturityScore + teamReadinessScore + orgSizeScore;
    const overallScore = qualificationSubtotal + readinessSubtotal + engagementScore;

    // Generate service recommendations
    const recommendations = generateServiceRecommendations(qualification, {
      budget: budgetScore,
      authority: authorityScore,
      need: needScore,
      timeline: timelineScore,
      aiMaturity: aiMaturityScore,
      teamReadiness: teamReadinessScore,
      overall: overallScore
    });

    return {
      overall: Math.round(overallScore),
      qualification: {
        budget: budgetScore,
        authority: authorityScore,
        need: needScore,
        timeline: timelineScore
      },
      readiness: {
        aiMaturity: aiMaturityScore,
        teamReadiness: teamReadinessScore,
        organizationSize: orgSizeScore
      },
      engagement: {
        sessionDuration: Math.round(engagementData.sessionDuration),
        messageCount: engagementData.messageCount,
        topicsExplored: engagementData.topicsExplored
      },
      recommendations
    };
  }, []);

  const generateServiceRecommendations = (
    qualification: LeadQualificationData,
    scores: any
  ): ServiceRecommendation[] => {
    const recommendations: ServiceRecommendation[] = [];

    // High-value, immediate timeline prospects
    if (scores.overall >= 80 && qualification.timelineUrgency === 'immediate') {
      recommendations.push({
        type: 'consultation',
        title: 'Executive AI Strategy Session',
        description: 'One-on-one strategic consultation to create your AI implementation roadmap',
        priority: 'high',
        reasoning: 'High qualification score with immediate timeline indicates readiness for strategic engagement',
        nextSteps: [
          'Schedule 60-minute strategy session',
          'Prepare AI readiness assessment',
          'Develop custom implementation timeline'
        ]
      });
    }

    // Medium-high scores with good timeline
    if (scores.overall >= 60 && ['immediate', 'within_3_months'].includes(qualification.timelineUrgency || '')) {
      recommendations.push({
        type: 'workshop',
        title: 'AI Leadership Workshop',
        description: 'Interactive workshop for leadership teams to develop AI strategy and capabilities',
        priority: scores.overall >= 75 ? 'high' : 'medium',
        reasoning: 'Good qualification with near-term timeline suits structured learning approach',
        nextSteps: [
          'Book workshop for leadership team',
          'Customize content for your industry',
          'Include hands-on AI tool exploration'
        ]
      });
    }

    // Lower AI maturity but good business fundamentals
    if (qualification.aiMaturityLevel === 'beginner' && scores.qualification >= 50) {
      recommendations.push({
        type: 'assessment',
        title: 'AI Readiness Assessment',
        description: 'Comprehensive evaluation of your organization\'s AI readiness and opportunity areas',
        priority: 'medium',
        reasoning: 'Strong business case but needs foundational AI education',
        nextSteps: [
          'Complete detailed AI readiness evaluation',
          'Receive customized opportunity report',
          'Plan phased AI adoption approach'
        ]
      });
    }

    // Complex implementation needs
    if (qualification.implementationComplexity === 'complex' && scores.overall >= 70) {
      recommendations.push({
        type: 'implementation',
        title: 'AI Implementation Partnership',
        description: 'End-to-end AI implementation support with ongoing guidance',
        priority: 'high',
        reasoning: 'Complex needs with strong qualifications warrant comprehensive support',
        nextSteps: [
          'Design implementation roadmap',
          'Establish success metrics',
          'Begin with pilot project'
        ]
      });
    }

    // Default recommendation for engaged but lower-qualified leads
    if (scores.engagement >= 15 && recommendations.length === 0) {
      recommendations.push({
        type: 'consultation',
        title: 'AI Opportunity Discovery Call',
        description: 'Complimentary session to explore AI opportunities for your organization',
        priority: 'medium',
        reasoning: 'Good engagement level indicates genuine interest worth exploring',
        nextSteps: [
          'Schedule 30-minute discovery call',
          'Explore specific use cases',
          'Identify next steps for AI adoption'
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const saveLeadScore = useCallback(async (sessionId: string, score: LeadScore) => {
    try {
      const { error } = await supabase
        .from('lead_qualification_scores')
        .upsert({
          session_id: sessionId,
          engagement_score: score.engagement.messageCount + score.engagement.topicsExplored,
          business_readiness_score: score.qualification.budget + score.qualification.authority,
          pain_point_severity: score.qualification.need,
          implementation_readiness: score.readiness.aiMaturity + score.readiness.teamReadiness,
          total_score: score.overall,
          qualification_notes: `Timeline: ${qualificationData.timelineUrgency}, Authority: ${qualificationData.decisionAuthority}, Organization: ${qualificationData.organizationSize}`
        });

      if (error) {
        console.error('Error saving lead score:', error);
      }
    } catch (error) {
      console.error('Error in saveLeadScore:', error);
    }
  }, [qualificationData]);

  return {
    qualificationData,
    leadScore,
    updateQualificationData,
    calculateLeadScore,
    saveLeadScore,
    setLeadScore
  };
};