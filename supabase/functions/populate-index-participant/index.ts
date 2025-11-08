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
    const { 
      sessionId, 
      userId, 
      assessmentData, 
      contactData,
      consentFlags = {}
    } = await req.json();

    console.log('📊 Populating index participant data for session:', sessionId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate readiness score from assessment responses (0-100 scale)
    let totalScore = 0;
    const responses = Object.values(assessmentData);
    responses.forEach((response: any) => {
      if (typeof response === 'string') {
        const match = response.match(/^(\d+)/);
        if (match) {
          totalScore += parseInt(match[1]);
        }
      }
    });
    const readinessScore = Math.round((totalScore / 30) * 100); // Normalize from 30 max to 100

    // Extract dimension scores from assessment
    const dimensionScores = {
      industry_impact: extractScore(assessmentData.industryImpact),
      business_acceleration: extractScore(assessmentData.businessAcceleration),
      team_alignment: extractScore(assessmentData.teamAlignment),
      external_positioning: extractScore(assessmentData.externalPositioning),
      kpi_connection: extractScore(assessmentData.kpiConnection),
      coaching_champions: extractScore(assessmentData.coachingChampions)
    };

    // Determine tier based on readiness score
    let tier = 'emerging';
    if (readinessScore >= 83) tier = 'leading';
    else if (readinessScore >= 63) tier = 'advancing';
    else if (readinessScore >= 43) tier = 'establishing';

    // Extract email domain for company hashing
    const emailDomain = contactData.email.split('@')[1]?.toLowerCase();
    
    // Hash company identifier using the database function
    let companyHash = null;
    if (emailDomain) {
      const { data: hashData, error: hashError } = await supabase.rpc(
        'hash_company_identifier',
        { email_domain: emailDomain }
      );
      if (!hashError && hashData) {
        companyHash = hashData;
      }
    }

    // Default consent flags with product_improvements always true
    const finalConsentFlags = {
      index_publication: consentFlags.index_publication ?? false,
      case_study: consentFlags.case_study ?? false,
      research_partnerships: consentFlags.research_partnerships ?? false,
      sales_outreach: consentFlags.sales_outreach ?? false,
      product_improvements: true // Always true by default
    };

    // Insert into index_participant_data
    const { data: participantData, error: insertError } = await supabase
      .from('index_participant_data')
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        readiness_score: readinessScore,
        dimension_scores: dimensionScores,
        completed_at: new Date().toISOString(),
        consent_flags: finalConsentFlags,
        company_identifier_hash: companyHash,
        industry: contactData.primaryFocus || null,
        company_size: contactData.companySize || null,
        role_title: contactData.roleTitle || null,
        tier: tier,
        assessment_type: 'ai_leadership_benchmark'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting participant data:', insertError);
      throw insertError;
    }

    console.log('✅ Index participant data populated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        participantId: participantData.id,
        readinessScore,
        tier,
        companyHash
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in populate-index-participant:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to extract numeric score from response string
function extractScore(response: string | undefined): number {
  if (!response || typeof response !== 'string') return 0;
  const match = response.match(/^(\d+)/);
  return match ? parseInt(match[1]) : 0;
}
