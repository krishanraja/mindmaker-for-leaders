-- Fix security warnings by adding missing RLS policies and setting search paths

-- Fix search path for functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_conversion_metrics(session_uuid UUID)
RETURNS TABLE(
  total_sessions INTEGER,
  conversion_rate DECIMAL(5,2),
  avg_lead_score DECIMAL(5,2),
  high_value_conversions INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;