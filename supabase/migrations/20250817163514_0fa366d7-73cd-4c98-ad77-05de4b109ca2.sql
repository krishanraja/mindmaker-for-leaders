-- Fix security warning: Function Search Path Mutable
-- Update functions to have proper search_path configuration

CREATE OR REPLACE FUNCTION public.trigger_booking_sheets_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Trigger background sync for new booking requests
  PERFORM
    net.http_post(
      url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/sync-to-google-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'booking',
        'trigger_type', 'new_booking',
        'data', row_to_json(NEW)
      )
    );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_lead_score_sheets_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only sync if it's a high-value lead (score > 50)
  IF NEW.total_score > 50 THEN
    PERFORM
      net.http_post(
        url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/sync-to-google-sheets',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body := jsonb_build_object(
          'type', 'lead_scores',
          'trigger_type', 'high_value_lead',
          'data', row_to_json(NEW)
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_analytics_sheets_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only sync for certain conversion types
  IF NEW.conversion_type IN ('booking', 'high_engagement', 'qualified_lead') THEN
    PERFORM
      net.http_post(
        url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/sync-to-google-sheets',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body := jsonb_build_object(
          'type', 'analytics',
          'trigger_type', 'conversion_event',
          'data', row_to_json(NEW)
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;