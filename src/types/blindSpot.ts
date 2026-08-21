export type BlindSpotKind = 'pattern' | 'tension';

export type BlindSpotSourceKind =
  | 'memory'
  | 'decision'
  | 'decision_case'
  | 'mission'
  | 'check_in';

export type BlindSpotAnchorRole = 'intention' | 'recurrence';

export interface BlindSpotAnchor {
  sourceId: string;
  sourceKind: BlindSpotSourceKind;
  label: string;
  excerpt: string;
  observedAt: string;
  role: BlindSpotAnchorRole;
}

export interface BlindSpotEvidenceStrength {
  signalCount: number;
  sourceTypeCount: number;
  windowDays: number | null;
}

export interface BlindSpotExperimentProposal {
  title: string;
  instruction: string;
  checkInPrompt: string;
  durationMinutes: number;
}

export interface BlindSpotCandidateV2 {
  kind: BlindSpotKind;
  headline: string;
  explanation: string;
  evidenceStrength: BlindSpotEvidenceStrength;
  intention: BlindSpotAnchor | null;
  recurrence: BlindSpotAnchor[];
  question: string;
  experiment: BlindSpotExperimentProposal | null;
}

export type BlindSpotRejectionReason =
  | 'wrong_pattern'
  | 'evidence_stale'
  | 'missing_context';

export interface BlindSpotGenerateResponse {
  candidate?: BlindSpotCandidateV2;
  candidateToken?: string;
  anchorFingerprint?: string;
  suppressed?: boolean;
  error?: string;
}

export interface BlindSpotExperiment {
  id: string;
  pattern_id: string;
  title: string;
  instruction: string;
  check_in_prompt: string;
  duration_minutes: number;
  due_at: string;
  expires_at: string;
  status: 'active' | 'completed' | 'expired';
  outcome: 'positive' | 'not_really' | 'not_yet' | null;
  defer_count: number;
  user_note: string | null;
}

export type BlindSpotExperimentOutcome = 'positive' | 'not_really' | 'not_yet';

export type BlindSpotFixtureState =
  | 'pattern'
  | 'tension'
  | 'loading'
  | 'error'
  | 'accepted'
  | 'rejected'
  | 'conversation'
  | 'stale-evidence'
  | 'long-content';
