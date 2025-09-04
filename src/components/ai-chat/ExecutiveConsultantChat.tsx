import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle, Brain, User, ArrowRight } from 'lucide-react';
import { useStructuredAssessment } from '@/hooks/useStructuredAssessment';
import { useToast } from '@/components/ui/use-toast';
import ExecutiveLoadingScreen from './ExecutiveLoadingScreen';
import LLMInsightEngine from './LLMInsightEngine';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExecutiveConsultantChatProps {
  onComplete?: (sessionData: any) => void;
}

const ExecutiveConsultantChat: React.FC<ExecutiveConsultantChatProps> = ({ onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightProgress, setInsightProgress] = useState(0);
  const [insightPhase, setInsightPhase] = useState<'analyzing' | 'generating' | 'finalizing'>('analyzing');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const {
    assessmentState,
    getCurrentQuestion,
    answerQuestion,
    setSelectedOption,
    getProgressData,
    getAssessmentData,
    totalQuestions
  } = useStructuredAssessment();

  // Initialize consultant session
  React.useEffect(() => {
    if (!isInitialized) {
      initializeConsultantSession();
    }
  }, []);

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle assessment completion and insight generation
  React.useEffect(() => {
    const progressData = getProgressData();
    const hasAnsweredAllQuestions = progressData.completedAnswers >= totalQuestions;
    
    if (assessmentState.isComplete && hasAnsweredAllQuestions && !isGeneratingInsights) {
      startInsightGeneration();
    }
  }, [assessmentState.isComplete, getProgressData, totalQuestions]);

  const initializeConsultantSession = async () => {
    try {
      const anonymousSessionId = crypto.randomUUID();
      
      const { data: session, error: sessionError } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: null,
          session_title: 'Executive AI Consultation',
          status: 'active',
          business_context: {}
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setSessionId(session.id);
      setIsInitialized(true);

      // Start with executive welcome and first question
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Welcome to your Executive AI Readiness Consultation. I'm here to help you assess and develop your personal AI leadership capabilities.\n\nThis focused assessment will help you:\n• **Identify your AI leadership strengths** and development opportunities\n• **Create a personalized development plan** for AI-forward leadership\n• **Build confidence** in navigating AI transformation\n\nI'll ask you 15 strategic questions that take about 10-12 minutes. Each question builds on the previous one to create a complete picture of your AI leadership profile.\n\nLet's begin:`,
        timestamp: new Date()
      };

      const firstQuestion = getCurrentQuestion();
      if (firstQuestion) {
        const questionMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `**Question 1 of ${totalQuestions}:** ${firstQuestion.question}`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage, questionMessage]);
      }

    } catch (error) {
      console.error('Error initializing consultant session:', error);
      toast({
        title: "Session Error",
        description: "Failed to initialize consultation. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  const handleOptionSelect = async (option: string) => {
    if (!sessionId) return;

    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    // Record user's answer
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: option,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    answerQuestion(option);

    // Generate contextual AI response and next question
    const progressData = getProgressData();
    const assessmentData = getAssessmentData();

    try {
      const { data, error } = await supabase.functions.invoke('ai-assessment-chat', {
        body: {
          message: `The executive answered: "${option}" to the question: "${currentQuestion.question}". 
          
          Context: This is question ${currentQuestion.id} of ${totalQuestions} in phase "${currentQuestion.phase}".
          Progress: ${progressData.completedAnswers}/${totalQuestions} questions completed.
          
          Provide a brief, executive-level acknowledgment of their answer that shows understanding and builds rapport, then present the next question. Be professional but personable, like a skilled executive coach.
          
          Format: Brief insight on their answer + "Here's our next question:" + Question text with options.`,
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
      
      // Fallback to next question directly
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

    // Realistic progress with executive messaging
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

  // Show insights after completion
  if (assessmentState.isComplete && !isGeneratingInsights) {
    const assessmentData = getAssessmentData();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Your AI Leadership Development Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Based on your consultation, here are personalized insights to accelerate your AI leadership journey.
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
              <h3 className="text-2xl font-semibold mb-4">Ready to Accelerate Your AI Leadership?</h3>
              <p className="text-muted-foreground mb-6">
                These insights are just the beginning. Let's discuss how to implement your personalized AI leadership development plan.
              </p>
              
              <p className="text-muted-foreground">
                Complete the consultation to access your personalized recommendations and next steps.
              </p>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // Main consultation interface
  const progressData = getProgressData();
  const currentQuestion = getCurrentQuestion();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-4xl mx-auto p-4">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Executive AI Consultation</h1>
            <Badge variant="outline">
              Question {progressData.currentQuestion} of {totalQuestions}
            </Badge>
          </div>
          
          <Progress value={progressData.progressPercentage} className="h-2" />
          
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Phase: {progressData.phase}</span>
            <span>{Math.round(progressData.estimatedTimeRemaining)} min remaining</span>
          </div>
        </div>

        {/* Conversation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Leadership Consultation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
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
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Answer Options */}
        {currentQuestion && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium text-foreground mb-4">Select your answer:</h3>
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full p-4 h-auto text-left justify-start"
                    onClick={() => handleOptionSelect(option)}
                  >
                    <ArrowRight className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span className="text-sm">{option}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExecutiveConsultantChat;