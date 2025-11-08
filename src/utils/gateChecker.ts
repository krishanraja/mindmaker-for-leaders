import { supabase } from '@/integrations/supabase/client';

export async function checkGateStatus(sessionId: string): Promise<{ isUnlocked: boolean; gateReason: string }> {
  try {
    const { data, error } = await supabase
      .from('voice_sessions')
      .select('gated_unlocked_at')
      .eq('session_id', sessionId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking gate status:', error);
      return { isUnlocked: false, gateReason: 'Error checking gate status' };
    }
    
    const isUnlocked = !!data?.gated_unlocked_at;
    const gateReason = isUnlocked ? '' : 'Unlock advanced toolkit via Sprint sign-up';
    
    return { isUnlocked, gateReason };
  } catch (error) {
    console.error('Error in checkGateStatus:', error);
    return { isUnlocked: false, gateReason: 'Error checking gate status' };
  }
}
