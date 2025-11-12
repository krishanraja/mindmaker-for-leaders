import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Rocket,
  Sparkles,
  Award,
  Calendar,
  Compass,
  RefreshCw
} from 'lucide-react';
import { StandardCarousel, StandardCarouselCard } from '@/components/ui/standard-carousel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { ContactData } from './ContactCollectionForm';
import { DeepProfileData } from './DeepProfileQuestionnaire';
import { deriveLeadershipComparison, type LeadershipComparison } from '@/utils/scaleUpsMapping';

interface PersonalizedInsights {
  growthReadiness: { level: string; preview: string; details: string };
  leadershipStage: { stage: string; preview: string; details: string };
  keyFocus: { category: string; preview: string; details: string };
  roadmapInitiatives: Array<{
    title: string;
    description: string;
    basedOn: string[];
    impact: string;
    timeline: string;
    growthMetric: string;
    scaleUpsDimensions?: string[];
  }>;
}

interface AILeadershipBenchmarkProps {
  assessmentData: any;
  sessionId: string | null;
  contactData: ContactData;
  deepProfileData: DeepProfileData | null;
  onBack?: () => void;
  onViewToolkit?: () => void;
}

const AILeadershipBenchmark: React.FC<AILeadershipBenchmarkProps> = ({
  assessmentData,
  sessionId,
  contactData,
  deepProfileData,
  onBack,
  onViewToolkit
}) => {
  const { toast } = useToast();
  const [personalizedInsights, setPersonalizedInsights] = useState<PersonalizedInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedDimensions, setExpandedDimensions] = useState<Record<string, boolean>>({});
  const [leadershipComparison, setLeadershipComparison] = useState<LeadershipComparison | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<LeadershipComparison['dimensions'][0] | null>(null);

  // Utility function to clean and validate "Based on" text
  const cleanBasedOnText = (items: string[]): string[] => {
    const technicalPatterns = [
      /^[A-Z_]+$/, // All caps with underscores (e.g., KPI_CONNECTION)
      /_[a-z]/, // Snake_case patterns
      /^[a-z]+_[a-z]+/i, // Any underscore patterns
    ];
    
    const labelMap: Record<string, string> = {
      'Kpi_connection': 'KPI tracking and metrics',
      'kpi_connection': 'Performance metrics',
      'KPI_CONNECTION': 'Performance tracking',
      'time_waste': 'Time optimization',
      'delegation_tasks': 'Delegation priorities',
      'work_breakdown': 'Work distribution',
      'communication_style': 'Communication preferences',
      'stakeholder_needs': 'Stakeholder requirements',
    };
    
    return items
      .filter(item => item && item.trim().length > 0)
      .map(item => {
        // Check if it's a technical string
        if (technicalPatterns.some(pattern => pattern.test(item))) {
          return labelMap[item] || 'Assessment insights';
        }
        return item;
      })
      .filter(item => item.length > 0);
  };

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const toggleDimension = (dimensionName: string) => {
    setExpandedDimensions(prev => ({
      ...prev,
      [dimensionName]: !prev[dimensionName]
    }));
  };

  useEffect(() => {
    loadOrGenerateInsights();
    // Derive leadership comparison from existing data
    const comparison = deriveLeadershipComparison(assessmentData, deepProfileData);
    setLeadershipComparison(comparison);
  }, []);

  const loadOrGenerateInsights = async () => {
    try {
      setIsLoadingInsights(true);
      
      // First, check if insights already exist for this session
      if (sessionId) {
        console.log('Checking for existing insights for session:', sessionId);
        const { data: existingInsights, error: fetchError } = await supabase
          .from('ai_insights_generated')
          .select('insight_content')
          .eq('session_id', sessionId)
          .eq('insight_type', 'personalized_insights')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!fetchError && existingInsights?.insight_content) {
          console.log('Found existing personalized insights, using cached version');
          const parsedInsights = typeof existingInsights.insight_content === 'string' 
            ? JSON.parse(existingInsights.insight_content)
            : existingInsights.insight_content;
          setPersonalizedInsights(parsedInsights);
          setIsLoadingInsights(false);
          return;
        }
      }

      // No existing insights found, generate new ones
      console.log('No existing insights found, generating new ones...');
      await generatePersonalizedInsights();
    } catch (error) {
      console.error('Error loading insights:', error);
      // Fallback to generating new insights
      await generatePersonalizedInsights();
    }
  };

  const generatePersonalizedInsights = async () => {
    try {
      console.log('Generating personalized insights...');

      const { data, error } = await supabase.functions.invoke('generate-personalized-insights', {
        body: {
          assessmentData,
          contactData,
          deepProfileData,
          sessionId
        }
      });

      if (error) throw error;

      if (data?.personalizedInsights) {
        setPersonalizedInsights(data.personalizedInsights);
        console.log('Personalized insights generated successfully');
        
        // Save to database for future use
        if (sessionId) {
          await supabase
            .from('ai_insights_generated')
            .insert({
              session_id: sessionId,
              insight_type: 'personalized_insights',
              insight_content: JSON.stringify(data.personalizedInsights)
            });
          console.log('Insights saved to database');
        }
      }
    } catch (error) {
      console.error('Error generating personalized insights:', error);
      toast({
        title: "Generating Insights",
        description: "Showing standard insights while we personalize your results.",
        variant: "default",
      });
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Calculate Leadership Score (0-100 scale, normalized from 6 questions × 5 points = 30 max)
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
    
    // Normalize to 0-100 scale (max possible is 30, so multiply by 100/30)
    const normalizedScore = Math.round((totalScore / 30) * 100);
    return normalizedScore;
  };

  const score = calculateLeadershipScore();

  const getLeadershipTier = (score: number) => {
    if (score >= 83) return { 
      tier: 'AI-Orchestrator', 
      gradient: 'from-[hsl(var(--tier-orchestrator))] to-[hsl(var(--tier-orchestrator-light))]',
      textColor: 'text-[hsl(var(--tier-orchestrator))]',
      bgGradient: 'bg-gradient-to-br from-[hsl(var(--tier-orchestrator))]/10 to-[hsl(var(--tier-orchestrator-light))]/5',
      borderGlow: 'shadow-[0_0_30px_-5px_hsl(var(--tier-orchestrator)/0.3)]',
      icon: Crown,
      message: "You're setting the pace. Now amplify by formalizing AI across teams."
    };
    if (score >= 63) return { 
      tier: 'AI-Confident Leader', 
      gradient: 'from-[hsl(var(--tier-confident))] to-[hsl(var(--tier-confident-light))]',
      textColor: 'text-[hsl(var(--tier-confident))]',
      bgGradient: 'bg-gradient-to-br from-[hsl(var(--tier-confident))]/10 to-[hsl(var(--tier-confident-light))]/5',
      borderGlow: 'shadow-[0_0_30px_-5px_hsl(var(--tier-confident)/0.3)]',
      icon: Target,
      message: "You're using AI as a thinking partner—next, scale culture and growth ops."
    };
    if (score >= 43) return { 
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

  // Map dimension names to icons
  const getDimensionIcon = (dimensionName: string) => {
    const iconMap: Record<string, any> = {
      'AI Fluency': Brain,
      'Delegation Mastery': Users,
      'Strategic Vision': Compass,
      'Decision Agility': Zap,
      'Impact Orientation': Award,
      'Change Leadership': RefreshCw
    };
    return iconMap[dimensionName] || Target;
  };

  // Get level styling and progress
  const getLevelStyling = (level: string) => {
    const levelMap: Record<string, { gradient: string, iconBg: string, progress: number, badgeBg: string }> = {
      'Building Foundations': { 
        gradient: 'from-muted/30 to-muted/10',
        iconBg: 'bg-muted/50 border-muted',
        progress: 25,
        badgeBg: 'bg-muted text-muted-foreground'
      },
      'Active Explorer': { 
        gradient: 'from-primary/20 to-primary/5',
        iconBg: 'bg-primary/10 border-primary/30',
        progress: 50,
        badgeBg: 'bg-primary/20 text-primary border-primary/30'
      },
      'Confident Practitioner': { 
        gradient: 'from-primary/30 to-primary/10',
        iconBg: 'bg-primary/20 border-primary/40',
        progress: 75,
        badgeBg: 'bg-primary/30 text-primary border-primary/40'
      },
      'AI Pioneer': { 
        gradient: 'from-primary/40 to-primary/15',
        iconBg: 'bg-primary/30 border-primary/50',
        progress: 100,
        badgeBg: 'bg-primary text-primary-foreground'
      }
    };
    return levelMap[level] || levelMap['Building Foundations'];
  };

  // Default strategic insights (fallback)
  const defaultStrategicInsights = [
    {
      title: 'AI-Driven Revenue Acceleration',
      description: 'Identify and implement AI solutions that directly impact your top-line growth and market positioning.',
      basedOn: ['Assessment responses', 'Business context'],
      impact: 'Revenue Growth',
      timeline: '30-60 days',
      growthMetric: '15-25%',
      icon: Rocket,
      scaleUpsDimensions: ['Growth Systems', 'Strategic Speed']
    },
    {
      title: 'Executive AI Fluency',
      description: 'Develop AI literacy that positions you as a thought leader in your industry and with stakeholders.',
      basedOn: ['Leadership assessment scores'],
      impact: 'Strategic Influence',
      timeline: '60-90 days',
      growthMetric: '20-40%',
      icon: Crown,
      scaleUpsDimensions: ['Strategic Speed', 'Competitive Edge']
    },
    {
      title: 'AI Champions Network',
      description: 'Build and coach a network of AI champions across your organization to accelerate adoption.',
      basedOn: ['Organizational readiness'],
      impact: 'Cultural Change',
      timeline: '90-120 days',
      growthMetric: '25-50%',
      icon: Users,
      scaleUpsDimensions: ['Competitive Edge', 'Workflow Automation']
    }
  ];

  // Use personalized roadmap or fallback with character length validation
  const roadmapInsights = personalizedInsights?.roadmapInitiatives?.map(initiative => {
    // Truncate title to 80 chars
    const truncatedTitle = initiative.title.length > 80 
      ? initiative.title.substring(0, 77) + '...' 
      : initiative.title;
    
    // Truncate description to 400 chars
    const truncatedDescription = initiative.description.length > 400
      ? initiative.description.substring(0, 397) + '...'
      : initiative.description;
    
    // Clean and limit basedOn to 3 items, each max 60 chars
    const cleanedBasedOn = cleanBasedOnText(initiative.basedOn || [])
      .slice(0, 3)
      .map(item => item.length > 60 ? item.substring(0, 57) + '...' : item);
    
    // Limit dimensions to 3 and clean them
    const limitedDimensions = (initiative.scaleUpsDimensions || [])
      .slice(0, 3)
      .map(dim => cleanBasedOnText([dim])[0] || dim);
    
    // Extract concise metric (max 20 chars)
    let cleanedMetric = initiative.growthMetric;
    if (cleanedMetric && cleanedMetric.length > 20) {
      const metricMatch = cleanedMetric.match(/\d+[-–]?\d*%|\$\d+[KMB]?|\d+x/i);
      if (metricMatch) {
        cleanedMetric = metricMatch[0];
      } else {
        cleanedMetric = cleanedMetric.substring(0, 17) + '...';
      }
    }
    
    return {
      ...initiative,
      title: truncatedTitle,
      description: truncatedDescription,
      basedOn: cleanedBasedOn.length > 0 ? cleanedBasedOn : ['Your assessment responses'],
      scaleUpsDimensions: limitedDimensions,
      growthMetric: cleanedMetric,
      icon: initiative.title.includes('Revenue') || initiative.title.includes('Business') ? Rocket :
            initiative.title.includes('Leadership') || initiative.title.includes('Executive') ? Crown : Users
    };
  }) || defaultStrategicInsights;

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20 pt-5 sm:pt-7">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight leading-tight text-center">
            {contactData.fullName.split(' ')[0]}'s Leadership
            <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent mt-2">
              AI Benchmark
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Hello {contactData.fullName} from <span className="font-semibold text-foreground">{contactData.companyName}</span>! Here's your AI leadership capability assessment 
            and strategic roadmap for driving growth through AI literacy.
          </p>
          
          {/* Book a Call Button */}
          <div className="flex justify-center mt-6">
            <Button 
              onClick={handleExecutivePrimerBooking}
              size="lg"
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Book a Call
            </Button>
          </div>
        </div>

        {/* Leadership Score Dashboard - Hero Style */}
        <Card className={`mb-12 sm:mb-24 max-w-6xl lg:max-w-[94rem] mx-auto border-2 rounded-2xl overflow-hidden ${leadershipProfile.borderGlow} ${leadershipProfile.bgGradient}`}>
          <CardContent className="p-6 sm:p-10 lg:p-12">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-center">
              {/* Left: Hero Score Circle */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:flex-shrink-0 lg:w-72">
                <div className="relative mb-6">
                  {/* Animated gradient border circle */}
                  <div className={`w-36 h-36 lg:w-56 lg:h-56 rounded-full bg-gradient-to-br ${leadershipProfile.gradient} p-1 animate-pulse`}>
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center relative">
                      <div className="flex flex-col items-center">
                        <span className="text-5xl lg:text-7xl font-display font-bold text-primary">
                          {score}
                        </span>
                        <span className="text-sm text-muted-foreground mt-1">out of 100</span>
                      </div>
                      <div className="absolute -top-4 -right-4 bg-background rounded-full p-2 shadow-lg">
                        <leadershipProfile.icon className="h-8 w-8 lg:h-12 lg:w-12 text-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">Leadership Score</div>
                </div>
                
                <h2 className="text-2xl lg:text-4xl font-bold text-primary mb-4">
                  {leadershipProfile.tier}
                </h2>
              </div>

              {/* Right: Key Metrics & Insight */}
              <div className="space-y-6 w-full lg:w-auto lg:flex-1">
                 {/* Desktop - Horizontal Cards */}
                 <div className="hidden md:flex flex-col gap-3 max-w-4xl">
                  {isLoadingInsights ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground">Personalizing your insights...</span>
                    </div>
                  ) : (
                    <>
                      {/* Growth Readiness Card */}
                      <Card className="py-4 px-4 shadow-md border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Growth Readiness</span>
                              <span className="text-base font-bold text-foreground">
                                {personalizedInsights?.growthReadiness.level || (score >= 25 ? 'High' : score >= 19 ? 'Medium-High' : score >= 13 ? 'Medium' : 'Developing')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {personalizedInsights?.growthReadiness.preview || 'Revenue acceleration potential'} — {personalizedInsights?.growthReadiness.details || 'Focus on identifying high-impact AI use cases that align with your strategic priorities.'}
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Leadership Stage Card */}
                      <Card className="py-4 px-4 shadow-md border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Target className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leadership Stage</span>
                              <span className="text-base font-bold text-foreground">
                                {personalizedInsights?.leadershipStage.stage || (score >= 25 ? 'Orchestrator' : score >= 19 ? 'Confident' : score >= 13 ? 'Aware' : 'Emerging')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {personalizedInsights?.leadershipStage.preview || 'Build strategic AI leadership capabilities'} — {personalizedInsights?.leadershipStage.details || 'Build a cross-functional AI champion network to accelerate adoption across your organization.'}
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Executive Insight Card */}
                      <Card className="py-4 px-4 shadow-md border-0 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Lightbulb className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Executive Insight</span>
                              <span className="text-base font-bold text-foreground">
                                {personalizedInsights?.keyFocus.category || 'Key Focus'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {personalizedInsights?.keyFocus.preview || leadershipProfile.message} — {personalizedInsights?.keyFocus.details || 'Develop a roadmap for integrating AI into your core business processes.'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}
                </div>

                {/* Mobile Vertical Stack - 3 Cards */}
                <div className="md:hidden flex flex-col gap-4 w-full max-w-sm mx-auto">
                  <Card className="p-5 shadow-lg border-2 border-border bg-card">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-muted-foreground">Growth Readiness</span>
                        <BarChart3 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-xl font-bold text-foreground mb-2">
                        {personalizedInsights?.growthReadiness.level || (score >= 83 ? 'High' : score >= 63 ? 'Medium-High' : score >= 43 ? 'Medium' : 'Developing')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {personalizedInsights?.growthReadiness.preview || 'Revenue acceleration potential'}
                      </p>
                      <Collapsible open={expandedCards.has('growth-mobile')}>
                        <CollapsibleTrigger asChild>
                          <button 
                            onClick={() => toggleCard('growth-mobile')}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-2"
                          >
                            {expandedCards.has('growth-mobile') ? (
                              <>Less <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>More <ChevronDown className="h-3 w-3" /></>
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {personalizedInsights?.growthReadiness.details || 'Focus on identifying high-impact AI use cases.'}
                          </p>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                  
                  <Card className="p-5 shadow-lg border-2 border-border bg-card">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-muted-foreground">Leadership Stage</span>
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-xl font-bold text-foreground mb-2">
                        {personalizedInsights?.leadershipStage.stage || (score >= 83 ? 'Orchestrator' : score >= 63 ? 'Confident' : score >= 43 ? 'Aware' : 'Emerging')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {personalizedInsights?.leadershipStage.preview || 'Build strategic AI leadership capabilities'}
                      </p>
                      <Collapsible open={expandedCards.has('leadership-mobile')}>
                        <CollapsibleTrigger asChild>
                          <button 
                            onClick={() => toggleCard('leadership-mobile')}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-2"
                          >
                            {expandedCards.has('leadership-mobile') ? (
                              <>Less <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>More <ChevronDown className="h-3 w-3" /></>
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {personalizedInsights?.leadershipStage.details || 'Build a cross-functional AI champion network.'}
                          </p>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                  
                  <Card className="p-5 shadow-lg border-2 border-border bg-card">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-muted-foreground">Executive Insight</span>
                        <Lightbulb className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-xl font-bold text-foreground mb-2">
                        {personalizedInsights?.keyFocus.category || 'Key Focus'}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {personalizedInsights?.keyFocus.preview || leadershipProfile.message}
                      </p>
                      <Collapsible open={expandedCards.has('focus-mobile')}>
                        <CollapsibleTrigger asChild>
                          <button 
                            onClick={() => toggleCard('focus-mobile')}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-2"
                          >
                            {expandedCards.has('focus-mobile') ? (
                              <>Less <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>More <ChevronDown className="h-3 w-3" /></>
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {personalizedInsights?.keyFocus.details || 'Develop a roadmap for integrating AI into your core business processes.'}
                          </p>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Growth Opportunities - Horizontal Swipe */}
        <div className="mb-20 sm:mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
              Your 90-Day <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Growth Roadmap</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              Executive-level initiatives to accelerate your AI leadership impact and drive measurable business results
            </p>
          </div>

          <StandardCarousel cardWidth="desktop" showDots={false} showArrows={true} className="w-full">
            {isLoadingInsights ? (
              <StandardCarouselCard className="min-h-[320px]">
                <Card className="h-full border-0 shadow-none flex items-center justify-center">
                  <CardContent className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Creating your personalized roadmap...</p>
                  </CardContent>
                </Card>
              </StandardCarouselCard>
            ) : (
              roadmapInsights.map((insight, index) => (
                <StandardCarouselCard key={index} className="shadow-lg border-2 rounded-2xl overflow-hidden hover:shadow-xl transition-all">
                  <Card className="h-full border-0 shadow-none flex flex-col min-h-[469px]">
                    <CardContent className="p-4 sm:p-6 flex flex-col h-full">
                      {/* Header: Fixed 72px */}
                      <div className="h-[72px] flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex-shrink-0">
                          <insight.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="carousel-card-title-base font-bold text-foreground text-base line-clamp-2">
                            {insight.title}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Description: Fixed 120px */}
                      <div className="h-[120px] flex flex-col justify-start">
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">
                          {insight.description}
                        </p>
                      </div>
                      
                      {/* Based On: Increased to 85px for better readability */}
                      <div className="h-[85px]">
                        <div className="p-3 bg-primary/10 rounded-lg h-full overflow-hidden flex flex-col justify-start">
                          <div className="text-xs font-semibold text-primary mb-1.5 flex-shrink-0">Based on:</div>
                          <div className="text-xs text-muted-foreground line-clamp-3 flex-1 leading-relaxed break-words">
                            {insight.basedOn && insight.basedOn.length > 0 
                              ? insight.basedOn.join(' • ') 
                              : 'Your assessment responses and leadership profile'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Dimensions: Fixed 52px (always present) */}
                      <div className="h-[52px] flex items-start overflow-x-auto">
                        <div className="flex flex-wrap gap-1.5 h-full content-start">
                          {insight.scaleUpsDimensions && insight.scaleUpsDimensions.length > 0 ? (
                            insight.scaleUpsDimensions.map((dim: string, dimIdx: number) => (
                              <Badge key={dimIdx} variant="outline" className="text-xs py-0.5 px-2 h-fit">
                                {dim}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs py-0.5 px-2 h-fit">General Leadership</Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Success Metrics: Fixed 80px (always present) */}
                      <div className="h-[80px]">
                        <div className="p-2.5 bg-muted/30 rounded-lg h-full overflow-hidden flex flex-col justify-start">
                          <div className="text-xs font-semibold text-foreground mb-1.5 flex-shrink-0 uppercase tracking-wide">Success Metrics</div>
                          <div className="text-xs text-muted-foreground line-clamp-3 flex-1 leading-relaxed">
                            {insight.impact || 'Measurable business impact and growth acceleration'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom Metrics: Fixed 60px footer */}
                      <div className="h-[60px] flex items-center justify-between pt-3 border-t gap-3 mt-auto">
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <div className="text-xs font-bold text-primary mb-1 truncate w-full">
                            {insight.growthMetric}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider">
                            Growth
                          </div>
                        </div>
                        <div className="flex flex-col items-start flex-shrink-0">
                          <div className="text-xs font-bold text-foreground mb-1 whitespace-nowrap">
                            {insight.timeline}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider">
                            Timeline
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StandardCarouselCard>
              ))
            )}
          </StandardCarousel>
        </div>

        {/* Leadership Comparison Carousel */}
        {leadershipComparison && (
          <Card className="mb-20 sm:mb-24">
            <CardContent className="p-8 sm:p-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                    How You Compare
                  </h3>
                </div>
                
                <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
                  Based on your responses, here's how your AI leadership capabilities compare to other executives
                </p>
                
                {/* Mobile-Optimized Carousel with proper breathing space */}
                <StandardCarousel cardWidth="mobile-lg" showDots={true} showArrows={true} className="w-full mt-6">
                  {leadershipComparison.dimensions.map((dim, idx) => {
                    const IconComponent = getDimensionIcon(dim.dimension);
                    const styling = getLevelStyling(dim.level);
                    
                    return (
                      <StandardCarouselCard 
                        key={idx} 
                        className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl rounded-2xl flex flex-col
                          border-2 border-primary/10
                          sm:bg-gradient-to-br sm:from-card sm:to-muted/20"
                      >
                        {/* Mobile: Professional, readable layout (400px) | Desktop: Comprehensive view */}
                        <Card className="h-full border-0 shadow-none bg-transparent min-h-[400px] sm:min-h-[480px]">
                          <CardContent className="p-5 sm:p-6 h-full flex flex-col">
                            
                            {/* Mobile-First Layout */}
                            <div className="flex flex-col h-full sm:hidden space-y-4">
                              {/* Watermark Icon - Mobile Only */}
                              <div className="absolute top-4 right-4 opacity-[0.03]">
                                <IconComponent className="w-24 h-24" />
                              </div>

                              {/* Hero: Large Level Badge */}
                              <div className="flex justify-center pt-2">
                                <Badge className={`text-lg font-extrabold px-6 py-3 ${styling.badgeBg} border-2 shadow-md`}>
                                  {dim.level}
                                </Badge>
                              </div>

                              {/* Dimension Title */}
                              <div className="text-center">
                                <h4 className="text-lg font-extrabold text-foreground leading-tight">
                                  {dim.dimension}
                                </h4>
                              </div>

                              {/* Key Insight - First 2-3 sentences with natural line clamp */}
                              <div className="flex-1 flex items-start">
                                <p className="text-sm text-muted-foreground leading-relaxed text-center line-clamp-4">
                                  {dim.reasoning.split('.').slice(0, 3).join('. ') + (dim.reasoning.split('.').length > 3 ? '.' : '')}
                                </p>
                              </div>

                              {/* Next Step - Full text with line clamp */}
                              {dim.nextStep && (
                                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                  <p className="text-sm font-medium text-foreground line-clamp-3">
                                    <span className="text-primary font-semibold">Next:</span> {dim.nextStep}
                                  </p>
                                </div>
                              )}

                              {/* Percentile Context */}
                              {dim.percentile && (
                                <div className="text-center pb-1">
                                  <p className="text-base font-bold text-primary">
                                    Top {100 - dim.percentile}% of executives
                                  </p>
                                </div>
                              )}

                              {/* Tap for Details Button - Prominent */}
                              <div className="text-center pt-2 border-t border-border/50">
                                <button 
                                  onClick={() => setSelectedDimension(dim)}
                                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1.5 mx-auto group"
                                >
                                  Tap for full details
                                  <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                </button>
                              </div>
                            </div>

                            {/* Desktop: Comprehensive View - Keep existing detailed layout */}
                            <div className="hidden sm:flex sm:flex-col sm:h-full sm:space-y-4">
                              {/* Header with Icon and Title */}
                              <div className="carousel-card-header flex items-start gap-3 min-h-[85px] flex-shrink-0">
                                <div className={`p-2.5 rounded-xl border ${styling.iconBg} transition-transform group-hover:scale-110 flex-shrink-0`}>
                                  <IconComponent className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="carousel-card-title-base font-bold text-base sm:text-lg text-foreground line-clamp-2 mb-2 leading-tight">
                                    {dim.dimension}
                                  </h4>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={`text-xs font-semibold px-3 py-1 ${styling.badgeBg} border`}>
                                      {dim.level}
                                    </Badge>
                                    {dim.rank && dim.rank <= 2 && (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                                        Top Strength
                                      </Badge>
                                    )}
                                    {dim.rank && dim.rank >= 5 && (
                                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                        Growth Area
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Visual Progress Indicator */}
                              <div className="space-y-2 min-h-[45px] flex-shrink-0">
                                <Progress value={dim.score} className="h-2" />
                                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                  <span>Building</span>
                                  <span>Explorer</span>
                                  <span>Practitioner</span>
                                  <span>Pioneer</span>
                                </div>
                              </div>

                              {/* Enhanced Reasoning with Collapsible Expansion */}
                              <div className="carousel-card-body space-y-2 flex-1 overflow-hidden">
                                <Collapsible
                                  open={expandedDimensions[dim.dimension] || false}
                                  onOpenChange={() => toggleDimension(dim.dimension)}
                                >
                                  <div className="space-y-2">
                                    {!expandedDimensions[dim.dimension] && (
                                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                        {dim.reasoning}
                                      </p>
                                    )}
                                    
                                    <CollapsibleContent>
                                      <p className="text-sm text-muted-foreground leading-relaxed">
                                        {dim.reasoning}
                                      </p>
                                    </CollapsibleContent>
                                    
                                    {dim.reasoning.length > 150 && (
                                      <CollapsibleTrigger asChild>
                                        <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                                          {expandedDimensions[dim.dimension] ? 'Read less' : 'Read more'}
                                          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${
                                            expandedDimensions[dim.dimension] ? 'rotate-180' : ''
                                          }`} />
                                        </button>
                                      </CollapsibleTrigger>
                                    )}
                                  </div>
                                </Collapsible>
                                
                                {dim.nextStep && (
                                  <div className={`p-2.5 bg-primary/5 rounded-lg border border-primary/10 ${
                                    !expandedDimensions[dim.dimension] && dim.nextStep.length > 100 ? 'line-clamp-2' : ''
                                  }`}>
                                    <p className="text-xs font-medium text-foreground">
                                      <span className="text-primary">Next Step:</span> {dim.nextStep}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Percentile - Desktop */}
                                {dim.percentile && (
                                  <p className="text-xs text-muted-foreground/80">
                                    You're in the top {100 - dim.percentile}% of executives in this dimension
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </StandardCarouselCard>
                    );
                  })}
                </StandardCarousel>

                {/* Mobile Detail Modal */}
                <Dialog open={!!selectedDimension} onOpenChange={(open) => !open && setSelectedDimension(null)}>
                  <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    {selectedDimension && (() => {
                      const IconComponent = getDimensionIcon(selectedDimension.dimension);
                      const styling = getLevelStyling(selectedDimension.level);
                      
                      return (
                        <>
                          <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded-xl ${styling.iconBg}`}>
                                <IconComponent className="w-5 h-5 text-primary" />
                              </div>
                              <DialogTitle className="text-xl font-bold">{selectedDimension.dimension}</DialogTitle>
                            </div>
                            <Badge className={`w-fit ${styling.badgeBg} font-bold`}>
                              {selectedDimension.level}
                            </Badge>
                          </DialogHeader>

                          <div className="space-y-6 mt-4">
                            {/* Score Progress */}
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-foreground">Your Score</span>
                                <span className="text-sm font-bold text-primary">{selectedDimension.score}/5</span>
                              </div>
                              <Progress value={styling.progress} className="h-3" />
                            </div>

                            {/* Full Reasoning */}
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-2">Assessment</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {selectedDimension.reasoning}
                              </p>
                            </div>

                            {/* Next Step */}
                            {selectedDimension.nextStep && (
                              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                                <h4 className="text-sm font-semibold text-primary mb-2">Next Step</h4>
                                <p className="text-sm text-foreground leading-relaxed">
                                  {selectedDimension.nextStep}
                                </p>
                              </div>
                            )}

                            {/* Percentile */}
                            {selectedDimension.percentile && (
                              <div className="p-4 bg-muted rounded-xl">
                                <p className="text-sm text-center">
                                  <span className="font-bold text-primary text-lg">Top {100 - selectedDimension.percentile}%</span>
                                  <span className="text-muted-foreground"> of executives</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </DialogContent>
                </Dialog>

                <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>Your Leadership Position:</strong> <span className="text-primary font-semibold">{leadershipComparison.overallMaturity}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  Prompt Toolkit
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Executive Primer CTA - Hero Section */}
        <Card className="mt-16 shadow-2xl border-0 rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
          <CardContent className="p-4 sm:p-12 lg:p-16 text-center relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-8">
                <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
                Limited Spots Available This Month
              </div>
              
              <h3 className="text-lg sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-6 leading-tight">
                Ready to turn your score<br className="hidden sm:block" /> into a <span className="underline decoration-white/50">strategic roadmap</span>?
              </h3>
              
              <p className="text-xs sm:text-xl text-white/90 mb-4 sm:mb-12 leading-snug sm:leading-relaxed max-w-3xl mx-auto px-2 sm:px-4">
                Book your <span className="font-bold">Executive Primer</span> and align your AI literacy with revenue strategy in just 30 days.
              </p>
              
              {/* Value Props - Desktop Grid */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
                {[
                  { icon: Target, title: 'Strategic AI Roadmap', desc: 'Industry-specific' },
                  { icon: TrendingUp, title: 'Revenue Acceleration', desc: 'Growth-focused AI deployment' },
                  { icon: Users, title: 'Team Activation', desc: 'Leadership & stakeholder toolkit' }
                ].map((item, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white h-[180px] flex flex-col">
                    <item.icon className="h-10 w-10 mx-auto mb-4" />
                    <h4 className="carousel-card-title-lg font-bold text-lg mb-2 line-clamp-2">{item.title}</h4>
                    <p className="text-sm text-white/80">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Value Props - Mobile Carousel */}
              <div className="sm:hidden mb-4">
                <StandardCarousel cardWidth="mobile" showDots={true} showArrows={false} className="w-full max-w-sm mx-auto">
                  {[
                    { icon: Target, title: 'Strategic AI Roadmap', desc: 'Industry-specific' },
                    { icon: TrendingUp, title: 'Revenue Acceleration', desc: 'Growth-focused AI deployment' },
                    { icon: Users, title: 'Team Activation', desc: 'Leadership & stakeholder toolkit' }
                  ].map((item, index) => (
                      <StandardCarouselCard key={index} className="bg-white/10 backdrop-blur-sm rounded-xl text-white">
                        <Card className="h-full border-0 shadow-none bg-transparent min-h-[140px]">
                          <CardContent className="carousel-card-content p-3 text-center h-full flex flex-col">
                            <div className="carousel-card-header flex-shrink-0">
                              <item.icon className="h-6 w-6 mx-auto mb-2" />
                            </div>
                            <div className="carousel-card-body flex-1 flex flex-col justify-center">
                              <h4 className="carousel-card-title-base font-bold text-sm mb-1 leading-tight line-clamp-2">{item.title}</h4>
                              <p className="text-xs text-white/80 leading-tight">{item.desc}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </StandardCarouselCard>
                  ))}
                </StandardCarousel>
              </div>
              
              <div className="overflow-hidden">
                <Button 
                  size="lg" 
                  onClick={handleExecutivePrimerBooking}
                  className="bg-white text-primary hover:bg-white/90 px-4 sm:px-10 py-3 sm:py-6 text-sm sm:text-xl font-bold group transition-all rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.4)] hover:scale-105 max-w-full"
                  aria-label="Schedule Your Strategic Session"
                >
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">Schedule Your Strategic AI Planning Session</span>
                  <span className="sm:hidden">Schedule Session</span>
                </Button>
              </div>
              
              <div className="mt-3 sm:mt-8 text-white/80 text-[10px] sm:text-sm leading-tight sm:leading-normal">
                <p className="mb-1 sm:mb-2">🚀 Join 500+ executives who've accelerated their AI leadership</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AILeadershipBenchmark;