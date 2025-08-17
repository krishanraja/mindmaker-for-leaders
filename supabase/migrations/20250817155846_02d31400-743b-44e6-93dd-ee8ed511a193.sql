-- Create Google Sheets sync logging table
CREATE TABLE public.google_sheets_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('booking', 'analytics', 'lead_scores', 'full_sync')),
  data_count INTEGER DEFAULT 0,
  sync_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'prepared', 'synced', 'failed')),
  sync_metadata JSONB DEFAULT '{}',
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.google_sheets_sync_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (admin access only for sync logs)
CREATE POLICY "Admin can manage sync logs" 
ON public.google_sheets_sync_log 
FOR ALL 
USING (true); -- In production, this should be restricted to admin users

-- Create index
CREATE INDEX idx_google_sheets_sync_log_type ON public.google_sheets_sync_log(sync_type);
CREATE INDEX idx_google_sheets_sync_log_status ON public.google_sheets_sync_log(status);
CREATE INDEX idx_google_sheets_sync_log_created_at ON public.google_sheets_sync_log(created_at);

-- Create function to trigger Google Sheets sync
CREATE OR REPLACE FUNCTION public.trigger_google_sheets_sync(sync_type_param TEXT DEFAULT 'booking')
RETURNS TABLE(
  sync_id UUID,
  records_prepared INTEGER,
  sync_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_sync_id UUID;
  record_count INTEGER := 0;
BEGIN
  -- Create sync log entry
  INSERT INTO public.google_sheets_sync_log (sync_type, status)
  VALUES (sync_type_param, 'pending')
  RETURNING id INTO new_sync_id;
  
  -- Count records based on sync type
  CASE sync_type_param
    WHEN 'booking' THEN
      SELECT COUNT(*) INTO record_count FROM public.booking_requests WHERE created_at >= NOW() - INTERVAL '7 days';
    WHEN 'analytics' THEN
      SELECT COUNT(*) INTO record_count FROM public.conversion_analytics WHERE created_at >= NOW() - INTERVAL '7 days';
    WHEN 'lead_scores' THEN
      SELECT COUNT(*) INTO record_count FROM public.lead_qualification_scores WHERE created_at >= NOW() - INTERVAL '7 days';
    ELSE
      record_count := 0;
  END CASE;
  
  -- Update sync log with count
  UPDATE public.google_sheets_sync_log 
  SET data_count = record_count,
      sync_metadata = jsonb_build_object('trigger_time', NOW(), 'record_count', record_count)
  WHERE id = new_sync_id;
  
  RETURN QUERY SELECT new_sync_id, record_count, 'pending'::TEXT;
END;
$$;