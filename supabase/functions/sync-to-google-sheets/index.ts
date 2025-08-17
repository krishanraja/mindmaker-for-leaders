import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type = 'booking', data } = await req.json();

    console.log('Syncing to Google Sheets', { type, dataKeys: Object.keys(data || {}) });

    // Google Sheets configuration (would require Google API setup)
    // For now, we'll prepare the data structure that would be sent to Google Sheets

    let sheetData: any[] = [];

    switch (type) {
      case 'booking':
        sheetData = await formatBookingData(supabase, data);
        break;
      case 'analytics':
        sheetData = await formatAnalyticsData(supabase);
        break;
      case 'lead_scores':
        sheetData = await formatLeadScoreData(supabase);
        break;
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }

    // In a real implementation, you would send this data to Google Sheets API
    // For now, we'll log it and store it in a sync log table
    console.log('Prepared data for Google Sheets:', sheetData);

    // Store sync record
    const { error: syncError } = await supabase
      .from('google_sheets_sync_log')
      .insert({
        sync_type: type,
        data_count: sheetData.length,
        sync_data: sheetData,
        status: 'prepared',
        sync_metadata: {
          timestamp: new Date().toISOString(),
          environment: 'development'
        }
      });

    if (syncError) {
      console.error('Error logging sync:', syncError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      type,
      recordCount: sheetData.length,
      data: sheetData,
      message: 'Data prepared for Google Sheets sync (API integration required for actual sync)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Google Sheets sync function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to sync to Google Sheets',
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
    'Booking ID': booking.id,
    'Date Created': booking.created_at,
    'Contact Name': booking.contact_name,
    'Email': booking.contact_email,
    'Company': booking.company_name,
    'Role': booking.role,
    'Phone': booking.phone || '',
    'Service Type': booking.service_type,
    'Service Title': booking.service_title,
    'Priority': booking.priority,
    'Status': booking.status,
    'Lead Score': booking.lead_score || 0,
    'Preferred Time': booking.preferred_time || '',
    'Specific Needs': booking.specific_needs || '',
    'Session Started': booking.conversation_sessions?.[0]?.started_at || '',
    'Session Status': booking.conversation_sessions?.[0]?.status || '',
    'Engagement Score': booking.lead_qualification_scores?.[0]?.engagement_score || 0,
    'Business Readiness': booking.lead_qualification_scores?.[0]?.business_readiness_score || 0,
    'Scheduled Date': booking.scheduled_date || '',
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
  // Get lead qualification scores with session data
  const { data: scores, error } = await supabase
    .from('lead_qualification_scores')
    .select(`
      *,
      conversation_sessions (
        session_title,
        started_at,
        business_context
      )
    `)
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) {
    console.error('Error fetching lead score data:', error);
    return [];
  }

  return scores.map((score: any) => ({
    'Date': score.created_at,
    'Session ID': score.session_id,
    'Total Score': score.total_score || 0,
    'Engagement Score': score.engagement_score || 0,
    'Business Readiness Score': score.business_readiness_score || 0,
    'Pain Point Severity': score.pain_point_severity || 0,
    'Implementation Readiness': score.implementation_readiness || 0,
    'Qualification Notes': score.qualification_notes || '',
    'Session Started': score.conversation_sessions?.[0]?.started_at || '',
    'Business Context': JSON.stringify(score.conversation_sessions?.[0]?.business_context || {})
  }));
}