-- Fix all trigger functions to remove net.http_post() calls and use internal sync methods

-- Fix trigger_contact_collection_sync function
CREATE OR REPLACE FUNCTION public.trigger_contact_collection_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use internal sync function instead of net.http_post()
  PERFORM public.sync_lead_to_sheets(
    COALESCE(NEW.user_id, (NEW.contact_data->>'auth_user_id')::uuid),
    NEW.session_id,
    'booking'
  );
  
  RETURN NEW;
END;
$function$;

-- Fix trigger_booking_sheets_sync function
CREATE OR REPLACE FUNCTION public.trigger_booking_sheets_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use internal sync function instead of net.http_post()
  PERFORM public.sync_lead_to_sheets(
    NEW.user_id,
    NEW.session_id,
    'booking'
  );
  
  RETURN NEW;
END;
$function$;

-- Fix trigger_lead_score_sheets_sync function
CREATE OR REPLACE FUNCTION public.trigger_lead_score_sheets_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only sync if it's a high-value lead (score > 50)
  IF NEW.total_score > 50 THEN
    PERFORM public.sync_lead_to_sheets(
      NEW.user_id,
      NEW.session_id,
      'booking'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix trigger_analytics_sheets_sync function
CREATE OR REPLACE FUNCTION public.trigger_analytics_sheets_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only sync for certain conversion types
  IF NEW.conversion_type IN ('booking', 'high_engagement', 'qualified_lead') THEN
    PERFORM public.sync_lead_to_sheets(
      NEW.user_id,
      NEW.session_id,
      'booking'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix trigger_anonymous_booking_sync function
CREATE OR REPLACE FUNCTION public.trigger_anonymous_booking_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use internal sync function instead of net.http_post()
  PERFORM public.sync_lead_to_sheets(
    NEW.user_id,
    NEW.session_id,
    'booking'
  );
  
  RETURN NEW;
END;
$function$;

-- Fix trigger_anonymous_lead_sync function
CREATE OR REPLACE FUNCTION public.trigger_anonymous_lead_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only sync for anonymous high-value leads
  IF NEW.total_score > 50 THEN
    PERFORM public.sync_lead_to_sheets(
      NEW.user_id,
      NEW.session_id,
      'booking'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;