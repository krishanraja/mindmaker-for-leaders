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
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
        {/* Floating Glass Back Button - Mobile App Optimized */}
        {onBack && (
          <div className="absolute top-safe-5 left-5 sm:top-6 sm:left-6 z-20">
            <Button
              variant="glass"
              onClick={onBack}
              className="glass-button text-white hover:bg-white/20 mobile-button rounded-xl"
              aria-label="Go back to home page"
            >
              ← Back to Selection
            </Button>
          </div>
        )}

      <div className="safe-area-padding relative z-10 py-6 sm:py-8">
        {/* Header - Mobile App Optimized */}
        <div className="text-center mobile-section">
          <h1 className="text-mobile-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4 leading-tight">
            AI Leadership Assessment
          </h1>
          <p className="text-mobile-sm sm:text-base text-white/80 leading-relaxed max-w-md mx-auto">
            Discover your leadership potential with AI-guided insights
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Section - Mobile App Optimized */}
          <Card className="glass-card-dark border-white/20 mobile-section rounded-xl">
            <CardContent className="touch-padding">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-mobile-lg font-semibold text-white">Assessment Progress</h2>
                <Badge variant="outline" className="flex items-center gap-2 bg-white/10 text-white border-white/20 px-3 py-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-mobile-xs">{progressData.currentQuestion} of {totalQuestions}</span>
                </Badge>
              </div>
              
              <Progress value={progressData.progressPercentage} className="h-3 mb-3" />
              
              <div className="flex justify-between text-mobile-xs text-white/70">
                <span>Phase: {progressData.phase}</span>
                <span>{Math.round(progressData.estimatedTimeRemaining)} min remaining</span>
              </div>
            </CardContent>
          </Card>


          {/* Current Question - Mobile App Optimized */}
          {currentQuestion && (
            <Card className="glass-card-dark border-white/20 rounded-xl">
              <CardContent className="touch-padding">
                <div className="mobile-content">
                  <h3 className="text-mobile-lg sm:text-xl font-semibold text-white mb-3 leading-tight">
                    Question {currentQuestion.id} of {totalQuestions}
                  </h3>
                  <p className="text-mobile-base sm:text-lg text-white mb-4 leading-relaxed">
                    {currentQuestion.question}
                  </p>
                </div>
                
                <div className="touch-spacing">
                  <h4 className="font-medium text-white/70 mb-4 text-mobile-sm">
                    Select your answer:
                  </h4>
                  {currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full mobile-button h-auto text-left justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 transition-colors rounded-xl"
                      onClick={() => handleOptionSelect(option)}
                      aria-label={`Select option: ${option}`}
                    >
                      <ArrowRight className="h-4 w-4 mr-3 flex-shrink-0 text-purple-200" />
                      <span className="text-mobile-sm text-white leading-relaxed text-left">{option}</span>
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