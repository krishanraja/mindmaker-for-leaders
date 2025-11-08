import { UnifiedAssessment } from '@/components/UnifiedAssessment';
import { HeroSection } from '@/components/HeroSection';
import { VoiceOrchestrator } from '@/components/voice/VoiceOrchestrator';
import { useState } from 'react';

type AssessmentMode = 'hero' | 'voice' | 'quiz';

const Index = () => {
  const [mode, setMode] = useState<AssessmentMode>('hero');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  if (mode === 'voice') {
    return (
      <VoiceOrchestrator 
        sessionId={sessionId}
        onBack={() => setMode('hero')}
      />
    );
  }

  if (mode === 'quiz') {
    return (
      <UnifiedAssessment 
        onBack={() => setMode('hero')}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <HeroSection 
        onStartVoice={() => setMode('voice')} 
        onStartQuiz={() => setMode('quiz')}
      />
    </div>
  );
};

export default Index;
