-- Fix trigger_booking_sync function to use valid sync_type
CREATE OR REPLACE FUNCTION public.trigger_booking_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Trigger sync for new booking requests using valid sync_type 'booking'
  PERFORM public.sync_lead_to_sheets(
    NEW.user_id,
    NEW.session_id,
    'booking'
  );
  
  RETURN NEW;
END;
$function$;

-- Fix trigger_business_context_sync function to use valid sync_type
CREATE OR REPLACE FUNCTION public.trigger_business_context_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger sync for significant updates (when AI readiness score is set or context data changes)
  IF (NEW.ai_readiness_score IS NOT NULL AND NEW.ai_readiness_score != COALESCE(OLD.ai_readiness_score, 0)) OR
     (NEW.context_data IS NOT NULL AND NEW.context_data != COALESCE(OLD.context_data, '{}'::jsonb)) THEN
    PERFORM public.sync_lead_to_sheets(
      NEW.user_id,
      NULL,
      'booking'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix sync_lead_to_sheets function default parameter to use valid sync_type
CREATE OR REPLACE FUNCTION public.sync_lead_to_sheets(lead_user_id uuid, lead_session_id uuid DEFAULT NULL::uuid, sync_type_param text DEFAULT 'booking'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sync_id uuid;
  lead_data jsonb := '{}';
  user_data record;
  business_data record;
  diagnostic_data record;
  booking_data record;
  conversation_data record;
  qualification_data record;
BEGIN
  -- Get user profile data
  SELECT * INTO user_data FROM public.users WHERE auth_user_id = lead_user_id;
  
  -- Get business context
  SELECT * INTO business_data FROM public.user_business_context WHERE user_id = lead_user_id ORDER BY updated_at DESC LIMIT 1;
  
  -- Get latest diagnostic data (if exists)
  SELECT 
    context_data,
    ai_readiness_score,
    updated_at as diagnostic_date
  INTO diagnostic_data 
  FROM public.user_business_context 
  WHERE user_id = lead_user_id AND context_data IS NOT NULL 
  ORDER BY updated_at DESC LIMIT 1;
  
  -- Get booking request data
  SELECT * INTO booking_data FROM public.booking_requests 
  WHERE user_id = lead_user_id 
  ORDER BY created_at DESC LIMIT 1;
  
  -- Get conversation session data
  SELECT 
    cs.*,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_at
  INTO conversation_data
  FROM public.conversation_sessions cs
  LEFT JOIN public.chat_messages cm ON cs.id = cm.session_id
  WHERE cs.user_id = lead_user_id
  AND (lead_session_id IS NULL OR cs.id = lead_session_id)
  GROUP BY cs.id
  ORDER BY cs.last_activity DESC
  LIMIT 1;
  
  -- Get lead qualification scores
  SELECT * INTO qualification_data FROM public.lead_qualification_scores 
  WHERE user_id = lead_user_id 
  ORDER BY created_at DESC LIMIT 1;
  
  -- Build comprehensive lead data JSON
  lead_data := jsonb_build_object(
    'contact_info', jsonb_build_object(
      'full_name', COALESCE(user_data.full_name, 'Unknown'),
      'email', COALESCE(user_data.email, 'Unknown'),
      'company_name', COALESCE(user_data.company_name, business_data.business_name, booking_data.company_name, 'Unknown'),
      'role', COALESCE(user_data.role_title, booking_data.role, 'Unknown'),
      'industry', COALESCE(user_data.industry, business_data.industry, 'Unknown'),
      'company_size', COALESCE(user_data.company_size, business_data.company_size, 'Unknown'),
      'website', business_data.website_url,
      'phone', booking_data.phone
    ),
    'business_context', jsonb_build_object(
      'description', business_data.business_description,
      'primary_challenges', business_data.primary_challenges,
      'ai_readiness_score', COALESCE(business_data.ai_readiness_score, qualification_data.total_score, 0)
    ),
    'diagnostic_results', COALESCE(diagnostic_data.context_data, '{}'),
    'engagement_data', jsonb_build_object(
      'session_count', (SELECT COUNT(*) FROM public.conversation_sessions WHERE user_id = lead_user_id),
      'total_messages', COALESCE(conversation_data.message_count, 0),
      'last_activity', conversation_data.last_activity,
      'session_duration', EXTRACT(EPOCH FROM (conversation_data.completed_at - conversation_data.started_at))/60,
      'insights_generated', (SELECT COUNT(*) FROM public.ai_insights_generated WHERE user_id = lead_user_id)
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
    'booking_request', CASE 
      WHEN booking_data.id IS NOT NULL THEN
        jsonb_build_object(
          'service_type', booking_data.service_type,
          'service_title', booking_data.service_title,
          'status', booking_data.status,
          'priority', booking_data.priority,
          'preferred_time', booking_data.preferred_time,
          'specific_needs', booking_data.specific_needs,
          'requested_at', booking_data.created_at
        )
      ELSE '{}'::jsonb
    END,
    'sync_metadata', jsonb_build_object(
      'user_id', lead_user_id,
      'session_id', lead_session_id,
      'sync_timestamp', now(),
      'data_sources', jsonb_build_array(
        CASE WHEN user_data.id IS NOT NULL THEN 'user_profile' END,
        CASE WHEN business_data.id IS NOT NULL THEN 'business_context' END,
        CASE WHEN diagnostic_data.diagnostic_date IS NOT NULL THEN 'diagnostic_results' END,
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
      'created_at', now()
    ),
    lead_user_id
  ) RETURNING id INTO sync_id;
  
  RETURN sync_id;
END;
$function$;