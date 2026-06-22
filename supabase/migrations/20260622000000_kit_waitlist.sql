-- Kit waitlist (2026-06-22)
--
-- The main CTRL app is not in production yet, so kit users are offered a spot on
-- the waitlist instead of a direct sign-up. This is the central, monitorable log
-- of everyone who has asked for early access, written only by the
-- `kit-waitlist-join` edge function (service role). RLS is enabled with no
-- policies, so the table is locked to the service role; the founder reads it via
-- the Supabase dashboard.

CREATE TABLE IF NOT EXISTS public.kit_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  redemption_id uuid REFERENCES public.kit_redemptions(id) ON DELETE SET NULL,
  user_id uuid,
  class_slug text,
  source text NOT NULL DEFAULT 'kit',
  status text NOT NULL DEFAULT 'pending',
  notified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per person; a second tap is an idempotent no-op.
CREATE UNIQUE INDEX IF NOT EXISTS kit_waitlist_email_key
  ON public.kit_waitlist (lower(email));

CREATE INDEX IF NOT EXISTS kit_waitlist_created_at_idx
  ON public.kit_waitlist (created_at DESC);

ALTER TABLE public.kit_waitlist ENABLE ROW LEVEL SECURITY;
