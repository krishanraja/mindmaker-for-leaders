import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Brain, 
  Target, 
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Lightbulb,
  BarChart3,
  Zap,
  Users,
  AlertTriangle,
  Crown,
  Rocket
} from 'lucide-react';

import { ContactData } from './ContactCollectionForm';

interface AILeadershipBenchmarkProps {
  assessmentData: any;
  sessionId: string | null;
  contactData: ContactData;
  onBack?: () => void;
}

const AILeadershipBenchmark: React.FC<AILeadershipBenchmarkProps> = ({
  assessmentData,
  sessionId,
  contactData,
  onBack
}) => {
  const { toast } = useToast();

  // Calculate Leadership Score (0-30 scale)
  const calculateLeadershipScore = () => {
    let totalScore = 0;
    const responses = Object.values(assessmentData);
    
    responses.forEach((response: any) => {
      if (typeof response === 'string') {
        // Extract numeric value from "1 - Strongly Disagree" format
        const match = response.match(/^(\d+)/);
        if (match) {
          totalScore += parseInt(match[1]);
        }
      }
    });
    
    return totalScore;
  };

  const score = calculateLeadershipScore();

  const getLeadershipTier = (score: number) => {
    if (score >= 25) return { 
      tier: 'AI-Orchestrator', 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-50', 
      borderColor: 'border-emerald-200',
      icon: Crown,
      message: "You're setting the pace. Now amplify by formalizing AI across teams."
    };
    if (score >= 19) return { 
      tier: 'AI-Confident Leader', 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200',
      icon: Target,
      message: "You're using AI as a thinking partner—next, scale culture and growth ops."
    };
    if (score >= 13) return { 
      tier: 'AI-Aware Leader', 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-50', 
      borderColor: 'border-amber-200',
      icon: Lightbulb,
      message: "You're talking the talk—time to embed literacy into revenue strategy."
    };
    return { 
      tier: 'AI-Confused Leader', 
      color: 'text-red-600', 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-200',
      icon: AlertTriangle,
      message: "You're at risk of being disrupted. Literacy is your missing link."
    };
  };

  const leadershipProfile = getLeadershipTier(score);

  const strategicInsights = [
    {
      category: 'Growth Strategy',
      priority: 'High',
      insight: 'AI-Driven Revenue Acceleration',
      description: 'Identify and implement AI solutions that directly impact your top-line growth and market positioning.',
      impact: 'Revenue Growth',
      timeline: '30-60 days',
      improvement: '15-25%',
      icon: Rocket
    },
    {
      category: 'Leadership Development',
      priority: 'High',
      insight: 'Executive AI Fluency',
      description: 'Develop AI literacy that positions you as a thought leader in your industry and with stakeholders.',
      impact: 'Strategic Influence',
      timeline: '60-90 days',
      improvement: '20-40%',
      icon: Crown
    },
    {
      category: 'Organizational Capability',
      priority: 'Medium',
      insight: 'AI Champions Network',
      description: 'Build and coach a network of AI champions across your organization to accelerate adoption.',
      impact: 'Cultural Change',
      timeline: '90-120 days',
      improvement: '25-50%',
      icon: Users
    }
  ];

  const handleExecutivePrimerBooking = async () => {
    try {
      console.log('Sending executive primer notification...');
      
      const { data, error } = await supabase.functions.invoke('send-advisory-sprint-notification', {
        body: {
          contactData,
          assessmentData,
          sessionId: sessionId || '',
          scores: {
            leadershipScore: score,
            leadershipTier: leadershipProfile.tier,
            industryImpact: score >= 25 ? 95 : score >= 19 ? 80 : score >= 13 ? 65 : 45,
            businessAcceleration: score >= 25 ? 90 : score >= 19 ? 75 : score >= 13 ? 60 : 40,
            teamAlignment: score >= 25 ? 85 : score >= 19 ? 70 : score >= 13 ? 55 : 35,
            externalPositioning: score >= 25 ? 88 : score >= 19 ? 72 : score >= 13 ? 58 : 38
          },
          isLeadershipBenchmark: true
        }
      });

      if (error) {
        console.error('Background email error:', error);
      } else {
        console.log('Background email sent successfully');
      }

    } catch (error) {
      console.error('Executive Primer background process error:', error);
    }

    // Open Calendly for Executive Primer
    window.open('https://calendly.com/krish-raja/mindmaker-leaders', '_blank');
    
    toast({
      title: "Executive Primer Booking",
      description: `Hi ${contactData.fullName}! Your leadership benchmark data has been prepared for your Executive Primer session.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      {onBack && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
          <Button
            variant="outline"
            onClick={onBack}
            className="rounded-xl"
            aria-label="Go back to benchmark"
          >
            ← Back to Benchmark
          </Button>
        </div>
      )}

      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
            <Brain className="h-4 w-4" />
            AI Leadership Growth Benchmark Results
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight leading-tight">
            {contactData.fullName.split(' ')[0]}'s Leadership
            <span className="block text-primary">Benchmark</span>
          </h1>
          
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            Hello {contactData.fullName} from {contactData.companyName}! Here's your AI leadership capability assessment 
            and strategic roadmap for driving growth through AI literacy.
          </p>
        </div>

        {/* Leadership Score Dashboard */}
        <Card className={`mb-8 sm:mb-12 max-w-4xl mx-auto shadow-sm border rounded-xl ${leadershipProfile.borderColor}`}>
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
              {/* Primary Score */}
              <div className="text-center lg:text-left">
                <div className="relative inline-block mb-6">
                  <div className={`w-32 h-32 rounded-full ${leadershipProfile.bgColor} border-4 ${leadershipProfile.borderColor} flex items-center justify-center relative`}>
                    <span className={`text-4xl font-display ${leadershipProfile.color}`}>
                      {score}
                    </span>
                    <div className="absolute -top-3 -right-3">
                      <leadershipProfile.icon className={`h-8 w-8 ${leadershipProfile.color}`} />
                    </div>
                  </div>
                </div>
                
                <h2 className={`text-2xl font-display ${leadershipProfile.color} mb-2`}>
                  {leadershipProfile.tier}
                </h2>
                
                <Badge className={`${leadershipProfile.bgColor} ${leadershipProfile.color} ${leadershipProfile.borderColor} px-4 py-2`}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Leadership Growth Track
                </Badge>
              </div>

              {/* Key Metrics */}
              <div className="space-y-4">
                <Card className="p-4 sm:p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Growth Readiness</span>
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {score >= 25 ? 'High' : score >= 19 ? 'Medium-High' : score >= 13 ? 'Medium' : 'Developing'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI-driven growth potential
                  </p>
                </Card>

                <Card className="p-4 sm:p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Leadership Stage</span>
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {score >= 25 ? 'Orchestrator' : score >= 19 ? 'Confident' : score >= 13 ? 'Aware' : 'Emerging'}
                  </div>
                  <p className="text-sm text-muted-foreground">ready for next level</p>
                </Card>
              </div>

              {/* Leadership Insight */}
              <Card className="p-6 sm:p-8 shadow-sm border">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Executive Insight</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm sm:text-base">
                  {leadershipProfile.message}
                </p>
                <div className="flex items-center text-primary text-sm">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Strategic roadmap ready
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Growth Opportunities */}
        <div className="mb-8 sm:mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4">Strategic Growth Opportunities</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
              Executive-level initiatives to accelerate your AI leadership impact
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {strategicInsights.map((insight, index) => (
              <Card key={index} className="group hover:shadow-md transition-all duration-300 rounded-xl border shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <insight.icon className="h-8 w-8 text-primary" />
                    <Badge 
                      variant="outline" 
                      className={`
                        ${insight.priority === 'High' ? 'border-emerald-500/50 text-emerald-600 bg-emerald-500/10' : ''}
                        ${insight.priority === 'Medium' ? 'border-blue-500/50 text-blue-600 bg-blue-500/10' : ''}
                      `}
                    >
                      {insight.priority} Impact
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3">{insight.insight}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">{insight.description}</p>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-sm sm:text-base font-bold text-foreground">{insight.timeline}</div>
                      <div className="text-xs text-muted-foreground">Timeline</div>
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-foreground">{insight.impact}</div>
                      <div className="text-xs text-muted-foreground">Impact</div>
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-primary">{insight.improvement}</div>
                      <div className="text-xs text-muted-foreground">Growth</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Executive Primer CTA */}
        <Card className="shadow-sm border rounded-xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="h-8 w-8 text-white" />
            </div>

            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
              <Brain className="h-4 w-4" />
              AI-Powered Leadership Assessment
            </div>
            
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-6">
              Ready to turn your score into a roadmap?
            </h3>
            
            <p className="text-sm sm:text-base text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto px-4">
              Book an Executive Primer → align your AI literacy with growth strategy in 30 days.
            </p>
            
            <div className="mb-8">
              <h4 className="text-base sm:text-lg font-semibold text-foreground mb-6">Executive Primer Includes:</h4>
              
              <div className="max-w-md mx-auto">
                {[
                  'Strategic AI roadmap for your industry',
                  'Growth-focused AI implementation plan', 
                  'Leadership positioning strategy',
                  'Team activation framework',
                  'Stakeholder communication toolkit',
                  '30-day execution plan'
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 mb-3 sm:mb-4 text-left">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              size="lg" 
              onClick={handleExecutivePrimerBooking}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-medium group transition-all rounded-xl shadow-lg hover:shadow-xl"
              aria-label="Book Executive Primer Session"
            >
              Book My Primer
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            
            <p className="text-xs sm:text-sm text-muted-foreground mt-4 px-4">
              30-minute strategic session • Personalized to your benchmark results
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AILeadershipBenchmark;