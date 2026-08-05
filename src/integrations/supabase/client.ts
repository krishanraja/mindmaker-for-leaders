import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Mindmaker AI Supabase Database Configuration
// Project ID: bkyuxvschuwngtcdhsyg
// Database: Mindmaker AI
const EXPECTED_PROJECT_ID = 'bkyuxvschuwngtcdhsyg';
const DEFAULT_SUPABASE_URL = `https://${EXPECTED_PROJECT_ID}.supabase.co`;
// Public anon key (safe to ship). Prefer setting VITE_SUPABASE_ANON_KEY in Vercel env.
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXV4dnNjaHV3bmd0Y2Roc3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDE2NzgsImV4cCI6MjA2NzU3NzY3OH0.XmOP_W7gUdBuP23p4lH-iryMXPXMI69ZshU8Dwm6ujo";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

// Strictly verify we're using the correct database
if (!SUPABASE_URL.includes(EXPECTED_PROJECT_ID)) {
  const errorMessage = `❌ CRITICAL: Supabase URL does not match expected project ID (${EXPECTED_PROJECT_ID}). Current URL: ${SUPABASE_URL}`;
  console.error(errorMessage);
  if (import.meta.env.PROD) {
    throw new Error(errorMessage);
  }
}

// Note: New Supabase publishable keys (sb_publishable_*) don't contain project ID
// The key format is validated by Supabase itself when used
// JWT tokens are also valid (legacy format)
if (SUPABASE_PUBLISHABLE_KEY && !SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_') && !SUPABASE_PUBLISHABLE_KEY.includes(EXPECTED_PROJECT_ID) && !SUPABASE_PUBLISHABLE_KEY.startsWith('eyJ')) {
  // Only warn if it's not a JWT token (starts with eyJ) and not the new format
  if (import.meta.env.DEV) {
    console.warn('⚠️ Warning: Supabase publishable key format may be incorrect. Expected format: sb_publishable_* or JWT token.');
  }
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// The build-time prerender pass imports this module in Node, where there is no
// `localStorage`; reading it at module scope threw and aborted the whole SSR
// bundle, taking the prerendered HTML for every public route with it. In a
// browser this is exactly the storage it always was. Undefined lets supabase-js
// fall back to its own in-memory store for the render pass, which never needs to
// persist a session.
const authStorage = typeof window !== 'undefined' ? window.localStorage : undefined;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});