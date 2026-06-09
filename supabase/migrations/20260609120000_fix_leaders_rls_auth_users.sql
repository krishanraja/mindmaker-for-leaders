-- Fix: leaders RLS policies threw 403 (permission denied) for the authenticated
-- role because they subqueried auth.users directly:
--   email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())
-- The authenticated role has no privilege on auth.users, so every policy
-- evaluation errored -> 403 on all leaders SELECT/UPDATE/INSERT.
--
-- Rewrite to the security-definer helper auth.email() (reads the JWT claim, no
-- table access) and compare auth.uid() = id directly (both uuid). Same intent
-- (own row by id, or by matching email), without the privilege error.

DROP POLICY IF EXISTS "Users can view their own leader profile" ON public.leaders;
CREATE POLICY "Users can view their own leader profile" ON public.leaders
  FOR SELECT
  USING ((auth.uid() = id) OR (email = auth.email()));

DROP POLICY IF EXISTS "Users can update their own leader profile" ON public.leaders;
CREATE POLICY "Users can update their own leader profile" ON public.leaders
  FOR UPDATE
  USING ((auth.uid() = id) OR (email = auth.email()));

DROP POLICY IF EXISTS "Users can insert their own leader profile" ON public.leaders;
CREATE POLICY "Users can insert their own leader profile" ON public.leaders
  FOR INSERT
  WITH CHECK ((auth.uid() = id) OR (email = auth.email()));
