-- Remove pg_net dependency and simplify the trigger
-- Since pg_net extension is not available, we'll use a simpler approach
CREATE OR REPLACE FUNCTION public.trigger_booking_http_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log the sync attempt first
  PERFORM public.sync_lead_to_sheets(
    NEW.user_id,
    NEW.session_id,
    'booking'
  );
  
  -- Create a log entry indicating that manual processing is needed
  INSERT INTO public.google_sheets_sync_log (
    sync_type,
    status,
    sync_metadata
  ) VALUES (
    'booking',
    'needs_processing',
    jsonb_build_object(
      'booking_id', NEW.id,
      'trigger_time', now(),
      'trigger_source', 'simplified_trigger',
      'note', 'Use batch-process-pending-syncs function to process this'
    )
  );
  
  RETURN NEW;
END;
$function$;