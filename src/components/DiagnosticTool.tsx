import React, { useState } from 'react';
import { WelcomeScreen } from './diagnostic/WelcomeScreen';
import RichConversationalAssessment from './RichConversationalAssessment';
import { supabase } from '@/integrations/supabase/client';

export type DiagnosticStep = 'welcome' | 'assessment' | 'loading' | 'results';

export interface AIUseCase {
  useCase: string;
  tool: string;
}

export interface DiagnosticData {
  // Section A - Personal Productivity
  deepWorkHours?: number;
  meetingHours?: number;
  adminHours?: number;
  aiUseCases?: AIUseCase[];
  
  // Section B - Decision Velocity
  decisionMakingSpeed?: number;
  aiTrustLevel?: number;
  
  // Section C - Stakeholder Influence
  stakeholderAudiences?: string[];
  persuasionChallenge?: string;
  customAudience?: string;
  
  // Section D - Learning & Growth
  upskillPercentage?: number;
  skillGaps?: string[];
  
  // Section E - Risk & Governance
  hasAiSafetyPlaybook?: boolean;
  riskComfortLevel?: number;
  
  // Section F - Priority & Contact
  dailyFrictions?: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  title?: string;
  linkedinUrl?: string;
  specificNeeds?: string;
  prioritizedStrategies?: string[];
  allChallenges?: string[];
}

export interface DiagnosticScores {
  aiToolFluency: number;
  aiDecisionMaking: number;
  aiCommunication: number;
  aiLearningGrowth: number;
  aiEthicsBalance: number;
  aiMindmakerScore: number;
}

const DiagnosticTool: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<DiagnosticStep>('welcome');
  const [sessionData, setSessionData] = useState<any>(null);

  const handleStepChange = (step: DiagnosticStep) => {
    setCurrentStep(step);
  };

  const handleAssessmentComplete = (data: any) => {
    setSessionData(data);
    setCurrentStep('results');
  };

  return (
    <div className="min-h-screen bg-background">
      {currentStep === 'welcome' && (
        <WelcomeScreen 
          onStart={() => handleStepChange('assessment')}
        />
      )}

      {currentStep === 'assessment' && (
        <RichConversationalAssessment 
          onComplete={handleAssessmentComplete}
        />
      )}
    </div>
  );
};

export default DiagnosticTool;