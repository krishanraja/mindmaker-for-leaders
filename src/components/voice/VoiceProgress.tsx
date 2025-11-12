import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pause, Play, Mail } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface VoiceProgressProps {
  currentModule: 'compass' | 'roi';
  elapsedSeconds: number;
  totalSeconds: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinishLater: () => void;
}

export const VoiceProgress: React.FC<VoiceProgressProps> = ({
  currentModule,
  elapsedSeconds,
  totalSeconds,
  isPaused,
  onPause,
  onResume,
  onFinishLater
}) => {
  const isMobile = useIsMobile();
  const progressPercentage = (elapsedSeconds / totalSeconds) * 100;
  const minutesRemaining = Math.ceil((totalSeconds - elapsedSeconds) / 60);
  const moduleLabel = currentModule === 'compass' ? 'Compass (1/2)' : 'ROI (2/2)';
  
  // Hide on mobile
  if (isMobile) {
    return null;
  }
  
  const getProgressColor = () => {
    if (progressPercentage < 60) return 'text-success';
    if (progressPercentage < 90) return 'text-[hsl(var(--tier-aware))]';
    return 'text-destructive';
  };

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border py-3 px-4 sm:px-6">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{moduleLabel}</span>
            <span className={`text-xs font-medium ${getProgressColor()}`}>
              ~{minutesRemaining} min left
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isPaused ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResume}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPause}
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onFinishLater}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Finish later
            </Button>
          </div>
        </div>
        
        <Progress value={progressPercentage} className="h-2" />
        
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-muted-foreground">
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.floor(totalSeconds / 60)}:{String(totalSeconds % 60).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
};
