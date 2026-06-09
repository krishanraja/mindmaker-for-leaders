import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight, Check, Brain } from 'lucide-react';
import { validateEmail } from '@/utils/formValidation';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/utils/edgeFunctionClient';
import type { QuickEntryResult } from './QuickVoiceEntry';

interface EmailCaptureFormProps {
  quickEntryResult: QuickEntryResult;
  onComplete: (email: string) => void;
  onSkip: () => void;
}

export const EmailCaptureForm: React.FC<EmailCaptureFormProps> = ({
  quickEntryResult,
  onComplete,
  onSkip
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create anonymous session if not logged in
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session) {
        // Sign up anonymously or create a lightweight lead record
        const { error: signUpError } = await supabase.auth.signInAnonymously();
        if (signUpError) {
          console.warn('Anonymous sign-in failed, continuing anyway:', signUpError);
        }
      }

      // 2. Send lead capture email to krish@themindmaker.ai
      try {
        await invokeEdgeFunction('send-diagnostic-email', {
          data: {
            firstName: 'Quick Entry',
            lastName: 'Lead',
            email: email,
            company: '',
            title: '',
            primaryFocus: '',
            
            // Include the quick entry data
            quickEntryTranscript: quickEntryResult.transcript,
            quickEntryInsight: quickEntryResult.insight,
            quickEntryAction: quickEntryResult.action,
            
            hasDeepProfile: false,
            benchmarkScore: 0,
            benchmarkTier: 'Quick Entry',
          },
          scores: { total: 0 },
          contactType: 'quick_entry_email_capture',
          sessionId: `quick_${Date.now()}`
        }, { logPrefix: '📧' });
        console.log('✅ Quick entry lead email sent');
      } catch (emailError) {
        console.error('❌ Quick entry email failed (non-blocking):', emailError);
      }

      // 3. Store email preference for weekly reminders
      try {
        await supabase.functions.invoke('upsert-notification-prefs', {
          body: { 
            weekly_checkin_enabled: true,
            email: email
          },
        });
      } catch (prefError) {
        console.warn('Notification prefs failed (non-blocking):', prefError);
      }

      setIsSuccess(true);
      
      // Brief delay to show success, then continue
      setTimeout(() => {
        onComplete(email);
      }, 1500);

    } catch (err) {
      console.error('Email capture error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, quickEntryResult, onComplete]);

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-6">
        <Card className="w-full max-w-md shadow-lg border rounded-xl">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              You're in
            </h2>
            <p className="text-sm text-muted-foreground">
              Your first weekly insight is on its way.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-6">
      <Card className="w-full max-w-md shadow-lg border rounded-xl">
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-primary text-sm mb-3">
              <Brain className="h-4 w-4" />
              <span>Weekly insights</span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
              Get this every week
            </h2>
            <p className="text-sm text-muted-foreground">
              One insight. One action. 30 seconds to read. No course.
            </p>
          </div>

          {/* Preview of what they got */}
          <div className="bg-secondary/30 rounded-lg p-3 mb-6 text-sm">
            <p className="text-foreground font-medium mb-1">This week's action:</p>
            <p className="text-muted-foreground text-xs">
              {quickEntryResult.action}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium text-sm flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className="rounded-lg"
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
              />
              {error && (
                <p className="text-destructive text-xs">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="cta"
              className="w-full rounded-xl py-5"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Setting up...' : 'Send me weekly insights'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Privacy note */}
          <p className="text-[10px] text-muted-foreground text-center mt-4 leading-relaxed">
            No spam. Unsubscribe anytime. Your data stays private.
          </p>

          {/* Skip option */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};






