-- Add 'kit' and 'capsule' to memory_source_type for the Kit Engine:
-- 'kit'     = facts written from class kit intake answers
-- 'capsule' = facts parsed from a pasted Context Capsule (student's own AI)
-- Pattern mirrors 20260321000000_add_markdown_source_type.sql.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'kit'
    AND enumtypid = 'public.memory_source_type'::regtype
  ) THEN
    ALTER TYPE public.memory_source_type ADD VALUE 'kit';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'capsule'
    AND enumtypid = 'public.memory_source_type'::regtype
  ) THEN
    ALTER TYPE public.memory_source_type ADD VALUE 'capsule';
  END IF;
END $$;
