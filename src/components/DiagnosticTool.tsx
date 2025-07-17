import React, { useState } from 'react';
import { WelcomeScreen } from './diagnostic/WelcomeScreen';
import { QuestionFlow } from './diagnostic/QuestionFlow';
import { LoadingScreen } from './diagnostic/LoadingScreen';
import { ResultsScreen } from './diagnostic/ResultsScreen';
import { supabase } from '@/integrations/supabase/client';

export type DiagnosticStep = 'welcome' | 'questions' | 'loading' | 'results';

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
    
    // AI-Enhanced Decision Making (25%) - Based on AI trust level
    const aiTrust = ((data.aiTrustLevel || 3) - 1) / 4; // Normalize 1-5 to 0-1
    const aiDecisionMaking = Math.min(70, aiTrust * 70);
    
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
    setCurrentStep('loading');
    
    // Show loading for 3 seconds for anticipation
    setTimeout(() => {
      setCurrentStep('results');
    }, 3000);
    
    // Send email with diagnostic results
    try {
      console.log('Starting to send diagnostic email...');
      console.log('Data being sent:', { data: diagnosticData, scores: calculatedScores });
      
      // Try with explicit function call
      const response = await fetch(`https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/send-diagnostic-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXV4dnNjaHV3bmd0Y2Roc3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDE2NzgsImV4cCI6MjA2NzU3NzY3OH0.XmOP_W7gUdBuP23p4lH-iryMXPXMI69ZshU8Dwm6ujo`
        },
        body: JSON.stringify({
          data: diagnosticData,
          scores: calculatedScores
        })
      });
      
      const result = await response.json();
      console.log('Email response:', response.status, result);
      
      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.status} ${JSON.stringify(result)}`);
      }
      
      console.log('Diagnostic email sent successfully', result);
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
      
      {currentStep === 'loading' && (
        <LoadingScreen />
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