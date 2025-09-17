export interface DiagnosticData {
  deepWorkHours?: number;
  meetingHours?: number;
  adminHours?: number;
  usesChatGPT?: boolean;
  usesNotionAI?: boolean;
  usesGrammarlyAI?: boolean;
  usesOtherAI?: boolean;
  communicationAudiences?: string[];
  communicationFrequency?: number;
  aiLearningTime?: number;
  skillDevelopmentAreas?: string[];
  aiDecisionTrust?: number;
  hasPersonalEthicsGuidelines?: boolean;
  comfortableWithSensitiveData?: boolean;
  bottleneckAreas?: string[];
  [key: string]: any;
}

export interface DiagnosticScores {
  overallScore: number;
  readinessScore: number;
  collaborationScore: number;
  strategicScore: number;
  ethicsScore: number;
  productivityScore: number;
  aiMindmakerScore: number;
  aiToolFluency: number;
  aiDecisionMaking: number;
  aiCommunication: number;
  aiLearningGrowth: number;
  aiEthicsBalance: number;
}

export interface AIUseCase {
  useCase: string;
  tool: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'rarely';
}

export type DiagnosticStep = 'welcome' | 'assessment' | 'loading' | 'results';