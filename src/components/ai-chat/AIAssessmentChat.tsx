import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';

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
import ExecutiveAssessmentReport from './ExecutiveAssessmentReport';
import { useExecutiveInsights } from '@/hooks/useExecutiveInsights';
import ConversationFlow from './ConversationFlow';
import ServiceRecommendations from '../lead-qualification/ServiceRecommendations';
import QuickSelectButtons from './QuickSelectButtons';
import AssessmentProgress from './AssessmentProgress';
import LLMInsightEngine from './LLMInsightEngine';
import ExecutiveLoadingScreen from './ExecutiveLoadingScreen';

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
  const [clickingButton, setClickingButton] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightProgress, setInsightProgress] = useState(0);
  const [insightPhase, setInsightPhase] = useState<'analyzing' | 'generating' | 'finalizing'>('analyzing');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  const {
    insights: executiveInsights,
    assessmentData: executiveAssessmentData,
    generateExecutiveInsights
  } = useExecutiveInsights();

  // Initialize session and user
  useEffect(() => {
    initializeSession();
  }, []);

  // Handle insight generation when assessment completes
  useEffect(() => {
    if (assessmentState.isComplete && !isGeneratingInsights) {
      startInsightGeneration();
    }
  }, [assessmentState.isComplete]);

  const startInsightGeneration = async () => {
    setIsGeneratingInsights(true);
    setInsightPhase('analyzing');
    setInsightProgress(10);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setInsightProgress(prev => {
        if (prev < 90) return prev + 10;
        return prev;
      });
    }, 500);

    setTimeout(() => {
      setInsightPhase('generating');
      setInsightProgress(50);
    }, 2000);

    setTimeout(() => {
      setInsightPhase('finalizing');
      setInsightProgress(80);
    }, 4000);

    setTimeout(() => {
      setInsightProgress(100);
      clearInterval(progressInterval);
      setIsGeneratingInsights(false);
    }, 6000);
  };

  // Define helper functions first before useCallback dependencies
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
          session_title: 'AI Leadership Assessment',
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
        content: "Hello! I'm your Personal AI Leadership Development Advisor. I'll help you assess and enhance your readiness to lead in the AI era.\n\nI'll ask you 15 focused questions across 3 key areas:\n• **Current AI Relationship** - Your personal AI adoption and comfort level\n• **Leadership Challenges** - Communication, decision-making, and efficiency gaps\n• **Development Goals** - Skills you want to build and outcomes you seek\n\nThis will take about 10-15 minutes and you'll get personalized insights to help you become a more AI-forward leader.\n\nLet's start with the first question:",
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

  const sendMessage = useCallback(async (messageContent?: string) => {
    const content = messageContent || inputMessage.trim();
    if (!content || !sessionId || isLoading) return;

    console.log('=== SEND MESSAGE START ===', { content, isLoading });

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    // Immediately update state
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

      // Add AI response and FORCE immediate button enabling
      setMessages(prev => [...prev, aiMessage]);
      
      // Force synchronous DOM update to make buttons clickable immediately
      flushSync(() => {
        setIsLoading(false);
        setClickingButton(null);
      });
      
      console.log('=== BUTTONS FORCE ENABLED ===', { isLoading: false });
      
      // Clear emergency timeout
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
        emergencyTimeoutRef.current = null;
      }
      
      // Process insights and lead qualification in background without blocking UI
      requestIdleCallback(() => {
        processInsights(content, data.response).catch(console.error);
        updateLeadQualification(content, data.response).catch(console.error);
        
        // Generate executive insights if assessment is complete or has enough data
        if (assessmentState.isComplete || progressData.completedAnswers >= 10) {
          generateExecutiveInsights(
            conversationContext,
            assessmentData,
            qualificationData.organizationSize,
            'technology', // Default industry
            'executive' // Default role
          );
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Communication Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      flushSync(() => {
        setIsLoading(false);
        setClickingButton(null);
      });
    }
  }, [inputMessage, sessionId, isLoading, answerQuestion, getProgressData, getAssessmentData, assessmentState.isComplete, toast, processInsights, updateLeadQualification]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleQuickSelect = useCallback((option: string) => {
    if (isLoading) return; // Prevent double-clicks
    
    // Immediate visual feedback
    setClickingButton(option);
    setSelectedOption(option);
    
    // Clear any existing timeout
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
    }
    
    // Emergency timeout reduced to 300ms for better UX
    emergencyTimeoutRef.current = setTimeout(() => {
      flushSync(() => {
        setIsLoading(false);
        setClickingButton(null);
      });
    }, 300);
    
    sendMessage(option);
  }, [setSelectedOption, sendMessage, isLoading]);

  const handleSuggestedQuestion = useCallback((question: string) => {
    sendMessage(question);
  }, [sendMessage]);

  const startNewAssessment = () => {
    setMessages([]);
    setInsights([]);
    setSessionId(null);
    setIsGeneratingInsights(false);
    setInsightProgress(0);
    resetAssessment();
    initializeSession();
  };

  const progressData = useMemo(() => getProgressData(), [getProgressData]);
  const currentQuestion = useMemo(() => getCurrentQuestion(), [getCurrentQuestion]);
  
  // Memoized current question to prevent unnecessary re-renders
  const currentQuestionMessage = useMemo(() => currentQuestion ? {
    id: 'current-question',
    role: 'assistant' as const,
    content: currentQuestion.question,
    timestamp: new Date()
  } : null, [currentQuestion]);
  
  // Memoized previous messages for performance
  const previousMessages = useMemo(() => {
    return messages.slice(0, -1).reverse(); // Show in reverse order (most recent first)
  }, [messages]);

  // Show loading screen during insight generation
  if (isGeneratingInsights) {
    return (
      <ExecutiveLoadingScreen 
        progress={insightProgress} 
        phase={insightPhase} 
      />
    );
  }

  // Show results when assessment is complete and insights are generated
  if (assessmentState.isComplete && !isGeneratingInsights) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="insights" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger 
                value="insights" 
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI Leadership Insights
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-2 opacity-60"
              >
                <MessageCircle className="h-4 w-4" />
                Q&A History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="space-y-6">
              {/* LLM Insight Engine - Primary Results */}
              <LLMInsightEngine
                conversationData={{
                  ...getProgressData(),
                  totalQuestions,
                  assessmentData: getAssessmentData(),
                  messages: messages
                }}
                assessmentData={getAssessmentData()}
                sessionId={sessionId}
                isComplete={assessmentState.isComplete}
              />

              {/* Action Button */}
              <Card className="text-center p-8">
                <CardContent>
                  <h3 className="text-2xl font-bold mb-4">Ready to Start Your AI Leadership Journey?</h3>
                  <p className="text-muted-foreground mb-6">
                    Take the next step in becoming an AI-forward leader with personalized coaching and implementation support.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button size="lg" onClick={startNewAssessment} variant="outline">
                      Retake Assessment
                    </Button>
                    <Button size="lg">
                      Book a Strategy Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Q&A History</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Review your responses (most recent first)
                  </p>
                </CardHeader>
                <CardContent>
                  {previousMessages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No conversation history available.
                    </p>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-4 pr-4">
                        {previousMessages.map((message) => (
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
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                              <p className="text-xs opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Assessment in progress
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Fixed Progress Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <AssessmentProgress
            currentQuestion={progressData.currentQuestion}
            totalQuestions={progressData.totalQuestions}
            phase={progressData.phase}
            completedAnswers={progressData.completedAnswers}
            estimatedTimeRemaining={Math.max(1, (totalQuestions - progressData.completedAnswers) * 1.5)}
          />
        </div>
      </div>

      {/* Assessment Interface */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Current Conversation */}
        <div className="space-y-6">
          {/* Current Question Card */}
          {currentQuestionMessage && (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Question {progressData.currentQuestion} of {progressData.totalQuestions}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed mb-6">{currentQuestionMessage.content}</p>
                
                {/* Quick Select Options */}
                {currentQuestion && (
                  <QuickSelectButtons
                    options={currentQuestion.options}
                    onSelect={handleQuickSelect}
                    isLoading={isLoading}
                    clickingButton={clickingButton}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent AI Response */}
          {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {messages[messages.length - 1].content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Response Input */}
          {!assessmentState.isComplete && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Or provide your own response:</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your response or use the quick options above..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => sendMessage()} 
                    disabled={isLoading || !inputMessage.trim()}
                    size="icon"
                    className="px-4"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssessmentChat;