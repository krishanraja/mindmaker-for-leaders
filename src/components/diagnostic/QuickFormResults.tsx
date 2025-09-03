import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  Users, 
  CheckCircle,
  ArrowRight,
  Calendar,
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

  const getScoreCategory = (score: number) => {
    if (score >= 80) return { label: 'AI Leadership Ready', color: 'text-green-600', description: 'You\'re positioned for rapid AI transformation' };
    if (score >= 60) return { label: 'AI-Forward Executive', color: 'text-blue-600', description: 'Strong foundation with clear next steps' };
    if (score >= 40) return { label: 'AI Growth Trajectory', color: 'text-yellow-600', description: 'Building momentum toward AI leadership' };
    return { label: 'AI Leadership Opportunity', color: 'text-purple-600', description: 'Significant untapped potential for AI advantage' };
  };

  const getAIUsageLabel = (level: string) => {
    const labels: Record<string, string> = {
      'never': 'AI Newcomer',
      'experimental': 'AI Explorer', 
      'occasional': 'AI Adopter',
      'regular': 'AI User',
      'power_user': 'AI Power User'
    };
    return labels[level] || 'AI Professional';
  };

  const getTimelineUrgency = (timeline: string) => {
    const urgency: Record<string, { label: string; priority: 'high' | 'medium' | 'low' }> = {
      'immediate': { label: 'Immediate Action Required', priority: 'high' },
      'within_3_months': { label: 'Near-term Priority', priority: 'high' },
      'within_6_months': { label: 'Strategic Planning Phase', priority: 'medium' },
      'this_year': { label: 'Long-term Development', priority: 'low' }
    };
    return urgency[timeline] || { label: 'Strategic Planning', priority: 'medium' };
  };

  const getQuickWins = () => {
    const wins = [];
    
    if (data.timeAllocation >= 4) {
      wins.push('🚀 High-impact AI automation opportunities in your daily work');
    }
    if (data.aiUsageLevel === 'power_user') {
      wins.push('💡 Advanced AI strategies to multiply your current expertise');
    } else if (data.aiUsageLevel === 'never') {
      wins.push('⚡ Essential AI tools that will transform your productivity immediately');
    }
    if (data.decisionAuthority === 'full') {
      wins.push('🎯 Executive AI implementation roadmap tailored to your authority');
    }
    
    // Always include 2-3 default wins
    wins.push('📈 Personal AI leadership positioning strategy for competitive advantage');
    wins.push('🛡️ AI ethics and governance framework for confident decision-making');
    
    return wins.slice(0, 4);
  };

  const scoreCategory = getScoreCategory(score);
  const urgency = getTimelineUrgency(data.implementationTimeline);
  const quickWins = getQuickWins();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header with Logo */}
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <img 
                src="/lovable-uploads/2819589c-814c-4ec7-9e78-0d2a80b89243.png" 
                alt="AI Mindmaker Logo" 
                className={`w-auto ${isMobile ? 'h-12' : 'h-16'}`}
              />
            </div>
            
            <h1 className={`font-bold tracking-tight ${
              isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'
            }`}>
              AI Leadership Score for <span className="text-primary underline">{data.firstName}</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Your personalized AI leadership development roadmap is ready
            </p>
          </div>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
            
            {/* Main Score */}
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Your AI Leadership Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative">
                  <div className={`mx-auto ${isMobile ? 'w-32 h-32' : 'w-40 h-40'}`}>
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
                        strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`font-bold text-primary ${
                          isMobile ? 'text-2xl' : 'text-3xl'
                        }`}>
                          {score}
                        </div>
                        <div className="text-sm text-muted-foreground">/ 100</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className={`font-semibold ${scoreCategory.color}`}>
                    {scoreCategory.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {scoreCategory.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your AI Leadership Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <p className="font-medium">{data.company}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Role:</span>
                    <p className="font-medium">{data.role}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">AI Experience:</span>
                    <p className="font-medium">{getAIUsageLabel(data.aiUsageLevel)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Daily AI Opportunity:</span>
                    <p className="font-medium">{data.timeAllocation} hours</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Timeline:</span>
                    <Badge variant={urgency.priority === 'high' ? 'destructive' : urgency.priority === 'medium' ? 'default' : 'secondary'}>
                      {urgency.label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Wins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Your Personalized Quick Wins
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Immediate opportunities to accelerate your AI leadership journey
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {quickWins.map((win, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg border"
                  >
                    <div className="bg-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm">{win}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">1. Strategy Call</h3>
                  <p className="text-xs text-muted-foreground">30-min personalized AI leadership consultation</p>
                </div>
                <div className="text-center p-4 bg-secondary/10 rounded-lg border">
                  <TrendingUp className="h-8 w-8 text-secondary-foreground mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">2. Custom Roadmap</h3>
                  <p className="text-xs text-muted-foreground">Tailored 90-day AI transformation plan</p>
                </div>
                <div className="text-center p-4 bg-secondary/10 rounded-lg border">
                  <CheckCircle className="h-8 w-8 text-secondary-foreground mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">3. Implementation</h3>
                  <p className="text-xs text-muted-foreground">Execute with ongoing coaching support</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center space-y-6 pt-8">
            <h2 className={`font-bold tracking-tight ${
              isMobile ? 'text-xl' : 'text-2xl md:text-3xl'
            }`}>
              Transform Your Leadership in 90 Days
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Unlock your {100 - score} points of untapped AI leadership potential with a personalized strategy session.
            </p>
            
            <div className={`flex gap-4 justify-center ${
              isMobile ? 'flex-col max-w-sm mx-auto' : 'flex-row'
            }`}>
              <Button 
                size="lg"
                onClick={() => window.open('https://calendly.com/krish-raja', '_blank')}
                className="flex items-center gap-2"
              >
                Book a Strategy Call
                <ArrowRight className="h-4 w-4" />
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
        </div>
      </div>
    </div>
  );
};

export default QuickFormResults;