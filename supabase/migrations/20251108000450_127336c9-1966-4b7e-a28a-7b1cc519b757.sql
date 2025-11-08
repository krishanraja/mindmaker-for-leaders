-- Voice Sessions Table
CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  
  -- Voice-specific fields
  voice_enabled BOOLEAN DEFAULT true,
  compass_completed_at TIMESTAMP,
  roi_completed_at TIMESTAMP,
  audio_retention_consent BOOLEAN DEFAULT false,
  
  -- Compass scores (tier-based)
  compass_scores JSONB,
  compass_tier TEXT CHECK (compass_tier IN ('Emerging', 'Establishing', 'Advancing', 'Leading')),
  compass_focus_areas TEXT[],
  
  -- ROI data
  roi_transcript TEXT,
  roi_inputs JSONB,
  roi_conservative_value NUMERIC,
  roi_likely_value NUMERIC,
  roi_assumptions TEXT[],
  
  -- Gating
  gated_unlocked_at TIMESTAMP,
  sprint_signup_source TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own voice sessions"
ON public.voice_sessions
FOR ALL
USING (
  session_id IN (
    SELECT id FROM public.conversation_sessions 
    WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

-- Voice Instrumentation Table
CREATE TABLE IF NOT EXISTS public.voice_instrumentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN ('module_start', 'module_complete', 'mic_error', 'clarifier_asked', 'abandon', 'ios_fallback', 'transcription_complete')),
  module_name TEXT CHECK (module_name IN ('compass', 'roi')),
  dwell_time_seconds INTEGER,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_instrumentation_session ON public.voice_instrumentation(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_instrumentation_event_type ON public.voice_instrumentation(event_type);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_session_id ON public.voice_sessions(session_id);

-- Add RLS for instrumentation
ALTER TABLE public.voice_instrumentation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own instrumentation"
ON public.voice_instrumentation
FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.conversation_sessions 
    WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

CREATE POLICY "Service role can insert instrumentation"
ON public.voice_instrumentation
FOR INSERT
WITH CHECK (true);