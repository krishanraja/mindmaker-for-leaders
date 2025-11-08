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
      companyHash,
      sessionId,
      userId,
      contactData,
      eventType = 'assessment_completed' // 'assessment_completed', 'referral', 'booking'
    } = await req.json();

    console.log('📈 Updating adoption momentum for company:', companyHash?.substring(0, 8) + '...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!companyHash) {
      throw new Error('Company hash is required');
    }

    // Fetch existing momentum record
    const { data: existingMomentum, error: fetchError } = await supabase
      .from('adoption_momentum')
      .select('*')
      .eq('company_identifier_hash', companyHash)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      throw fetchError;
    }

    // Get all assessments for this company to calculate metrics
    const { data: allParticipants, error: participantsError } = await supabase
      .from('index_participant_data')
      .select('user_id, completed_at')
      .eq('company_identifier_hash', companyHash)
      .order('completed_at', { ascending: true });

    if (participantsError) throw participantsError;

    const totalAssessments = allParticipants?.length || 1;
    const uniqueUsers = new Set(allParticipants?.map(p => p.user_id).filter(Boolean)).size;
    
    // Get date range
    const firstAssessmentDate = allParticipants?.[0]?.completed_at || new Date().toISOString();
    const latestAssessmentDate = allParticipants?.[allParticipants.length - 1]?.completed_at || new Date().toISOString();
    
    // Calculate days between first and last assessment
    const daysBetween = Math.floor(
      (new Date(latestAssessmentDate).getTime() - new Date(firstAssessmentDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Count advisory sprints (bookings)
    const { count: sprintCount, error: sprintError } = await supabase
      .from('booking_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_name', contactData?.companyName)
      .in('service_type', ['advisory_sprint', 'executive_primer']);

    // Count workshop bookings
    const { count: workshopCount, error: workshopError } = await supabase
      .from('booking_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_name', contactData?.companyName)
      .eq('service_type', 'workshop');

    // Get referral data (if any)
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .or(`referring_company_hash.eq.${companyHash},referred_company_hash.eq.${companyHash}`);

    const referredCompanies = referrals?.filter(r => r.referring_company_hash === companyHash).length || 0;
    const verifiedReferrals = referrals?.filter(r => 
      r.referring_company_hash === companyHash && 
      r.referred_company_completed_assessment
    ).length || 0;

    // Prepare momentum data
    const momentumData = {
      company_identifier_hash: companyHash,
      total_assessments: totalAssessments,
      total_unique_users: uniqueUsers,
      total_advisory_sprints: sprintCount || 0,
      total_workshop_bookings: workshopCount || 0,
      first_assessment_date: firstAssessmentDate,
      latest_assessment_date: latestAssessmentDate,
      days_between_first_last: daysBetween,
      referred_companies: referredCompanies,
      verified_referrals: verifiedReferrals,
      industry: contactData?.primaryFocus || existingMomentum?.industry || null,
      company_size: contactData?.companySize || existingMomentum?.company_size || null,
      metadata: {
        last_event_type: eventType,
        last_updated_by: eventType,
        session_id: sessionId,
        user_id: userId
      }
    };

    let result;
    
    if (existingMomentum) {
      // Update existing momentum record (trigger will calculate scores)
      console.log('📊 Updating existing momentum record...');
      const { data: updated, error: updateError } = await supabase
        .from('adoption_momentum')
        .update(momentumData)
        .eq('id', existingMomentum.id)
        .select()
        .single();

      if (updateError) throw updateError;
      result = updated;
    } else {
      // Create new momentum record (trigger will calculate scores)
      console.log('🆕 Creating new momentum record...');
      const { data: created, error: createError } = await supabase
        .from('adoption_momentum')
        .insert(momentumData)
        .select()
        .single();

      if (createError) throw createError;
      result = created;
    }

    console.log('✅ Momentum updated:', {
      tier: result.momentum_tier,
      score: result.momentum_score,
      assessments: totalAssessments,
      users: uniqueUsers
    });

    return new Response(
      JSON.stringify({
        success: true,
        momentum: {
          id: result.id,
          tier: result.momentum_tier,
          score: result.momentum_score,
          total_assessments: result.total_assessments,
          total_unique_users: result.total_unique_users,
          days_active: result.days_between_first_last
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error updating adoption momentum:', error);
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
