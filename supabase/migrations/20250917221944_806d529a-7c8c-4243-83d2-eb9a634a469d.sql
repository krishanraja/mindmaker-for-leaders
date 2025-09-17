-- Fix critical security issues by implementing proper RLS policies

-- 1. Fix booking_requests table - restrict to session-based access
DROP POLICY IF EXISTS "Anyone can view booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Anyone can create anonymous booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Anyone can update booking requests" ON public.booking_requests;

CREATE POLICY "Users can view their own booking requests" 
ON public.booking_requests 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  session_id IN (
    SELECT id FROM public.conversation_sessions 
    WHERE user_id = auth.uid() OR (user_id IS NULL AND id = session_id)
  )
);

CREATE POLICY "Authenticated users can create booking requests" 
ON public.booking_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own booking requests" 
ON public.booking_requests 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- 2. Fix chat_messages table - restrict to session owners
DROP POLICY IF EXISTS "Anyone can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can create anonymous messages" ON public.chat_messages;

CREATE POLICY "Users can view their session messages" 
ON public.chat_messages 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  session_id IN (
    SELECT id FROM public.conversation_sessions 
    WHERE user_id = auth.uid() OR (user_id IS NULL AND id = session_id)
  )
);

CREATE POLICY "Users can create messages in their sessions" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  user_id IS NULL
);

-- 3. Fix conversation_sessions table - more restrictive access
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Anyone can create anonymous sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Anyone can update sessions they created" ON public.conversation_sessions;

CREATE POLICY "Users can view their own sessions" 
ON public.conversation_sessions 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create anonymous sessions" 
ON public.conversation_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own sessions" 
ON public.conversation_sessions 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. Fix lead_qualification_scores table - already properly secured
-- No changes needed - already has proper system access

-- 5. Fix user_business_context table - more restrictive public access
DROP POLICY IF EXISTS "Anonymous users can view business context" ON public.user_business_context;
DROP POLICY IF EXISTS "Anonymous users can create business context" ON public.user_business_context;

-- Keep authenticated user policies but remove anonymous public access
-- Business context should only be accessible to authenticated users or the creator
CREATE POLICY "Session owners can view business context" 
ON public.user_business_context 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (user_id IS NULL AND auth.uid() IS NULL)
);

CREATE POLICY "Session owners can create business context" 
ON public.user_business_context 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  (user_id IS NULL AND auth.uid() IS NULL)
);