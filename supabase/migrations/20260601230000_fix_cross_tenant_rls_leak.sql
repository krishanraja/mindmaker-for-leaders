-- SECURITY HOTFIX (applied to production 2026-06-02 via the Management API;
-- recorded here so the migration history matches the live database).
--
-- Five tables had RLS policies with USING(true) granted to the `public` role,
-- while anon + authenticated held full table grants. Net effect: any holder of
-- the public anon key could read - and on user_business_context / chat_messages
-- also write and delete - every user's personal data (emails, company context,
-- conversation history). This is a cross-tenant data exposure: SOC 2 CC6.1,
-- GDPR Art. 32, ISO A.5.15/A.8.3.
--
-- Fix: owner-scope profiles; drop the world-access "manage" policies on
-- chat_messages and user_business_context (each already had correct
-- owner-scoped policies); lock unified_profiles and profile_insights to the
-- service role (random-uuid PKs, populated server-side, not read by the
-- client). Idempotent.

-- profiles: was world-readable (emails) and world-writable. Owner-only now.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles"        ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles"        ON public.profiles;
CREATE POLICY "own_profile_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own_profile_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own_profile_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- chat_messages: drop world ALL (owner SELECT/INSERT policies remain).
DROP POLICY IF EXISTS "System can manage chat messages" ON public.chat_messages;

-- user_business_context: drop world ALL (owner CRUD policies remain).
DROP POLICY IF EXISTS "System can manage all business context" ON public.user_business_context;

-- unified_profiles + profile_insights: service-role only (no client policy).
DROP POLICY IF EXISTS "Public read unified_profiles"  ON public.unified_profiles;
DROP POLICY IF EXISTS "Service manage unified_profiles" ON public.unified_profiles;
DROP POLICY IF EXISTS "Public read profile_insights"  ON public.profile_insights;
DROP POLICY IF EXISTS "Service manage profile_insights" ON public.profile_insights;
