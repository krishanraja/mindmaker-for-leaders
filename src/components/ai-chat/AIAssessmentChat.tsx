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
import InsightEngine from './InsightEngine';
import ConversationFlow from './ConversationFlow';
import ServiceRecommendations from '../lead-qualification/ServiceRecommendations';

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
    topics,
    conversationState,
    updateTopicProgress,
    setCurrentTopic,
    getNextTopic,
    getSuggestedQuestions,
    updateAssessmentData
  } = useConversationFlow();

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
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue with the assessment.",
          variant: "destructive",
        });
        return;
      }

      setUserId(user.id);

      // Create new conversation session
      const { data: session, error: sessionError } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: user.id,
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

      // Send welcome message from AI
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Hello! I'm your AI Literacy Advisor. I'm here to help you assess your organization's AI readiness and identify strategic opportunities.\n\nI'll guide you through 5 key areas that are crucial for AI success:\n\n🕒 **Time & Productivity** - How you manage your time and efficiency\n🧠 **AI Experience** - Your current AI adoption and team readiness\n👥 **Communication** - Stakeholder management and information flow\n📚 **Learning & Development** - Investment in AI skills and knowledge\n🎯 **Strategic Decision Making** - Your decision-making processes and data usage\n\nWe can explore these areas in any order you prefer. What would you like to start with, or do you have a specific challenge you'd like to discuss?",
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);

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
    if (!content || !sessionId || !userId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      topicId: conversationState.currentTopic || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Enhanced context for AI
      const conversationContext = {
        currentTopic: conversationState.currentTopic,
        completedTopics: conversationState.completedTopics,
        overallProgress: conversationState.overallProgress,
        assessmentData: conversationState.assessmentData,
        topicInsights: topics.reduce((acc, topic) => {
          acc[topic.id] = topic.insights;
          return acc;
        }, {} as Record<string, string[]>)
      };

      const { data, error } = await supabase.functions.invoke('ai-assessment-chat', {
        body: {
          message: content,
          sessionId: sessionId,
          userId: userId,
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
    const engagementData = {
      sessionDuration,
      messageCount: messages.length,
      topicsExplored: conversationState.completedTopics.length
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

    // Update topic progress if we're in a specific topic
    if (conversationState.currentTopic) {
      const topicInsights = extractedInsights.filter(insight => 
        insight.category === conversationState.currentTopic
      );
      
      if (topicInsights.length > 0) {
        updateTopicProgress(
          conversationState.currentTopic, 
          topicInsights.map(i => i.content)
        );
      }
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
        category: conversationState.currentTopic || 'general',
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

  const handleTopicSelect = (topicId: string) => {
    setCurrentTopic(topicId);
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      const message = `I'd like to explore ${topic.name}. ${topic.description}.`;
      sendMessage(message);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const startNewAssessment = () => {
    setMessages([]);
    setInsights([]);
    setSessionId(null);
    initializeSession();
  };

  const currentTopicSuggestions = getSuggestedQuestions(conversationState.currentTopic || undefined);

  const assessmentProgress = {
    overallScore: Math.round(conversationState.overallProgress),
    topicScores: topics.reduce((acc, topic) => {
      acc[topic.id] = topic.completed ? 100 : 0;
      return acc;
    }, {} as Record<string, number>),
    completedTopics: conversationState.completedTopics.length,
    totalTopics: topics.length,
    engagementLevel: (messages.length > 10 ? 'high' : messages.length > 5 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
  };

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
                          {conversationState.currentTopic && (
                            <Badge variant="outline" className="ml-2">
                              {topics.find(t => t.id === conversationState.currentTopic)?.name}
                            </Badge>
                          )}
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
                      
                      <div className="flex gap-2 mt-4">
                        <Input
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type your message..."
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
                    progress={assessmentProgress}
                  />
                </TabsContent>

                <TabsContent value="services" className="mt-0">
                  {leadScore && leadScore.recommendations.length > 0 ? (
                    <ServiceRecommendations
                      recommendations={leadScore.recommendations}
                      leadScore={leadScore}
                      sessionId={sessionId || ''}
                      userId={userId || ''}
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
                  <ConversationFlow
                    topics={topics}
                    currentTopic={conversationState.currentTopic}
                    overallProgress={conversationState.overallProgress}
                    onTopicSelect={handleTopicSelect}
                    onSuggestedQuestion={handleSuggestedQuestion}
                    suggestedQuestions={currentTopicSuggestions}
                  />
                </TabsContent>
              </div>

              {/* Sidebar for all tabs */}
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <ConversationFlow
                    topics={topics}
                    currentTopic={conversationState.currentTopic}
                    overallProgress={conversationState.overallProgress}
                    onTopicSelect={handleTopicSelect}
                    onSuggestedQuestion={handleSuggestedQuestion}
                    suggestedQuestions={currentTopicSuggestions}
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