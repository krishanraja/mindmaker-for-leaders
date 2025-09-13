-- Phase 1: Create HTTP-calling trigger function and clean up redundant triggers
-- Remove all redundant triggers first
DROP TRIGGER IF EXISTS booking_sheets_sync_trigger ON public.booking_requests;
DROP TRIGGER IF EXISTS trigger_anonymous_booking_requests ON public.booking_requests;
DROP TRIGGER IF EXISTS contact_collection_sync_trigger ON public.booking_requests;
DROP TRIGGER IF EXISTS booking_google_sheets_sync ON public.booking_requests;

-- Create the main HTTP-calling trigger function that actually invokes the Edge Function
CREATE OR REPLACE FUNCTION public.trigger_booking_http_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
  http_response text;
BEGIN
  -- Get Supabase URL
  supabase_url := 'https://bkyuxvschuwngtcdhsyg.supabase.co';
  
  -- Log the sync attempt first
  PERFORM public.sync_lead_to_sheets(
    NEW.user_id,
    NEW.session_id,
    'booking'
  );
  
  -- Make actual HTTP call to Edge Function using pg_net extension
  BEGIN
    SELECT INTO http_response
      net.http_post(
        url := supabase_url || '/functions/v1/sync-to-google-sheets',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'type', 'booking',
          'trigger_type', 'database_trigger',
          'booking_id', NEW.id,
          'data', jsonb_build_object(
            'user_id', NEW.user_id,
            'session_id', NEW.session_id,
            'contact_email', NEW.contact_email,
            'contact_name', NEW.contact_name,
            'company_name', NEW.company_name,
            'service_type', NEW.service_type,
            'lead_score', NEW.lead_score
          )
        )
      );
      
    -- Log successful HTTP call
    INSERT INTO public.google_sheets_sync_log (
      sync_type,
      status,
      sync_metadata
    ) VALUES (
      'booking',
      'http_sent',
      jsonb_build_object(
        'booking_id', NEW.id,
        'trigger_time', now(),
        'trigger_source', 'http_trigger',
        'function_url', supabase_url || '/functions/v1/sync-to-google-sheets',
        'http_response', http_response
      )
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Log failed HTTP call but don't block the insert
    INSERT INTO public.google_sheets_sync_log (
      sync_type,
      status,
      error_message,
      sync_metadata
    ) VALUES (
      'booking',
      'http_failed',
      SQLERRM,
      jsonb_build_object(
        'booking_id', NEW.id,
        'trigger_time', now(),
        'trigger_source', 'http_trigger_failed',
        'function_url', supabase_url || '/functions/v1/sync-to-google-sheets',
        'error_details', SQLERRM
      )
    );
  END;
  
  RETURN NEW;
END;
$function$;

-- Create single consolidated trigger
CREATE TRIGGER booking_http_sync_trigger
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_booking_http_sync();

-- Create function to process pending sync logs by calling Edge Function
CREATE OR REPLACE FUNCTION public.process_pending_sync_logs()
RETURNS TABLE(processed_count integer, success_count integer, error_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
  pending_log record;
  http_response text;
  total_processed integer := 0;
  total_success integer := 0;
  total_errors integer := 0;
BEGIN
  supabase_url := 'https://bkyuxvschuwngtcdhsyg.supabase.co';
  
  -- Process each pending sync log
  FOR pending_log IN 
    SELECT id, sync_type, sync_data, sync_metadata 
    FROM public.google_sheets_sync_log 
    WHERE status = 'pending' 
    ORDER BY created_at ASC
    LIMIT 50  -- Process in batches
  LOOP
    total_processed := total_processed + 1;
    
    BEGIN
      -- Make HTTP call to Edge Function
      SELECT INTO http_response
        net.http_post(
          url := supabase_url || '/functions/v1/sync-to-google-sheets',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'type', pending_log.sync_type,
            'trigger_type', 'batch_processing',
            'sync_log_id', pending_log.id,
            'data', pending_log.sync_data
          )
        );
      
      -- Update log as http_sent
      UPDATE public.google_sheets_sync_log
      SET 
        status = 'http_sent',
        last_updated_at = now(),
        sync_metadata = sync_metadata || jsonb_build_object(
          'batch_processed_at', now(),
          'http_response', http_response
        )
      WHERE id = pending_log.id;
      
      total_success := total_success + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Update log as failed but continue processing others
      UPDATE public.google_sheets_sync_log
      SET 
        status = 'batch_failed',
        error_message = SQLERRM,
        last_updated_at = now(),
        sync_metadata = sync_metadata || jsonb_build_object(
          'batch_error_at', now(),
          'batch_error_details', SQLERRM
        )
      WHERE id = pending_log.id;
      
      total_errors := total_errors + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT total_processed, total_success, total_errors;
END;
$function$;