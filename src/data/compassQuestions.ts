import { CompassDimension } from '@/types/voice';

export const COMPASS_QUESTIONS: CompassDimension[] = [
  {
    id: 'industry_impact',
    name: 'Industry AI Awareness',
    question: 'In 15 seconds: Describe how AI is specifically transforming your industry and its impact on growth.',
    timeLimit: 15,
    example: 'e.g., "In fintech, AI is enabling real-time fraud detection and personalized lending at scale—reducing defaults by 30% and accelerating approval times."'
  },
  {
    id: 'business_acceleration',
    name: 'AI-First Workflow Identification',
    question: 'Tell me about one specific business area where AI-first workflows could accelerate your results.',
    timeLimit: 15,
    example: 'e.g., "Our sales team spends 60% of time on admin. AI could automate CRM updates, draft follow-ups, and prioritize hot leads—freeing them to close deals."'
  },
  {
    id: 'team_alignment',
    name: 'Leadership AI Narrative',
    question: 'How aligned is your leadership team on AI? What is your current AI narrative?',
    timeLimit: 15,
    example: 'e.g., "My CFO sees AI as cost reduction, my CTO sees it as product enhancement—we have not unified around a growth narrative yet."'
  },
  {
    id: 'external_positioning',
    name: 'AI in Market Positioning',
    question: 'How does AI show up in your story to investors, customers, or the market?',
    timeLimit: 15,
    example: 'e.g., "In our last board deck, AI was one slide about pilot projects. Investors asked tough questions—we need a stronger AI growth story."'
  },
  {
    id: 'kpi_connection',
    name: 'AI-to-KPI Linkage',
    question: 'Give me an example of how you connect AI adoption to a specific business KPI—like margin, speed, or retention.',
    timeLimit: 15,
    example: 'e.g., "We track AI-assisted support tickets: 40% faster resolution, 15-point NPS increase, targeting 25% cost reduction this quarter."'
  },
  {
    id: 'coaching_champions',
    name: 'Developing AI Champions',
    question: 'How are you actively identifying and coaching emerging AI champions in your organization?',
    timeLimit: 15,
    example: 'e.g., "I run monthly AI office hours, pair early adopters with skeptics, and publicly celebrate wins—now 5 teams are experimenting."'
  },
  {
    id: 'strategic_execution',
    name: 'AI Strategy to Execution',
    question: 'Describe your approach to moving from AI strategy to actual execution and adoption.',
    timeLimit: 15,
    example: 'e.g., "We start with one high-impact, low-risk workflow per quarter—measure results, document learnings, then scale what works."'
  }
];
