import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Target, Sparkles, LucideIcon } from 'lucide-react';
import mindmakerLogo from '@/assets/mindmaker-logo-dark.png';

interface ProgressPhase {
  label: string;
  description: string;
  icon: LucideIcon;
}

interface ProgressScreenProps {
  progress: number;
  phase: 'analyzing' | 'generating' | 'finalizing';
  title?: string;
  subtitle?: string;
  phases?: ProgressPhase[];
}

const defaultPhases: Record<string, ProgressPhase> = {
  analyzing: {
    label: 'Strategic Analysis',
    description: 'Analyzing your strategic position and AI readiness...',
    icon: Brain
  },
  generating: {
    label: 'Leadership Insights',
    description: 'Generating executive-level insights and recommendations...',
    icon: TrendingUp
  },
  finalizing: {
    label: 'Action Plan',
    description: 'Preparing your personalized leadership development plan...',
    icon: Target
  }
};

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ 
  progress, 
  phase,
  title = "Creating Your AI Leadership Insights",
  subtitle = "We're analyzing your responses to create a personalized AI leadership development strategy tailored to your unique challenges and opportunities.",
  phases = Object.values(defaultPhases)
}) => {
  const currentPhase = defaultPhases[phase];
  const PhaseIcon = currentPhase.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
      <Card className="w-full max-w-2xl mx-4 p-8 text-center bg-card/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardContent className="space-y-8">
          <div className="flex justify-center">
            <img 
              src={mindmakerLogo} 
              alt="Mindmaker" 
              className="h-16 w-auto animate-pulse"
            />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              {title}
            </h2>
            <div className="h-[6rem] flex items-center justify-center">
              <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {currentPhase.description}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {progress}% Complete
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            {phases.map((phaseItem) => {
              const Icon = phaseItem.icon;
              return (
                <div key={phaseItem.label} className="space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{phaseItem.label}</p>
                </div>
              );
            })}
          </div>
          
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground italic">
              {subtitle}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
