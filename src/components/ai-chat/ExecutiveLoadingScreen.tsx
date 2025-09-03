import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Target, Sparkles } from 'lucide-react';

interface ExecutiveLoadingScreenProps {
  progress: number;
  phase: 'analyzing' | 'generating' | 'finalizing';
}

const ExecutiveLoadingScreen: React.FC<ExecutiveLoadingScreenProps> = ({ 
  progress, 
  phase 
}) => {
  const phaseMessages = {
    analyzing: "Analyzing your strategic position and AI readiness...",
    generating: "Generating executive-level insights and recommendations...",
    finalizing: "Preparing your personalized leadership development plan..."
  };

  const phaseIcons = {
    analyzing: <Brain className="h-8 w-8 text-primary animate-pulse" />,
    generating: <TrendingUp className="h-8 w-8 text-primary animate-pulse" />,
    finalizing: <Target className="h-8 w-8 text-primary animate-pulse" />
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
      <Card className="w-full max-w-2xl mx-4 p-8 text-center bg-card/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardContent className="space-y-8">
          <div className="flex justify-center">
            <div className="relative">
              {phaseIcons[phase]}
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-4 w-4 text-primary/60 animate-spin" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Creating Your AI Leadership Insights
            </h2>
            <p className="text-lg text-muted-foreground">
              {phaseMessages[phase]}
            </p>
          </div>
          
          <div className="space-y-3">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {progress}% Complete
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Strategic Analysis</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Leadership Insights</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Action Plan</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground italic">
              "We're analyzing your responses to create a personalized AI leadership development strategy tailored to your unique challenges and opportunities."
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveLoadingScreen;