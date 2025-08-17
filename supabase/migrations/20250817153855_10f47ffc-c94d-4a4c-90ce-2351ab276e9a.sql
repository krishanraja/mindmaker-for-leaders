-- Create booking requests table
CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('consultation', 'workshop', 'assessment', 'implementation')),
  service_title TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  company_name TEXT,
  role TEXT,
  phone TEXT,
  preferred_time TEXT,
  specific_needs TEXT,
  lead_score INTEGER DEFAULT 0,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'scheduled', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics tracking table
CREATE TABLE public.conversion_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('booking_request', 'email_signup', 'resource_download', 'consultation_scheduled')),
  service_type TEXT,
  lead_score INTEGER,
  session_duration INTEGER, -- in seconds
  messages_exchanged INTEGER DEFAULT 0,
  topics_explored INTEGER DEFAULT 0,
  insights_generated INTEGER DEFAULT 0,
  conversion_value DECIMAL(10,2), -- estimated value of conversion
  source_channel TEXT DEFAULT 'ai_chat',
  conversion_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for booking_requests
CREATE POLICY "Users can view their own booking requests" 
ON public.booking_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own booking requests" 
ON public.booking_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking requests" 
ON public.booking_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for conversion_analytics
CREATE POLICY "Users can view their own conversion analytics" 
ON public.conversion_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create conversion analytics" 
ON public.conversion_analytics 
FOR INSERT 
WITH CHECK (true); -- Allow system to insert analytics

-- Create indexes for performance
CREATE INDEX idx_booking_requests_session_id ON public.booking_requests(session_id);
CREATE INDEX idx_booking_requests_user_id ON public.booking_requests(user_id);
CREATE INDEX idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX idx_booking_requests_lead_score ON public.booking_requests(lead_score);
CREATE INDEX idx_conversion_analytics_session_id ON public.conversion_analytics(session_id);
CREATE INDEX idx_conversion_analytics_user_id ON public.conversion_analytics(user_id);
CREATE INDEX idx_conversion_analytics_conversion_type ON public.conversion_analytics(conversion_type);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_booking_requests_updated_at
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate conversion metrics
CREATE OR REPLACE FUNCTION public.calculate_conversion_metrics(session_uuid UUID)
RETURNS TABLE(
  total_sessions INTEGER,
  conversion_rate DECIMAL(5,2),
  avg_lead_score DECIMAL(5,2),
  high_value_conversions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT cs.id)::INTEGER as total_sessions,
    (COUNT(DISTINCT br.id)::DECIMAL / NULLIF(COUNT(DISTINCT cs.id), 0) * 100) as conversion_rate,
    AVG(lqs.total_score) as avg_lead_score,
    COUNT(DISTINCT CASE WHEN br.priority = 'high' THEN br.id END)::INTEGER as high_value_conversions
  FROM public.conversation_sessions cs
  LEFT JOIN public.booking_requests br ON cs.id = br.session_id
  LEFT JOIN public.lead_qualification_scores lqs ON cs.id = lqs.session_id
  WHERE (session_uuid IS NULL OR cs.id = session_uuid);
END;
$$ LANGUAGE plpgsql;