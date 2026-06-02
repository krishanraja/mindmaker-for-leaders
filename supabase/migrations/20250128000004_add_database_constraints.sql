-- Add Database Constraints for Data Quality
-- This migration adds CHECK constraints and length limits to prevent invalid data

-- Add length constraints to text fields
ALTER TABLE leaders
  ALTER COLUMN email SET DATA TYPE VARCHAR(255),
  ALTER COLUMN name SET DATA TYPE VARCHAR(255),
  ALTER COLUMN company SET DATA TYPE VARCHAR(255),
  ALTER COLUMN role SET DATA TYPE VARCHAR(255);

-- Add CHECK constraints for email format (basic validation)
ALTER TABLE leaders
  ADD CONSTRAINT leaders_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add length constraints to leader_assessments
ALTER TABLE leader_assessments
  ALTER COLUMN source SET DATA TYPE VARCHAR(50),
  ALTER COLUMN benchmark_tier SET DATA TYPE VARCHAR(50),
  ALTER COLUMN learning_style SET DATA TYPE VARCHAR(50),
  ALTER COLUMN schema_version SET DATA TYPE VARCHAR(20);

-- Add CHECK constraints for benchmark_score (0-100)
ALTER TABLE leader_assessments
  ADD CONSTRAINT leader_assessments_benchmark_score_range 
  CHECK (benchmark_score IS NULL OR (benchmark_score >= 0 AND benchmark_score <= 100));

-- Add CHECK constraints for dimension scores
ALTER TABLE leader_dimension_scores
  ADD CONSTRAINT leader_dimension_scores_score_range 
  CHECK (score_numeric >= 0 AND score_numeric <= 100);

-- Add length constraints to dimension_scores
ALTER TABLE leader_dimension_scores
  ALTER COLUMN dimension_key SET DATA TYPE VARCHAR(50),
  ALTER COLUMN dimension_tier SET DATA TYPE VARCHAR(50);

-- Add length constraints to risk signals
ALTER TABLE leader_risk_signals
  ALTER COLUMN risk_key SET DATA TYPE VARCHAR(50),
  ALTER COLUMN level SET DATA TYPE VARCHAR(20);

-- Add CHECK constraint for risk level
ALTER TABLE leader_risk_signals
  ADD CONSTRAINT leader_risk_signals_level_check 
  CHECK (level IN ('low', 'medium', 'high', 'critical'));

-- Add length constraints to tensions
ALTER TABLE leader_tensions
  ALTER COLUMN dimension_key SET DATA TYPE VARCHAR(50);

-- Add length constraints to org scenarios
ALTER TABLE leader_org_scenarios
  ALTER COLUMN scenario_key SET DATA TYPE VARCHAR(50);

-- Add length constraints to first moves
ALTER TABLE leader_first_moves
  ALTER COLUMN move_text SET DATA TYPE VARCHAR(500);

-- Add length constraints to prompt sets
ALTER TABLE leader_prompt_sets
  ALTER COLUMN prompt_key SET DATA TYPE VARCHAR(50),
  ALTER COLUMN category SET DATA TYPE VARCHAR(50);

-- Add CHECK constraint for priority_rank (must be positive)
ALTER TABLE leader_tensions
  ADD CONSTRAINT leader_tensions_priority_rank_check 
  CHECK (priority_rank > 0);

ALTER TABLE leader_risk_signals
  ADD CONSTRAINT leader_risk_signals_priority_rank_check 
  CHECK (priority_rank > 0);

ALTER TABLE leader_org_scenarios
  ADD CONSTRAINT leader_org_scenarios_priority_rank_check 
  CHECK (priority_rank > 0);

-- Add NOT NULL constraints where appropriate
ALTER TABLE leader_assessments
  ALTER COLUMN session_id SET NOT NULL;

ALTER TABLE leader_dimension_scores
  ALTER COLUMN assessment_id SET NOT NULL,
  ALTER COLUMN dimension_key SET NOT NULL,
  ALTER COLUMN score_numeric SET NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leader_assessments_session_id 
  ON leader_assessments(session_id);

CREATE INDEX IF NOT EXISTS idx_leader_dimension_scores_assessment 
  ON leader_dimension_scores(assessment_id);

CREATE INDEX IF NOT EXISTS idx_leader_tensions_assessment 
  ON leader_tensions(assessment_id);

CREATE INDEX IF NOT EXISTS idx_leader_risk_signals_assessment 
  ON leader_risk_signals(assessment_id);

