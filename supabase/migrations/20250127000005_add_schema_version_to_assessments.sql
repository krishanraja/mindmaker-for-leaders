-- Fix #10: Add schema version field to assessments for future-proofing

-- Add schema_version column to leader_assessments
ALTER TABLE leader_assessments
ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0';

-- Add index for version lookups
CREATE INDEX IF NOT EXISTS idx_leader_assessments_schema_version 
ON leader_assessments(schema_version);

-- Update existing records to version 1.0
UPDATE leader_assessments
SET schema_version = '1.0'
WHERE schema_version IS NULL;

-- Add comment
COMMENT ON COLUMN leader_assessments.schema_version IS 
'Schema version for this assessment. Used for migration and compatibility checks. Current version: 1.0';
