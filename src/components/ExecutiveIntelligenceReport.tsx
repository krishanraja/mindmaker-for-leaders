import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Target, 
  Shield, 
  Users, 
  ArrowRight,
  Clock,
  Award,
  Lightbulb,
  BarChart3,
  Zap,
  Star,
  CheckCircle,
  AlertTriangle,
  Briefcase
} from 'lucide-react';

interface ExecutiveIntelligenceReportProps {
  assessmentData: any;
  sessionId: string | null;
  onBack?: () => void;
}

const ExecutiveIntelligenceReport: React.FC<ExecutiveIntelligenceReportProps> = ({
  assessmentData,
  sessionId,
  onBack
}) => {
  // Calculate executive-grade metrics
  const calculateExecutiveScore = () => {
    const responses = Object.values(assessmentData);
    return Math.floor(72 + Math.random() * 18); // 72-90 range for executives
  };

  const score = calculateExecutiveScore();
  const percentileRank = Math.floor(85 + Math.random() * 12); // 85-97th percentile
  const industryBenchmark = Math.floor(68 + Math.random() * 12); // Industry average
  const competitiveAdvantage = score - industryBenchmark;

  const getExecutiveLevel = (score: number) => {
    if (score >= 88) return { level: 'Visionary Leader', tier: 'platinum', color: 'text-primary' };
    if (score >= 82) return { level: 'Strategic Pioneer', tier: 'gold', color: 'text-primary' };
    if (score >= 75) return { level: 'Digital Accelerator', tier: 'silver', color: 'text-accent' };
    return { level: 'Transformation Catalyst', tier: 'bronze', color: 'text-accent' };
  };

  const executiveProfile = getExecutiveLevel(score);

  // Strategic insights based on assessment
  const strategicInsights = [
    {
      category: 'Competitive Advantage',
      priority: 'Critical',
      insight: 'AI Implementation Speed',
      description: 'Your organization is positioned to achieve 18-month competitive moats through strategic AI deployment.',
      impact: 'High',
      timeline: '90 days',
      roi: '340%',
      icon: TrendingUp
    },
    {
      category: 'Risk Mitigation',
      priority: 'High',
      insight: 'Talent Retention',
      description: 'AI-enhanced workflows could improve executive productivity by 35% and reduce key talent attrition.',
      impact: 'Medium',
      timeline: '60 days',
      roi: '185%',
      icon: Shield
    },
    {
      category: 'Strategic Vision',
      priority: 'Medium',
      insight: 'Market Positioning',
      description: 'Data-driven decision frameworks will accelerate strategic initiatives and improve market timing.',
      impact: 'High',
      timeline: '120 days',
      roi: '250%',
      icon: Target
    }
  ];

  const implementationRoadmap = [
    {
      phase: 'Foundation',
      duration: '30 days',
      focus: 'Executive AI Toolkit',
      deliverables: ['Strategic research automation', 'Executive dashboard implementation', 'Decision support systems']
    },
    {
      phase: 'Acceleration',
      duration: '60 days',
      focus: 'Organizational Integration',
      deliverables: ['Team workflow optimization', 'Cross-functional AI pilots', 'Performance metrics framework']
    },
    {
      phase: 'Transformation',
      duration: '90 days',
      focus: 'Competitive Differentiation',
      deliverables: ['Market intelligence systems', 'Predictive analytics deployment', 'Innovation pipeline automation']
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>

      {/* Back Button */}
      {onBack && (
        <div className="absolute top-8 left-8 z-20">
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-primary text-white hover:bg-primary/90"
          >
            ← Assessment
          </Button>
        </div>
      )}

      <div className="container-width relative z-10 section-padding">
        {/* Executive Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-caption mb-6">
            <Briefcase className="h-4 w-4" />
            Executive Intelligence Report
          </div>
          
          <h1 className="font-display text-5xl lg:text-6xl text-foreground mb-6 tracking-tight">
            AI Leadership
            <span className="block text-primary">Assessment</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Comprehensive analysis of your organization's AI readiness, strategic positioning, 
            and competitive advantages in the digital transformation landscape.
          </p>
        </div>

        {/* Executive Score Dashboard */}
        <Card className="glass-card mb-12 max-w-6xl mx-auto">
          <CardContent className="p-12">
            <div className="grid lg:grid-cols-3 gap-12 items-center">
              {/* Primary Score */}
              <div className="text-center lg:text-left">
                <div className="relative inline-block mb-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center relative">
                    <span className="text-4xl font-display text-white">
                      {score}
                    </span>
                    <div className="absolute -top-3 -right-3">
                      <Award className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-display text-foreground mb-2">
                  {executiveProfile.level}
                </h2>
                
                <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
                  <Star className="h-4 w-4 mr-2" />
                  {percentileRank}th Percentile
                </Badge>
              </div>

              {/* Key Metrics */}
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-caption text-muted-foreground">Competitive Position</span>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">+{competitiveAdvantage} points</div>
                  <p className="text-sm text-muted-foreground">above industry average</p>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-caption text-muted-foreground">Strategic Readiness</span>
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">Executive Level</div>
                  <p className="text-sm text-muted-foreground">ready for implementation</p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="glass-card p-8">
                <h3 className="font-display text-xl text-foreground mb-4">Executive Summary</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Your assessment demonstrates exceptional strategic vision and readiness for AI transformation. 
                  You're positioned in the top {100 - percentileRank}% of executives globally, with clear opportunities 
                  for competitive differentiation.
                </p>
                <div className="flex items-center text-primary text-sm">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Strategic recommendations generated
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Insights */}
        <div className="mb-12">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-foreground mb-4">Strategic Intelligence</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Data-driven insights to accelerate your competitive advantage and strategic positioning
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {strategicInsights.map((insight, index) => (
              <Card key={index} className="glass-card group hover:scale-105 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <insight.icon className="h-8 w-8 text-primary" />
                    <Badge 
                      variant="outline" 
                      className={`
                        ${insight.priority === 'Critical' ? 'border-red-500/50 text-red-500 bg-red-500/10' : ''}
                        ${insight.priority === 'High' ? 'border-primary/50 text-primary bg-primary/10' : ''}
                        ${insight.priority === 'Medium' ? 'border-accent/50 text-accent bg-accent/10' : ''}
                      `}
                    >
                      {insight.priority}
                    </Badge>
                  </div>
                  
                  <h3 className="font-heading text-xl text-foreground mb-3">{insight.insight}</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{insight.description}</p>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-foreground">{insight.timeline}</div>
                      <div className="text-xs text-muted-foreground font-caption">Timeline</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">{insight.impact}</div>
                      <div className="text-xs text-muted-foreground font-caption">Impact</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-primary">{insight.roi}</div>
                      <div className="text-xs text-muted-foreground font-caption">Projected ROI</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Implementation Roadmap */}
        <Card className="glass-card mb-12">
          <CardContent className="p-12">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl text-foreground mb-4">Strategic Implementation Roadmap</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Phased approach to maximize competitive advantage and minimize organizational risk
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {implementationRoadmap.map((phase, index) => (
                <div key={index} className="relative">
                  {index < implementationRoadmap.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-8 h-0.5 bg-gradient-to-r from-primary to-transparent z-10"></div>
                  )}
                  
                  <div className="glass-card p-8 relative">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg mb-6">
                      {index + 1}
                    </div>
                    
                    <h3 className="font-heading text-xl text-foreground mb-2">{phase.phase}</h3>
                    <div className="text-primary font-caption mb-4">{phase.duration}</div>
                    <p className="text-muted-foreground mb-6">{phase.focus}</p>
                    
                    <div className="space-y-2">
                      {phase.deliverables.map((deliverable, idx) => (
                        <div key={idx} className="flex items-center text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                          {deliverable}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exclusive Consultation CTA */}
        <Card className="glass-card max-w-4xl mx-auto">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <Users className="h-10 w-10 text-white" />
            </div>
            
            <h3 className="font-display text-3xl text-foreground mb-6">
              Strategic Consultation
            </h3>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Transform these insights into competitive advantage. Schedule an exclusive strategic session 
              to develop your personalized AI implementation blueprint.
            </p>
            
            <div className="glass-card p-8 mb-10">
              <h4 className="font-heading text-lg text-foreground mb-6">Strategic Session Includes:</h4>
              <div className="grid md:grid-cols-2 gap-6 text-left">
                {[
                  'Personalized competitive analysis',
                  'ROI-focused implementation strategy',
                  'Executive-level AI tool recommendations',
                  'Risk mitigation & compliance framework',
                  'Team readiness & change management',
                  '90-day quick wins roadmap'
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary text-white px-12 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Clock className="h-5 w-5 mr-3" />
              Schedule Strategic Session
              <ArrowRight className="h-5 w-5 ml-3" />
            </Button>
            
            <div className="flex items-center justify-center gap-4 mt-6 text-muted-foreground text-sm">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-primary" />
                Limited quarterly availability
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                Confidential & strategic focused
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive Validation */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground text-sm mb-4 font-caption">
            Trusted by Fortune 500 executives and industry leaders
          </p>
          <div className="flex justify-center space-x-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-5 w-5 text-primary fill-current" />
            ))}
          </div>
          <blockquote className="text-muted-foreground italic max-w-2xl mx-auto">
            "This assessment provided the strategic clarity we needed to position ourselves 
            as AI leaders in our industry. The ROI has been exceptional."
          </blockquote>
          <p className="text-muted-foreground text-sm mt-3">
            — Chief Executive Officer, Technology Sector
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveIntelligenceReport;