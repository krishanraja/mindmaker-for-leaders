import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { attributionForStripe } from '@/lib/attribution';

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const createPaymentSession = async (
    assessmentId: string,
    upgradeType: 'full_diagnostic' | 'deep_context' | 'bundle' = 'full_diagnostic'
  ): Promise<string | null> => {
    setIsProcessing(true);
    
    try {
      console.log('💳 Creating payment session for assessment:', assessmentId, 'type:', upgradeType);

      const { data, error } = await supabase.functions.invoke('create-diagnostic-payment', {
        body: {
          assessment_id: assessmentId,
          upgrade_type: upgradeType,
          attribution: attributionForStripe(),
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      console.log('✅ Payment session created');
      return data.url;
    } catch (error: any) {
      console.error('❌ Payment session error:', error);
      toast({
        title: 'Payment Error',
        description: 'Unable to create payment session. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (assessmentId: string, sessionId: string): Promise<boolean> => {
    try {
      console.log('🔍 Verifying payment for assessment:', assessmentId);

      const { data, error } = await supabase.functions.invoke('verify-diagnostic-payment', {
        body: { assessment_id: assessmentId, session_id: sessionId },
      });

      if (error) {
        throw error;
      }

      if (data?.paid) {
        console.log('✅ Payment verified successfully');
        toast({
          title: 'Diagnostic Unlocked!',
          description: 'Your Full Leadership Diagnostic is now available.',
        });
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Payment verification error:', error);
      return false;
    }
  };

  return {
    createPaymentSession,
    verifyPayment,
    isProcessing,
  };
}
