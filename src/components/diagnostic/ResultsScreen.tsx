import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DiagnosticData, DiagnosticScores } from '../DiagnosticTool';
import { generatePersonalizedQuickWins } from '@/utils/personalAIQuickWins';
import { useIsMobile } from '@/hooks/use-mobile';
import ContactCollectionModal from '../ContactCollectionModal';
import { 
  CheckCircle, 
  TrendingUp, 
  Lightbulb, 
  Target, 
  Clock,
  Calendar,
  ExternalLink,
  Gauge,
  Zap,
  Users,
  BarChart3,
  Star
} from 'lucide-react';

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
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactActionType, setContactActionType] = useState<'learn_more' | 'book_call'>('book_call');
  
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
        insights.push({
          icon: <Zap className="h-5 w-5 text-yellow-600" />,
          title: "AI Tool Stack Active",
          content: `You're already using ${topTools.join(', ')}. This shows strong AI adoption momentum - expand this foundation strategically.`
        });
      }
    }
    
    if (data.dailyFrictions && data.dailyFrictions.length > 0) {
      insights.push({
        icon: <Target className="h-5 w-5 text-red-600" />,
        title: "Productivity Friction Points",
        content: `Your top friction points are ${data.dailyFrictions.slice(0, 2).join(' and ')}. These are prime candidates for AI automation.`
      });
    }
    
    if (data.upskillPercentage && data.upskillPercentage > 0) {
      insights.push({
        icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
        title: "Learning Commitment",
        content: `Your ${data.upskillPercentage}% weekly learning commitment shows strong AI development potential.`
      });
    }
    
    if (scores.aiMindmakerScore < 50) {
      insights.push({
        icon: <Star className="h-5 w-5 text-purple-600" />,
        title: "High Growth Potential",
        content: `With ${100 - scores.aiMindmakerScore} points of untapped potential, you're positioned for significant AI leadership gains.`
      });
    }
    
    return insights.slice(0, 4);
  };

  const personaDescription = getPersonaDescription(scores, data);
  const personalizedInsights = generatePersonalizedInsights();
  const topQuickWins = quickWins.slice(0, 3);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted ${
      isMobile ? 'p-4' : 'p-8'
    }`}>
      <div className={`mx-auto space-y-8 ${isMobile ? 'max-w-lg' : 'max-w-6xl'}`}>
        
        {/* Header Section */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <Gauge className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Your AI Readiness Report</h1>
          </div>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl text-muted-foreground mb-2">
              {data.firstName ? `${data.firstName}, ` : ''}
              {personaDescription}
            </h2>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>AI Leadership Assessment</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setContactActionType('book_call');
                  setShowContactModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Book Strategy Call
              </Button>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          
          {/* AI Readiness Score */}
          <Card className="col-span-1 text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Overall AI Readiness</h3>
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - scores.aiMindmakerScore / 100)}`}
                    className="text-primary"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{scores.aiMindmakerScore}</div>
                    <div className="text-xs text-muted-foreground">/100</div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {scores.aiMindmakerScore >= 75 ? 'AI Leadership Ready' :
                 scores.aiMindmakerScore >= 50 ? 'Strong Foundation' : 
                 'High Growth Potential'}
              </p>
            </div>
          </Card>

          {/* Personal AI Mastery Dimensions */}
          <Card className="col-span-2 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Personal AI Mastery Dimensions
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Tool Fluency</span>
                  <span className="font-medium">{scores.aiToolFluency}/100</span>
                </div>
                <Progress value={scores.aiToolFluency} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {scores.aiToolFluency >= 60 ? 'Strong toolkit mastery' : 'Focus on core AI tools first'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI-Enhanced Decision Making</span>
                  <span className="font-medium">{scores.aiDecisionMaking}/100</span>
                </div>
                <Progress value={scores.aiDecisionMaking} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {scores.aiDecisionMaking >= 60 ? 'Confident AI-informed decisions' : 'Build AI decision frameworks'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Communication & Influence</span>
                  <span className="font-medium">{scores.aiCommunication}/100</span>
                </div>
                <Progress value={scores.aiCommunication} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {scores.aiCommunication >= 60 ? 'Strong AI thought leadership' : 'Develop AI communication skills'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Learning & Growth</span>
                  <span className="font-medium">{scores.aiLearningGrowth}/100</span>
                </div>
                <Progress value={scores.aiLearningGrowth} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {scores.aiLearningGrowth >= 60 ? 'Excellent growth mindset' : 'Increase AI learning commitment'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Ethics & Balance</span>
                  <span className="font-medium">{scores.aiEthicsBalance}/100</span>
                </div>
                <Progress value={scores.aiEthicsBalance} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {scores.aiEthicsBalance >= 60 ? 'Thoughtful AI approach' : 'Develop AI governance thinking'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* We Heard You Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            We Heard You: Personalized Insights
          </h3>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {personalizedInsights.map((insight, index) => (
              <div key={index} className="flex gap-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex-shrink-0">{insight.icon}</div>
                <div className="space-y-1">
                  <h4 className="font-medium">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground">{insight.content}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Your Next Steps */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Next Steps: Top Quick Wins
          </h3>
          <div className="space-y-4">
            {topQuickWins.map((win, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{typeof win === 'string' ? win : win.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {typeof win === 'string' ? 'Personalized recommendation based on your assessment' : win.description}
                  </p>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-primary/10 rounded text-primary">
                      High Impact
                    </span>
                    <span className="px-2 py-1 bg-muted rounded">
                      1-2 weeks
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Call to Action */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Ready to Accelerate Your AI Leadership Journey?</h3>
            <p className="text-muted-foreground mb-6">
              Get personalized guidance to implement these insights and transform your leadership approach.
            </p>
            
            <ContactCollectionModal
              isOpen={showContactModal}
              onClose={() => setShowContactModal(false)}
              actionType={contactActionType}
              assessmentData={{ 
                source: 'Full Assessment',
                data: data,
                scores: scores
              }}
            />
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="flex items-center gap-2"
                onClick={() => {
                  setContactActionType('book_call');
                  setShowContactModal(true);
                }}
              >
                <Calendar className="h-5 w-5" />
                Book Strategy Call
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="flex items-center gap-2"
                onClick={() => {
                  setContactActionType('learn_more');
                  setShowContactModal(true);
                }}
              >
                <ExternalLink className="h-5 w-5" />
                Learn More
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={onRestart}
              >
                Retake Assessment
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};