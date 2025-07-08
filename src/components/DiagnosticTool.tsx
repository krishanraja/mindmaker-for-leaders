import React, { useState } from 'react';
import { WelcomeScreen } from './diagnostic/WelcomeScreen';
import { QuestionFlow } from './diagnostic/QuestionFlow';
import { ResultsScreen } from './diagnostic/ResultsScreen';

export type DiagnosticStep = 'welcome' | 'questions' | 'results';

export interface DiagnosticData {
  // Section A - Personal Productivity
  deepWorkHours?: number;
  meetingHours?: number;
  adminHours?: number;
  aiCopilots?: string[];
  
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
  email?: string;
  company?: string;
  title?: string;
  linkedinUrl?: string;
}

export interface DiagnosticScores {
  productivityMultiplier: number;
  decisionAgility: number;
  influenceQuotient: number;
  growthMindset: number;
  governanceConfidence: number;
  aldadScore: number;
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
    // Scoring algorithm implementation
    const deepWorkRatio = (data.deepWorkHours || 0) / 24;
    const copilotUse = (data.aiCopilots?.length || 0) / 4; // Max 4 copilots
    
    const productivityMultiplier = Math.min(100, (deepWorkRatio * copilotUse) * 100);
    
    const decisionAgility = Math.min(100, 
      ((72 - (data.hoursToDecision || 72)) / 72) * (data.aiTrustLevel || 0) * 25
    );
    
    const influenceQuotient = Math.min(100, 
      ((data.stakeholderAudiences?.length || 0) / 4) * 
      (data.persuasionChallenge ? 70 : 100)
    );
    
    const growthMindset = Math.min(100, 
      (data.upskillPercentage || 0) * 
      (1 - ((data.skillGaps?.length || 0) / 5)) * 100
    );
    
    const governanceConfidence = Math.min(100, 
      ((data.hasAiSafetyPlaybook ? 50 : 0) + (data.riskComfortLevel || 0) * 5)
    );
    
    const aldadScore = Math.round(
      (productivityMultiplier * 0.25) +
      (decisionAgility * 0.25) +
      (influenceQuotient * 0.2) +
      (growthMindset * 0.2) +
      (governanceConfidence * 0.1)
    );

    return {
      productivityMultiplier: Math.round(productivityMultiplier),
      decisionAgility: Math.round(decisionAgility),
      influenceQuotient: Math.round(influenceQuotient),
      growthMindset: Math.round(growthMindset),
      governanceConfidence: Math.round(governanceConfidence),
      aldadScore
    };
  };

  const handleComplete = () => {
    const calculatedScores = calculateScores(diagnosticData);
    setScores(calculatedScores);
    setCurrentStep('results');
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