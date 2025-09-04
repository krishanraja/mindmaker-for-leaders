-- Fix trigger_contact_collection_sync function to remove non-existent contact_data field reference
CREATE OR REPLACE FUNCTION public.trigger_contact_collection_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use internal sync function with actual table columns only
  PERFORM public.sync_lead_to_sheets(
    NEW.user_id,  -- Remove the COALESCE and contact_data reference since it doesn't exist
    NEW.session_id,
    'booking'
  );
  
  RETURN NEW;
END;
$function$;