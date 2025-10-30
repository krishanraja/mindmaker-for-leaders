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
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  BarChart3,
  Zap,
  Users,
  AlertTriangle,
  Crown,
  Rocket,
  Sparkles,
  Award
} from 'lucide-react';

import { ContactData } from './ContactCollectionForm';

interface AILeadershipBenchmarkProps {
  assessmentData: any;
  sessionId: string | null;
  contactData: ContactData;
  onBack?: () => void;
  onViewToolkit?: () => void;
}

const AILeadershipBenchmark: React.FC<AILeadershipBenchmarkProps> = ({
  assessmentData,
  sessionId,
  contactData,
  onBack,
  onViewToolkit
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
      gradient: 'from-[hsl(var(--tier-orchestrator))] to-[hsl(var(--tier-orchestrator-light))]',
      textColor: 'text-[hsl(var(--tier-orchestrator))]',
      bgGradient: 'bg-gradient-to-br from-[hsl(var(--tier-orchestrator))]/10 to-[hsl(var(--tier-orchestrator-light))]/5',
      borderGlow: 'shadow-[0_0_30px_-5px_hsl(var(--tier-orchestrator)/0.3)]',
      icon: Crown,
      message: "You're setting the pace. Now amplify by formalizing AI across teams."
    };
    if (score >= 19) return { 
      tier: 'AI-Confident Leader', 
      gradient: 'from-[hsl(var(--tier-confident))] to-[hsl(var(--tier-confident-light))]',
      textColor: 'text-[hsl(var(--tier-confident))]',
      bgGradient: 'bg-gradient-to-br from-[hsl(var(--tier-confident))]/10 to-[hsl(var(--tier-confident-light))]/5',
      borderGlow: 'shadow-[0_0_30px_-5px_hsl(var(--tier-confident)/0.3)]',
      icon: Target,
      message: "You're using AI as a thinking partner—next, scale culture and growth ops."
    };
    if (score >= 13) return { 
      tier: 'AI-Aware Leader', 
      gradient: 'from-[hsl(var(--tier-aware))] to-[hsl(var(--tier-aware-light))]',
      textColor: 'text-[hsl(var(--tier-aware))]',
      bgGradient: 'bg-gradient-to-br from-[hsl(var(--tier-aware))]/10 to-[hsl(var(--tier-aware-light))]/5',
      borderGlow: 'shadow-[0_0_30px_-5px_hsl(var(--tier-aware)/0.3)]',
      icon: Lightbulb,
      message: "You're talking the talk—time to embed literacy into revenue strategy."
    };
    return { 
      tier: 'AI-Emerging Leader', 
      gradient: 'from-[hsl(var(--tier-emerging))] to-[hsl(var(--tier-emerging-light))]',
      textColor: 'text-[hsl(var(--tier-emerging))]',
      bgGradient: 'bg-gradient-to-br from-[hsl(var(--tier-emerging))]/10 to-[hsl(var(--tier-emerging-light))]/5',
      borderGlow: 'shadow-[0_0_30px_-5px_hsl(var(--tier-emerging)/0.3)]',
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
    window.open('https://calendly.com/krish-raja/mindmaker-meeting', '_blank');
    
    toast({
      title: "Executive Primer Booking",
      description: `Hi ${contactData.fullName}! Your leadership benchmark data has been prepared for your Executive Primer session.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      {onBack && (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back to benchmark"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Benchmark</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <Badge variant="outline" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Leadership Score
            </Badge>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-sm font-medium mb-8">
            <Brain className="h-4 w-4" />
            AI Leadership Scorecard
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight leading-tight">
            <span className="flex items-center justify-center gap-3">
              <Crown className="h-8 w-8 lg:h-10 lg:w-10 text-[hsl(var(--gold-accent))]" />
              {contactData.fullName.split(' ')[0]}'s Leadership
            </span>
            <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent mt-2">
              AI Benchmark
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Hello {contactData.fullName} from <span className="font-semibold text-foreground">{contactData.companyName}</span>! Here's your AI leadership capability assessment 
            and strategic roadmap for driving growth through AI literacy.
          </p>
        </div>

        {/* Leadership Score Dashboard - Hero Style */}
        <Card className={`mb-20 sm:mb-24 max-w-6xl mx-auto border-2 rounded-2xl overflow-hidden ${leadershipProfile.borderGlow} ${leadershipProfile.bgGradient}`}>
          <CardContent className="p-8 sm:p-10 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              {/* Left: Hero Score Circle */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                <div className="relative mb-8">
                  {/* Animated gradient border circle */}
                  <div className={`w-48 h-48 lg:w-56 lg:h-56 rounded-full bg-gradient-to-br ${leadershipProfile.gradient} p-1 animate-pulse`}>
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center relative">
                      <span className={`text-6xl lg:text-7xl font-display font-bold ${leadershipProfile.textColor}`}>
                        {score}
                      </span>
                      <div className="absolute -top-4 -right-4 bg-background rounded-full p-2 shadow-lg">
                        <leadershipProfile.icon className={`h-10 w-10 lg:h-12 lg:w-12 ${leadershipProfile.textColor}`} />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">Leadership Score</div>
                </div>
                
                <h2 className={`text-3xl lg:text-4xl font-bold ${leadershipProfile.textColor} mb-4`}>
                  {leadershipProfile.tier}
                </h2>
                
                <Badge className={`${leadershipProfile.bgGradient} border-0 px-5 py-2.5 text-base ${leadershipProfile.textColor}`}>
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Leadership Growth Track
                </Badge>
              </div>

              {/* Right: Key Metrics & Insight */}
              <div className="space-y-6">
                {/* Two Key Metrics Side by Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Card className="p-6 shadow-lg border-0 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-muted-foreground">Growth Readiness</span>
                      <BarChart3 className={`h-6 w-6 ${leadershipProfile.textColor}`} />
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                      {score >= 25 ? 'High' : score >= 19 ? 'Medium-High' : score >= 13 ? 'Medium' : 'Developing'}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Revenue acceleration potential
                    </p>
                  </Card>

                  <Card className="p-6 shadow-lg border-0 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-muted-foreground">Leadership Stage</span>
                      <Target className={`h-6 w-6 ${leadershipProfile.textColor}`} />
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                      {score >= 25 ? 'Orchestrator' : score >= 19 ? 'Confident' : score >= 13 ? 'Aware' : 'Emerging'}
                    </div>
                    <p className="text-sm text-muted-foreground">Advancement pathway identified</p>
                  </Card>
                </div>

                {/* Executive Insight as Quote Block */}
                <Card className="p-8 shadow-lg border-0 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <Lightbulb className={`h-6 w-6 ${leadershipProfile.textColor} flex-shrink-0 mt-1`} />
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">Executive Insight</h3>
                      <p className={`text-base leading-relaxed ${leadershipProfile.textColor} font-medium italic`}>
                        "{leadershipProfile.message}"
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Growth Opportunities - 90-Day Roadmap */}
        <div className="mb-20 sm:mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
              Your 90-Day <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Growth Roadmap</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              Executive-level initiatives to accelerate your AI leadership impact and drive measurable business results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {strategicInsights.map((insight, index) => {
              const priorityStyles = insight.priority === 'High' 
                ? 'from-[hsl(var(--gold-accent))]/10 to-[hsl(var(--gold-accent))]/5 border-[hsl(var(--gold-accent))]/30' 
                : 'from-primary/10 to-primary/5 border-primary/30';
              
              return (
                <Card key={index} className={`group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 rounded-2xl border-2 shadow-lg bg-gradient-to-br ${priorityStyles}`}>
                  <CardContent className="p-8 lg:p-10">
                    {/* Icon & Priority Badge */}
                    <div className="flex items-start justify-between mb-8">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${leadershipProfile.gradient} flex items-center justify-center shadow-lg`}>
                        <insight.icon className="h-8 w-8 text-white" />
                      </div>
                      <Badge 
                        className={`
                          ${insight.priority === 'High' ? 'bg-[hsl(var(--gold-accent))]/20 text-[hsl(var(--gold-accent))] border-[hsl(var(--gold-accent))]/50' : ''}
                          ${insight.priority === 'Medium' ? 'bg-primary/20 text-primary border-primary/50' : ''}
                          border-2 px-4 py-1.5 text-sm font-semibold shadow-md
                        `}
                      >
                        {insight.priority} Impact
                      </Badge>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4 leading-tight">{insight.insight}</h3>
                    <p className="text-base text-muted-foreground mb-8 leading-relaxed">{insight.description}</p>
                    
                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6"></div>
                    
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-base font-bold text-foreground mb-1">{insight.timeline}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Timeline</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-foreground mb-1">{insight.impact}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Impact</div>
                      </div>
                      <div>
                        <div className={`text-base font-bold ${leadershipProfile.textColor} mb-1`}>{insight.improvement}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Growth</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* AI Toolkit CTA */}
        {onViewToolkit && (
          <Card className="mt-16 border-2 border-primary/20 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 sm:p-10 text-center">
                <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4 animate-pulse">
                  <Sparkles className="h-4 w-4" />
                  NEW: Personalized AI Toolkit Available
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Ready to Put Your Score Into Action?
                </h2>
                
                <p className="text-muted-foreground text-base sm:text-lg mb-6 max-w-2xl mx-auto">
                  View your custom AI project templates, master prompts, and implementation roadmap designed specifically for your leadership style.
                </p>
                
                <Button
                  size="lg"
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  onClick={onViewToolkit}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  View Your AI Toolkit
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Executive Primer CTA - Hero Section */}
        <Card className="mt-16 shadow-2xl border-0 rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
          <CardContent className="p-10 sm:p-12 lg:p-16 text-center relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <Crown className="h-10 w-10 text-white" />
              </div>

              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-medium mb-8">
                <Brain className="h-4 w-4" />
                Limited Spots Available This Month
              </div>
              
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Ready to turn your score<br className="hidden sm:block" /> into a <span className="underline decoration-white/50">strategic roadmap</span>?
              </h3>
              
              <p className="text-lg sm:text-xl text-white/90 mb-12 leading-relaxed max-w-3xl mx-auto px-4">
                Book your <span className="font-bold">Executive Primer</span> and align your AI literacy with revenue strategy in just 30 days.
              </p>
              
              {/* Value Props in 3-Column Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
                {[
                  { icon: Target, title: 'Strategic AI Roadmap', desc: 'Industry-specific implementation plan' },
                  { icon: TrendingUp, title: 'Revenue Acceleration', desc: 'Growth-focused AI deployment' },
                  { icon: Users, title: 'Team Activation', desc: 'Leadership & stakeholder toolkit' }
                ].map((item, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white">
                    <item.icon className="h-10 w-10 mx-auto mb-4" />
                    <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                    <p className="text-sm text-white/80">{item.desc}</p>
                  </div>
                ))}
              </div>
              
              <Button 
                size="lg" 
                onClick={handleExecutivePrimerBooking}
                className="bg-white text-primary hover:bg-white/90 px-10 py-6 text-xl font-bold group transition-all rounded-2xl shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.4)] hover:scale-105"
                aria-label="Schedule Your Strategic Session"
              >
                Schedule Your Strategic Session
                <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-2" />
              </Button>
              
              <div className="mt-8 text-white/80 text-sm">
                <p className="mb-2">🚀 Join 500+ executives who've accelerated their AI leadership</p>
                <p>30-minute strategic session • Personalized to your benchmark results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AILeadershipBenchmark;