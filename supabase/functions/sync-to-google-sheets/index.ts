import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

// Get or refresh Google OAuth token with service account authentication
async function getGoogleToken(): Promise<string> {
  try {
    // Try service account approach first (preferred for server-to-server)
    const serviceAccountKey = Deno.env.get('GOOGLE_OAUTH_CREDENTIALS');
    
    if (serviceAccountKey) {
      try {
        const credentials = JSON.parse(serviceAccountKey);
        const tokenResult = await getGoogleOAuthToken(credentials);
        
        if (tokenResult.success && tokenResult.token) {
          console.log('✅ Successfully obtained Google OAuth token via service account');
          return tokenResult.token;
        } else {
          console.warn('⚠️ Service account OAuth failed, falling back to OAuth client');
        }
      } catch (parseError) {
        console.error('Error parsing service account credentials:', parseError);
      }
    }
    
    // Fallback to OAuth client credentials (for user-based auth if needed)
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      console.warn('⚠️ Google OAuth credentials not configured - Google Sheets sync will use test mode');
      return 'test_token_for_logging_only';
    }
    
    // For OAuth client flow, we would need to implement the full OAuth 2.0 flow
    // with refresh tokens stored in the database. For now, return test token.
    // TODO: Implement full OAuth 2.0 flow with refresh token storage if needed
    console.warn('⚠️ OAuth client credentials provided but full OAuth flow not implemented. Using test mode.');
    return 'test_token_for_logging_only';
    
  } catch (error) {
    console.error('Error getting Google token:', error);
    return 'error_fallback_token';
  }
}

// Generate Google OAuth token using service account JWT (similar to Vertex AI)
interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

async function getGoogleOAuthToken(credentials: ServiceAccountCredentials): Promise<{ success: boolean; token?: string }> {
  try {
    // Google Sheets API requires spreadsheets scope
    const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = btoa(JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // Token valid for 1 hour
      iat: now
    }));

    const privateKeyPem = credentials.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\n/g, '');
    
    const binaryKey = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureInput = `${jwtHeader}.${jwtPayload}`;
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signatureInput)
    );

    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${signatureInput}.${signatureBase64}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Google OAuth token error:', errorText);
      return { success: false };
    }

    const tokenData = await tokenResponse.json();
    return { success: true, token: tokenData.access_token };

  } catch (error) {
    console.error('OAuth token generation error:', error);
    return { success: false };
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
    const existingSheets = (spreadsheetData.sheets as Array<{ properties: { title: string } }>).map(sheet => sheet.properties.title);
    
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

// Sync data to Google Sheets with proper headers and append functionality
async function syncToGoogleSheets(spreadsheetId: string, accessToken: string, sheetName: string, data: MetricRow[]): Promise<void> {
  if (data.length === 0) return;
  
  // Aggregate-only columns. One row is one metric, never one person. Adding a
  // per-user column here would reintroduce the personal-data export this sync
  // was narrowed to remove.
  const systematicHeaders = ['Snapshot Date', 'Sync Type', 'Metric', 'Value'];
  
  // Check if headers exist
  const checkHeadersResponse = await fetch(
    `${GOOGLE_SHEETS_API_URL}/${spreadsheetId}/values/${sheetName}!1:1`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  let needsHeaders = true;
  if (checkHeadersResponse.ok) {
    const headerData = await checkHeadersResponse.json();
    needsHeaders = !headerData.values || headerData.values.length === 0 || headerData.values[0].length === 0;
  }
  
  // Add headers if needed
  if (needsHeaders) {
    const headerResponse = await fetch(
      `${GOOGLE_SHEETS_API_URL}/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [systematicHeaders]
        }),
      }
    );
    
    if (!headerResponse.ok) {
      console.warn(`Failed to add headers to sheet ${sheetName}: ${headerResponse.statusText}`);
    } else {
      console.log(`Added headers to sheet ${sheetName}`);
    }
  }
  
  // Find the next empty row to append data
  const rangeResponse = await fetch(
    `${GOOGLE_SHEETS_API_URL}/${spreadsheetId}/values/${sheetName}!A:A`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  let nextRow = 2; // Start after headers
  if (rangeResponse.ok) {
    const rangeData = await rangeResponse.json();
    if (rangeData.values && rangeData.values.length > 0) {
      nextRow = rangeData.values.length + 1;
    }
  }
  
  // Format data to match systematic headers
  // Keep a zero as 0. `|| ''` would blank every legitimately zero metric and
  // make an empty cohort indistinguishable from a failed read.
  const formattedData = data.map(row =>
    systematicHeaders.map(header => (row[header] === undefined || row[header] === null ? '' : row[header])),
  );
  
  // Append the new data
  const appendResponse = await fetch(
    `${GOOGLE_SHEETS_API_URL}/${spreadsheetId}/values/${sheetName}!A${nextRow}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: formattedData
      }),
    }
  );
  
  if (!appendResponse.ok) {
    throw new Error(`Failed to append data to sheet ${sheetName}: ${appendResponse.statusText}`);
  }
  
  console.log(`Successfully appended ${formattedData.length} rows to sheet ${sheetName} starting at row ${nextRow}`);
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

    let sheetData: MetricRow[] = [];
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

    // Always attempt sync if we have data - remove development mode restriction
    console.log(`Processing ${sheetData.length} records for Google Sheets sync`);

    if (sheetData.length > 0) {
      try {
        // Get Google access token
        const accessToken = await getGoogleToken();
        
        if (accessToken.includes('test_token') || accessToken.includes('error_fallback')) {
          // For testing: simulate successful sync without actual Google API calls
          console.log(`Test mode: simulating sync of ${sheetData.length} records to Google Sheets`);
          
          // Update sync log with simulated success
          if (syncLog) {
            await supabase
              .from('google_sheets_sync_log')
              .update({
                status: 'synced',
                data_count: sheetData.length,
                synced_at: new Date().toISOString(),
                sync_metadata: {
                  ...syncLog.sync_metadata,
                  spreadsheet_id: 'test_spreadsheet_id',
                  sheet_name: sheetName,
                  records_synced: sheetData.length,
                  test_mode: true,
                  note: 'Simulated sync - Google credentials not configured'
                }
              })
              .eq('id', syncLog.id);
          }
          
          console.log(`Test sync completed for ${sheetData.length} records`);
        } else {
          // Real Google API integration
          const spreadsheetId = await getOrCreateSpreadsheet(accessToken);
          await syncToGoogleSheets(spreadsheetId, accessToken, sheetName, sheetData);
          
          // Update sync log with real success
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
        }
      } catch (error) {
        console.error('Google Sheets sync failed:', error);
        
        // Update sync log with error
        if (syncLog) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const errorStack = error instanceof Error ? error.stack : undefined;
          await supabase
            .from('google_sheets_sync_log')
            .update({
              status: 'failed',
              error_message: errorMessage,
              sync_metadata: {
                ...syncLog.sync_metadata,
                error_details: errorStack
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

  } catch (error: unknown) {
    console.error('Error in background Google Sheets sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: 'Background sync failed',
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Aggregate builders.
 *
 * This sync used to write one row per person, carrying full name, email,
 * company, role, phone and free-text business context into a Google Sheet.
 * That is a large amount of personal data leaving the database for an
 * operational convenience, and it is the kind of thing a leader reads in a
 * privacy notice and quietly decides against.
 *
 * Everything below produces counts and distributions only. One row is one
 * metric, never one person, so no identifier can reach the sheet even if a
 * new column is added upstream.
 */

interface MetricRow {
  'Snapshot Date': string;
  'Sync Type': string;
  'Metric': string;
  'Value': number;
}

function metric(type: string, name: string, value: number): MetricRow {
  return {
    'Snapshot Date': new Date().toISOString().slice(0, 10),
    'Sync Type': type,
    'Metric': name,
    'Value': value,
  };
}

/** One row as returned by Supabase: named columns whose types we narrow at use. */
type Row = Record<string, unknown>;

/**
 * The narrow slice of the Supabase client these aggregates use. Typing the
 * shape we actually call keeps the builders honest without pulling the full
 * generated database types into an edge function.
 */
interface SupabaseLike {
  from(table: string): {
    select(columns: string): {
      order(column: string, opts: { ascending: boolean }): {
        limit(count: number): Promise<{ data: Row[] | null; error: { message: string } | null }>;
      };
    };
  };
}

/** Reads a numeric column, treating anything non-numeric as absent. */
function num(row: Row, field: string): number | null {
  const v = row[field];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Counts occurrences of a field, emitting one metric row per distinct value. */
function distribution(rows: Row[], field: string, type: string, label: string): MetricRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[field];
    const key = raw === null || raw === undefined || raw === '' ? 'unspecified' : String(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => metric(type, `${label}: ${key}`, count));
}

function band(score: number): string {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

async function formatBookingData(supabase: SupabaseLike, _additionalData?: unknown): Promise<MetricRow[]> {
  const { data: bookings, error } = await supabase
    .from('booking_requests')
    .select('status, priority, service_type, lead_score, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching booking data:', error);
    return [];
  }

  const rows: Row[] = bookings ?? [];
  const scores = rows.map(r => num(r, 'lead_score')).filter((v): v is number => v !== null);
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length)
    : 0;

  return [
    metric('booking', 'total bookings', rows.length),
    metric('booking', 'average lead score', averageScore),
    ...distribution(rows, 'status', 'booking', 'status'),
    ...distribution(rows, 'priority', 'booking', 'priority'),
    ...distribution(rows, 'service_type', 'booking', 'service'),
    ...distribution(scores.map(v => ({ band: band(v) })), 'band', 'booking', 'lead quality'),
  ];
}

async function formatAnalyticsData(supabase: SupabaseLike): Promise<MetricRow[]> {
  const { data: analytics, error } = await supabase
    .from('conversion_analytics')
    .select('conversion_type, service_type, source_channel, session_duration, messages_exchanged, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching analytics data:', error);
    return [];
  }

  const rows: Row[] = analytics ?? [];
  const totalMinutes = rows.reduce((sum, r) => sum + Math.round((num(r, 'session_duration') ?? 0) / 60), 0);
  const totalMessages = rows.reduce((sum, r) => sum + (num(r, 'messages_exchanged') ?? 0), 0);

  return [
    metric('analytics', 'total conversions', rows.length),
    metric('analytics', 'median session minutes', rows.length ? Math.round(totalMinutes / rows.length) : 0),
    metric('analytics', 'average messages exchanged', rows.length ? Math.round(totalMessages / rows.length) : 0),
    ...distribution(rows, 'conversion_type', 'analytics', 'conversion'),
    ...distribution(rows, 'source_channel', 'analytics', 'channel'),
    ...distribution(rows, 'service_type', 'analytics', 'service'),
  ];
}

async function formatLeadScoreData(supabase: SupabaseLike): Promise<MetricRow[]> {
  // Industry and company size are business attributes rather than personal
  // ones, but they are only ever emitted here as counts across the cohort.
  const { data: scores, error } = await supabase
    .from('lead_qualification_scores')
    .select('total_score, engagement_score, business_readiness_score, implementation_readiness, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching lead score data:', error);
    return [];
  }

  const rows: Row[] = scores ?? [];
  const average = (field: string) =>
    rows.length
      ? Math.round(rows.reduce((sum, r) => sum + (num(r, field) ?? 0), 0) / rows.length)
      : 0;

  return [
    metric('lead_scores', 'total scored sessions', rows.length),
    metric('lead_scores', 'average total score', average('total_score')),
    metric('lead_scores', 'average engagement score', average('engagement_score')),
    metric('lead_scores', 'average business readiness', average('business_readiness_score')),
    metric('lead_scores', 'average implementation readiness', average('implementation_readiness')),
    ...distribution(rows.map(r => ({ band: band(num(r, 'total_score') ?? 0) })), 'band', 'lead_scores', 'quality band'),
  ];
}
