-- Add missing RLS policies for tables that have RLS enabled but incomplete policies

-- Fix ai_insights_generated table (missing INSERT policy)
CREATE POLICY "Users can create insights in their sessions" 
ON public.ai_insights_generated 
FOR INSERT 
WITH CHECK (
  session_id IN (
    SELECT id FROM public.conversation_sessions WHERE user_id = auth.uid()
  ) OR auth.uid() = user_id
);

-- Fix engagement_analytics table (no policies at all)
CREATE POLICY "Users can view their own engagement analytics" 
ON public.engagement_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create engagement analytics" 
ON public.engagement_analytics 
FOR INSERT 
WITH CHECK (true);

-- Fix lead_qualifications table (no policies at all)
CREATE POLICY "Users can view their own lead qualifications" 
ON public.lead_qualifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead qualifications" 
ON public.lead_qualifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead qualifications" 
ON public.lead_qualifications 
FOR UPDATE 
USING (auth.uid() = user_id);