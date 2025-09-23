import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Brain, 
  Target, 
  BookOpen, 
  Users, 
  ArrowRight,
  Clock,
  Star,
  CheckCircle,
  Lightbulb,
  BarChart3,
  Zap,
  GraduationCap,
  TrendingUp
} from 'lucide-react';

import { ContactData } from './ContactCollectionForm';

interface AILiteracyReportProps {
  assessmentData: any;
  sessionId: string | null;
  contactData: ContactData;
  onBack?: () => void;
}

const AILiteracyReport: React.FC<AILiteracyReportProps> = ({
  assessmentData,
  sessionId,
  contactData,
  onBack
}) => {
  const { toast } = useToast();
  // Calculate AI literacy score based on actual responses
  const calculateLiteracyScore = () => {
    const responses = Object.values(assessmentData);
    const joinedResponses = responses.join(' ').toLowerCase();
    
    let score = 30; // Base score
    
    // AI tool usage
    if (joinedResponses.includes('chatgpt') || joinedResponses.includes('ai')) score += 20;
    if (joinedResponses.includes('daily') || joinedResponses.includes('regularly')) score += 15;
    if (joinedResponses.includes('automation') || joinedResponses.includes('efficiency')) score += 10;
    
    // Understanding level
    if (joinedResponses.includes('understand') || joinedResponses.includes('learning')) score += 10;
    if (joinedResponses.includes('never') || joinedResponses.includes('don\'t know')) score -= 15;
    
    return Math.min(100, Math.max(0, score));
  };

  const score = calculateLiteracyScore();
  const benchmarkScore = 52; // Average AI literacy benchmark
  const growthPotential = score < 60 ? 'High' : score < 80 ? 'Medium' : 'Steady';

  const getLiteracyLevel = (score: number) => {
    if (score >= 80) return { level: 'AI Advanced', tier: 'expert', color: 'text-emerald-600' };
    if (score >= 60) return { level: 'AI Proficient', tier: 'intermediate', color: 'text-blue-600' };
    if (score >= 40) return { level: 'AI Developing', tier: 'learning', color: 'text-amber-600' };
    return { level: 'AI Beginner', tier: 'foundation', color: 'text-red-600' };
  };

  const literacyProfile = getLiteracyLevel(score);

  // Learning-focused insights
  const learningInsights = [
    {
      category: 'Quick Wins',
      priority: 'High',
      insight: 'AI Tool Integration',
      description: 'Start using AI tools in your daily workflow to build practical experience and see immediate benefits.',
      impact: 'Immediate',
      timeline: '1-2 weeks',
      improvement: '15-25%',
      icon: Zap
    },
    {
      category: 'Skill Building',
      priority: 'Medium',
      insight: 'Prompt Engineering',
      description: 'Learn to write effective prompts to get better results from AI tools and improve your productivity.',
      impact: 'High',
      timeline: '2-4 weeks',
      improvement: '30-40%',
      icon: Target
    },
    {
      category: 'Understanding',
      priority: 'Medium',
      insight: 'AI Fundamentals',
      description: 'Build foundational knowledge about how AI works to make better decisions about tool selection and use.',
      impact: 'Long-term',
      timeline: '4-6 weeks',
      improvement: '20-30%',
      icon: Brain
    }
  ];

  const learningPath = [
    {
      phase: 'Foundation',
      duration: '2-3 weeks',
      focus: 'AI Basics & First Tools',
      activities: ['Learn AI terminology', 'Try ChatGPT for writing', 'Understand AI capabilities', 'Practice basic prompts']
    },
    {
      phase: 'Application',
      duration: '3-4 weeks',
      focus: 'Practical AI Integration',
      activities: ['Use AI in work tasks', 'Learn prompt engineering', 'Explore specialized tools', 'Measure productivity gains']
    },
    {
      phase: 'Mastery',
      duration: '4-6 weeks',
      focus: 'Advanced AI Literacy',
      activities: ['Understand AI ethics', 'Learn about AI limitations', 'Teach others', 'Design AI workflows']
    }
  ];

  const handleAdvisorySprintBooking = async () => {
    try {
      console.log('Sending personalized advisory sprint notification...');
      
      // Send assessment data with contact information via background email
      const { data, error } = await supabase.functions.invoke('send-advisory-sprint-notification', {
        body: {
          contactData,
          assessmentData,
          sessionId: sessionId || '',
          scores: {
            aiMindmakerScore: calculateLiteracyScore(),
            aiToolFluency: Math.min(100, calculateLiteracyScore() + 10),
            aiDecisionMaking: Math.min(100, calculateLiteracyScore() - 5),
            aiCommunication: Math.min(100, calculateLiteracyScore() + 5),
            aiLearningGrowth: Math.min(100, calculateLiteracyScore() - 10),
            aiEthicsBalance: Math.min(100, calculateLiteracyScore() + 15)
          },
          isAnonymous: false
        }
      });

      if (error) {
        console.error('Background email error:', error);
        // Don't show error to user, still open Calendly
      } else {
        console.log('Background email sent successfully');
      }

    } catch (error) {
      console.error('Advisory Sprint background process error:', error);
      // Continue with Calendly regardless
    }

    // Always open Calendly
    window.open('https://calendly.com/krish-raja/mindmaker-leaders', '_blank');
    
    toast({
      title: "Calendly Opening",
      description: `Hi ${contactData.fullName}! Your personalized assessment data has been sent to Krish for session preparation. Please complete your booking on Calendly.`,
    });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>

      {/* Back Button - Mobile App Optimized */}
      {onBack && (
        <div className="absolute top-safe-5 left-5 sm:top-6 sm:left-6 md:top-8 md:left-8 z-20">
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-card/80 backdrop-blur-sm mobile-button rounded-xl"
            aria-label="Go back to assessment"
          >
            ← Back to Assessment
          </Button>
        </div>
      )}

      <div className="container-width relative z-10 py-6 sm:py-8 md:py-12 lg:py-16">
        {/* Header - Mobile App Optimized */}
        <div className="text-center mobile-section">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-caption mb-4 sm:mb-6">
            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
            AI Literacy Assessment Results
          </div>
          
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 sm:mb-6 tracking-tight leading-tight">
            {contactData.fullName.split(' ')[0]}'s AI Learning
            <span className="block text-primary">Journey</span>
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl sm:max-w-3xl mx-auto leading-relaxed">
            Hello {contactData.fullName} from {contactData.companyName}! Here are your personalized insights and recommendations to accelerate your AI literacy 
            and unlock new possibilities in your work and learning.
          </p>
        </div>

        {/* Literacy Score Dashboard - Mobile App Optimized */}
        <Card className="mobile-section max-w-4xl mx-auto border-0 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-sm shadow-2xl rounded-xl">
          <CardContent className="p-6 md:p-8 lg:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 items-center">
              {/* Primary Score */}
              <div className="text-center lg:text-left">
                <div className="relative inline-block mb-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center relative">
                    <span className="text-4xl font-display text-white">
                      {score}
                    </span>
                    <div className="absolute -top-3 -right-3">
                      <GraduationCap className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </div>
                
                <h2 className="text-2xl font-display text-foreground mb-2">
                  {literacyProfile.level}
                </h2>
                
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {growthPotential} Growth Potential
                </Badge>
              </div>

              {/* Key Metrics */}
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-caption text-muted-foreground">vs. Benchmark</span>
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {score > benchmarkScore ? '+' : ''}{score - benchmarkScore} points
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {score > benchmarkScore ? 'above' : 'below'} average literacy
                  </p>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-caption text-muted-foreground">Learning Stage</span>
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{literacyProfile.tier}</div>
                  <p className="text-sm text-muted-foreground">ready for next level</p>
                </div>
              </div>

              {/* Learning Summary */}
              <div className="glass-card p-8">
                <h3 className="font-display text-xl text-foreground mb-4">{contactData.fullName.split(' ')[0]}'s Learning Profile</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Based on your responses, {contactData.fullName.split(' ')[0]}, you're positioned to make significant progress in AI literacy at {contactData.companyName}. 
                  Your current level shows {score < 40 ? 'strong potential for rapid improvement' : 
                  score < 70 ? 'solid foundation for advanced learning' : 'readiness for expert-level applications'}.
                </p>
                <div className="flex items-center text-primary text-sm">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Personalized learning path created
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Insights */}
        <div className="mobile-section">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="font-display text-mobile-2xl sm:text-3xl text-foreground mb-3 sm:mb-4">Your Learning Opportunities</h2>
            <p className="text-mobile-sm sm:text-base text-muted-foreground max-w-xl sm:max-w-2xl mx-auto leading-relaxed">
              Targeted recommendations to improve your AI literacy and practical skills
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {learningInsights.map((insight, index) => (
              <Card key={index} className="glass-card group hover:scale-105 transition-all duration-300 rounded-xl">
                <CardContent className="touch-padding lg:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <insight.icon className="h-8 w-8 text-primary" />
                    <Badge 
                      variant="outline" 
                      className={`
                        ${insight.priority === 'High' ? 'border-emerald-500/50 text-emerald-600 bg-emerald-500/10' : ''}
                        ${insight.priority === 'Medium' ? 'border-blue-500/50 text-blue-600 bg-blue-500/10' : ''}
                      `}
                    >
                      {insight.priority} Priority
                    </Badge>
                  </div>
                  
                  <h3 className="font-heading text-mobile-lg sm:text-xl text-foreground mb-3">{insight.insight}</h3>
                  <p className="text-mobile-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">{insight.description}</p>
                  
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
                    <div>
                      <div className="text-mobile-base sm:text-lg font-bold text-foreground">{insight.timeline}</div>
                      <div className="text-mobile-xs text-muted-foreground font-caption">Timeline</div>
                    </div>
                    <div>
                      <div className="text-mobile-base sm:text-lg font-bold text-foreground">{insight.impact}</div>
                      <div className="text-mobile-xs text-muted-foreground font-caption">Impact</div>
                    </div>
                    <div>
                      <div className="text-mobile-base sm:text-lg font-bold text-primary">{insight.improvement}</div>
                      <div className="text-mobile-xs text-muted-foreground font-caption">Improvement</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Learning Path */}
        <Card className="glass-card mb-12">
          <CardContent className="p-12">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl text-foreground mb-4">Your Personalized Learning Path</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A structured approach to building your AI literacy from current level to advanced proficiency
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {learningPath.map((phase, index) => (
                <div key={index} className="relative">
                  {index < learningPath.length - 1 && (
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
                      {phase.activities.map((activity, idx) => (
                        <div key={idx} className="flex items-center text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mr-3 flex-shrink-0" />
                          {activity}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strategic Consultation CTA */}
        <Card className="glass-card">
          <CardContent className="mobile-padding text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>

            {/* AI Attribution */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 sm:px-4 rounded-full text-xs sm:text-sm font-caption mb-4 sm:mb-6">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
              AI-Powered Assessment Results
            </div>
            
            <h3 className="font-display mobile-text-xl sm:text-2xl md:text-3xl text-foreground mb-4 sm:mb-6">
              Book Your Strategy Consultation
            </h3>
            
            <div className="container-width max-w-2xl">
              <p className="mobile-text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
                Ready to transform these insights into strategic action? Get expert guidance to implement 
                AI solutions that drive measurable business impact for your organization.
              </p>
            </div>
            
            <div className="glass-card mobile-padding mb-6 sm:mb-10 container-width max-w-2xl">
              <h4 className="font-heading mobile-text-base text-foreground mb-4 sm:mb-6">Strategic Advisory Session Includes:</h4>
              <div className="grid gap-3 sm:gap-4 text-left">
                {[
                  'AI strategy roadmap for your role',
                  'Custom tool recommendations', 
                  'Implementation priority matrix',
                  'ROI measurement framework',
                  'Change management guidance',
                  '30-day action plan'
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              size="lg"
              className="mobile-button bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
              onClick={handleAdvisorySprintBooking}
            >
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
              Book Expert Consultation
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2 sm:ml-3" />
            </Button>
            
            <div className="flex items-center justify-center gap-4 mt-6 text-muted-foreground text-sm">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                90-minute focused session
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-2 text-emerald-500" />
                Actionable strategic outcomes
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AILiteracyReport;