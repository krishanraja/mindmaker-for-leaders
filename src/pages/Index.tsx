import { UnifiedAssessment } from '@/components/UnifiedAssessment';
import { HeroSection } from '@/components/HeroSection';
import { VoiceOrchestrator } from '@/components/voice/VoiceOrchestrator';
import { AssessmentProvider } from '@/contexts/AssessmentContext';
import { useState } from 'react';

type AssessmentMode = 'hero' | 'voice' | 'quiz';

const Index = () => {
  const [mode, setMode] = useState<AssessmentMode>('hero');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  return (
    <AssessmentProvider>
      {mode === 'voice' ? (
        <VoiceOrchestrator 
          sessionId={sessionId}
          onBack={() => setMode('hero')}
        />
      ) : mode === 'quiz' ? (
        <UnifiedAssessment 
          onBack={() => setMode('hero')}
        />
      ) : (
        <div className="min-h-screen">
          <HeroSection 
            onStartVoice={() => setMode('voice')} 
            onStartQuiz={() => setMode('quiz')}
          />
        </div>
      )}
    </AssessmentProvider>
  );
};

export default Index;
