/* eslint-disable react-refresh/only-export-components -- useAuth is co-located with the provider it reads; every consumer imports both from here */
/**
 * AuthProvider Component
 *
 * Authentication context provider with baseline linking support.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPersistedAssessmentId, linkAssessmentToUser } from '@/utils/assessmentPersistence';
import { getAttribution } from '@/lib/attribution';
import { emitEvent } from '@/lib/track';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      // Link baseline to user account when they sign in/up
      if (event === 'SIGNED_IN' && session?.user && !session.user.is_anonymous) {
        const { assessmentId } = getPersistedAssessmentId();
        if (assessmentId && session.user.id) {
          try {
            await linkAssessmentToUser(assessmentId, session.user.id);
            console.log('✅ Linked baseline to user account');
          } catch (error) {
            console.warn('⚠️ Failed to link baseline to user:', error);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { error: null };
    const friendly: Record<string, string> = {
      'Invalid login credentials': 'Email or password is incorrect. Please try again.',
      'Email not confirmed': 'Please check your email and confirm your account first.',
      'User not found': 'No account found with that email. Try signing up instead.',
    };
    return { error: friendly[error.message] ?? error.message };
  };

  const signUp = async (email: string, password: string) => {
    // Persist first-touch attribution into user_metadata so the signup is
    // joinable to its acquisition source downstream.
    const attribution = getAttribution();

    // A visitor who weighed a decision on /try is already signed in
    // ANONYMOUSLY, and that anonymous user owns the case row. Converting that
    // same user in place is what makes "make an account and it stays" true; a
    // plain signUp would mint a second user and orphan their work.
    const { data: current } = await supabase.auth.getSession();
    if (current?.session?.user?.is_anonymous) {
      const { error } = await supabase.auth.updateUser({
        email,
        password,
        data: attribution ? { attribution } : undefined,
      });
      if (!error) {
        emitEvent('signed_up', { email, attribution, converted_from_anonymous: true }, false);
      }
      return { error: error?.message ?? null };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: attribution ? { data: { attribution } } : undefined,
    });
    if (!error) {
      emitEvent('signed_up', { email, attribution }, false);
    }
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null && !user.is_anonymous,
    isAnonymous:
      user !== null &&
      (user.is_anonymous === true ||
        (user.user_metadata as Record<string, unknown> | undefined)?.is_anonymous === true),
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
