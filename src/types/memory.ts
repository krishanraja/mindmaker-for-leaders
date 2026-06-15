/**
 * User Memory System Types
 * Voice-first context extraction and verification
 */

export type FactCategory = 'identity' | 'business' | 'objective' | 'blocker' | 'preference';

export type VerificationStatus = 'inferred' | 'verified' | 'corrected' | 'rejected';

export type MemorySourceType = 'voice' | 'form' | 'linkedin' | 'calendar' | 'enrichment' | 'markdown';

export interface UserMemoryFact {
  id: string;
  user_id: string;
  fact_key: string;
  fact_category: FactCategory;
  fact_label: string;
  fact_value: string;
  fact_context?: string;
  confidence_score: number;
  is_high_stakes: boolean;
  verification_status: VerificationStatus;
  verified_at?: string;
  source_type: MemorySourceType;
  source_session_id?: string;
  is_current: boolean;
  /**
   * Brain importance, 1-10 (LLM-scored at creation, sharpened by decision
   * outcomes via the credit loop). Facts at IMPORTANCE_HOT_TIER+ are
   * hot-tiered - always kept in the model's context. Optional: pre-brain
   * rows / older API shapes may omit it. NOTE: for most facts today this is
   * still the day-1 estimate (it is only *earned* once an outcome sharpens
   * it) - so the UI claims behaviour ("kept in context"), never truth
   * ("this is important").
   */
  importance?: number;
  created_at: string;
  updated_at: string;
}

/**
 * The hot-tier threshold the brain uses (memory-lifecycle promotes
 * importance>=8 to the always-loaded context tier). Surfaced behaviourally
 * as the "Core context" marker - a claim about what the brain DOES, not a
 * verdict on the fact's truth/importance.
 */
export const IMPORTANCE_HOT_TIER = 8;

export interface PendingVerification {
  id: string;
  fact_key: string;
  fact_category: FactCategory;
  fact_label: string;
  fact_value: string;
  fact_context?: string;
  confidence_score: number;
}

export interface ExtractedFact {
  fact_key: string;
  fact_category: FactCategory;
  fact_label: string;
  fact_value: string;
  fact_context: string;
  confidence_score: number;
  is_high_stakes: boolean;
}

export interface ExtractionResult {
  success: boolean;
  facts_extracted?: number;
  facts_stored?: number;
  facts?: ExtractedFact[];
  pending_verifications: PendingVerification[];
  error?: string;
}

export interface MemoryContext {
  verified: UserMemoryFact[];
  inferred: UserMemoryFact[];
  formatted: string;
}

// Category metadata for UI
export const FACT_CATEGORY_META: Record<FactCategory, { icon: string; label: string; color: string }> = {
  identity: { icon: 'User', label: 'About You', color: 'blue' },
  business: { icon: 'Building', label: 'Your Business', color: 'purple' },
  objective: { icon: 'Target', label: 'Your Goals', color: 'green' },
  blocker: { icon: 'AlertTriangle', label: 'Challenges', color: 'orange' },
  preference: { icon: 'Settings', label: 'Preferences', color: 'gray' },
};

// ===== Memory Web Types =====

export type Temperature = 'hot' | 'warm' | 'cold';

export type PatternType = 'preference' | 'anti_preference' | 'behavior' | 'blindspot' | 'strength';

export type ExportFormat = 'chatgpt' | 'claude' | 'gemini' | 'cursor' | 'claude-code' | 'markdown';

export type ExportUseCase =
  | 'general' | 'meeting' | 'decision' | 'code' | 'email' | 'strategy'
  | 'delegation' | 'board'
  | 'writing_persona'
  | 'strength_framework'
  | 'delegation_playbook'
  | 'strategic_advisor'
  | 'decision_journal';

export interface MemoryWebFact {
  id: string;
  user_id: string;
  fact_key: string;
  fact_category: FactCategory;
  fact_label: string;
  fact_value: string;
  fact_context?: string;
  confidence_score: number;
  is_high_stakes: boolean;
  verification_status: VerificationStatus;
  verified_at?: string;
  source_type: MemorySourceType;
  source_session_id?: string;
  is_current: boolean;
  temperature: Temperature;
  last_referenced_at?: string;
  reference_count: number;
  archived_at?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface UserPattern {
  id: string;
  user_id: string;
  pattern_type: PatternType;
  pattern_text: string;
  confidence: number;
  evidence_count: number;
  first_observed_at: string;
  last_confirmed_at: string;
  status: 'confirmed' | 'emerging' | 'deprecated';
  source_facts: string[];
  created_at: string;
}

export type DecisionSource = 'manual' | 'voice' | 'check_in' | 'mission' | 'assessment';

export interface UserDecision {
  id: string;
  user_id: string;
  decision_text: string;
  rationale: string | null;
  context_snapshot: Record<string, unknown>;
  status: 'active' | 'superseded' | 'reversed';
  superseded_by: string | null;
  source: DecisionSource;
  created_at: string;
  updated_at: string;
}

export interface MemoryWebStats {
  total_facts: number;
  verified_count: number;
  verified_rate: number;
  temperature_distribution: Record<Temperature, number>;
  category_distribution: Record<FactCategory, number>;
  health_score: number;
  patterns_count: number;
  decisions_count: number;
}

export interface GettingSmarterDelta {
  new_facts: number;
  new_patterns: number;
  new_decisions: number;
  period: string;
}

export interface MemoryBudget {
  hot_token_count: number;
  hot_max_tokens: number;
  warm_token_count: number;
  warm_max_tokens: number;
  total_facts: number;
  last_cleanup_at: string;
}

export interface ExportArtefact {
  filename: string;
  mime: string;
  kind: string;
  content: string;
}

export interface MemoryExportResult {
  format: ExportFormat;
  use_case: ExportUseCase;
  content: string;
  token_count: number;
  last_updated: string;
  artefacts?: ExportArtefact[];
  primary_filename?: string;
  primary_mime?: string;
}

// Common fact keys and their labels
export const FACT_KEY_LABELS: Record<string, string> = {
  role: 'Your Role',
  title: 'Job Title',
  department: 'Department',
  team_size: 'Team Size',
  reports_to: 'Reports To',
  seniority: 'Seniority Level',
  company_name: 'Company',
  company: 'Company',
  industry: 'Industry',
  vertical: 'Business Vertical',
  company_size: 'Company Size',
  growth_stage: 'Growth Stage',
  main_goal: 'Main Goal',
  main_objective: 'Main Objective',
  quarterly_priority: 'Quarterly Priority',
  success_metric: 'Success Metric',
  main_blocker: 'Main Challenge',
  personal_blocker: 'Personal Challenge',
  team_blocker: 'Team Challenge',
  org_blocker: 'Organizational Challenge',
  time_constraint: 'Time Constraint',
  communication_style: 'Communication Style',
  decision_style: 'Decision Making Style',
  delegation_comfort: 'Delegation Comfort',
};
