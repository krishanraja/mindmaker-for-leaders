import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets API configuration
const GOOGLE_SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_NAME = 'Fractional AI: Leader Leads';

// Encryption utilities
async function encryptToken(token: string): Promise<string> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(encryptedToken: string): Promise<string> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const combined = new Uint8Array(atob(encryptedToken).split('').map(c => c.charCodeAt(0)));
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

// Get or refresh Google OAuth token
async function getGoogleToken(supabase: any): Promise<string> {
  try {
    // Try to get existing token from secrets
    const storedToken = Deno.env.get('GOOGLE_OAUTH_CREDENTIALS');
    if (storedToken) {
      return await decryptToken(storedToken);
    }
    
    // If no stored token, create one using service account
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    
    if (!clientId || !clientSecret || !serviceAccountEmail) {
      throw new Error('Google OAuth credentials not properly configured');
    }
    
    // For service account authentication, we need to implement JWT
    // For now, return a placeholder that would be handled by proper service account setup
    console.log('Google OAuth setup required for full integration');
    return 'placeholder_token_requires_setup';
    
  } catch (error) {
    console.error('Error getting Google token:', error);
    throw error;
  }
}

// Get specific Google Spreadsheet and ensure required tabs exist
async function getOrCreateSpreadsheet(accessToken: string): Promise<string> {
  try {
    // Use the specific spreadsheet ID from environment variable
    const spreadsheetId = Deno.env.get('GOOGLE_SHEETS_SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured in environment variables');
    }
    
    console.log(`Using specific Google Spreadsheet ID: ${spreadsheetId}`);
    
    // Get current spreadsheet info to check existing tabs
    const getResponse = await fetch(
      `${GOOGLE_SHEETS_API_URL}/${spreadsheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!getResponse.ok) {
      throw new Error(`Failed to access spreadsheet: ${getResponse.statusText}`);
    }
    
    const spreadsheetData = await getResponse.json();
    const existingSheets = spreadsheetData.sheets.map((sheet: any) => sheet.properties.title);
    
    // Required tabs for our data
    const requiredTabs = ['Bookings', 'Lead Scores', 'Analytics'];
    const missingTabs = requiredTabs.filter(tab => !existingSheets.includes(tab));
    
    // Create missing tabs if needed
    if (missingTabs.length > 0) {
      console.log(`Creating missing tabs: ${missingTabs.join(', ')}`);
      
      const requests = missingTabs.map(tabName => ({
        addSheet: {
          properties: {
            title: tabName,
            gridProperties: { 
              rowCount: 1000, 
              columnCount: tabName === 'Bookings' ? 20 : (tabName === 'Lead Scores' ? 15 : 12)
            }
          }
        }
      }));
      
      const batchUpdateResponse = await fetch(
        `${GOOGLE_SHEETS_API_URL}/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        }
      );
      
      if (!batchUpdateResponse.ok) {
        console.warn(`Failed to create missing tabs: ${batchUpdateResponse.statusText}`);
      } else {
        console.log(`Successfully created missing tabs: ${missingTabs.join(', ')}`);
      }
    }
    
    return spreadsheetId;
    
  } catch (error) {
    console.error('Error accessing spreadsheet:', error);
    throw error;
  }
}

// Sync data to Google Sheets
async function syncToGoogleSheets(spreadsheetId: string, accessToken: string, sheetName: string, data: any[]): Promise<void> {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const values = [headers, ...data.map(row => headers.map(header => row[header] || ''))];
  
  const response = await fetch(
    `${GOOGLE_SHEETS_API_URL}/${spreadsheetId}/values/${sheetName}!A1:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    console.warn(`Failed to clear sheet ${sheetName}: ${response.statusText}`);
  }
  
  const updateResponse = await fetch(
    `${GOOGLE_SHEETS_API_URL}/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      }),
    }
  );
  
  if (!updateResponse.ok) {
    throw new Error(`Failed to update sheet ${sheetName}: ${updateResponse.statusText}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type = 'booking', data, trigger_type = 'manual' } = await req.json();

    console.log('Background Google Sheets sync triggered', { type, trigger_type });

    // Log sync attempt
    const { data: syncLog, error: logError } = await supabase
      .from('google_sheets_sync_log')
      .insert({
        sync_type: type,
        status: 'pending',
        sync_metadata: {
          trigger_type,
          timestamp: new Date().toISOString(),
          environment: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development'
        }
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating sync log:', logError);
    }

    let sheetData: any[] = [];
    let sheetName = '';

    switch (type) {
      case 'booking':
        sheetData = await formatBookingData(supabase, data);
        sheetName = 'Bookings';
        break;
      case 'analytics':
        sheetData = await formatAnalyticsData(supabase);
        sheetName = 'Analytics';
        break;
      case 'lead_scores':
        sheetData = await formatLeadScoreData(supabase);
        sheetName = 'Lead Scores';
        break;
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }

    // Skip actual Google API call if no data or in development mode
    const isDevelopment = !Deno.env.get('DENO_DEPLOYMENT_ID');
    const hasValidCredentials = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') && 
                               Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

    if (sheetData.length > 0 && !isDevelopment && hasValidCredentials) {
      try {
        // Get Google access token
        const accessToken = await getGoogleToken(supabase);
        
        if (accessToken !== 'placeholder_token_requires_setup') {
          // Get or create spreadsheet
          const spreadsheetId = await getOrCreateSpreadsheet(accessToken);
          
          // Sync data to Google Sheets
          await syncToGoogleSheets(spreadsheetId, accessToken, sheetName, sheetData);
          
          // Update sync log with success
          if (syncLog) {
            await supabase
              .from('google_sheets_sync_log')
              .update({
                status: 'synced',
                data_count: sheetData.length,
                synced_at: new Date().toISOString(),
                sync_metadata: {
                  ...syncLog.sync_metadata,
                  spreadsheet_id: spreadsheetId,
                  sheet_name: sheetName,
                  records_synced: sheetData.length
                }
              })
              .eq('id', syncLog.id);
          }
          
          console.log(`Successfully synced ${sheetData.length} records to Google Sheets`);
        } else {
          throw new Error('Google OAuth setup incomplete');
        }
      } catch (error) {
        console.error('Google Sheets sync failed:', error);
        
        // Update sync log with error
        if (syncLog) {
          await supabase
            .from('google_sheets_sync_log')
            .update({
              status: 'failed',
              error_message: error.message,
              sync_metadata: {
                ...syncLog.sync_metadata,
                error_details: error.stack
              }
            })
            .eq('id', syncLog.id);
        }
        
        // Don't throw error for background processes - just log and continue
        console.log('Falling back to data preparation only');
      }
    }

    // Always update sync log with prepared data
    if (syncLog) {
      await supabase
        .from('google_sheets_sync_log')
        .update({
          status: sheetData.length > 0 ? 'prepared' : 'failed',
          data_count: sheetData.length,
          sync_data: sheetData.slice(0, 10), // Store sample of data for debugging
          sync_metadata: {
            ...syncLog.sync_metadata,
            total_records_prepared: sheetData.length,
            sample_record: sheetData[0] || null
          }
        })
        .eq('id', syncLog.id);
    }

    // Return success response (this is a background process)
    return new Response(JSON.stringify({ 
      success: true,
      type,
      recordCount: sheetData.length,
      status: 'processed',
      message: 'Background sync completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in background Google Sheets sync:', error);
    return new Response(JSON.stringify({ 
      error: 'Background sync failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function formatBookingData(supabase: any, additionalData?: any) {
  // Get all booking requests with related data
  const { data: bookings, error } = await supabase
    .from('booking_requests')
    .select(`
      *,
      conversation_sessions (
        session_title,
        started_at,
        status,
        business_context
      ),
      lead_qualification_scores (
        total_score,
        engagement_score,
        business_readiness_score
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching booking data:', error);
    return [];
  }

  return bookings.map((booking: any) => ({
    'Lead ID': booking.id,
    'Date Created': new Date(booking.created_at).toLocaleDateString(),
    'Source': booking.session_id ? 'AI Chat Assessment' : 'Quick Form Assessment',
    'Full Name': booking.contact_name,
    'Email': booking.contact_email,
    'Company': booking.company_name,
    'Role/Title': booking.role,
    'Phone': booking.phone || '',
    'LinkedIn': '', // To be populated from business context
    'AI Readiness Score': booking.lead_score || 0,
    'Current AI Usage Level': '', // Derived from assessment data
    'Decision Authority': '', // Derived from assessment responses
    'Budget Range': '', // Derived from assessment responses
    'Implementation Timeline': booking.preferred_time || '',
    'Team Readiness': '', // Derived from assessment data
    'Top 3 Productivity Bottlenecks': booking.specific_needs?.substring(0, 100) || '',
    'Pain Point Severity': booking.priority || '',
    'Time Spent (minutes)': Math.round((booking.conversation_sessions?.[0]?.business_context?.session_duration || 0) / 60),
    'Questions Answered': booking.conversation_sessions?.[0]?.business_context?.questions_answered || 0,
    'Messages Exchanged': booking.conversation_sessions?.[0]?.business_context?.message_count || 0,
    'Insight Categories Generated': '', // To be derived from insights
    'Booking Request Status': booking.status,
    'Business Readiness Score': booking.lead_qualification_scores?.[0]?.business_readiness_score || 0,
    'Implementation Readiness': booking.lead_qualification_scores?.[0]?.implementation_readiness || 0,
    'Lead Quality Score': booking.lead_score >= 70 ? 'High' : booking.lead_score >= 50 ? 'Medium' : 'Low',
    'Recommended Service Type': booking.service_type,
    'Follow-up Priority': booking.priority || 'medium',
    'Scheduled Date': booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString() : '',
    'Notes': booking.notes || ''
  }));
}

async function formatAnalyticsData(supabase: any) {
  // Get conversion analytics data
  const { data: analytics, error } = await supabase
    .from('conversion_analytics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching analytics data:', error);
    return [];
  }

  return analytics.map((record: any) => ({
    'Date': record.created_at,
    'Conversion Type': record.conversion_type,
    'Service Type': record.service_type || '',
    'Lead Score': record.lead_score || 0,
    'Session Duration (min)': Math.round((record.session_duration || 0) / 60),
    'Messages Exchanged': record.messages_exchanged || 0,
    'Topics Explored': record.topics_explored || 0,
    'Insights Generated': record.insights_generated || 0,
    'Conversion Value': record.conversion_value || 0,
    'Source Channel': record.source_channel || 'ai_chat'
  }));
}

async function formatLeadScoreData(supabase: any) {
  // Get lead qualification scores with session data and business context
  const { data: scores, error } = await supabase
    .from('lead_qualification_scores')
    .select(`
      *,
      conversation_sessions (
        session_title,
        started_at,
        business_context
      ),
      user_business_context!inner (
        context_data,
        business_name,
        industry,
        company_size
      )
    `)
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) {
    console.error('Error fetching lead score data:', error);
    return [];
  }

  return scores.map((score: any) => ({
    'Date': new Date(score.created_at).toLocaleDateString(),
    'Session ID': score.session_id?.substring(0, 8) || 'N/A',
    'Source': score.session_id ? 'AI Chat Assessment' : 'Quick Form Assessment',
    'Total AI Readiness Score': score.total_score || 0,
    'Engagement Score': score.engagement_score || 0,
    'Business Readiness Score': score.business_readiness_score || 0,
    'Pain Point Severity': score.pain_point_severity || 0,
    'Implementation Readiness': score.implementation_readiness || 0,
    'Company': score.user_business_context?.business_name || '',
    'Industry': score.user_business_context?.industry || '',
    'Company Size': score.user_business_context?.company_size || '',
    'Lead Quality': score.total_score >= 70 ? 'High Priority' : score.total_score >= 50 ? 'Medium Priority' : 'Low Priority',
    'Session Duration (min)': Math.round((score.conversation_sessions?.[0]?.business_context?.session_duration || 0) / 60),
    'Qualification Notes': score.qualification_notes || '',
    'Business Context Summary': score.user_business_context?.context_data ? 
      JSON.stringify(score.user_business_context.context_data).substring(0, 200) + '...' : ''
  }));
}