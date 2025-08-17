-- Create conversation tracking tables
CREATE TABLE public.conversation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'ai_assessment',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  context JSONB DEFAULT '{}',
  assessment_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sequence_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  question_category TEXT,
  user_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  insights_generated JSONB DEFAULT '{}',
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_business_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_size TEXT,
  industry TEXT,
  ai_experience_level TEXT,
  primary_goals TEXT[],
  current_challenges TEXT[],
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversation_sessions
CREATE POLICY "Users can view their own conversation sessions" 
ON public.conversation_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation sessions" 
ON public.conversation_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation sessions" 
ON public.conversation_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for chat_messages
CREATE POLICY "Users can view messages from their sessions" 
ON public.chat_messages 
FOR SELECT 
USING (session_id IN (
  SELECT id FROM public.conversation_sessions WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their sessions" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (session_id IN (
  SELECT id FROM public.conversation_sessions WHERE user_id = auth.uid()
));

-- Create RLS policies for ai_conversations
CREATE POLICY "Users can view their own AI conversations" 
ON public.ai_conversations 
FOR SELECT 
USING (session_id IN (
  SELECT id FROM public.conversation_sessions WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create AI conversations in their sessions" 
ON public.ai_conversations 
FOR INSERT 
WITH CHECK (session_id IN (
  SELECT id FROM public.conversation_sessions WHERE user_id = auth.uid()
));

-- Create RLS policies for user_business_context
CREATE POLICY "Users can view their own business context" 
ON public.user_business_context 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business context" 
ON public.user_business_context 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business context" 
ON public.user_business_context 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for security_audit_log
CREATE POLICY "Users can view their own audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_conversation_sessions_user_id ON public.conversation_sessions(user_id);
CREATE INDEX idx_conversation_sessions_status ON public.conversation_sessions(status);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_sequence ON public.chat_messages(session_id, sequence_number);
CREATE INDEX idx_ai_conversations_session_id ON public.ai_conversations(session_id);
CREATE INDEX idx_user_business_context_user_id ON public.user_business_context(user_id);
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_conversation_sessions_updated_at
  BEFORE UPDATE ON public.conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_business_context_updated_at
  BEFORE UPDATE ON public.user_business_context
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();