-- Create database triggers for automatic Google Sheets sync

-- Function to trigger Google Sheets sync for new booking requests
CREATE OR REPLACE FUNCTION public.trigger_booking_sheets_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to trigger Google Sheets sync for lead qualification scores
CREATE OR REPLACE FUNCTION public.trigger_lead_score_sheets_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to trigger analytics sync for conversion events
CREATE OR REPLACE FUNCTION public.trigger_analytics_sheets_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create triggers (these will run in background, invisible to users)
DROP TRIGGER IF EXISTS booking_sheets_sync_trigger ON public.booking_requests;
CREATE TRIGGER booking_sheets_sync_trigger
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_booking_sheets_sync();

DROP TRIGGER IF EXISTS lead_score_sheets_sync_trigger ON public.lead_qualification_scores;
CREATE TRIGGER lead_score_sheets_sync_trigger
  AFTER INSERT OR UPDATE ON public.lead_qualification_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_score_sheets_sync();

DROP TRIGGER IF EXISTS analytics_sheets_sync_trigger ON public.conversion_analytics;
CREATE TRIGGER analytics_sheets_sync_trigger
  AFTER INSERT ON public.conversion_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_analytics_sheets_sync();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_requests_sheets_sync ON public.booking_requests(created_at, status, priority);
CREATE INDEX IF NOT EXISTS idx_lead_scores_sheets_sync ON public.lead_qualification_scores(created_at, total_score);
CREATE INDEX IF NOT EXISTS idx_analytics_sheets_sync ON public.conversion_analytics(created_at, conversion_type);