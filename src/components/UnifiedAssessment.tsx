import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, User, ArrowRight, CheckCircle, Target, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useStructuredAssessment } from '@/hooks/useStructuredAssessment';
import ExecutiveLoadingScreen from './ai-chat/ExecutiveLoadingScreen';
import LLMInsightEngine from './ai-chat/LLMInsightEngine';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UnifiedAssessmentProps {
  onComplete?: (sessionData: any) => void;
}

export const UnifiedAssessment: React.FC<UnifiedAssessmentProps> = ({ onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightProgress, setInsightProgress] = useState(0);
  const [insightPhase, setInsightPhase] = useState<'analyzing' | 'generating' | 'finalizing'>('analyzing');
  const { toast } = useToast();
  
  const {
    assessmentState,
    getCurrentQuestion,
    answerQuestion,
    getProgressData,
    getAssessmentData,
    totalQuestions
  } = useStructuredAssessment();

  useEffect(() => {
    if (!isInitialized) {
      initializeAssessmentSession();
    }
  }, []);

  useEffect(() => {
    const progressData = getProgressData();
    const hasAnsweredAllQuestions = progressData.completedAnswers >= totalQuestions;
    
    if (assessmentState.isComplete && hasAnsweredAllQuestions && !isGeneratingInsights) {
      startInsightGeneration();
    }
  }, [assessmentState.isComplete, getProgressData, totalQuestions]);

  const initializeAssessmentSession = async () => {
    try {
      const anonymousSessionId = crypto.randomUUID();
      
      const { data: session, error: sessionError } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: null,
          session_title: 'AI Leadership Assessment',
          status: 'active',
          business_context: {}
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setSessionId(session.id);
      setIsInitialized(true);

      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Welcome to your AI Leadership Assessment. I'll guide you through ${totalQuestions} strategic questions designed to evaluate your AI leadership potential.\n\nThis assessment will help you:\n• **Identify your current AI leadership strengths**\n• **Discover key development opportunities**\n• **Create a personalized action plan**\n\nEach question builds on the previous one to create a comprehensive picture of your leadership profile. Let's begin with your first question.`,
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
      
    } catch (error) {
      console.error('Error initializing assessment session:', error);
      toast({
        title: "Session Error",
        description: "Failed to initialize assessment. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  const handleOptionSelect = async (option: string) => {
    if (!sessionId) return;

    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: option,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    answerQuestion(option);

    const progressData = getProgressData();
    const assessmentData = getAssessmentData();

    try {
      const { data, error } = await supabase.functions.invoke('ai-assessment-chat', {
        body: {
          message: `The executive answered: "${option}" to the question: "${currentQuestion.question}". 
          
          Context: This is question ${currentQuestion.id} of ${totalQuestions} in phase "${currentQuestion.phase}".
          Progress: ${progressData.completedAnswers}/${totalQuestions} questions completed.
          
          Provide a brief acknowledgment that shows understanding, then present the next question. Be professional and encouraging, like an executive coach.`,
          sessionId: sessionId,
          userId: null,
          context: {
            currentQuestion: progressData.currentQuestion,
            phase: progressData.phase,
            assessmentData: assessmentData,
            isComplete: assessmentState.isComplete
          }
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const nextQuestion = getCurrentQuestion();
      if (nextQuestion && !assessmentState.isComplete) {
        const nextQuestionMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `**Question ${nextQuestion.id} of ${totalQuestions}:** ${nextQuestion.question}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, nextQuestionMessage]);
      }
    }
  };

  const startInsightGeneration = async () => {
    setIsGeneratingInsights(true);
    setInsightPhase('analyzing');
    setInsightProgress(15);

    const progressInterval = setInterval(() => {
      setInsightProgress(prev => {
        if (prev < 40) return prev + 8;
        if (prev < 70) return prev + 5;
        if (prev < 90) return prev + 3;
        return prev;
      });
    }, 1200);

    setTimeout(() => {
      setInsightPhase('generating');
      setInsightProgress(45);
    }, 3500);

    setTimeout(() => {
      setInsightPhase('finalizing');
      setInsightProgress(80);
    }, 6000);

    setTimeout(() => {
      setInsightProgress(100);
      clearInterval(progressInterval);
      setIsGeneratingInsights(false);
    }, 8000);
  };


  if (isGeneratingInsights) {
    return (
      <ExecutiveLoadingScreen 
        progress={insightProgress} 
        phase={insightPhase} 
      />
    );
  }

  if (assessmentState.isComplete && !isGeneratingInsights) {
    const assessmentData = getAssessmentData();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Your AI Leadership Assessment Results
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Based on your responses, here are personalized insights to accelerate your AI leadership journey.
            </p>
          </div>

          <LLMInsightEngine
            conversationData={messages}
            assessmentData={assessmentData}
            sessionId={sessionId}
            isComplete={true}
          />

          <div className="mt-12 text-center">
            <div className="max-w-2xl mx-auto bg-card p-8 rounded-lg border shadow-sm">
              <h3 className="text-2xl font-semibold mb-4">Ready to Transform Your Leadership?</h3>
              <p className="text-muted-foreground mb-6">
                These insights are customized for your leadership profile. Let's discuss how to implement your development plan.
              </p>
              
              <p className="text-muted-foreground">
                Complete the assessment to access your personalized AI leadership development plan and recommendations.
              </p>
            </div>
          </div>
        </div>

      </div>
    );
  }

  const progressData = getProgressData();
  const currentQuestion = getCurrentQuestion();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/2819589c-814c-4ec7-9e78-0d2a80b89243.png" 
            alt="AI Mindmaker Logo" 
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            AI Leadership Assessment
          </h1>
          <p className="text-muted-foreground mb-6">
            Discover your leadership potential with AI-guided insights
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Section */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Assessment Progress</h2>
                <Badge variant="outline" className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Question {progressData.currentQuestion} of {totalQuestions}
                </Badge>
              </div>
              
              <Progress value={progressData.progressPercentage} className="h-3 mb-2" />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Phase: {progressData.phase}</span>
                <span>{Math.round(progressData.estimatedTimeRemaining)} min remaining</span>
              </div>
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <ScrollArea className="h-80 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.role === 'assistant' && (
                            <Brain className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          )}
                          {message.role === 'user' && (
                            <User className="h-4 w-4 text-primary-foreground mt-1 flex-shrink-0" />
                          )}
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Current Question */}
          {currentQuestion && (
            <Card>
              <CardContent className="pt-6">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Question {currentQuestion.id} of {totalQuestions}
                  </h3>
                  <p className="text-lg text-foreground mb-4">
                    {currentQuestion.question}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-muted-foreground mb-4">
                    Select your answer:
                  </h4>
                  {currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full p-4 h-auto text-left justify-start hover:bg-muted/50 transition-colors"
                      onClick={() => handleOptionSelect(option)}
                    >
                      <ArrowRight className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                      <span className="text-sm text-foreground">{option}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};