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
import { ContactCollectionForm, ContactData } from './ContactCollectionForm';
import AILiteracyReport from './AILiteracyReport';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UnifiedAssessmentProps {
  onComplete?: (sessionData: any) => void;
  onBack?: () => void;
}

export const UnifiedAssessment: React.FC<UnifiedAssessmentProps> = ({ onComplete, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightProgress, setInsightProgress] = useState(0);
  const [insightPhase, setInsightPhase] = useState<'analyzing' | 'generating' | 'finalizing'>('analyzing');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [showResults, setShowResults] = useState(false);
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
    
    if (assessmentState.isComplete && hasAnsweredAllQuestions && !showContactForm && !contactData && !isGeneratingInsights && insightProgress === 0) {
      setShowContactForm(true);
    }
  }, [assessmentState.isComplete, getProgressData, totalQuestions, showContactForm, contactData, isGeneratingInsights, insightProgress]);

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
      setShowResults(true);
    }, 8000);
  };

  const handleContactSubmit = (data: ContactData) => {
    setContactData(data);
    setShowContactForm(false);
    startInsightGeneration();
  };


  // Show contact form after assessment completion
  if (showContactForm) {
    return (
      <ContactCollectionForm
        onSubmit={handleContactSubmit}
        onBack={onBack}
      />
    );
  }

  if (isGeneratingInsights) {
    return (
      <ExecutiveLoadingScreen 
        progress={insightProgress} 
        phase={insightPhase} 
      />
    );
  }

  // Show personalized results with contact data
  if (showResults && contactData) {
    const assessmentData = getAssessmentData();
    
    return (
      <AILiteracyReport
        assessmentData={assessmentData}
        sessionId={sessionId}
        contactData={contactData}
        onBack={onBack}
      />
    );
  }

  const progressData = getProgressData();
  const currentQuestion = getCurrentQuestion();

  return (
    <div className="bg-background min-h-screen relative overflow-hidden">
        {/* Back Button - Mobile Optimized */}
        {onBack && (
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
            <Button
              variant="outline"
              onClick={onBack}
              className="rounded-xl"
              aria-label="Go back to home page"
            >
              ← Back to Selection
            </Button>
          </div>
        )}

      <div className="safe-area-padding relative z-10 py-6 sm:py-8">
        {/* Header - Clean Mobile Design */}
        <div className="text-center mb-8 sm:mb-12 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
            <Brain className="h-4 w-4" />
            AI Leadership Assessment
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight leading-tight">
            Discover Your Leadership 
            <span className="block text-primary">Potential</span>
          </h1>
          
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            Get AI-guided insights to unlock your strategic thinking and leadership capabilities
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Section - Clean Design */}
          <Card className="mb-8 sm:mb-12 shadow-sm border rounded-xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Assessment Progress</h2>
                <Badge variant="outline" className="flex items-center gap-2 bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-sm">{progressData.currentQuestion} of {totalQuestions}</span>
                </Badge>
              </div>
              
              <Progress value={progressData.progressPercentage} className="h-3 mb-3" />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Phase: {progressData.phase}</span>
                <span>{Math.round(progressData.estimatedTimeRemaining)} min remaining</span>
              </div>
            </CardContent>
          </Card>


          {/* Current Question - Clean Design */}
          {currentQuestion && (
            <Card className="shadow-sm border rounded-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 leading-tight">
                    Question {currentQuestion.id} of {totalQuestions}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 leading-relaxed">
                    {currentQuestion.question}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground mb-4 text-sm">
                    Select your answer:
                  </h4>
                  {currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full h-auto text-left justify-start hover:bg-primary/10 transition-colors rounded-xl p-4"
                      onClick={() => handleOptionSelect(option)}
                      aria-label={`Select option: ${option}`}
                    >
                      <ArrowRight className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                      <span className="text-sm text-foreground leading-relaxed text-left">{option}</span>
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