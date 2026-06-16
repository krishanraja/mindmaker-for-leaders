import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Target, Lightbulb, Users, Zap, LucideIcon } from 'lucide-react';
import { CtrlLogo } from '@/components/landing/CtrlLogo';

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

// Educational micro-content that rotates during loading
const educationalTips = [
  {
    icon: Lightbulb,
    title: "Did you know?",
    content: "Leaders who use AI prompts tailored to their role save an average of 5-10 hours per week."
  },
  {
    icon: Users,
    title: "Peer Insight",
    content: "Only 12% of executives effectively connect AI initiatives to growth KPIs. Your benchmark will show where you stand."
  },
  {
    icon: Zap,
    title: "Quick Win",
    content: "The most impactful AI adoption starts with one high-value workflow, not company-wide rollouts."
  },
  {
    icon: TrendingUp,
    title: "Growth Signal",
    content: "Teams with aligned AI narratives ship 2.3x faster than those without shared language."
  },
  {
    icon: Brain,
    title: "Leadership Insight",
    content: "AI-fluent leaders spend 40% more time on strategic work and 40% less on operational tasks."
  },
  {
    icon: Target,
    title: "Focus Area",
    content: "Your biggest tension often reveals your biggest opportunity for AI-driven growth."
  }
];

const defaultPhases: Record<string, ProgressPhase> = {
  analyzing: {
    label: 'Analyzing',
    description: 'Mapping your strategic position and AI readiness signals...',
    icon: Brain
  },
  generating: {
    label: 'Generating',
    description: 'Creating personalized insights based on 500+ executive benchmarks...',
    icon: TrendingUp
  },
  finalizing: {
    label: 'Preparing',
    description: 'Building your custom AI toolkit and action plan...',
    icon: Target
  }
};

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ 
  progress, 
  phase,
  title = "Creating Your AI Leadership Insights",
  subtitle,
  phases = Object.values(defaultPhases)
}) => {
  const [tipIndex, setTipIndex] = useState(0);
  // Track the highest progress ever seen - never regress visually
  const [displayProgress, setDisplayProgress] = useState(progress);
  const currentPhase = defaultPhases[phase];
  const currentTip = educationalTips[tipIndex];
  const TipIcon = currentTip.icon;

  // Only update display progress if new progress is higher (monotonic increase)
  useEffect(() => {
    setDisplayProgress(prev => Math.max(prev, progress));
  }, [progress]);

  // Smooth minimum progress over time to feel premium
  useEffect(() => {
    // Start with at least 5% and gradually increase minimum floor
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      // Minimum progress: starts at 5%, reaches 85% at 30 seconds, caps there
      const minProgress = Math.min(5 + (elapsed * 2.5), 85);
      setDisplayProgress(prev => Math.max(prev, minProgress));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % educationalTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[100dvh] h-[100dvh] flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg mx-auto text-center bg-card border shadow-xl rounded-2xl animate-fade-in min-h-[70vh] sm:min-h-0 flex flex-col justify-center">
        <CardContent className="p-6 sm:p-8 space-y-6 sm:space-y-8 flex flex-col justify-center">
          {/* Logo first - most important for branding */}
          <div className="flex justify-center">
            <CtrlLogo className="h-9 sm:h-11 w-auto" />
          </div>
          
          {/* Title & Current Phase */}
          <div className="space-y-1 sm:space-y-2">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground transition-all duration-300">
              {currentPhase.description}
            </p>
          </div>
          
          {/* Progress - always uses monotonic displayProgress */}
          <div className="space-y-2">
            <Progress value={displayProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentPhase.label}</span>
              <span className="tabular-nums">{Math.round(displayProgress)}%</span>
            </div>
          </div>
          
          {/* Phase Indicators */}
          <div className="flex justify-center gap-6">
            {phases.map((phaseItem, idx) => {
              const Icon = phaseItem.icon;
              const isActive = phaseItem.label === currentPhase.label;
              const isPast = phases.indexOf(currentPhase) > idx;
              return (
                <div key={phaseItem.label} className="flex flex-col items-center gap-1 transition-all duration-300">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'bg-primary/20 text-primary scale-110' : 
                    isPast ? 'bg-emerald-500/20 text-emerald-600' : 
                    'bg-secondary text-muted-foreground'
                  }`}>
                    <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'animate-pulse' : ''}`} />
                  </div>
                  <span className={`text-xs transition-colors duration-300 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {phaseItem.label}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Educational Tip - Smooth crossfade - hidden on very small screens */}
          <div className="pt-3 sm:pt-4 border-t border-border hidden sm:block">
            <div 
              key={tipIndex}
              className="bg-secondary/30 rounded-lg p-3 sm:p-4 animate-fade-in"
              style={{ animationDuration: '0.4s' }}
            >
              <div className="flex items-start gap-2 sm:gap-3 text-left">
                <div className="shrink-0 p-1 sm:p-1.5 bg-primary/10 rounded transition-colors duration-300">
                  <TipIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-0.5 sm:mb-1">{currentTip.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentTip.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
