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
import { DeepProfileQuestionnaire, DeepProfileData } from './DeepProfileQuestionnaire';
import { UnifiedResults } from './UnifiedResults';
import AILeadershipBenchmark from './AILeadershipBenchmark';


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
  const [showDeepProfileOptIn, setShowDeepProfileOptIn] = useState(false);
  const [showDeepProfileQuestionnaire, setShowDeepProfileQuestionnaire] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [promptLibrary, setPromptLibrary] = useState<any>(null);
  const [isGeneratingLibrary, setIsGeneratingLibrary] = useState(false);
  const [libraryProgress, setLibraryProgress] = useState(0);
  const [libraryPhase, setLibraryPhase] = useState<'analyzing' | 'generating' | 'finalizing'>('analyzing');
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
          session_title: 'AI Leadership Growth Benchmark',
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
        content: `Welcome to your AI Leadership Growth Benchmark. I'll guide you through ${totalQuestions} strategic questions designed to evaluate how your AI literacy drives growth—not just buzzwords.\n\nThis benchmark will help you:\n• **Assess your AI leadership capability**\n• **Identify growth acceleration opportunities**\n• **Benchmark against other executives**\n• **Create a strategic roadmap**\n\nEach question evaluates a different dimension of AI leadership. Let's begin your benchmark.`,
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
    setShowDeepProfileOptIn(true);
  };

  const handleSkipDeepProfile = () => {
    setShowDeepProfileOptIn(false);
    startInsightGeneration();
  };

  const handleStartDeepProfile = () => {
    setShowDeepProfileOptIn(false);
    setShowDeepProfileQuestionnaire(true);
  };

  const handleDeepProfileComplete = async (profileData: DeepProfileData) => {
    setShowDeepProfileQuestionnaire(false);
    setIsGeneratingLibrary(true);
    setLibraryPhase('analyzing');
    setLibraryProgress(10);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setLibraryProgress(prev => {
        if (prev < 35) return prev + 5;
        if (prev < 65) return prev + 3;
        if (prev < 85) return prev + 2;
        return prev;
      });
    }, 800);

    // Update phases
    setTimeout(() => {
      setLibraryPhase('generating');
      setLibraryProgress(40);
    }, 2500);

    setTimeout(() => {
      setLibraryPhase('finalizing');
      setLibraryProgress(70);
    }, 5000);

    try {
      const assessmentData = getAssessmentData();
      
      const { data, error } = await supabase.functions.invoke('generate-prompt-library', {
        body: {
          sessionId: sessionId,
          userId: null,
          contactData: contactData,
          assessmentData: assessmentData,
          profileData: profileData
        }
      });

      if (error) throw error;

      clearInterval(progressInterval);
      setLibraryProgress(100);
      
      // Wait for animation to complete
      setTimeout(() => {
        setPromptLibrary(data.library);
        setIsGeneratingLibrary(false);
        setShowPromptLibrary(true);
      }, 500);
      
      toast({
        title: "AI Command Center Ready!",
        description: "Your personalized prompt library has been generated",
      });
    } catch (error) {
      console.error('Error generating prompt library:', error);
      clearInterval(progressInterval);
      setIsGeneratingLibrary(false);
      toast({
        title: "Generation Error",
        description: "Failed to generate prompt library. Showing assessment results instead.",
        variant: "destructive",
      });
      startInsightGeneration();
    }
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

  // Show deep profile opt-in
  if (showDeepProfileOptIn && contactData) {
    return (
      <div className="bg-background min-h-screen relative overflow-hidden flex items-center justify-center px-4">
        <Card className="max-w-3xl w-full shadow-lg border rounded-xl">
          <CardContent className="p-8 sm:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full text-base font-semibold mb-6">
                <Brain className="h-5 w-5" />
                Unlock $5,000 Value
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                Get Your Personal<br />AI Command Center
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                10 more questions = Custom AI toolkit designed for <span className="text-foreground font-semibold">YOUR</span> thinking style, 
                <span className="text-foreground font-semibold"> YOUR</span> bottlenecks, and <span className="text-foreground font-semibold">YOUR</span> workflow.
              </p>
            </div>

            {/* Value Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl text-center">
                <div className="text-4xl mb-2">🎯</div>
                <div className="font-bold text-foreground mb-1">5 Custom Projects</div>
                <div className="text-sm text-muted-foreground">Tailored to your role</div>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl text-center">
                <div className="text-4xl mb-2">⚡</div>
                <div className="font-bold text-foreground mb-1">5-10 Hours/Week</div>
                <div className="text-sm text-muted-foreground">Time you'll save</div>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl text-center">
                <div className="text-4xl mb-2">🚀</div>
                <div className="font-bold text-foreground mb-1">Ready in 1 Day</div>
                <div className="text-sm text-muted-foreground">Start using immediately</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button 
                variant="cta" 
                size="lg"
                className="w-full rounded-xl text-lg py-6"
                onClick={handleStartDeepProfile}
              >
                Yes, Build My AI Toolkit
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <button 
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleSkipDeepProfile}
              >
                Skip - I'll see generic results instead
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              ⏱️ 10 minutes · 💎 Highly personalized · 🎁 $5,000 value
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show deep profile questionnaire
  if (showDeepProfileQuestionnaire) {
    return (
      <DeepProfileQuestionnaire
        onComplete={handleDeepProfileComplete}
        onBack={() => {
          setShowDeepProfileQuestionnaire(false);
          setShowDeepProfileOptIn(true);
        }}
      />
    );
  }

  // Show library generation loading
  if (isGeneratingLibrary) {
    return (
      <ExecutiveLoadingScreen 
        progress={libraryProgress} 
        phase={libraryPhase}
      />
    );
  }

  // Show unified results (both benchmark and library)
  if (showPromptLibrary && promptLibrary && contactData) {
    const assessmentData = getAssessmentData();
    
    return (
      <UnifiedResults
        assessmentData={assessmentData}
        promptLibrary={promptLibrary}
        contactData={contactData}
        sessionId={sessionId}
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
      <AILeadershipBenchmark
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-6 sm:py-8">
        {/* Header - Clean Mobile Design */}
        <div className="text-center mb-6 sm:mb-8 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
            <Brain className="h-4 w-4" />
            AI Leadership Growth Benchmark
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight leading-tight">
            Benchmark Your AI
            <span className="block text-primary">Leadership Growth</span>
          </h1>
          
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            Evaluate how your AI literacy drives strategic growth and competitive advantage
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Progress Section - Clean Design */}
          <Card className="mb-6 sm:mb-8 shadow-sm border rounded-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Benchmark Progress</h2>
                <Badge variant="outline" className="flex items-center gap-2 bg-primary/10 text-primary border-primary/20 px-3 py-1 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  <span className="text-sm">{progressData.currentQuestion}/{totalQuestions}</span>
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
              <CardContent className="p-4 sm:p-6">
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