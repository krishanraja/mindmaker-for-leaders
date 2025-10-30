-- Create prompt_library_profiles table
CREATE TABLE IF NOT EXISTS public.prompt_library_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES conversation_sessions(id),
  
  -- Profile data
  executive_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  communication_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  bottleneck_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  stakeholder_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  trust_calibration JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Generated content
  recommended_projects JSONB NOT NULL DEFAULT '[]'::jsonb,
  prompt_templates JSONB NOT NULL DEFAULT '[]'::jsonb,
  implementation_roadmap JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  generation_model VARCHAR(100),
  generation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_profiles_user ON public.prompt_library_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_profiles_session ON public.prompt_library_profiles(session_id);

-- Enable RLS
ALTER TABLE public.prompt_library_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own prompt profiles"
ON public.prompt_library_profiles
FOR SELECT
USING ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "System can manage prompt profiles"
ON public.prompt_library_profiles
FOR ALL
USING (true)
WITH CHECK (true);

-- Add columns to user_business_context for deep profiling
ALTER TABLE public.user_business_context 
ADD COLUMN IF NOT EXISTS communication_style JSONB,
ADD COLUMN IF NOT EXISTS thinking_process JSONB,
ADD COLUMN IF NOT EXISTS bottleneck_details JSONB,
ADD COLUMN IF NOT EXISTS stakeholder_audiences JSONB,
ADD COLUMN IF NOT EXISTS workflow_pattern JSONB,
ADD COLUMN IF NOT EXISTS ai_trust_levels JSONB;