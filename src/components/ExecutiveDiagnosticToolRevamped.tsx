import React, { useState } from 'react';
import { HeroSection } from './HeroSection';
import { StreamlinedAssessment } from './StreamlinedAssessment';
import AILiteracyReport from './AILiteracyReport';

type Screen = 'landing' | 'assessment' | 'results';

interface AssessmentData {
  [key: string]: any;
}

export default function ExecutiveDiagnosticToolRevamped() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleStartAssessment = () => {
    setCurrentScreen('assessment');
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
  };

  const handleAssessmentComplete = (data: AssessmentData, session: string | null) => {
    setAssessmentData(data);
    setSessionId(session);
    setCurrentScreen('results');
  };

  if (currentScreen === 'landing') {
    return (
      <div className="min-h-screen">
        <HeroSection onStartAssessment={handleStartAssessment} />
      </div>
    );
  }

  if (currentScreen === 'assessment') {
    return (
      <StreamlinedAssessment 
        onComplete={handleAssessmentComplete} 
        onBack={handleBackToLanding}
      />
    );
  }

  if (currentScreen === 'results') {
    return (
      <AILiteracyReport 
        assessmentData={assessmentData}
        sessionId={sessionId}
        onBack={handleBackToLanding}
      />
    );
  }

  return null;
}