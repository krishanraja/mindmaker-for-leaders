import { useState, useCallback } from 'react';

export interface AssessmentTopic {
  id: string;
  name: string;
  description: string;
  questions: string[];
  completed: boolean;
  insights: string[];
}

export interface ConversationState {
  currentTopic: string | null;
  completedTopics: string[];
  assessmentData: Record<string, any>;
  overallProgress: number;
}

const ASSESSMENT_TOPICS: AssessmentTopic[] = [
  {
    id: 'time_allocation',
    name: 'Time & Productivity',
    description: 'Understanding how you spend your time and identify efficiency opportunities',
    questions: [
      'How do you typically spend your working hours? What percentage goes to deep work vs meetings vs administrative tasks?',
      'What are your biggest time drains or productivity challenges?',
      'How do you currently manage your calendar and prioritize tasks?'
    ],
    completed: false,
    insights: []
  },
  {
    id: 'ai_experience',
    name: 'AI Experience & Adoption',
    description: 'Assessing your current AI tool usage and team readiness',
    questions: [
      'What AI tools or technologies are you currently using in your work?',
      'How would you rate your team\'s overall AI literacy and readiness?',
      'What has been your experience with AI implementation so far?'
    ],
    completed: false,
    insights: []
  },
  {
    id: 'communication_stakeholders',
    name: 'Communication & Stakeholders',
    description: 'Evaluating your stakeholder management and communication challenges',
    questions: [
      'Who are your key stakeholders and how do you typically communicate with them?',
      'What are your biggest communication challenges in your role?',
      'How do you currently gather and synthesize information for decision-making?'
    ],
    completed: false,
    insights: []
  },
  {
    id: 'learning_development',
    name: 'Learning & Development',
    description: 'Understanding your investment in AI learning and skill development',
    questions: [
      'How much time do you currently invest in learning about AI and new technologies?',
      'What are the biggest skill gaps you see in your organization regarding AI?',
      'How do you stay updated on industry trends and technological advances?'
    ],
    completed: false,
    insights: []
  },
  {
    id: 'decision_making',
    name: 'Strategic Decision Making',
    description: 'Analyzing your decision-making processes and data utilization',
    questions: [
      'How do you typically make strategic decisions in your organization?',
      'What role does data play in your decision-making process?',
      'How quickly can you access the information you need to make informed decisions?'
    ],
    completed: false,
    insights: []
  }
];

export const useConversationFlow = () => {
  const [topics, setTopics] = useState<AssessmentTopic[]>(ASSESSMENT_TOPICS);
  const [conversationState, setConversationState] = useState<ConversationState>({
    currentTopic: null,
    completedTopics: [],
    assessmentData: {},
    overallProgress: 0
  });

  const updateTopicProgress = useCallback((topicId: string, insights: string[]) => {
    setTopics(prev => prev.map(topic => 
      topic.id === topicId 
        ? { ...topic, completed: true, insights }
        : topic
    ));

    setConversationState(prev => {
      const newCompletedTopics = prev.completedTopics.includes(topicId) 
        ? prev.completedTopics 
        : [...prev.completedTopics, topicId];
      
      return {
        ...prev,
        completedTopics: newCompletedTopics,
        overallProgress: (newCompletedTopics.length / ASSESSMENT_TOPICS.length) * 100
      };
    });
  }, []);

  const setCurrentTopic = useCallback((topicId: string | null) => {
    setConversationState(prev => ({
      ...prev,
      currentTopic: topicId
    }));
  }, []);

  const getNextTopic = useCallback(() => {
    const incompleteTopic = topics.find(topic => !topic.completed);
    return incompleteTopic || null;
  }, [topics]);

  const getSuggestedQuestions = useCallback((topicId?: string) => {
    if (!topicId) {
      return [
        "I'd like to understand my AI readiness better",
        "Help me identify opportunities for AI in my organization",
        "What should I focus on first with AI implementation?",
        "How can I become a more effective leader with AI?"
      ];
    }

    const topic = topics.find(t => t.id === topicId);
    return topic?.questions || [];
  }, [topics]);

  const updateAssessmentData = useCallback((key: string, value: any) => {
    setConversationState(prev => ({
      ...prev,
      assessmentData: {
        ...prev.assessmentData,
        [key]: value
      }
    }));
  }, []);

  return {
    topics,
    conversationState,
    updateTopicProgress,
    setCurrentTopic,
    getNextTopic,
    getSuggestedQuestions,
    updateAssessmentData
  };
};