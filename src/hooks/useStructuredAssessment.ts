import { useState, useCallback } from 'react';

export interface AssessmentQuestion {
  id: number;
  phase: string;
  question: string;
  options: string[];
  type: 'multiple_choice' | 'open_ended';
  category: string;
}

export interface AssessmentResponse {
  questionId: number;
  answer: string;
  timestamp: Date;
  category: string;
}

export interface AssessmentState {
  currentQuestion: number;
  responses: AssessmentResponse[];
  phase: string;
  isComplete: boolean;
  selectedOption: string | null;
}

const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 1,
    phase: 'Leadership Growth',
    question: 'I can clearly explain AI\'s impact on our industry in growth terms.',
    options: ['1 - Strongly Disagree', '2 - Disagree', '3 - Neutral', '4 - Agree', '5 - Strongly Agree'],
    type: 'multiple_choice',
    category: 'industry_impact'
  },
  {
    id: 2,
    phase: 'Leadership Growth',
    question: 'I know which areas of our business can be accelerated by AI-first workflows.',
    options: ['1 - Strongly Disagree', '2 - Disagree', '3 - Neutral', '4 - Agree', '5 - Strongly Agree'],
    type: 'multiple_choice',
    category: 'business_acceleration'
  },
  {
    id: 3,
    phase: 'Leadership Growth',
    question: 'My leadership team shares a common AI growth narrative.',
    options: ['1 - Strongly Disagree', '2 - Disagree', '3 - Neutral', '4 - Agree', '5 - Strongly Agree'],
    type: 'multiple_choice',
    category: 'team_alignment'
  },
  {
    id: 4,
    phase: 'Leadership Growth',
    question: 'AI is part of our external positioning (investors, market).',
    options: ['1 - Strongly Disagree', '2 - Disagree', '3 - Neutral', '4 - Agree', '5 - Strongly Agree'],
    type: 'multiple_choice',
    category: 'external_positioning'
  },
  {
    id: 5,
    phase: 'Leadership Growth',
    question: 'I connect AI adoption directly to KPIs (margin, speed, risk-adjusted growth).',
    options: ['1 - Strongly Disagree', '2 - Disagree', '3 - Neutral', '4 - Agree', '5 - Strongly Agree'],
    type: 'multiple_choice',
    category: 'kpi_connection'
  },
  {
    id: 6,
    phase: 'Leadership Growth',
    question: 'I actively coach emerging AI champions in my org.',
    options: ['1 - Strongly Disagree', '2 - Disagree', '3 - Neutral', '4 - Agree', '5 - Strongly Agree'],
    type: 'multiple_choice',
    category: 'coaching_champions'
  }
];

export const useStructuredAssessment = () => {
  const [assessmentState, setAssessmentState] = useState<AssessmentState>({
    currentQuestion: 1,
    responses: [],
    phase: 'Leadership Growth',
    isComplete: false,
    selectedOption: null
  });

  const getCurrentQuestion = useCallback(() => {
    return ASSESSMENT_QUESTIONS.find(q => q.id === assessmentState.currentQuestion) || null;
  }, [assessmentState.currentQuestion]);

  const answerQuestion = useCallback((answer: string) => {
    const currentQ = getCurrentQuestion();
    if (!currentQ) return;

    const response: AssessmentResponse = {
      questionId: currentQ.id,
      answer,
      timestamp: new Date(),
      category: currentQ.category
    };

    setAssessmentState(prev => {
      const newResponses = [...prev.responses.filter(r => r.questionId !== currentQ.id), response];
      const nextQuestion = prev.currentQuestion + 1;
      // Only mark complete when we've answered ALL questions and moved past the last one
      const isComplete = nextQuestion > ASSESSMENT_QUESTIONS.length;
      
      const nextPhase = isComplete ? 'Complete' : 
        ASSESSMENT_QUESTIONS.find(q => q.id === nextQuestion)?.phase || prev.phase;

      return {
        ...prev,
        responses: newResponses,
        currentQuestion: isComplete ? prev.currentQuestion : nextQuestion,
        phase: nextPhase,
        isComplete,
        selectedOption: null
      };
    });
  }, [getCurrentQuestion]);

  const setSelectedOption = useCallback((option: string | null) => {
    setAssessmentState(prev => ({
      ...prev,
      selectedOption: option
    }));
  }, []);

  const getProgressData = useCallback(() => {
    const totalQuestions = ASSESSMENT_QUESTIONS.length;
    const completedAnswers = assessmentState.responses.length;
    const estimatedTimeRemaining = Math.max(0, (totalQuestions - completedAnswers) * 0.33); // 0.33 min per question

    return {
      currentQuestion: assessmentState.currentQuestion,
      totalQuestions,
      phase: assessmentState.phase,
      completedAnswers,
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
      progressPercentage: (completedAnswers / totalQuestions) * 100
    };
  }, [assessmentState]);

  const getAssessmentData = useCallback(() => {
    const data: Record<string, any> = {};
    
    assessmentState.responses.forEach(response => {
      data[response.category] = response.answer;
    });

    return data;
  }, [assessmentState.responses]);

  const resetAssessment = useCallback(() => {
    setAssessmentState({
      currentQuestion: 1,
      responses: [],
      phase: 'Leadership Growth',
      isComplete: false,
      selectedOption: null
    });
  }, []);

  return {
    assessmentState,
    getCurrentQuestion,
    answerQuestion,
    setSelectedOption,
    getProgressData,
    getAssessmentData,
    resetAssessment,
    totalQuestions: ASSESSMENT_QUESTIONS.length
  };
};