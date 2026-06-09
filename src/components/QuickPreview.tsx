import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, Zap, TrendingUp } from 'lucide-react';
import mindmakerLogo from '@/assets/mindmaker-logo.png';

interface QuickPreviewProps {
  assessmentData: Record<string, any>;
  onContinue: () => void;
}

// Generate a tension teaser based on early assessment answers
const generateTensionTeaser = (data: Record<string, any>): { tension: string; insight: string } => {
  const answers = Object.entries(data);
  
  // Look for contrasting signals in the data
  const industryScore = parseAnswerScore(data.industry_impact);
  const businessScore = parseAnswerScore(data.business_acceleration);
  const teamScore = parseAnswerScore(data.team_alignment);
  
  // Find tensions based on score patterns
  if (industryScore >= 4 && teamScore <= 2) {
    return {
      tension: "Vision-Alignment Gap",
      insight: "You understand AI's industry impact, but your team isn't aligned yet. This gap is costing you 3-6 months in execution speed."
    };
  }
  
  if (businessScore >= 4 && industryScore <= 2) {
    return {
      tension: "Tactical vs Strategic",
      insight: "You're focused on immediate AI applications but may be missing the bigger industry shift. Leaders who balance both see 2.3x better outcomes."
    };
  }
  
  if (teamScore >= 4 && industryScore >= 4) {
    return {
      tension: "Ready for Acceleration",
      insight: "Your foundation is strong. The next level requires connecting AI initiatives directly to growth KPIs, which only 12% of leaders do effectively."
    };
  }
  
  if (industryScore <= 2 && businessScore <= 2) {
    return {
      tension: "Discovery Opportunity",
      insight: "You're at the start of your AI leadership journey. The good news? Leaders who build awareness systematically outperform reactive adopters by 40%."
    };
  }
  
  // Default tension
  return {
    tension: "Growth Pattern Detected",
    insight: "Your responses reveal a unique AI adoption pattern. Complete the benchmark to see where you stand vs 500+ executives."
  };
};

const parseAnswerScore = (answer: string | undefined): number => {
  if (!answer) return 3;
  const match = answer.match(/^(\d)/);
  return match ? parseInt(match[1]) : 3;
};

export const QuickPreview: React.FC<QuickPreviewProps> = ({ 
  assessmentData, 
  onContinue 
}) => {
  const { tension, insight } = generateTensionTeaser(assessmentData);

  return (
    <div className="bg-background min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full shadow-lg border rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border-b border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">Early Insight Detected</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {tension}
            </h2>
          </div>
          
          {/* Insight Content */}
          <div className="p-6 sm:p-8">
            <div className="flex gap-4 mb-6">
              <div className="shrink-0 mt-1">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {insight}
              </p>
            </div>
            
            {/* What's Next Teaser */}
            <div className="bg-secondary/30 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-foreground text-sm mb-3">Complete your benchmark to unlock:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Full tension analysis with actionable next moves
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Peer comparison vs 500+ executives
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Custom AI prompts for your role
                </li>
              </ul>
            </div>
            
            {/* CTA */}
            <Button 
              variant="cta" 
              size="lg"
              className="w-full rounded-xl text-lg py-6"
              onClick={onContinue}
            >
              Complete My Benchmark
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <p className="text-center text-xs text-muted-foreground mt-4">
              3 more questions · Takes ~1 minute
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
