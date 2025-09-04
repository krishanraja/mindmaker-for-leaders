-- Fix the trigger_google_sheets_edge_function to use valid sync_type
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
  -- For now, we'll use a simple log with valid sync_type
  INSERT INTO public.google_sheets_sync_log (
    sync_type,
    status,
    sync_metadata
  ) VALUES (
    'booking',  -- Changed from 'edge_function_trigger' to 'booking' to comply with check constraint
    'pending',
    jsonb_build_object(
      'booking_id', NEW.id,
      'trigger_time', now(),
      'trigger_source', 'edge_function_trigger',
      'function_url', supabase_url || '/functions/v1/sync-to-google-sheets'
    )
  );
  
  RETURN NEW;
END;
$function$;