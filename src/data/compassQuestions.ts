import { CompassDimension } from '@/types/voice';

export const COMPASS_QUESTIONS: CompassDimension[] = [
  {
    id: 'industry_impact',
    name: 'AI Awareness & Competitive Pressure',
    question: 'What is the biggest competitive pressure or opportunity you see around AI in your industry right now?',
    timeLimit: 15,
    example: 'e.g., "Competitors are launching AI features faster, and customers are starting to expect it. We are falling behind on speed."'
  },
  {
    id: 'business_acceleration',
    name: 'Priority Problem Identification',
    question: 'If you could wave a magic wand and have AI solve one problem in your business tomorrow, what would it be?',
    timeLimit: 15,
    example: 'e.g., "Our sales team drowns in admin work—if AI could handle CRM updates and follow-ups, they would have 10 more hours a week to sell."'
  },
  {
    id: 'team_alignment',
    name: 'Leadership Readiness',
    question: 'On a scale of totally lost to ready to execute, where is your leadership team on AI right now?',
    timeLimit: 15,
    example: 'e.g., "Honestly? We are scattered. My CTO wants to build, my CFO wants to cut costs, and I am not sure how to unite them around a plan."'
  },
  {
    id: 'external_positioning',
    name: 'Stakeholder Confidence',
    question: 'When investors, customers, or your board ask about AI, how confident do you feel in your answer?',
    timeLimit: 15,
    example: 'e.g., "Last board meeting, I got grilled on AI and fumbled it. I need a stronger, clearer story that shows momentum."'
  },
  {
    id: 'kpi_connection',
    name: 'Value Metric Clarity',
    question: 'If AI is going to drive real business results for you, what metric would you most want to move?',
    timeLimit: 15,
    example: 'e.g., "Customer acquisition cost. If AI could help us qualify leads better and automate outreach, we could cut CAC by 20%."'
  },
  {
    id: 'coaching_champions',
    name: 'Champion Identification',
    question: 'Who on your team is most excited about AI, and what is stopping you from empowering them?',
    timeLimit: 15,
    example: 'e.g., "My ops lead is a ChatGPT power user, but she is buried in firefighting. I need to carve out time for her to experiment."'
  },
  {
    id: 'strategic_execution',
    name: 'Near-Term Action Bias',
    question: 'If you had to pick ONE thing to start doing in the next 30 days to build AI momentum, what would it be?',
    timeLimit: 15,
    example: 'e.g., "Run a lunch-and-learn to show my team 3 AI tools they could use today. Get everyone experimenting, even small wins."'
  }
];
