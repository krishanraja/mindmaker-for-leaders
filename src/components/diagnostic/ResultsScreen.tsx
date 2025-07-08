import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DiagnosticData, DiagnosticScores } from '../DiagnosticTool';
import { generatePersonalizedQuickWins } from '@/utils/quickWinsGenerator';

interface ResultsScreenProps {
  data: DiagnosticData;
  scores: DiagnosticScores;
  onRestart: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ 
  data, 
  scores, 
  onRestart 
}) => {
  const quickWins = generatePersonalizedQuickWins(data, scores);

  const getPersonaDescription = (scores: DiagnosticScores) => {
    if (scores.influenceQuotient > 70 && scores.decisionAgility < 50) {
      return 'High Influence / Low Decision Agility';
    }
    if (scores.productivityMultiplier > 80) {
      return 'Productivity Powerhouse';
    }
    if (scores.growthMindset > 75) {
      return 'Growth-Oriented Leader';
    }
    return 'Emerging AI Leader';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="diagnostic-container py-12">
        
        {/* Header */}
        <div className="text-center space-y-6 mb-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="/lovable-uploads/2819589c-814c-4ec7-9e78-0d2a80b89243.png" 
              alt="AI Mindmaker Logo" 
              className="h-16 w-auto"
            />
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black tracking-tight leading-[0.9]">
            Your <span className="text-primary font-black underline decoration-primary decoration-4 underline-offset-4">AI Mindmaker</span> Results
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-body font-light">
            {getPersonaDescription(scores)}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Main Score Gauge */}
          <Card className="question-card text-center">
            <div className="space-y-8">
              <h2 className="text-2xl font-heading font-bold tracking-tight">
                Overall AI Mindmaker Score
              </h2>
              
              <div className="relative">
                <div className="w-48 h-48 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(scores.aiMindmakerScore / 100) * 251.2} 251.2`}
                      className="purple-glow transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">
                        {scores.aiMindmakerScore}
                      </div>
                      <div className="text-sm text-muted-foreground">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-muted-foreground">
                You're in the top {100 - scores.aiMindmakerScore}% of AI-forward leaders
              </p>
            </div>
          </Card>

          {/* Radar Chart - Dimensions */}
          <Card className="question-card">
            <div className="space-y-6">
              <h2 className="text-2xl font-heading font-bold tracking-tight text-center">
                Leadership Dimensions
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Productivity Multiplier</span>
                    <span className="text-primary">{scores.productivityMultiplier}</span>
                  </div>
                  <Progress value={scores.productivityMultiplier} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Decision Agility</span>
                    <span className="text-primary">{scores.decisionAgility}</span>
                  </div>
                  <Progress value={scores.decisionAgility} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Influence Quotient</span>
                    <span className="text-primary">{scores.influenceQuotient}</span>
                  </div>
                  <Progress value={scores.influenceQuotient} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Growth Mindset</span>
                    <span className="text-primary">{scores.growthMindset}</span>
                  </div>
                  <Progress value={scores.growthMindset} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Governance Confidence</span>
                    <span className="text-primary">{scores.governanceConfidence}</span>
                  </div>
                  <Progress value={scores.governanceConfidence} className="h-2" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Wins */}
        <Card className="question-card mt-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-heading font-bold tracking-tight text-center">
              Your Quick Wins
            </h2>
            <p className="text-center text-muted-foreground">
              5 AI tricks/tools mapped to your daily frictions
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickWins.map((win, index) => (
                <div 
                  key={index}
                  className="bg-secondary/20 p-4 rounded-lg border border-primary/20 hover:border-primary/40 transition-all duration-300"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {index + 1}
                    </div>
                    <span className="text-sm">{win}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="text-center space-y-6 mt-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">
            Ready to 10× your leadership impact?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Book a 30 minute consult to scope out your tailored 90-day agentic AI sprint.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="btn-primary"
              onClick={() => window.open('https://calendly.com/krish-raja/krish-raja', '_blank')}
            >
              Book a call
            </Button>
            <Button variant="outline" onClick={onRestart}>
              Retake Diagnostic
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};