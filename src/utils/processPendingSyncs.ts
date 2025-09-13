import { supabase } from "@/integrations/supabase/client";

export const processPendingSyncs = async () => {
  try {
    console.log('🔄 Processing pending Google Sheets syncs...');
    
    // First, update any old pending statuses to ready_for_http
    const { error: updateError } = await supabase
      .from('google_sheets_sync_log')
      .update({ 
        status: 'ready_for_http',
        last_updated_at: new Date().toISOString()
      })
      .in('status', ['pending', 'needs_processing']);

    if (updateError) {
      console.error('❌ Error updating sync statuses:', updateError);
    } else {
      console.log('✅ Updated pending syncs to ready_for_http status');
    }

    // Call the batch processing function
    const { data, error } = await supabase.functions.invoke('batch-process-pending-syncs', {
      body: { 
        trigger_source: 'manual_processing',
        timestamp: new Date().toISOString()
      }
    });

    if (error) {
      console.error('❌ Error calling batch processing function:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Batch processing result:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Exception during sync processing:', error);
    return { success: false, error: error.message };
  }
};

// Auto-expose to global scope for testing
if (typeof window !== 'undefined') {
  (window as any).processPendingSyncs = processPendingSyncs;
}