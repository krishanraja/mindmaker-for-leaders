import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle, Brain, TrendingUp, User, Sparkles, Target } from 'lucide-react';
import { useConversationFlow } from '@/hooks/useConversationFlow';
import { useLeadQualification } from '@/hooks/useLeadQualification';
import { useStructuredAssessment } from '@/hooks/useStructuredAssessment';
import InsightEngine from './InsightEngine';
import ConversationFlow from './ConversationFlow';
import ServiceRecommendations from '../lead-qualification/ServiceRecommendations';
import QuickSelectButtons from './QuickSelectButtons';
import AssessmentProgress from './AssessmentProgress';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  topicId?: string;
}

interface Insight {
  id: string;
  type: 'opportunity' | 'risk' | 'quick_win' | 'strategic';
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actionable: boolean;
}

interface AIAssessmentChatProps {
  onComplete?: (sessionData: any) => void;
}

const AIAssessmentChat: React.FC<AIAssessmentChatProps> = ({ onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const {
    assessmentState,
    getCurrentQuestion,
    answerQuestion,
    setSelectedOption,
    getProgressData,
    getAssessmentData,
    resetAssessment,
    totalQuestions
  } = useStructuredAssessment();

  const {
    qualificationData,
    leadScore,
    updateQualificationData,
    calculateLeadScore,
    saveLeadScore,
    setLeadScore
  } = useLeadQualification();

  // Initialize session and user
  useEffect(() => {
    initializeSession();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeSession = async () => {
    try {
      // Generate anonymous session ID
      const anonymousSessionId = crypto.randomUUID();
      setUserId(null); // No user authentication required
      
      // Create new anonymous conversation session
      const { data: session, error: sessionError } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: null, // Anonymous session
          session_title: 'AI Assessment Chat',
          status: 'active',
          business_context: {}
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        toast({
          title: "Setup Error",
          description: "Failed to initialize chat session. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setSessionId(session.id);

      // Send welcome message from AI with first structured question
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Hello! I'm your AI Literacy Advisor. I'll help you assess your AI readiness through a focused conversation.\n\nI'll ask you 15 specific questions across 3 key areas:\n• **Current State** - Your time management and AI experience\n• **Pain Points** - Challenges and bottlenecks you're facing\n• **Vision & Goals** - Your timeline, budget, and success metrics\n\nThis will take about 10-15 minutes and you'll get personalized insights and recommendations.\n\nLet's start with the first question:",
        timestamp: new Date()
      };

      // Add the first structured question
      const firstQuestion = getCurrentQuestion();
      if (firstQuestion) {
        const questionMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: firstQuestion.question,
          timestamp: new Date()
        };
        setMessages([welcomeMessage, questionMessage]);
      } else {
        setMessages([welcomeMessage]);
      }

    } catch (error) {
      console.error('Error initializing session:', error);
      toast({
        title: "Initialization Error",
        description: "Failed to set up the assessment. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || inputMessage.trim();
    if (!content || !sessionId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Record the structured answer
    answerQuestion(content);

    try {
      // Enhanced context for AI with structured assessment data
      const progressData = getProgressData();
      const assessmentData = getAssessmentData();
      const conversationContext = {
        currentQuestion: progressData.currentQuestion,
        totalQuestions: progressData.totalQuestions,
        phase: progressData.phase,
        completedAnswers: progressData.completedAnswers,
        assessmentData: assessmentData,
        isComplete: assessmentState.isComplete
      };

      const { data, error } = await supabase.functions.invoke('ai-assessment-chat', {
        body: {
          message: content,
          sessionId: sessionId,
          userId: null, // Anonymous session
          context: conversationContext
        }
      });

      if (error) {
        throw error;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Extract and process insights
      await processInsights(content, data.response);

      // Update lead qualification based on conversation
      await updateLeadQualification(content, data.response);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Communication Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeadQualification = async (userInput: string, aiResponse: string) => {
    // Extract qualification indicators from conversation
    const qualificationUpdates: any = {};

    // Analyze user input for qualification signals
    const input = userInput.toLowerCase();
    const response = aiResponse.toLowerCase();

    // Budget signals
    if (input.includes('budget') || input.includes('investment') || input.includes('cost')) {
      if (input.includes('million') || input.includes('large budget')) {
        qualificationUpdates.budgetRange = 'enterprise_100k+';
      } else if (input.includes('thousand') || input.includes('50k') || input.includes('100k')) {
        qualificationUpdates.budgetRange = 'medium_25k-100k';
      }
    }

    // Authority signals
    if (input.includes('ceo') || input.includes('founder') || input.includes('president')) {
      qualificationUpdates.decisionAuthority = 'full';
    } else if (input.includes('manager') || input.includes('director') || input.includes('vp')) {
      qualificationUpdates.decisionAuthority = 'shared';
    }

    // Timeline signals
    if (input.includes('immediately') || input.includes('urgent') || input.includes('asap')) {
      qualificationUpdates.timelineUrgency = 'immediate';
    } else if (input.includes('this quarter') || input.includes('3 months')) {
      qualificationUpdates.timelineUrgency = 'within_3_months';
    } else if (input.includes('this year') || input.includes('6 months')) {
      qualificationUpdates.timelineUrgency = 'within_6_months';
    }

    // Organization size signals
    if (input.includes('startup') || input.includes('small company')) {
      qualificationUpdates.organizationSize = 'startup';
    } else if (input.includes('enterprise') || input.includes('large company')) {
      qualificationUpdates.organizationSize = 'enterprise';
    }

    // AI maturity signals
    if (input.includes('new to ai') || input.includes('beginner')) {
      qualificationUpdates.aiMaturityLevel = 'beginner';
    } else if (input.includes('experienced with ai') || input.includes('using ai')) {
      qualificationUpdates.aiMaturityLevel = 'intermediate';
    }

    // Pain points
    const painPoints = [];
    if (input.includes('efficiency') || input.includes('productivity')) painPoints.push('productivity');
    if (input.includes('decision') || input.includes('data')) painPoints.push('decision-making');
    if (input.includes('communication') || input.includes('collaboration')) painPoints.push('communication');
    if (input.includes('time') || input.includes('manual')) painPoints.push('manual-processes');

    if (painPoints.length > 0) {
      qualificationUpdates.primaryPainPoints = [...(qualificationData.primaryPainPoints || []), ...painPoints];
    }

    // Update qualification data
    if (Object.keys(qualificationUpdates).length > 0) {
      updateQualificationData(qualificationUpdates);
    }

    // Calculate lead score if we have enough data
    const sessionDuration = (Date.now() - (messages[0]?.timestamp.getTime() || Date.now())) / 1000;
    const progressData = getProgressData();
    const engagementData = {
      sessionDuration,
      messageCount: messages.length,
      topicsExplored: progressData.completedAnswers
    };

    const newLeadScore = calculateLeadScore({ ...qualificationData, ...qualificationUpdates }, engagementData);
    setLeadScore(newLeadScore);

    // Save to database if session exists and score is meaningful
    if (sessionId && newLeadScore.overall > 10) {
      await saveLeadScore(sessionId, newLeadScore);
    }
  };

  const processInsights = async (userInput: string, aiResponse: string) => {
    // Enhanced insight extraction logic
    const extractedInsights = extractInsightsFromResponse(aiResponse);
    
    if (extractedInsights.length > 0) {
      setInsights(prev => {
        const newInsights = extractedInsights.filter(
          newInsight => !prev.some(existing => existing.content === newInsight.content)
        );
        return [...prev, ...newInsights];
      });
    }
  };

  const extractInsightsFromResponse = (response: string): Insight[] => {
    const insights: Insight[] = [];
    
    // Pattern matching for different types of insights
    const quickWinPatterns = [
      /you could immediately|quick win|start by|right away|this week/i,
      /simple step|easy to implement|low-hanging fruit/i
    ];
    
    const opportunityPatterns = [
      /opportunity|potential|could help|might consider|strategic advantage/i,
      /significant impact|game-changer|transformation/i
    ];
    
    const riskPatterns = [
      /risk|concern|challenge|problem|warning|careful about/i,
      /potential issue|gap|weakness|vulnerability/i
    ];

    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.length < 30) return;

      let type: Insight['type'] = 'strategic';
      let priority: Insight['priority'] = 'medium';

      if (quickWinPatterns.some(pattern => pattern.test(trimmed))) {
        type = 'quick_win';
        priority = 'high';
      } else if (opportunityPatterns.some(pattern => pattern.test(trimmed))) {
        type = 'opportunity';
        priority = 'medium';
      } else if (riskPatterns.some(pattern => pattern.test(trimmed))) {
        type = 'risk';
        priority = 'high';
      }

      insights.push({
        id: `insight-${Date.now()}-${index}`,
        type,
        title: generateInsightTitle(trimmed, type),
        content: trimmed,
        priority,
        category: assessmentState.phase || 'general',
        actionable: type === 'quick_win' || trimmed.includes('implement') || trimmed.includes('start')
      });
    });

    return insights.slice(0, 3); // Limit to 3 insights per response
  };

  const generateInsightTitle = (content: string, type: Insight['type']): string => {
    const titlePrefixes = {
      quick_win: 'Quick Win',
      opportunity: 'Opportunity',
      risk: 'Risk Area',
      strategic: 'Strategic Insight'
    };

    const firstWords = content.split(' ').slice(0, 6).join(' ');
    return `${titlePrefixes[type]}: ${firstWords}...`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickSelect = (option: string) => {
    setSelectedOption(option);
    sendMessage(option);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const startNewAssessment = () => {
    setMessages([]);
    setInsights([]);
    setSessionId(null);
    resetAssessment();
    initializeSession();
  };

  const progressData = getProgressData();
  const currentQuestion = getCurrentQuestion();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              AI Assessment Chat
            </h1>
            <p className="text-xl text-muted-foreground">
              Your personal AI literacy advisor for strategic business guidance
            </p>
          </div>

          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Insights
                {insights.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {insights.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Services
                {leadScore && leadScore.recommendations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {leadScore.recommendations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Progress
              </TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
              <div className="lg:col-span-3">
                <TabsContent value="chat" className="mt-0">
                  <Card className="h-[700px] flex flex-col">
                    <CardHeader className="flex-shrink-0">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          AI Assessment Conversation
                          <Badge variant="outline" className="ml-2">
                            {progressData.phase} - Q{progressData.currentQuestion}/{progressData.totalQuestions}
                          </Badge>
                        </span>
                        <Button variant="outline" size="sm" onClick={startNewAssessment}>
                          New Assessment
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-[85%] p-4 rounded-lg ${
                                  message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                <p className="text-xs opacity-70 mt-2">
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex justify-start">
                              <div className="bg-muted text-muted-foreground p-4 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="animate-pulse h-4 w-4" />
                                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                                  Analyzing and generating insights...
                                </div>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                      
                      {/* Quick Select Buttons for current question */}
                      {currentQuestion && currentQuestion.type === 'multiple_choice' && !isLoading && (
                        <div className="mt-4">
                          <QuickSelectButtons
                            options={currentQuestion.options}
                            onSelect={handleQuickSelect}
                            disabled={isLoading}
                            selectedOption={assessmentState.selectedOption || undefined}
                          />
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-4">
                        <Input
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type your message or use quick select above..."
                          disabled={isLoading || !sessionId}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => sendMessage()}
                          disabled={isLoading || !inputMessage.trim() || !sessionId}
                          className="px-4"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights" className="mt-0">
                  <InsightEngine 
                    insights={insights} 
                    progress={{
                      overallScore: progressData.progressPercentage,
                      topicScores: {},
                      completedTopics: progressData.completedAnswers,
                      totalTopics: progressData.totalQuestions,
                      engagementLevel: messages.length > 10 ? 'high' : messages.length > 5 ? 'medium' : 'low'
                    }}
                  />
                </TabsContent>

                <TabsContent value="services" className="mt-0">
                  {leadScore && leadScore.recommendations.length > 0 ? (
                    <ServiceRecommendations
                      recommendations={leadScore.recommendations}
                      leadScore={leadScore}
                      sessionId={sessionId || ''}
                      userId={userId} // Pass null for anonymous users
                    />
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-2">
                          Service Recommendations Coming Soon
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Continue our conversation to receive personalized service recommendations based on your needs and AI readiness.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="progress" className="mt-0">
                  <AssessmentProgress
                    currentQuestion={progressData.currentQuestion}
                    totalQuestions={progressData.totalQuestions}
                    phase={progressData.phase}
                    completedAnswers={progressData.completedAnswers}
                    estimatedTimeRemaining={progressData.estimatedTimeRemaining}
                  />
                </TabsContent>
              </div>

              {/* Sidebar for all tabs */}
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <AssessmentProgress
                    currentQuestion={progressData.currentQuestion}
                    totalQuestions={progressData.totalQuestions}
                    phase={progressData.phase}
                    completedAnswers={progressData.completedAnswers}
                    estimatedTimeRemaining={progressData.estimatedTimeRemaining}
                  />
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AIAssessmentChat;