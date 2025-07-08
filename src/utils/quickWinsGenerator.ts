import { DiagnosticData, DiagnosticScores } from '../components/DiagnosticTool';

interface QuickWin {
  title: string;
  description: string;
  timeSource: string;
  priority: number;
  categories: string[];
}

// Comprehensive database of AI solutions mapped to problems
const AI_SOLUTIONS: Record<string, QuickWin[]> = {
  // Daily Friction Solutions
  'Context-switching between tools': [
    {
      title: 'Unified workspace AI',
      description: 'AI dashboard that aggregates all your tools',
      timeSource: 'saves 2h/wk',
      priority: 1,
      categories: ['productivity', 'workflow']
    },
    {
      title: 'Smart notification triage',
      description: 'AI filters and prioritizes cross-platform alerts',
      timeSource: 'reduces interruptions 70%',
      priority: 2,
      categories: ['focus', 'productivity']
    }
  ],
  
  'Information overload & filtering': [
    {
      title: 'AI research assistant',
      description: 'Synthesizes information from multiple sources',
      timeSource: 'cuts research time 60%',
      priority: 1,
      categories: ['research', 'analysis']
    },
    {
      title: 'Content summarization engine',
      description: 'Auto-summarizes emails, docs, and reports',
      timeSource: 'saves 4h/wk',
      priority: 2,
      categories: ['productivity', 'analysis']
    }
  ],
  
  'Slow approval processes': [
    {
      title: 'Decision acceleration platform',
      description: 'AI-powered decision trees and approval routing',
      timeSource: 'cuts approval time 50%',
      priority: 1,
      categories: ['decision', 'workflow']
    },
    {
      title: 'Stakeholder alignment bot',
      description: 'Auto-tracks approvals and follows up',
      timeSource: 'eliminates 80% of follow-ups',
      priority: 2,
      categories: ['communication', 'workflow']
    }
  ],
  
  'Manual slide-building & presentations': [
    {
      title: 'AI presentation generator',
      description: 'Creates slides from bullet points or documents',
      timeSource: '3x faster slide creation',
      priority: 1,
      categories: ['creativity', 'productivity']
    },
    {
      title: 'Smart template engine',
      description: 'Auto-applies brand guidelines and formatting',
      timeSource: 'saves 90min per deck',
      priority: 2,
      categories: ['design', 'productivity']
    }
  ],
  
  'Email management & responses': [
    {
      title: 'Email triage AI',
      description: 'Prioritizes, categorizes, and drafts responses',
      timeSource: 'cuts inbox time 60%',
      priority: 1,
      categories: ['communication', 'productivity']
    },
    {
      title: 'Meeting-to-email converter',
      description: 'Turns meeting notes into action emails',
      timeSource: 'saves 2h/wk',
      priority: 2,
      categories: ['communication', 'workflow']
    }
  ]
};

// Skill gap solutions
const SKILL_SOLUTIONS: Record<string, QuickWin[]> = {
  'AI prompting, Data analysis and interpretation': [
    {
      title: 'Prompt optimization coach',
      description: 'AI that improves your AI prompts in real-time',
      timeSource: '2x better AI outputs',
      priority: 1,
      categories: ['skills', 'ai-mastery']
    },
    {
      title: 'Data storytelling assistant',
      description: 'Converts raw data into compelling narratives',
      timeSource: 'faster insights delivery',
      priority: 2,
      categories: ['analysis', 'communication']
    }
  ],
  
  'Storytelling for company reports': [
    {
      title: 'Executive narrative generator',
      description: 'Transforms data into executive-ready stories',
      timeSource: 'cuts report writing 70%',
      priority: 1,
      categories: ['communication', 'leadership']
    },
    {
      title: 'Impact amplification tool',
      description: 'Highlights key achievements for maximum impact',
      timeSource: 'stronger stakeholder buy-in',
      priority: 2,
      categories: ['influence', 'communication']
    }
  ],
  
  'Ghostwriting for PR': [
    {
      title: 'Thought leadership engine',
      description: 'Drafts articles and posts in your voice',
      timeSource: '4x more content output',
      priority: 1,
      categories: ['content', 'influence']
    },
    {
      title: 'Voice consistency AI',
      description: 'Maintains your brand voice across all content',
      timeSource: 'consistent messaging',
      priority: 2,
      categories: ['branding', 'communication']
    }
  ],
  
  'Ideation and strategy': [
    {
      title: 'Strategic brainstorming partner',
      description: 'AI that challenges and refines your thinking',
      timeSource: 'better strategic outcomes',
      priority: 1,
      categories: ['strategy', 'innovation']
    },
    {
      title: 'Competitive intelligence bot',
      description: 'Monitors market trends and competitor moves',
      timeSource: 'faster strategic pivots',
      priority: 2,
      categories: ['strategy', 'intelligence']
    }
  ],
  
  'Automation of admin': [
    {
      title: 'Admin task eliminator',
      description: 'Automates calendar, travel, and routine tasks',
      timeSource: 'reclaims 5h/wk',
      priority: 1,
      categories: ['automation', 'productivity']
    },
    {
      title: 'Smart delegation system',
      description: 'Routes tasks to appropriate team members',
      timeSource: 'eliminates task bottlenecks',
      priority: 2,
      categories: ['delegation', 'workflow']
    }
  ]
};

// Fallback solutions for various scenarios
const FALLBACK_SOLUTIONS: QuickWin[] = [
  {
    title: 'AI copilot expansion',
    description: 'Add AI assistance to your most time-consuming tasks',
    timeSource: 'saves 3h/wk',
    priority: 1,
    categories: ['productivity', 'general']
  },
  {
    title: 'Decision velocity booster',
    description: 'AI dashboard for faster, data-driven decisions',
    timeSource: 'cuts decision time 40%',
    priority: 2,
    categories: ['decision', 'leadership']
  },
  {
    title: 'Communication optimizer',
    description: 'AI-enhanced meeting prep and follow-up',
    timeSource: 'more effective meetings',
    priority: 3,
    categories: ['communication', 'efficiency']
  },
  {
    title: 'Growth mindset accelerator',
    description: 'Personalized learning paths with AI mentoring',
    timeSource: 'faster skill development',
    priority: 4,
    categories: ['growth', 'learning']
  },
  {
    title: 'Leadership impact multiplier',
    description: 'AI tools for stakeholder influence and alignment',
    timeSource: 'stronger team alignment',
    priority: 5,
    categories: ['leadership', 'influence']
  }
];

export function generatePersonalizedQuickWins(
  data: DiagnosticData, 
  scores: DiagnosticScores
): string[] {
  const selectedWins: QuickWin[] = [];
  const usedTitles = new Set<string>();
  
  // Priority 1: Address top daily frictions
  const frictions = data.dailyFrictions || [];
  frictions.slice(0, 2).forEach(friction => {
    const solutions = AI_SOLUTIONS[friction] || [];
    const bestSolution = solutions.find(s => !usedTitles.has(s.title));
    if (bestSolution) {
      selectedWins.push(bestSolution);
      usedTitles.add(bestSolution.title);
    }
  });
  
  // Priority 2: Address skill gaps
  const skillGaps = data.skillGaps || [];
  skillGaps.slice(0, 2).forEach(skill => {
    if (selectedWins.length >= 5) return;
    const solutions = SKILL_SOLUTIONS[skill] || [];
    const bestSolution = solutions.find(s => !usedTitles.has(s.title));
    if (bestSolution) {
      selectedWins.push(bestSolution);
      usedTitles.add(bestSolution.title);
    }
  });
  
  // Priority 3: Fill remaining slots based on low scores
  const remainingSlots = 5 - selectedWins.length;
  if (remainingSlots > 0) {
    // Add solutions based on lowest dimension scores
    const dimensionSolutions: QuickWin[] = [];
    
    if (scores.productivityMultiplier < 50) {
      dimensionSolutions.push({
        title: 'Deep work protector',
        description: 'AI blocks distractions during focus time',
        timeSource: 'doubles deep work efficiency',
        priority: 1,
        categories: ['productivity', 'focus']
      });
    }
    
    if (scores.decisionAgility < 50) {
      dimensionSolutions.push({
        title: 'Decision confidence engine',
        description: 'AI provides data-backed decision support',
        timeSource: 'faster, better decisions',
        priority: 2,
        categories: ['decision', 'confidence']
      });
    }
    
    if (scores.influenceQuotient < 50) {
      dimensionSolutions.push({
        title: 'Stakeholder mapping AI',
        description: 'Optimizes communication for each audience',
        timeSource: 'higher persuasion success',
        priority: 3,
        categories: ['influence', 'communication']
      });
    }
    
    // Add dimension-based solutions
    dimensionSolutions
      .filter(s => !usedTitles.has(s.title))
      .slice(0, remainingSlots)
      .forEach(solution => {
        selectedWins.push(solution);
        usedTitles.add(solution.title);
      });
  }
  
  // Priority 4: Fill any remaining slots with fallbacks
  const stillNeeded = 5 - selectedWins.length;
  if (stillNeeded > 0) {
    FALLBACK_SOLUTIONS
      .filter(s => !usedTitles.has(s.title))
      .slice(0, stillNeeded)
      .forEach(solution => {
        selectedWins.push(solution);
        usedTitles.add(solution.title);
      });
  }
  
  // Format as strings
  return selectedWins
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map(win => `${win.title} → ${win.timeSource}`);
}