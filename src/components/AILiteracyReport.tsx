import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AdvisorySprintModal from './AdvisorySprintModal';
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

interface AILiteracyReportProps {
  assessmentData: any;
  sessionId: string | null;
  onBack?: () => void;
}

const AILiteracyReport: React.FC<AILiteracyReportProps> = ({
  assessmentData,
  sessionId,
  onBack
}) => {
  const [isAdvisorySprintModalOpen, setIsAdvisorySprintModalOpen] = useState(false);
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
            className="bg-card/80 backdrop-blur-sm"
          >
            ← Back to Assessment
          </Button>
        </div>
      )}

      <div className="container-width relative z-10 section-padding">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-caption mb-6">
            <GraduationCap className="h-4 w-4" />
            AI Literacy Assessment Results
          </div>
          
          <h1 className="font-display text-5xl lg:text-6xl text-foreground mb-6 tracking-tight">
            Your AI Learning
            <span className="block text-primary">Journey</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Personalized insights and recommendations to accelerate your AI literacy 
            and unlock new possibilities in your work and learning.
          </p>
        </div>

        {/* Literacy Score Dashboard */}
        <Card className="glass-card mb-12 max-w-6xl mx-auto">
          <CardContent className="p-12">
            <div className="grid lg:grid-cols-3 gap-12 items-center">
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
                <h3 className="font-display text-xl text-foreground mb-4">Your Learning Profile</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Based on your responses, you're positioned to make significant progress in AI literacy. 
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
        <div className="mb-12">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-foreground mb-4">Your Learning Opportunities</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Targeted recommendations to improve your AI literacy and practical skills
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {learningInsights.map((insight, index) => (
              <Card key={index} className="glass-card group hover:scale-105 transition-all duration-300">
                <CardContent className="p-8">
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
                      <div className="text-lg font-bold text-primary">{insight.improvement}</div>
                      <div className="text-xs text-muted-foreground font-caption">Improvement</div>
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

        {/* Advisory Sprint CTA */}
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-8">
              <Users className="h-10 w-10 text-white" />
            </div>
            
            <h3 className="font-display text-3xl text-foreground mb-6">
              Book Your AI Advisory Sprint
            </h3>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Ready to accelerate your AI transformation? Get personalized strategic guidance to implement 
              AI solutions that drive real business impact.
            </p>
            
            <div className="glass-card p-8 mb-10">
              <h4 className="font-heading text-lg text-foreground mb-6">Advisory Sprint Includes:</h4>
              <div className="grid md:grid-cols-2 gap-6 text-left">
                {[
                  'AI strategy roadmap for your role',
                  'Custom tool recommendations',
                  'Implementation priority matrix',
                  'ROI measurement framework',
                  'Change management guidance',
                  '30-day action plan'
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white px-12 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              onClick={() => setIsAdvisorySprintModalOpen(true)}
            >
              <BookOpen className="h-5 w-5 mr-3" />
              Book Advisory Sprint
              <ArrowRight className="h-5 w-5 ml-3" />
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

      <AdvisorySprintModal
        isOpen={isAdvisorySprintModalOpen}
        onClose={() => setIsAdvisorySprintModalOpen(false)}
        assessmentData={assessmentData}
        sessionId={sessionId || ''}
        scores={{
          aiMindmakerScore: calculateLiteracyScore(),
          aiToolFluency: Math.min(100, calculateLiteracyScore() + 10),
          aiDecisionMaking: Math.min(100, calculateLiteracyScore() - 5),
          aiCommunication: Math.min(100, calculateLiteracyScore() + 5),
          aiLearningGrowth: Math.min(100, calculateLiteracyScore() - 10),
          aiEthicsBalance: Math.min(100, calculateLiteracyScore() + 15)
        }}
      />
    </div>
  );
};

export default AILiteracyReport;