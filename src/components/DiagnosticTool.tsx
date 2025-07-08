import React, { useState } from 'react';
import { WelcomeScreen } from './diagnostic/WelcomeScreen';
import { QuestionFlow } from './diagnostic/QuestionFlow';
import { ResultsScreen } from './diagnostic/ResultsScreen';
import { supabase } from '@/integrations/supabase/client';

export type DiagnosticStep = 'welcome' | 'questions' | 'results';

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
  hoursToDecision?: number;
  aiTrustLevel?: number;
  
  // Section C - Stakeholder Influence
  stakeholderAudiences?: string[];
  persuasionChallenge?: string;
  
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
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData>({});
  const [scores, setScores] = useState<DiagnosticScores | null>(null);

  const handleStepChange = (step: DiagnosticStep) => {
    setCurrentStep(step);
  };

  const handleDataUpdate = (data: Partial<DiagnosticData>) => {
    setDiagnosticData(prev => ({ ...prev, ...data }));
  };

  const calculateScores = (data: DiagnosticData): DiagnosticScores => {
    // AI Tool Fluency (25%) - Based on tool usage and time allocation optimization
    const toolCount = (data.aiUseCases?.length || 0);
    const deepWorkOptimization = Math.min(1, (data.deepWorkHours || 0) / 10);
    const aiToolFluency = Math.min(70, (toolCount / 9) * 40 + deepWorkOptimization * 30);
    
    // AI-Enhanced Decision Making (25%) - Based on decision speed and AI trust
    const decisionSpeed = Math.min(1, (48 - (data.hoursToDecision || 48)) / 48);
    const aiTrust = ((data.aiTrustLevel || 3) - 1) / 4; // Normalize 1-5 to 0-1
    const aiDecisionMaking = Math.min(70, (decisionSpeed * 35) + (aiTrust * 35));
    
    // AI-Enhanced Communication (20%) - Based on audience reach and communication challenges
    const audienceCount = (data.stakeholderAudiences?.length || 0);
    const hasChallenge = data.persuasionChallenge ? 1 : 0;
    const aiCommunication = Math.min(70, (audienceCount / 6) * 40 + hasChallenge * 30);
    
    // AI Learning & Growth (20%) - Based on learning investment and skill development
    const learningTime = (data.upskillPercentage || 0) / 50; // Normalize to 0-1
    const skillFocus = Math.min(1, (data.skillGaps?.length || 0) / 3);
    const aiLearningGrowth = Math.min(70, learningTime * 35 + skillFocus * 35);
    
    // AI Ethics & Balance (10%) - Based on personal guidelines and comfort level
    const hasGuidelines = data.hasAiSafetyPlaybook ? 35 : 0;
    const balanceLevel = ((data.riskComfortLevel || 5) / 10) * 35;
    const aiEthicsBalance = Math.min(70, hasGuidelines + balanceLevel);
    
    // Overall AI Mindmaker Score - Weighted average
    const aiMindmakerScore = Math.round(
      (aiToolFluency * 0.25) +
      (aiDecisionMaking * 0.25) +
      (aiCommunication * 0.20) +
      (aiLearningGrowth * 0.20) +
      (aiEthicsBalance * 0.10)
    );

    return {
      aiToolFluency: Math.round(aiToolFluency),
      aiDecisionMaking: Math.round(aiDecisionMaking),
      aiCommunication: Math.round(aiCommunication),
      aiLearningGrowth: Math.round(aiLearningGrowth),
      aiEthicsBalance: Math.round(aiEthicsBalance),
      aiMindmakerScore
    };
  };

  const handleComplete = async () => {
    const calculatedScores = calculateScores(diagnosticData);
    setScores(calculatedScores);
    setCurrentStep('results');
    
    // Send email with diagnostic results
    try {
      console.log('Starting to send diagnostic email...');
      console.log('Data being sent:', { data: diagnosticData, scores: calculatedScores });
      
      const { data: responseData, error } = await supabase.functions.invoke('send-diagnostic-email', {
        body: {
          data: diagnosticData,
          scores: calculatedScores
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      console.log('Diagnostic email sent successfully', responseData);
    } catch (error) {
      console.error('Failed to send diagnostic email:', error);
      // Don't block the user from seeing results even if email fails
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {currentStep === 'welcome' && (
        <WelcomeScreen onStart={() => handleStepChange('questions')} />
      )}
      
      {currentStep === 'questions' && (
        <QuestionFlow
          data={diagnosticData}
          onDataUpdate={handleDataUpdate}
          onComplete={handleComplete}
        />
      )}
      
      {currentStep === 'results' && scores && (
        <ResultsScreen
          data={diagnosticData}
          scores={scores}
          onRestart={() => {
            setCurrentStep('welcome');
            setDiagnosticData({});
            setScores(null);
          }}
        />
      )}
    </div>
  );
};

export default DiagnosticTool;