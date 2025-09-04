-- Fix the database constraint error by dropping and recreating the trigger and function
-- First drop the trigger
DROP TRIGGER IF EXISTS contact_collection_sync_trigger ON public.booking_requests;

-- Drop the function
DROP FUNCTION IF EXISTS public.trigger_contact_collection_sync();

-- Recreate the function with correct sync_type
CREATE OR REPLACE FUNCTION public.trigger_contact_collection_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Trigger Google Sheets sync for all contact collection events using 'booking' type
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

-- Recreate the trigger
CREATE TRIGGER contact_collection_sync_trigger
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_contact_collection_sync();