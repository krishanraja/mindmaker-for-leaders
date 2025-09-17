import React, { useState } from 'react';
import { HeroSection } from './HeroSection';
import { StreamlinedAssessment } from './StreamlinedAssessment';

type Screen = 'landing' | 'assessment' | 'results';

export default function ExecutiveDiagnosticToolRevamped() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');

  const handleStartAssessment = () => {
    setCurrentScreen('assessment');
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
  };

  const handleAssessmentComplete = () => {
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

  // Results or other assessment types would go here
  return (
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white">
        <div className="section-padding">
          <h1 className="section-header font-display font-bold mb-4 text-white">
            Assessment Complete
          </h1>
          <p className="text-lg text-white/80">
            Your personalized AI literacy insights are being generated...
          </p>
        </div>
      </div>
    </div>
  );
}