export interface VoiceSession {
  id: string;
  sessionId: string;
  voiceEnabled: boolean;
  compassCompletedAt?: string;
  roiCompletedAt?: string;
  audioRetentionConsent: boolean;
  
  // Compass
  compassScores?: Record<string, number>;
  compassTier?: 'Emerging' | 'Establishing' | 'Advancing' | 'Leading';
  compassFocusAreas?: string[];
  
  // ROI
  roiTranscript?: string;
  roiInputs?: RoiInputs;
  roiConservativeValue?: number;
  roiLikelyValue?: number;
  roiAssumptions?: string[];
  
  // Gating
  gatedUnlockedAt?: string;
  sprintSignupSource?: string;
}

export interface RoiInputs {
  hoursPerWeek: number;
  peopleInvolved: number;
  avgSalary: number;
  reductionPotential: number;
}

export interface VoiceInstrumentation {
  eventType: 'module_start' | 'module_complete' | 'mic_error' | 'clarifier_asked' | 'abandon' | 'ios_fallback' | 'transcription_complete';
  moduleName?: 'compass' | 'roi';
  dwellTimeSeconds?: number;
  metadata?: Record<string, any>;
}

export interface CompassDimension {
  id: string;
  name: string;
  question: string;
  timeLimit: number;
  example: string;
}

export interface CompassResults {
  scores: Record<string, number>;
  tier: 'Emerging' | 'Establishing' | 'Advancing' | 'Leading';
  tierDescription: string;
  focusAreas: string[];
  quickWins: string[];
}

export interface RoiEstimate {
  inputs: RoiInputs;
  conservativeValue: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
  likelyValue: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
  assumptions: string[];
  summary: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  forecast: {
    day30: number;
    day60: number;
    day90: number;
  };
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  duration_seconds: number;
  needs_clarification: boolean;
}
