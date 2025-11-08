import { CompassDimension } from '@/types/voice';

export const COMPASS_QUESTIONS: CompassDimension[] = [
  {
    id: 'ai_literacy',
    name: 'AI Literacy & Vocabulary',
    question: 'In 15 seconds: How would you explain AI\'s strategic impact to your board?',
    timeLimit: 15,
    example: 'e.g., "AI lets us predict customer churn, automate contract review, and personalize at scale."'
  },
  {
    id: 'strategic_vision',
    name: 'Strategic Vision',
    question: 'Describe one recent business decision where AI insights would have helped.',
    timeLimit: 15,
    example: 'e.g., "We expanded into a new region without demand forecasting—AI could have flagged low ROI."'
  },
  {
    id: 'cultural_leadership',
    name: 'Cultural Leadership',
    question: 'How are you preparing your team for AI transformation?',
    timeLimit: 15,
    example: 'e.g., "Monthly lunch-and-learns on AI tools, pairing skeptics with early adopters."'
  },
  {
    id: 'operational_readiness',
    name: 'Operational Implementation',
    question: 'Walk me through how you stay current with AI developments.',
    timeLimit: 15,
    example: 'e.g., "I follow 3 AI newsletters, attend quarterly roundtables, and test one new tool monthly."'
  },
  {
    id: 'risk_management',
    name: 'Risk Management & Ethics',
    question: 'What\'s your personal approach to managing AI adoption risks?',
    timeLimit: 15,
    example: 'e.g., "We pilot in low-risk areas first, have a bias audit checklist, and over-communicate changes."'
  },
  {
    id: 'innovation_mindset',
    name: 'Innovation & Competitive Mindset',
    question: 'How are you thinking about AI innovation in your competitive landscape?',
    timeLimit: 15,
    example: 'e.g., "Competitors automate pricing—we\'re focusing on AI-driven product recommendations instead."'
  },
  {
    id: 'stakeholder_engagement',
    name: 'Stakeholder Communication',
    question: 'How do you engage stakeholders (board, investors, customers) around AI strategy?',
    timeLimit: 15,
    example: 'e.g., "Quarterly board deck with AI metrics, monthly customer webinars showcasing AI features."'
  }
];
