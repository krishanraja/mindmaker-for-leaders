-- Fix booking_requests service_type constraint to include actual application values
ALTER TABLE public.booking_requests 
DROP CONSTRAINT IF EXISTS booking_requests_service_type_check;

-- Add updated constraint that includes the actual service types being used
ALTER TABLE public.booking_requests 
ADD CONSTRAINT booking_requests_service_type_check 
CHECK (service_type IN ('consultation', 'workshop', 'assessment', 'implementation', 'strategy_call', 'learn_more'));

-- Create trigger to ensure all booking requests sync to Google Sheets
CREATE OR REPLACE FUNCTION public.trigger_contact_collection_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Trigger Google Sheets sync for all contact collection events
  PERFORM
    net.http_post(
      url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/sync-to-google-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'booking',
        'trigger_type', 'contact_collection',
        'data', row_to_json(NEW)
      )
    );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for contact collection sync
DROP TRIGGER IF EXISTS contact_collection_sync_trigger ON public.booking_requests;
CREATE TRIGGER contact_collection_sync_trigger
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_contact_collection_sync();