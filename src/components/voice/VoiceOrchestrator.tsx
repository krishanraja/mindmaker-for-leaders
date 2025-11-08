import React, { useState } from 'react';
import { VoiceProgress } from './VoiceProgress';
import { CompassModule } from './CompassModule';
import { RoiModule } from './RoiModule';
import { VoiceSummary } from './VoiceSummary';
import { GatedModal } from './GatedModal';
import { CompassResults, RoiEstimate } from '@/types/voice';

interface VoiceOrchestratorProps {
  sessionId: string;
  onBack: () => void;
}

type VoiceStep = 'compass' | 'roi' | 'summary';

export const VoiceOrchestrator: React.FC<VoiceOrchestratorProps> = ({ sessionId, onBack }) => {
  const [currentStep, setCurrentStep] = useState<VoiceStep>('compass');
  const [compassResults, setCompassResults] = useState<CompassResults | null>(null);
  const [roiEstimate, setRoiEstimate] = useState<RoiEstimate | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);

  const handleCompassComplete = (results: CompassResults) => {
    setCompassResults(results);
    setCurrentStep('roi');
  };

  const handleRoiComplete = (estimate: RoiEstimate) => {
    setRoiEstimate(estimate);
    setCurrentStep('summary');
  };

  return (
    <div className="min-h-screen bg-background">
      <VoiceProgress
        currentModule={currentStep === 'compass' ? 'compass' : 'roi'}
        elapsedSeconds={elapsedSeconds}
        totalSeconds={120}
        isPaused={isPaused}
        onPause={() => setIsPaused(true)}
        onResume={() => setIsPaused(false)}
        onFinishLater={onBack}
      />

      {currentStep === 'compass' && (
        <CompassModule sessionId={sessionId} onComplete={handleCompassComplete} />
      )}

      {currentStep === 'roi' && (
        <RoiModule 
          sessionId={sessionId} 
          onComplete={handleRoiComplete}
          onGate={() => setShowGateModal(true)}
        />
      )}

      {currentStep === 'summary' && compassResults && (
        <VoiceSummary
          compassResults={compassResults}
          roiEstimate={roiEstimate}
          onUnlock={() => setShowGateModal(true)}
        />
      )}

      <GatedModal
        open={showGateModal}
        onClose={() => setShowGateModal(false)}
        onUnlock={() => console.log('Unlocked')}
        sessionId={sessionId}
      />
    </div>
  );
};
