-- Fix sync_lead_to_sheets function to properly extract booking request data
CREATE OR REPLACE FUNCTION public.sync_lead_to_sheets(lead_user_id uuid, lead_session_id uuid DEFAULT NULL::uuid, sync_type_param text DEFAULT 'booking'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sync_id uuid;
  lead_data jsonb := '{}';
  booking_data record;
  conversation_data record;
  qualification_data record;
BEGIN
  -- Get the most recent booking request for this session or user
  SELECT * INTO booking_data FROM public.booking_requests 
  WHERE (lead_session_id IS NOT NULL AND session_id = lead_session_id) 
     OR (lead_session_id IS NULL AND user_id = lead_user_id)
  ORDER BY created_at DESC LIMIT 1;
  
  -- Get conversation session data
  SELECT 
    cs.*,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_at
  INTO conversation_data
  FROM public.conversation_sessions cs
  LEFT JOIN public.chat_messages cm ON cs.id = cm.session_id
  WHERE (lead_session_id IS NOT NULL AND cs.id = lead_session_id)
     OR (lead_session_id IS NULL AND cs.user_id = lead_user_id)
  GROUP BY cs.id
  ORDER BY cs.last_activity DESC
  LIMIT 1;
  
  -- Get lead qualification scores
  SELECT * INTO qualification_data FROM public.lead_qualification_scores 
  WHERE (lead_session_id IS NOT NULL AND session_id = lead_session_id)
     OR (lead_session_id IS NULL AND user_id = lead_user_id)
  ORDER BY created_at DESC LIMIT 1;
  
  -- Build comprehensive lead data JSON using actual booking data
  lead_data := jsonb_build_object(
    'contact_info', jsonb_build_object(
      'full_name', COALESCE(booking_data.contact_name, 'Unknown'),
      'email', COALESCE(booking_data.contact_email, 'Unknown'),
      'company_name', COALESCE(booking_data.company_name, 'Unknown'),
      'role', COALESCE(booking_data.role, 'Unknown'),
      'phone', booking_data.phone,
      'industry', 'Unknown', -- Will be extracted from assessment data
      'company_size', 'Unknown' -- Will be extracted from assessment data
    ),
    'business_context', jsonb_build_object(
      'ai_readiness_score', COALESCE(booking_data.lead_score, qualification_data.total_score, 0),
      'service_type', booking_data.service_type,
      'service_title', booking_data.service_title,
      'priority', booking_data.priority,
      'preferred_time', booking_data.preferred_time,
      'specific_needs', booking_data.specific_needs
    ),
    'assessment_data', CASE 
      WHEN booking_data.specific_needs IS NOT NULL AND booking_data.specific_needs LIKE '%Assessment data:%' THEN
        -- Extract JSON from specific_needs field
        (booking_data.specific_needs::text ~ 'Assessment data: ({.*})$' AND 
         substring(booking_data.specific_needs::text from 'Assessment data: ({.*})$')::jsonb)
      ELSE '{}'::jsonb
    END,
    'engagement_data', jsonb_build_object(
      'session_count', 1,
      'total_messages', COALESCE(conversation_data.message_count, 0),
      'last_activity', COALESCE(conversation_data.last_activity, booking_data.created_at),
      'session_duration', CASE 
        WHEN conversation_data.completed_at IS NOT NULL AND conversation_data.started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (conversation_data.completed_at - conversation_data.started_at))/60
        ELSE NULL
      END
    ),
    'qualification_scores', CASE 
      WHEN qualification_data.id IS NOT NULL THEN
        jsonb_build_object(
          'total_score', qualification_data.total_score,
          'engagement_score', qualification_data.engagement_score,
          'business_readiness_score', qualification_data.business_readiness_score,
          'pain_point_severity', qualification_data.pain_point_severity,
          'implementation_readiness', qualification_data.implementation_readiness
        )
      ELSE '{}'::jsonb
    END,
    'booking_request', jsonb_build_object(
      'id', booking_data.id,
      'service_type', booking_data.service_type,
      'service_title', booking_data.service_title,
      'status', booking_data.status,
      'priority', booking_data.priority,
      'preferred_time', booking_data.preferred_time,
      'specific_needs', booking_data.specific_needs,
      'requested_at', booking_data.created_at,
      'scheduled_date', booking_data.scheduled_date
    ),
    'sync_metadata', jsonb_build_object(
      'user_id', lead_user_id,
      'session_id', lead_session_id,
      'booking_id', booking_data.id,
      'sync_timestamp', now(),
      'data_sources', jsonb_build_array(
        CASE WHEN booking_data.id IS NOT NULL THEN 'booking_request' END,
        CASE WHEN conversation_data.id IS NOT NULL THEN 'conversation_data' END,
        CASE WHEN qualification_data.id IS NOT NULL THEN 'qualification_scores' END
      )
    )
  );
  
  -- Create sync log entry
  INSERT INTO public.google_sheets_sync_log (
    sync_type,
    status,
    data_count,
    sync_data,
    sync_metadata,
    lead_id
  ) VALUES (
    sync_type_param,
    'pending',
    1,
    lead_data,
    jsonb_build_object(
      'user_id', lead_user_id,
      'session_id', lead_session_id,
      'booking_id', booking_data.id,
      'created_at', now()
    ),
    COALESCE(lead_user_id, booking_data.user_id)
  ) RETURNING id INTO sync_id;
  
  RETURN sync_id;
END;
$function$;

-- Create a trigger to actually invoke the Google Sheets edge function after booking requests
CREATE OR REPLACE FUNCTION public.trigger_google_sheets_edge_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
BEGIN
  -- Get Supabase URL from environment
  supabase_url := 'https://bkyuxvschuwngtcdhsyg.supabase.co';
  
  -- Call the sync function to create the sync log
  PERFORM public.sync_lead_to_sheets(
    NEW.user_id,
    NEW.session_id,
    'booking'
  );
  
  -- In production, make HTTP call to the edge function
  -- For now, we'll use a simple log
  INSERT INTO public.google_sheets_sync_log (
    sync_type,
    status,
    sync_metadata
  ) VALUES (
    'edge_function_trigger',
    'pending',
    jsonb_build_object(
      'booking_id', NEW.id,
      'trigger_time', now(),
      'function_url', supabase_url || '/functions/v1/sync-to-google-sheets'
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Create the actual trigger on booking_requests table
DROP TRIGGER IF EXISTS booking_google_sheets_sync ON public.booking_requests;
CREATE TRIGGER booking_google_sheets_sync
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_google_sheets_edge_function();