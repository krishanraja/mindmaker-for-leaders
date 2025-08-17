-- Enable anonymous data collection by updating RLS policies

-- Update conversation_sessions to allow anonymous creation and management
DROP POLICY IF EXISTS "Users can manage their own sessions" ON conversation_sessions;

CREATE POLICY "Anyone can create anonymous sessions" 
ON conversation_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update sessions they created" 
ON conversation_sessions 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can view sessions" 
ON conversation_sessions 
FOR SELECT 
USING (true);

-- Update chat_messages to allow anonymous messages
DROP POLICY IF EXISTS "Users can manage their own messages" ON chat_messages;

CREATE POLICY "Anyone can create anonymous messages" 
ON chat_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view messages" 
ON chat_messages 
FOR SELECT 
USING (true);

-- Update booking_requests to allow anonymous bookings
DROP POLICY IF EXISTS "Users can create their own booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Users can view their own booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Users can update their own booking requests" ON booking_requests;

CREATE POLICY "Anyone can create anonymous booking requests" 
ON booking_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view booking requests" 
ON booking_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update booking requests" 
ON booking_requests 
FOR UPDATE 
USING (true);

-- Update lead_qualification_scores to allow anonymous lead scoring
DROP POLICY IF EXISTS "Users can view their own qualification scores" ON lead_qualification_scores;

CREATE POLICY "System can manage lead qualification scores" 
ON lead_qualification_scores 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Update ai_insights_generated to allow anonymous insights
DROP POLICY IF EXISTS "Users can create insights in their sessions" ON ai_insights_generated;
DROP POLICY IF EXISTS "Users can view their own insights" ON ai_insights_generated;

CREATE POLICY "Anyone can create anonymous insights" 
ON ai_insights_generated 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view insights" 
ON ai_insights_generated 
FOR SELECT 
USING (true);

-- Update user_business_context to allow anonymous business context
DROP POLICY IF EXISTS "Users can manage their own business context" ON user_business_context;

CREATE POLICY "Anyone can manage anonymous business context" 
ON user_business_context 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for anonymous booking requests to trigger Google Sheets sync
CREATE OR REPLACE FUNCTION public.trigger_anonymous_booking_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Trigger Google Sheets sync for anonymous bookings
  PERFORM
    net.http_post(
      url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/sync-to-google-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'booking',
        'trigger_type', 'anonymous_booking',
        'data', row_to_json(NEW)
      )
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger for anonymous lead score sync  
CREATE OR REPLACE FUNCTION public.trigger_anonymous_lead_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Trigger Google Sheets sync for anonymous high-value leads
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
          'trigger_type', 'anonymous_high_value_lead',
          'data', row_to_json(NEW)
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add triggers for anonymous data
DROP TRIGGER IF EXISTS trigger_anonymous_booking_requests ON booking_requests;
CREATE TRIGGER trigger_anonymous_booking_requests
  AFTER INSERT ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_anonymous_booking_sync();

DROP TRIGGER IF EXISTS trigger_anonymous_lead_scores ON lead_qualification_scores;  
CREATE TRIGGER trigger_anonymous_lead_scores
  AFTER INSERT ON lead_qualification_scores
  FOR EACH ROW EXECUTE FUNCTION trigger_anonymous_lead_sync();