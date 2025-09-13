import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Target, Lightbulb } from 'lucide-react';

interface EnhancedLoadingScreenProps {
  onComplete: () => void;
}

interface LoadingPhase {
  name: string;
  description: string;
  icon: React.ElementType;
  duration: number;
}

const loadingPhases: LoadingPhase[] = [
  {
    name: 'Analyzing Responses',
    description: 'Processing your leadership assessment data...',
    icon: Brain,
    duration: 3000
  },
  {
    name: 'Generating Insights',
    description: 'Creating personalized AI recommendations...',
    icon: Lightbulb,
    duration: 3000
  },
  {
    name: 'Strategic Analysis',
    description: 'Calculating your competitive positioning...',
    icon: TrendingUp,
    duration: 2000
  },
  {
    name: 'Finalizing Report',
    description: 'Preparing your executive summary...',
    icon: Target,
    duration: 1000
  }
];

export const EnhancedLoadingScreen: React.FC<EnhancedLoadingScreenProps> = ({ onComplete }) => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);

  useEffect(() => {
    const totalDuration = loadingPhases.reduce((sum, phase) => sum + phase.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 100;
      
      // Calculate overall progress
      const overallProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(overallProgress);

      // Calculate which phase we're in
      let phaseElapsed = 0;
      let newPhaseIndex = 0;
      
      for (let i = 0; i < loadingPhases.length; i++) {
        if (elapsed <= phaseElapsed + loadingPhases[i].duration) {
          newPhaseIndex = i;
          const phaseProgressValue = ((elapsed - phaseElapsed) / loadingPhases[i].duration) * 100;
          setPhaseProgress(Math.min(phaseProgressValue, 100));
          break;
        }
        phaseElapsed += loadingPhases[i].duration;
      }
      
      setCurrentPhaseIndex(newPhaseIndex);

      // Complete when done
      if (elapsed >= totalDuration) {
        clearInterval(interval);
        setTimeout(onComplete, 500);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  const currentPhase = loadingPhases[currentPhaseIndex];
  const IconComponent = currentPhase.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-6">
            {/* Main Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-spin border-t-primary"></div>
              </div>
            </div>

            {/* Phase Title */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {currentPhase.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentPhase.description}
              </p>
            </div>

            {/* Progress */}
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="text-sm text-muted-foreground">
                {Math.round(progress)}% Complete
              </div>
            </div>

            {/* Phase Indicators */}
            <div className="flex justify-center space-x-2">
              {loadingPhases.map((phase, index) => {
                const PhaseIcon = phase.icon;
                const isActive = index === currentPhaseIndex;
                const isCompleted = index < currentPhaseIndex;
                
                return (
                  <div
                    key={phase.name}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isActive
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-muted text-muted-foreground'
                    }`}
                  >
                    <PhaseIcon className="w-4 h-4" />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};