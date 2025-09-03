import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DiagnosticData, DiagnosticScores } from '../DiagnosticTool';
import { generatePersonalizedQuickWins } from '@/utils/personalAIQuickWins';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
  // Scroll to top when results screen loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
      <div className={`diagnostic-container ${isMobile ? 'px-4 py-8' : 'py-12'}`}>
        
        {/* Header */}
        <div className={`text-center space-y-4 md:space-y-6 ${isMobile ? 'mb-8' : 'mb-12'}`}>
          {/* Logo */}
          <div className={`flex justify-center ${isMobile ? 'mb-4' : 'mb-8'}`}>
            <img 
              src="/lovable-uploads/2819589c-814c-4ec7-9e78-0d2a80b89243.png" 
              alt="AI Mindmaker Logo" 
              className={`w-auto ${isMobile ? 'h-12' : 'h-16'}`}
            />
          </div>
          
          <h1 className={`font-display font-black tracking-tight leading-[0.9] px-2 ${
            isMobile 
              ? 'text-2xl sm:text-3xl' 
              : 'text-3xl md:text-4xl lg:text-5xl'
          }`}>
            AI Readiness for <span className={`text-primary font-black underline decoration-primary underline-offset-2 md:underline-offset-4 ${
              isMobile ? 'decoration-2' : 'decoration-4'
            }`}>{data.firstName || 'You'}</span>
          </h1>
          <p className={`text-muted-foreground max-w-2xl mx-auto font-body font-light px-4 ${
            isMobile ? 'text-base' : 'text-xl'
          }`}>
            {getPersonaDescription(scores, data)}
          </p>
          <p className={`text-muted-foreground max-w-2xl mx-auto font-body font-medium px-4 ${
            isMobile ? 'text-sm' : 'text-lg'
          }`}>
            For a deeper look at your personalized AI Mindmaker, book a call below.
          </p>
        </div>

        <div className={`grid gap-6 md:gap-8 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
          
          {/* Main Score Gauge */}
          <Card className="question-card text-center">
            <div className={`space-y-6 md:space-y-8`}>
              <h2 className={`font-heading font-bold tracking-tight ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>
                Your Results
              </h2>
              
              <div className="relative">
                <div className={`mx-auto ${isMobile ? 'w-36 h-36' : 'w-48 h-48'}`}>
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
                      <div className={`font-bold text-primary ${
                        isMobile ? 'text-3xl' : 'text-4xl'
                      }`}>
                        {scores.aiMindmakerScore}
                      </div>
                      <div className="text-sm text-muted-foreground">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
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
              <h2 className={`font-heading font-bold tracking-tight text-center ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>
                Personal AI Mastery Dimensions
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start space-x-2 flex-1">
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>AI Tool Fluency</span>
                      {scores.aiToolFluency < 50 && !isMobile && <span className="text-xs text-amber-600">⚡ Master more AI tools for 10X output</span>}
                    </div>
                    <span className={`${scores.aiToolFluency >= 50 ? "text-green-600 font-bold" : "text-primary"} ${isMobile ? 'text-sm' : ''}`}>{scores.aiToolFluency}</span>
                  </div>
                  <Progress value={scores.aiToolFluency} className="h-2" />
                  {scores.aiToolFluency < 50 && isMobile && <p className="text-xs text-amber-600">⚡ Master more AI tools for 10X output</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start space-x-2 flex-1">
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>AI-Enhanced Decision Making</span>
                      {scores.aiDecisionMaking < 50 && !isMobile && <span className="text-xs text-amber-600">🎯 Make decisions in hours, not days</span>}
                    </div>
                    <span className={`${scores.aiDecisionMaking >= 50 ? "text-green-600 font-bold" : "text-primary"} ${isMobile ? 'text-sm' : ''}`}>{scores.aiDecisionMaking}</span>
                  </div>
                  <Progress value={scores.aiDecisionMaking} className="h-2" />
                  {scores.aiDecisionMaking < 50 && isMobile && <p className="text-xs text-amber-600">🎯 Make decisions in hours, not days</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start space-x-2 flex-1">
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>AI-Powered Communication</span>
                      {scores.aiCommunication < 50 && !isMobile && <span className="text-xs text-amber-600">📈 Amplify your influence with AI</span>}
                    </div>
                    <span className={`${scores.aiCommunication >= 50 ? "text-green-600 font-bold" : "text-primary"} ${isMobile ? 'text-sm' : ''}`}>{scores.aiCommunication}</span>
                  </div>
                  <Progress value={scores.aiCommunication} className="h-2" />
                  {scores.aiCommunication < 50 && isMobile && <p className="text-xs text-amber-600">📈 Amplify your influence with AI</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start space-x-2 flex-1">
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>AI Learning & Growth</span>
                      {scores.aiLearningGrowth < 50 && !isMobile && <span className="text-xs text-amber-600">🚀 Stay ahead of AI curve</span>}
                    </div>
                    <span className={`${scores.aiLearningGrowth >= 50 ? "text-green-600 font-bold" : "text-primary"} ${isMobile ? 'text-sm' : ''}`}>{scores.aiLearningGrowth}</span>
                  </div>
                  <Progress value={scores.aiLearningGrowth} className="h-2" />
                  {scores.aiLearningGrowth < 50 && isMobile && <p className="text-xs text-amber-600">🚀 Stay ahead of AI curve</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start space-x-2 flex-1">
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>AI Ethics & Balance</span>
                      {scores.aiEthicsBalance < 50 && !isMobile && <span className="text-xs text-amber-600">🛡️ Build responsible AI practices</span>}
                    </div>
                    <span className={`${scores.aiEthicsBalance >= 50 ? "text-green-600 font-bold" : "text-primary"} ${isMobile ? 'text-sm' : ''}`}>{scores.aiEthicsBalance}</span>
                  </div>
                  <Progress value={scores.aiEthicsBalance} className="h-2" />
                  {scores.aiEthicsBalance < 50 && isMobile && <p className="text-xs text-amber-600">🛡️ Build responsible AI practices</p>}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* We heard you section */}
        <Card className="question-card mt-6 md:mt-8">
          <div className="space-y-6">
            <h2 className={`font-heading font-bold tracking-tight text-center ${
              isMobile ? 'text-xl' : 'text-2xl'
            }`}>
              We Heard You
            </h2>
            <p className={`text-center text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
              Based on your specific inputs, here's what we understand about your AI journey
            </p>
            
            <div className="space-y-4">
              {generatePersonalizedInsights().map((insight, index) => (
                <div key={index} className={`bg-secondary/10 rounded-lg border border-primary/20 ${
                  isMobile ? 'p-3' : 'p-4'
                }`}>
                  <p className="text-sm text-muted-foreground italic">"{insight}"</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Wins */}
        <Card className="question-card mt-6 md:mt-8">
          <div className="space-y-6">
            <h2 className={`font-heading font-bold tracking-tight text-center ${
              isMobile ? 'text-xl' : 'text-2xl'
            }`}>
              Your Next Steps
            </h2>
            
            <div className={`grid gap-4 md:gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
              {quickWins.slice(0, 4).map((win, index) => {
                const [title, impact] = win.split(' → ');
                return (
                  <div 
                    key={index}
                    className={`bg-secondary/20 rounded-lg border border-primary/20 ${
                      isMobile ? 'p-3' : 'p-4'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground ${
                        isMobile ? 'w-6 h-6 text-xs' : 'w-8 h-8'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>{title}</h3>
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
        <div className={`text-center space-y-4 md:space-y-6 ${isMobile ? 'mt-8' : 'mt-12'}`}>
          <h2 className={`font-heading font-bold tracking-tight px-2 ${
            isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'
          }`}>
            Transform Your Leadership in 90 Days
          </h2>
          <p className={`text-muted-foreground max-w-xl mx-auto px-4 ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            Unlock your {100 - scores.aiMindmakerScore} points of leadership potential with a tailored AI strategy sprint.
          </p>
          
          <div className={`flex gap-4 justify-center px-4 ${
            isMobile ? 'flex-col' : 'flex-col sm:flex-row'
          }`}>
            <Button 
              className={`btn-primary ${isMobile ? 'w-full' : ''}`}
              onClick={() => window.open('https://calendly.com/krish-raja', '_blank')}
            >
              Book a Strategy Call
            </Button>
            <Button 
              variant="outline" 
              onClick={onRestart}
              className={isMobile ? 'w-full' : ''}
            >
              Retake Diagnostic
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};