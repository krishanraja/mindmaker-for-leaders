import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import ContactCollectionModal from '../ContactCollectionModal';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  Users, 
  CheckCircle,
  ArrowRight,
  Calendar,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface QuickFormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: string;
  timeAllocation: number;
  aiUsageLevel: string;
  implementationTimeline: string;
  budgetRange: string;
  decisionAuthority: string;
}

interface QuickFormResultsProps {
  data: QuickFormData;
  score: number;
  onRestart: () => void;
}

const QuickFormResults: React.FC<QuickFormResultsProps> = ({ 
  data, 
  score, 
  onRestart 
}) => {
  const isMobile = useIsMobile();
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactActionType, setContactActionType] = useState<'learn_more' | 'book_call'>('book_call');

  const getScoreCategory = (score: number) => {
    if (score >= 80) return { label: 'AI Leadership Ready', color: 'text-green-600', description: 'You\'re positioned for rapid AI transformation' };
    if (score >= 60) return { label: 'AI-Forward Executive', color: 'text-blue-600', description: 'Strong foundation with clear next steps' };
    if (score >= 40) return { label: 'AI Growth Trajectory', color: 'text-yellow-600', description: 'Building momentum toward AI leadership' };
    return { label: 'AI Leadership Opportunity', color: 'text-purple-600', description: 'Significant untapped potential for AI advantage' };
  };

  const getAIUsageLabel = (level: string) => {
    switch (level) {
      case 'never': return 'New to AI';
      case 'sometimes': return 'Occasional User';
      case 'frequently': return 'Regular User';
      case 'advanced': return 'Power User';
      default: return 'Not specified';
    }
  };

  const getTimelineUrgency = (timeline: string) => {
    switch (timeline) {
      case 'immediately': return { label: 'Immediate', priority: 'high' };
      case '1-3 months': return { label: 'Near-term', priority: 'medium' };
      case '6-12 months': return { label: 'Planned', priority: 'low' };
      default: return { label: 'Flexible', priority: 'low' };
    }
  };

  const getQuickWins = (data: QuickFormData, score: number) => {
    const wins = [];
    
    if (data.aiUsageLevel === 'never' || data.aiUsageLevel === 'sometimes') {
      wins.push({
        icon: <Target className="h-5 w-5" />,
        title: 'Start with AI Communication Basics',
        description: 'Build vocabulary and confidence to discuss AI strategy with stakeholders'
      });
    }
    
    if (data.timeAllocation >= 40) {
      wins.push({
        icon: <Clock className="h-5 w-5" />,
        title: 'Optimize High-Value Time',
        description: 'Use AI to automate routine tasks and focus on strategic leadership'
      });
    }
    
    if (data.implementationTimeline === 'immediately') {
      wins.push({
        icon: <TrendingUp className="h-5 w-5" />,
        title: 'Quick Impact AI Tools',
        description: 'Implement 2-3 AI tools this week for immediate productivity gains'
      });
    }
    
    wins.push({
      icon: <Users className="h-5 w-5" />,
      title: 'Become the AI-Forward Leader',
      description: 'Position yourself as the executive who guides others through AI transformation'
    });
    
    return wins.slice(0, 3);
  };

  const scoreCategory = getScoreCategory(score);
  const quickWins = getQuickWins(data, score);
  const timelineInfo = getTimelineUrgency(data.implementationTimeline);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted ${
      isMobile ? 'p-4' : 'p-8'
    }`}>
      <div className={`mx-auto space-y-8 ${isMobile ? 'max-w-lg' : 'max-w-4xl'}`}>
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Your AI Leadership Assessment</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Personalized insights for your AI transformation journey
          </p>
        </div>

        {/* AI Leadership Score */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Target className="h-6 w-6" />
              AI Leadership Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <div className="mx-auto w-40 h-40 relative">
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
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                    className="text-primary"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{score}</div>
                    <div className="text-sm text-muted-foreground">/ 100</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className={`text-xl font-semibold ${scoreCategory.color}`}>
                {scoreCategory.label}
              </h3>
              <p className="text-muted-foreground">{scoreCategory.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Your Leadership Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current AI Usage:</span>
                  <Badge variant="outline">{getAIUsageLabel(data.aiUsageLevel)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Implementation Timeline:</span>
                  <Badge variant={timelineInfo.priority === 'high' ? 'destructive' : 'default'}>
                    {timelineInfo.label}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Time for AI Enhancement:</span>
                  <Badge variant="secondary">{data.timeAllocation}% of work time</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Decision Authority:</span>
                  <Badge variant="outline">{data.decisionAuthority}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Budget Range:</span>
                  <Badge variant="secondary">{data.budgetRange}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Readiness Level:</span>
                  <Badge variant={score >= 60 ? 'default' : 'outline'}>
                    {score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Building'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Wins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Your Personal Quick Wins
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Start with these high-impact, low-effort actions
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quickWins.map((win, index) => (
                <div key={index} className="flex gap-3 p-4 rounded-lg bg-muted/50 border">
                  <div className="text-primary">{win.icon}</div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{win.title}</h4>
                    <p className="text-sm text-muted-foreground">{win.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Build AI Leadership Vocabulary</h4>
                  <p className="text-sm text-muted-foreground">
                    Develop confidence in AI discussions with stakeholders
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Implement Personal AI Tools</h4>
                  <p className="text-sm text-muted-foreground">
                    Start with 2-3 tools that address your biggest time drains
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Develop AI Strategy Vision</h4>
                  <p className="text-sm text-muted-foreground">
                    Create a roadmap for leading your team through AI transformation
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="text-center bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">
              Unlock Your {100 - score} Points of Untapped Potential
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Get personalized guidance to implement these insights and accelerate your AI leadership transformation.
            </p>
            
            <ContactCollectionModal
              isOpen={showContactModal}
              onClose={() => setShowContactModal(false)}
              actionType={contactActionType}
              assessmentData={{ 
                source: 'Quick Form Assessment',
                score: score,
                data: data
              }}
            />
            
            <div className={`flex gap-4 justify-center ${
              isMobile ? 'flex-col max-w-sm mx-auto' : 'flex-row'
            }`}>
              <Button 
                size="lg"
                onClick={() => {
                  setContactActionType('book_call');
                  setShowContactModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Book a Strategy Call
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  setContactActionType('learn_more');
                  setShowContactModal(true);
                }}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickFormResults;