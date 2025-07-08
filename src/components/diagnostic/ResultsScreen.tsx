import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DiagnosticData, DiagnosticScores } from '../DiagnosticTool';
import { generatePersonalizedQuickWins } from '@/utils/personalAIQuickWins';

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

  const getPersonaDescription = (scores: DiagnosticScores, data: DiagnosticData) => {
    const toolCount = data.aiUseCases?.length || 0;
    const learningTime = data.upskillPercentage || 0;
    
    if (scores.aiToolFluency > 50 && scores.aiDecisionMaking > 50) {
      return `AI Power User - Using AI for ${toolCount} use cases, ${learningTime}% weekly learning time`;
    }
    if (scores.aiCommunication > 50 && scores.aiLearningGrowth > 50) {
      return `AI-Enhanced Communicator - Strong growth mindset, expanding influence`;
    }
    if (scores.aiToolFluency > 40) {
      return `AI Adopter - Building toolkit mastery, ${100 - scores.aiMindmakerScore} points to optimization`;
    }
    return `AI Explorer - Early journey, unlimited potential for 10X transformation`;
  };

  const generatePersonalizedInsights = () => {
    const insights = [];
    
    if (data.aiUseCases && data.aiUseCases.length > 0) {
      const topTools = data.aiUseCases.map(u => u.tool).filter(t => t).slice(0, 3);
      if (topTools.length > 0) {
        insights.push(`You're currently using ${topTools.join(', ')} for your AI-powered work.`);
      }
    }
    
    if (data.dailyFrictions && data.dailyFrictions.length > 0) {
      insights.push(`Your biggest productivity challenge is ${data.dailyFrictions[0].toLowerCase()}.`);
    }
    
    if (data.persuasionChallenge) {
      insights.push(`Your communication challenge: "${data.persuasionChallenge}"`);
    }
    
    if (data.upskillPercentage) {
      insights.push(`You're investing ${data.upskillPercentage}% of your time in AI skill development.`);
    }
    
    return insights;
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
            Your <span className="text-primary font-black underline decoration-primary decoration-4 underline-offset-4">AI Leadership</span> Readiness
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-body font-light">
            {getPersonaDescription(scores, data)}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Main Score Gauge */}
          <Card className="question-card text-center">
            <div className="space-y-8">
              <h2 className="text-2xl font-heading font-bold tracking-tight">
                AI Leadership Readiness
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
              
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {scores.aiMindmakerScore >= 60 ? 'Transformation Ready' : 
                   scores.aiMindmakerScore >= 45 ? 'AI-Forward Leader' :
                   scores.aiMindmakerScore >= 30 ? 'Accelerating Growth' : 'Emerging AI Leader'}
                </p>
                <p className="text-sm text-primary font-medium">
                  {100 - scores.aiMindmakerScore} points of breakthrough potential
                </p>
              </div>
            </div>
          </Card>

          {/* Radar Chart - Dimensions */}
          <Card className="question-card">
            <div className="space-y-6">
              <h2 className="text-2xl font-heading font-bold tracking-tight text-center">
                Personal AI Mastery Dimensions
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">AI Tool Fluency</span>
                      {scores.aiToolFluency < 50 && <span className="text-xs text-amber-600">⚡ Master more AI tools for 10X output</span>}
                    </div>
                    <span className={scores.aiToolFluency >= 50 ? "text-green-600 font-bold" : "text-primary"}>{scores.aiToolFluency}</span>
                  </div>
                  <Progress value={scores.aiToolFluency} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">AI-Enhanced Decision Making</span>
                      {scores.aiDecisionMaking < 50 && <span className="text-xs text-amber-600">🎯 Make decisions in hours, not days</span>}
                    </div>
                    <span className={scores.aiDecisionMaking >= 50 ? "text-green-600 font-bold" : "text-primary"}>{scores.aiDecisionMaking}</span>
                  </div>
                  <Progress value={scores.aiDecisionMaking} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">AI-Powered Communication</span>
                      {scores.aiCommunication < 50 && <span className="text-xs text-amber-600">📈 Amplify your influence with AI</span>}
                    </div>
                    <span className={scores.aiCommunication >= 50 ? "text-green-600 font-bold" : "text-primary"}>{scores.aiCommunication}</span>
                  </div>
                  <Progress value={scores.aiCommunication} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">AI Learning & Growth</span>
                      {scores.aiLearningGrowth < 50 && <span className="text-xs text-amber-600">🚀 Stay ahead of AI curve</span>}
                    </div>
                    <span className={scores.aiLearningGrowth >= 50 ? "text-green-600 font-bold" : "text-primary"}>{scores.aiLearningGrowth}</span>
                  </div>
                  <Progress value={scores.aiLearningGrowth} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">AI Ethics & Balance</span>
                      {scores.aiEthicsBalance < 50 && <span className="text-xs text-amber-600">🛡️ Build responsible AI practices</span>}
                    </div>
                    <span className={scores.aiEthicsBalance >= 50 ? "text-green-600 font-bold" : "text-primary"}>{scores.aiEthicsBalance}</span>
                  </div>
                  <Progress value={scores.aiEthicsBalance} className="h-2" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* We heard you section */}
        <Card className="question-card mt-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-heading font-bold tracking-tight text-center">
              We Heard You
            </h2>
            <p className="text-center text-muted-foreground">
              Based on your specific inputs, here's what we understand about your AI journey
            </p>
            
            <div className="space-y-4">
              {generatePersonalizedInsights().map((insight, index) => (
                <div key={index} className="bg-secondary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground italic">"{insight}"</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Wins */}
        <Card className="question-card mt-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-heading font-bold tracking-tight text-center">
              Your Next Steps
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {quickWins.slice(0, 4).map((win, index) => {
                const [title, impact] = win.split(' → ');
                return (
                  <div 
                    key={index}
                    className="bg-secondary/20 p-4 rounded-lg border border-primary/20"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{title}</h3>
                        <p className="text-xs text-muted-foreground">{impact?.split(' (')[0]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="text-center space-y-6 mt-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">
            Transform Your Leadership in 90 Days
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Unlock your {100 - scores.aiMindmakerScore} points of leadership potential with a tailored AI strategy sprint.
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