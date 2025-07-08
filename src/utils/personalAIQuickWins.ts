import { DiagnosticData, DiagnosticScores } from '../components/DiagnosticTool';

interface PersonalQuickWin {
  title: string;
  description: string;
  impact: string;
  priority: number;
  reason: string;
}

// Personal AI tool recommendations based on bottlenecks
const PERSONAL_AI_SOLUTIONS: Record<string, PersonalQuickWin[]> = {
  'Writing and content creation taking too long': [
    {
      title: 'AI Writing Assistant Mastery',
      description: 'Master Claude/ChatGPT for first drafts, then human polish',
      impact: '70% faster content creation',
      priority: 1,
      reason: 'Based on your writing bottleneck'
    },
    {
      title: 'Voice-to-Text AI Workflow',
      description: 'Record thoughts, let AI transcribe and structure',
      impact: '3x faster idea capture',
      priority: 2,
      reason: 'Perfect for busy leaders who think faster than they type'
    }
  ],
  
  'Information research and synthesis': [
    {
      title: 'AI Research Command Center',
      description: 'Perplexity + Claude for rapid research synthesis',
      impact: '60% faster insights',
      priority: 1,
      reason: 'Addresses your research bottleneck directly'
    },
    {
      title: 'Smart Information Filter',
      description: 'AI-powered reading lists and executive summaries',
      impact: 'Stay current with 80% less time',
      priority: 2,
      reason: 'Information overload solution'
    }
  ],
  
  'Decision-making with incomplete information': [
    {
      title: 'AI Decision Support System',
      description: 'Structured prompts for pros/cons/scenarios analysis',
      impact: 'Confident decisions in hours',
      priority: 1,
      reason: 'Your decision-making challenge'
    },
    {
      title: 'Risk Assessment AI',
      description: 'AI frameworks for uncertainty and risk evaluation',
      impact: 'Better decisions under pressure',
      priority: 2,
      reason: 'Complements incomplete information challenge'
    }
  ],
  
  'Preparing presentations and reports': [
    {
      title: 'AI Presentation Generator',
      description: 'From outline to slides in minutes with AI',
      impact: '4x faster deck creation',
      priority: 1,
      reason: 'Directly tackles your presentation bottleneck'
    },
    {
      title: 'Executive Story Builder',
      description: 'AI helps craft compelling narratives from data',
      impact: 'More persuasive presentations',
      priority: 2,
      reason: 'Enhances your presentation impact'
    }
  ],
  
  'Managing email and communications': [
    {
      title: 'AI Email Command Center',
      description: 'Smart filtering, drafting, and response templates',
      impact: '60% less inbox time',
      priority: 1,
      reason: 'Your email management pain point'
    },
    {
      title: 'Communication Style AI',
      description: 'Tone and style optimization for different audiences',
      impact: 'More effective messages',
      priority: 2,
      reason: 'Amplifies your communication impact'
    }
  ],
  
  'Staying current with industry trends': [
    {
      title: 'AI Trend Monitoring',
      description: 'Automated industry intelligence and summaries',
      impact: 'Never miss key trends',
      priority: 1,
      reason: 'Keeps you ahead of the curve'
    },
    {
      title: 'Thought Leadership AI',
      description: 'Turn insights into content for your network',
      impact: 'Position as industry expert',
      priority: 2,
      reason: 'Builds on your industry knowledge'
    }
  ],
  
  'Creative problem-solving and ideation': [
    {
      title: 'AI Brainstorming Partner',
      description: 'Structured creative thinking with AI facilitation',
      impact: 'Better solutions, faster',
      priority: 1,
      reason: 'Enhances your creative process'
    },
    {
      title: 'Innovation Framework AI',
      description: 'AI-guided innovation methodologies',
      impact: 'Systematic breakthrough thinking',
      priority: 2,
      reason: 'Amplifies creative problem-solving'
    }
  ],
  
  'Time management and prioritization': [
    {
      title: 'AI Productivity Coach',
      description: 'Smart scheduling and priority optimization',
      impact: 'Reclaim 5+ hours weekly',
      priority: 1,
      reason: 'Addresses your time management challenge'
    },
    {
      title: 'Focus Enhancement AI',
      description: 'AI-powered distraction blocking and deep work',
      impact: '2x deeper work sessions',
      priority: 2,
      reason: 'Maximizes your productive time'
    }
  ]
};

// AI mastery skill recommendations
const AI_MASTERY_SOLUTIONS: Record<string, PersonalQuickWin[]> = {
  'Advanced prompt engineering and AI conversation': [
    {
      title: 'Prompt Engineering Mastery',
      description: 'Learn advanced prompting techniques for better AI outputs',
      impact: '3x better AI responses',
      priority: 1,
      reason: 'Foundation skill you identified'
    }
  ],
  
  'Building custom AI workflows and automations': [
    {
      title: 'No-Code AI Automation',
      description: 'Build personal AI workflows without coding',
      impact: 'Automate routine thinking tasks',
      priority: 1,
      reason: 'Your automation interest'
    }
  ],
  
  'Using AI for strategic thinking and analysis': [
    {
      title: 'Strategic AI Thinking',
      description: 'AI frameworks for strategic analysis and planning',
      impact: 'Sharper strategic insights',
      priority: 1,
      reason: 'Strategic thinking enhancement goal'
    }
  ],
  
  'AI-powered content creation and writing': [
    {
      title: 'AI Content Mastery',
      description: 'Advanced techniques for AI-human content collaboration',
      impact: '5x content output quality',
      priority: 1,
      reason: 'Content creation skill gap'
    }
  ]
};

// Fallback recommendations based on scores
const SCORE_BASED_SOLUTIONS: PersonalQuickWin[] = [
  {
    title: 'AI Tool Integration',
    description: 'Connect your existing tools with AI for seamless workflow',
    impact: 'Eliminate context switching',
    priority: 1,
    reason: 'Low tool fluency score'
  },
  {
    title: 'Decision Speed Accelerator',
    description: 'AI templates for faster decision-making processes',
    impact: 'Cut decision time in half',
    priority: 2,
    reason: 'Opportunity for faster decisions'
  },
  {
    title: 'Personal AI Learning Path',
    description: 'Curated AI skill development based on your goals',
    impact: 'Stay ahead of AI curve',
    priority: 3,
    reason: 'Growth mindset optimization'
  },
  {
    title: 'AI Communication Amplifier',
    description: 'Enhance your personal brand with AI-powered content',
    impact: 'Stronger professional presence',
    priority: 4,
    reason: 'Communication enhancement opportunity'
  },
  {
    title: 'Responsible AI Framework',
    description: 'Personal guidelines for ethical AI use',
    impact: 'Confident AI adoption',
    priority: 5,
    reason: 'Balance AI power with wisdom'
  }
];

export function generatePersonalizedQuickWins(
  data: DiagnosticData, 
  scores: DiagnosticScores
): string[] {
  const selectedWins: PersonalQuickWin[] = [];
  const usedTitles = new Set<string>();
  
  // Get user's specific tools for personalization
  const userTools = data.aiUseCases?.map(u => u.tool).filter(t => t) || [];
  const toolsText = userTools.length > 0 ? ` using ${userTools.slice(0, 2).join(' and ')}` : '';
  
  // Priority 1: Address top productivity bottlenecks
  const bottlenecks = data.dailyFrictions || [];
  bottlenecks.slice(0, 2).forEach(bottleneck => {
    const solutions = PERSONAL_AI_SOLUTIONS[bottleneck] || [];
    const bestSolution = solutions.find(s => !usedTitles.has(s.title));
    if (bestSolution) {
      // Personalize the solution with user's specific tools
      const personalizedSolution = {
        ...bestSolution,
        reason: `${bestSolution.reason}${toolsText}`
      };
      selectedWins.push(personalizedSolution);
      usedTitles.add(bestSolution.title);
    }
  });
  
  // Priority 2: Address AI mastery gaps
  const aiSkills = data.skillGaps || [];
  aiSkills.slice(0, 2).forEach(skill => {
    if (selectedWins.length >= 5) return;
    const solutions = AI_MASTERY_SOLUTIONS[skill] || [];
    const bestSolution = solutions.find(s => !usedTitles.has(s.title));
    if (bestSolution) {
      selectedWins.push(bestSolution);
      usedTitles.add(bestSolution.title);
    }
  });
  
  // Priority 3: Fill remaining slots based on low scores
  const remainingSlots = 5 - selectedWins.length;
  if (remainingSlots > 0) {
    const lowScoreSolutions: PersonalQuickWin[] = [];
    
    if (scores.aiToolFluency < 50) {
      lowScoreSolutions.push({
        title: 'AI Tool Stack Optimization',
        description: `Expand from ${data.aiUseCases?.length || 0} to 5+ integrated AI use cases`,
        impact: 'Double your AI-powered productivity',
        priority: 1,
        reason: `Current use cases: ${data.aiUseCases?.length || 0}${toolsText}`
      });
    }
    
    if (scores.aiDecisionMaking < 50) {
      lowScoreSolutions.push({
        title: 'Lightning Decision Framework',
        description: `Reduce decision time from ${data.hoursToDecision || 24}h to 2h with AI`,
        impact: 'Make decisions 10x faster',
        priority: 2,
        reason: `Current decision time: ${data.hoursToDecision || 24} hours`
      });
    }
    
    if (scores.aiLearningGrowth < 50) {
      lowScoreSolutions.push({
        title: 'AI Learning Accelerator',
        description: `Increase from ${data.upskillPercentage || 0}% to 15% weekly AI learning`,
        impact: 'Stay ahead of AI innovation',
        priority: 3,
        reason: `Current learning time: ${data.upskillPercentage || 0}%`
      });
    }
    
    // Add score-based solutions
    lowScoreSolutions
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
    SCORE_BASED_SOLUTIONS
      .filter(s => !usedTitles.has(s.title))
      .slice(0, stillNeeded)
      .forEach(solution => {
        selectedWins.push(solution);
        usedTitles.add(solution.title);
      });
  }
  
  // Format as strings with clear connection to inputs
  return selectedWins
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map(win => `${win.title} → ${win.impact} (${win.reason})`);
}