import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from '@/components/auth/AuthScreen';
import AIAssessmentChat from '@/components/ai-chat/AIAssessmentChat';

const ChatAssessment = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // The user state will be updated automatically by the auth state change listener
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return <AIAssessmentChat />;
};

export default ChatAssessment;