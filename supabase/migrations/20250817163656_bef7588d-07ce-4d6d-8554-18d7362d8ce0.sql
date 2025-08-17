-- Fix remaining search_path issues for all existing functions

-- Update existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_conversion_metrics(session_uuid uuid)
RETURNS TABLE(total_sessions integer, conversion_rate numeric, avg_lead_score numeric, high_value_conversions integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.trigger_google_sheets_sync(sync_type_param text DEFAULT 'booking'::text)
RETURNS TABLE(sync_id uuid, records_prepared integer, sync_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_sync_id UUID;
  record_count INTEGER := 0;
BEGIN
  -- Create sync log entry
  INSERT INTO public.google_sheets_sync_log (sync_type, status)
  VALUES (sync_type_param, 'pending')
  RETURNING id INTO new_sync_id;
  
  -- Count records based on sync type
  CASE sync_type_param
    WHEN 'booking' THEN
      SELECT COUNT(*) INTO record_count FROM public.booking_requests WHERE created_at >= NOW() - INTERVAL '7 days';
    WHEN 'analytics' THEN
      SELECT COUNT(*) INTO record_count FROM public.conversion_analytics WHERE created_at >= NOW() - INTERVAL '7 days';
    WHEN 'lead_scores' THEN
      SELECT COUNT(*) INTO record_count FROM public.lead_qualification_scores WHERE created_at >= NOW() - INTERVAL '7 days';
    ELSE
      record_count := 0;
  END CASE;
  
  -- Update sync log with count
  UPDATE public.google_sheets_sync_log 
  SET data_count = record_count,
      sync_metadata = jsonb_build_object('trigger_time', NOW(), 'record_count', record_count)
  WHERE id = new_sync_id;
  
  RETURN QUERY SELECT new_sync_id, record_count, 'pending'::TEXT;
END;
$$;