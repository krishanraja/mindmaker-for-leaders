import { supabase } from "@/integrations/supabase/client";

// Manual test function to process pending Google Sheets syncs
export const testGoogleSheetsSync = async () => {
  try {
    console.log('Testing Google Sheets sync processing...');
    
    // Call the batch processing function
    const { data, error } = await supabase.functions.invoke('batch-process-pending-syncs', {
      body: {}
    });

    if (error) {
      console.error('Error calling batch processing function:', error);
      return { success: false, error: error.message };
    }

    console.log('Batch processing result:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Exception during batch processing:', error);
    return { success: false, error: error.message };
  }
};

// Test the main sync function
export const testMainSyncFunction = async () => {
  try {
    console.log('Testing main sync function...');
    
    const { data, error } = await supabase.functions.invoke('sync-to-google-sheets', {
      body: {
        type: 'booking',
        trigger_type: 'manual_test'
      }
    });

    if (error) {
      console.error('Error calling main sync function:', error);
      return { success: false, error: error.message };
    }

    console.log('Main sync result:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Exception during main sync:', error);
    return { success: false, error: error.message };
  }
};