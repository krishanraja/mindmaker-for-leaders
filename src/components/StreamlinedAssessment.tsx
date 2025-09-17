import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, ArrowRight, CheckCircle, Target, Clock, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useStructuredAssessment } from '@/hooks/useStructuredAssessment';
import ExecutiveLoadingScreen from './ai-chat/ExecutiveLoadingScreen';
import ConversionOptimizedResults from './ConversionOptimizedResults';

interface StreamlinedAssessmentProps {
  onComplete?: (assessmentData: any, sessionId: string | null) => void;
  onBack?: () => void;
}

export const StreamlinedAssessment: React.FC<StreamlinedAssessmentProps> = ({ onComplete, onBack }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightProgress, setInsightProgress] = useState(0);
  const [insightPhase, setInsightPhase] = useState<'analyzing' | 'generating' | 'finalizing'>('analyzing');
  const [showSurprise, setShowSurprise] = useState(false);
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
    
    if (assessmentState.isComplete && hasAnsweredAllQuestions && !isGeneratingInsights && insightProgress === 0) {
      startInsightGeneration();
    }
  }, [assessmentState.isComplete, getProgressData, totalQuestions, isGeneratingInsights, insightProgress]);

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

    answerQuestion(option);

    // Show surprise elements at key moments
    const progressData = getProgressData();
    if (progressData.completedAnswers === Math.floor(totalQuestions / 2)) {
      setShowSurprise(true);
      setTimeout(() => setShowSurprise(false), 3000);
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
    
    // Call onComplete to let parent handle results
    if (onComplete) {
      onComplete(assessmentData, sessionId);
      return null;
    }
    
    // Fallback if no onComplete handler
    return (
      <ConversionOptimizedResults 
        assessmentData={assessmentData}
        sessionId={sessionId}
        onBack={onBack}
      />
    );
  }

  const progressData = getProgressData();
  const currentQuestion = getCurrentQuestion();

  return (
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
      {/* Back Button */}
      {onBack && (
        <div className="absolute top-6 left-6 z-20">
          <Button
            variant="glass"
            onClick={onBack}
            className="glass-button text-white hover:bg-white/20"
          >
            ← Back
          </Button>
        </div>
      )}

      {/* Surprise Element */}
      {showSurprise && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="animate-scale-in">
            <Card className="glass-card-dark border-white/20 p-6 max-w-md text-center">
              <CardContent>
                <Sparkles className="h-12 w-12 text-purple-200 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Excellent Progress!
                </h3>
                <p className="text-white/80">
                  You're thinking like a strategic AI leader. Keep going!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="container-width relative z-10 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            AI Leadership Assessment
          </h1>
          <p className="text-xl text-white/80 mb-6">
            Discover your AI leadership potential in just 5 minutes
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Smart Progress Bar */}
          <Card className="glass-card-dark border-white/20 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Your Progress</h2>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="flex items-center gap-2 bg-white/10 text-white border-white/20">
                    <Clock className="h-3 w-3" />
                    {Math.round(progressData.estimatedTimeRemaining)} min left
                  </Badge>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                    {progressData.completedAnswers}/{totalQuestions}
                  </Badge>
                </div>
              </div>
              
              <Progress value={progressData.progressPercentage} className="h-3 mb-2" />
              
              <div className="flex justify-between text-sm text-white/70">
                <span>Phase: {progressData.phase}</span>
                <span>{Math.round(progressData.progressPercentage)}% Complete</span>
              </div>
            </CardContent>
          </Card>

          {/* Current Question Card */}
          {currentQuestion && (
            <Card className="glass-card-dark border-white/20">
              <CardContent className="pt-8">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="h-6 w-6 text-purple-200" />
                    <h3 className="text-xl font-semibold text-white">
                      Question {currentQuestion.id} of {totalQuestions}
                    </h3>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-6 leading-relaxed">
                    {currentQuestion.question}
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full p-6 h-auto text-left justify-start bg-white/5 border-white/20 text-white hover:bg-white/15 transition-all duration-300 hover:scale-105 group"
                      onClick={() => handleOptionSelect(option)}
                    >
                      <div className="flex items-center w-full">
                        <ArrowRight className="h-5 w-5 mr-4 flex-shrink-0 text-purple-200 group-hover:translate-x-1 transition-transform" />
                        <span className="text-base text-white leading-relaxed">{option}</span>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Motivational Message */}
                <div className="mt-8 text-center">
                  <p className="text-white/60 text-sm">
                    Each question builds your personalized AI leadership profile
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};