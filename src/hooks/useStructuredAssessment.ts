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
    phase: 'Current State',
    question: 'How many hours per day would you say you spend in focused, deep work?',
    options: ['Less than 2 hours', '2-4 hours', '4-6 hours', 'More than 6 hours'],
    type: 'multiple_choice',
    category: 'time_allocation'
  },
  {
    id: 2,
    phase: 'Current State',
    question: "What's your biggest time drain during a typical workday?",
    options: ['Too many meetings', 'Email overload', 'Manual administrative tasks', 'Constant interruptions'],
    type: 'multiple_choice',
    category: 'productivity_challenges'
  },
  {
    id: 3,
    phase: 'Current State',
    question: 'Are you currently using any AI tools in your work?',
    options: ['None at all', 'Just ChatGPT occasionally', 'Several AI tools regularly', 'Integrated AI throughout workflows'],
    type: 'multiple_choice',
    category: 'ai_adoption'
  },
  {
    id: 4,
    phase: 'Current State',
    question: "How would you describe your team's comfort level with AI?",
    options: ['Skeptical/resistant', 'Curious but hesitant', 'Ready to try new tools', 'Already experimenting actively'],
    type: 'multiple_choice',
    category: 'team_readiness'
  },
  {
    id: 5,
    phase: 'Current State',
    question: "What's your role in making technology decisions?",
    options: ['I make final decisions', 'I influence decisions', 'I provide input', 'I implement what others decide'],
    type: 'multiple_choice',
    category: 'decision_authority'
  },
  {
    id: 6,
    phase: 'Pain Points',
    question: 'What frustrates you most about how information flows in your organization?',
    options: ['Too slow to get answers', 'Information silos', 'Poor data quality', 'Overwhelming information volume'],
    type: 'multiple_choice',
    category: 'information_flow'
  },
  {
    id: 7,
    phase: 'Pain Points',
    question: 'How often do you feel like you\'re making decisions without enough data?',
    options: ['Rarely', 'Sometimes', 'Often', 'Almost always'],
    type: 'multiple_choice',
    category: 'data_availability'
  },
  {
    id: 8,
    phase: 'Pain Points',
    question: "What's your biggest challenge in staying current with industry trends?",
    options: ['No time to research', 'Too much information to process', 'Hard to identify what\'s relevant', 'Lack of trusted sources'],
    type: 'multiple_choice',
    category: 'learning_challenges'
  },
  {
    id: 9,
    phase: 'Pain Points',
    question: 'How much time do you spend each week on repetitive administrative tasks?',
    options: ['Less than 2 hours', '2-5 hours', '5-10 hours', 'More than 10 hours'],
    type: 'multiple_choice',
    category: 'admin_time'
  },
  {
    id: 10,
    phase: 'Pain Points',
    question: "What's your organization's biggest competitive pressure right now?",
    options: ['Speed to market', 'Cost efficiency', 'Innovation lag', 'Talent shortage'],
    type: 'multiple_choice',
    category: 'competitive_pressure'
  },
  {
    id: 11,
    phase: 'Vision & Goals',
    question: 'If you could automate one aspect of your work, what would it be?',
    options: ['Email and communication', 'Data analysis and reporting', 'Scheduling and calendar management', 'Content creation and writing'],
    type: 'multiple_choice',
    category: 'automation_priority'
  },
  {
    id: 12,
    phase: 'Vision & Goals',
    question: "What's your timeline for implementing significant AI initiatives?",
    options: ['Within 3 months', '3-6 months', '6-12 months', 'Over a year'],
    type: 'multiple_choice',
    category: 'implementation_timeline'
  },
  {
    id: 13,
    phase: 'Vision & Goals',
    question: "What's your budget range for AI and automation investments?",
    options: ['Under $25K', '$25K-$100K', '$100K-$500K', '$500K+'],
    type: 'multiple_choice',
    category: 'budget_range'
  },
  {
    id: 14,
    phase: 'Vision & Goals',
    question: 'How do you prefer to learn about new technologies?',
    options: ['Hands-on experimentation', 'Structured training', 'Industry reports', 'Peer discussions'],
    type: 'multiple_choice',
    category: 'learning_preference'
  },
  {
    id: 15,
    phase: 'Vision & Goals',
    question: 'What would success look like for your first AI project?',
    options: ['Clear ROI and cost savings', 'Improved team productivity', 'Better decision-making speed', 'Competitive advantage'],
    type: 'multiple_choice',
    category: 'success_metrics'
  }
];

export const useStructuredAssessment = () => {
  const [assessmentState, setAssessmentState] = useState<AssessmentState>({
    currentQuestion: 1,
    responses: [],
    phase: 'Current State',
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
    const estimatedTimeRemaining = Math.max(0, (totalQuestions - completedAnswers) * 1.5); // 1.5 min per question

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
      phase: 'Current State',
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