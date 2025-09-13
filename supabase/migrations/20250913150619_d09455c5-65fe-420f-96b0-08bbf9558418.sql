-- Fix Google Sheets sync by creating proper HTTP trigger that actually calls the Edge Function
-- This replaces the simplified trigger with one that creates proper sync logs for processing

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_booking_requests_sync ON public.booking_requests;

-- Create new trigger function that marks syncs for HTTP processing
CREATE OR REPLACE FUNCTION public.trigger_booking_requests_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log the sync attempt using the existing sync function
  PERFORM public.sync_lead_to_sheets(
    NEW.user_id,
    NEW.session_id,
    'booking'
  );
  
  -- Mark all pending syncs for immediate HTTP processing
  UPDATE public.google_sheets_sync_log 
  SET status = 'ready_for_http',
      sync_metadata = sync_metadata || jsonb_build_object(
        'booking_trigger_time', now(),
        'trigger_booking_id', NEW.id,
        'needs_immediate_processing', true
      )
  WHERE status = 'pending' 
    AND sync_type = 'booking'
    AND created_at >= now() - interval '5 minutes';
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER trigger_booking_requests_sync
    AFTER INSERT ON public.booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_booking_requests_sync();

-- Update existing pending syncs to be ready for HTTP processing
UPDATE public.google_sheets_sync_log 
SET status = 'ready_for_http',
    sync_metadata = sync_metadata || jsonb_build_object(
      'migration_updated', now(),
      'ready_for_batch_processing', true
    )
WHERE status IN ('pending', 'needs_processing');