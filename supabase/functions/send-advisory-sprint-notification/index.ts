import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdvisorySprintRequest {
  contactData?: {
    fullName?: string;
    companyName?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    role?: string;
    phone?: string;
    linkedin?: string;
    roleTitle?: string;
    companySize?: string;
    primaryFocus?: string;
    timeline?: string;
    consentToInsights?: boolean;
  };
  assessmentData: any;
  sessionId: string;
  scores: any;
  isAnonymous?: boolean;
}

const formatAssessmentData = (data: any): string => {
  const questionMap = {
    'industry_impact': 'I can clearly explain AI\'s impact on our industry in growth terms.',
    'business_acceleration': 'I know which areas of our business can be accelerated by AI-first workflows.',
    'team_alignment': 'My leadership team shares a common AI growth narrative.',
    'external_positioning': 'AI is part of our external positioning (investors, market).',
    'kpi_connection': 'I connect AI adoption directly to KPIs (margin, speed, risk-adjusted growth).',
    'coaching_champions': 'I actively coach emerging AI champions in my org.'
  };
  
  const sections: string[] = [];
  
  if (data && Object.keys(data).length > 0) {
    Object.entries(data).forEach(([category, answer]) => {
      const question = questionMap[category as keyof typeof questionMap];
      if (question && answer) {
        sections.push(`
          <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 4px;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #374151;">${question}</p>
            <p style="margin: 0; color: #6366f1; font-weight: 600;">${answer}</p>
          </div>
        `);
      }
    });
  }
  
  return sections.length > 0 ? sections.join('') : '<p style="color: #6b7280; font-style: italic;">No assessment responses captured</p>';
};

const formatScores = (scores: any): string => {
  if (!scores || typeof scores.total !== 'number') {
    return '<p style="color: #6b7280; font-style: italic;">Leadership scoring not available</p>';
  }
  
  const total = scores.total || 0;
  const tier = getTierClassification(total);
  
  return `
    <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🎯 AI Leadership Growth Benchmark Results</h2>
      
      <div style="text-align: center; background: ${tier.color}; color: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <div style="font-size: 36px; font-weight: bold; margin-bottom: 8px;">${total}/30</div>
        <div style="font-size: 18px; font-weight: 600;">${tier.name}</div>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">${tier.description}</div>
      </div>
      
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 15px;">
        <h4 style="margin: 0 0 10px; color: #374151;">🎯 Strategic Growth Focus Areas:</h4>
        <ul style="margin: 0; color: #6b7280;">
          ${tier.focus.map((focus: string) => `<li>${focus}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
};

const getTierClassification = (score: number) => {
  if (score >= 25) {
    return {
      name: 'AI-Orchestrator',
      description: 'Leading organizational AI transformation',
      color: '#059669',
      focus: [
        'Scale AI adoption across all business units',
        'Build competitive moats through AI innovation',
        'Develop proprietary AI capabilities and IP'
      ]
    };
  } else if (score >= 20) {
    return {
      name: 'AI-Confident',
      description: 'Strong foundation with strategic gaps',
      color: '#2563eb',
      focus: [
        'Accelerate team-wide AI implementation',
        'Connect AI initiatives to measurable business outcomes',
        'Build internal AI expertise and culture'
      ]
    };
  } else if (score >= 15) {
    return {
      name: 'AI-Aware',
      description: 'Understanding value but lacking execution clarity',
      color: '#f59e0b',
      focus: [
        'Develop concrete AI adoption roadmap',
        'Align leadership team on AI strategy',
        'Identify highest-impact AI use cases'
      ]
    };
  } else {
    return {
      name: 'AI-Confused',
      description: 'Significant opportunity for strategic AI leadership',
      color: '#dc2626',
      focus: [
        'Build foundational AI literacy across leadership',
        'Clarify AI\'s role in business strategy',
        'Start with quick wins to build confidence'
      ]
    };
  }
};

const calculateLeadPriority = (contactData: any, assessmentScore: number) => {
  let score = 0;

  // Role/Title scoring (0-30 points)
  const roleTitle = (contactData?.roleTitle || contactData?.role || '').toLowerCase();
  if (roleTitle.includes('ceo') || roleTitle.includes('founder') || roleTitle.includes('chief')) {
    score += 30;
  } else if (roleTitle.includes('vp') || roleTitle.includes('director') || roleTitle.includes('head of')) {
    score += 20;
  } else if (roleTitle.includes('manager') || roleTitle.includes('lead')) {
    score += 10;
  }

  // Company Size scoring (0-25 points)
  const companySize = contactData?.companySize || '';
  if (companySize === '501-1000' || companySize === '1000+') {
    score += 25;
  } else if (companySize === '201-500') {
    score += 20;
  } else if (companySize === '51-200') {
    score += 15;
  } else if (companySize === '11-50') {
    score += 10;
  } else {
    score += 5;
  }

  // Timeline urgency scoring (0-25 points)
  const timeline = contactData?.timeline || '';
  if (timeline.includes('Immediate')) {
    score += 25;
  } else if (timeline.includes('Short-term')) {
    score += 20;
  } else if (timeline.includes('Medium-term')) {
    score += 15;
  } else if (timeline.includes('Long-term')) {
    score += 10;
  } else {
    score += 5;
  }

  // Primary Focus scoring (0-20 points)
  const focus = contactData?.primaryFocus || '';
  if (focus === 'Strategy & Vision' || focus === 'Competitive Advantage') {
    score += 20;
  } else if (focus === 'Product Innovation' || focus === 'Process Automation') {
    score += 15;
  } else {
    score += 10;
  }

  // Assessment Score bonus
  if (assessmentScore >= 25) {
    score += 10;
  } else if (assessmentScore >= 20) {
    score += 5;
  }

  // Determine tier
  if (score >= 75) {
    return {
      tier: 'A',
      label: 'HIGH-PRIORITY EXECUTIVE',
      emoji: '🔥',
      color: '#dc2626',
      description: 'C-level executive at scale-stage company with immediate timeline',
      recommendedAction: 'Schedule executive briefing within 24 hours. High-value strategic advisory opportunity.'
    };
  } else if (score >= 50) {
    return {
      tier: 'B',
      label: 'QUALIFIED LEAD',
      emoji: '⭐',
      color: '#f59e0b',
      description: 'Decision-maker or influencer with clear AI focus and reasonable timeline',
      recommendedAction: 'Follow up within 48-72 hours. Strong potential for advisory engagement.'
    };
  } else {
    return {
      tier: 'C',
      label: 'NURTURE PROSPECT',
      emoji: '📊',
      color: '#6b7280',
      description: 'Early-stage interest or longer timeline. Educational nurture recommended.',
      recommendedAction: 'Add to nurture sequence. Provide educational content and check back in 30-60 days.'
    };
  }
};

const formatQualificationContext = (contactData: any, priority: any, assessmentScore: number): string => {
  if (!contactData?.roleTitle && !contactData?.companySize) {
    return '';
  }

  return `
    <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 6px solid ${priority.color};">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <span style="font-size: 32px;">${priority.emoji}</span>
        <div>
          <h2 style="color: ${priority.color}; margin: 0; font-size: 24px; font-weight: bold;">${priority.label}</h2>
          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Lead Priority: ${priority.tier}-Tier</p>
        </div>
      </div>
      
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p style="margin: 0; color: #374151; font-weight: 600;">Profile Summary:</p>
        <p style="margin: 5px 0 0; color: #6b7280;">${priority.description}</p>
      </div>

      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">⚡ Recommended Action:</p>
        <p style="margin: 5px 0 0; color: #92400e;">${priority.recommendedAction}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Seniority</p>
          <p style="margin: 5px 0 0; color: #374151; font-weight: bold;">${contactData.roleTitle || contactData.role || 'Not provided'}</p>
        </div>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Company Scale</p>
          <p style="margin: 5px 0 0; color: #374151; font-weight: bold;">${contactData.companySize ? contactData.companySize + ' employees' : 'Not provided'}</p>
        </div>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Strategic Focus</p>
          <p style="margin: 5px 0 0; color: #374151; font-weight: bold;">${contactData.primaryFocus || 'Not provided'}</p>
        </div>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Timeline</p>
          <p style="margin: 5px 0 0; color: #374151; font-weight: bold;">${contactData.timeline || 'Not provided'}</p>
        </div>
      </div>

      <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          <strong>AI Leadership Score:</strong> ${assessmentScore}/30 | 
          <strong>Consent Status:</strong> ${contactData.consentToInsights ? '✅ Opted in to receive personalized insights' : '❌ No consent'}
        </p>
      </div>
    </div>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactData, assessmentData, sessionId, scores, isAnonymous }: AdvisorySprintRequest = await req.json();

    console.log('Processing Advisory Sprint notification - Anonymous:', !!isAnonymous);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let bookingData = null;

    // Only save to booking_requests if we have contact data
    if (contactData && !isAnonymous) {
      const { data, error: bookingError } = await supabase
        .from('booking_requests')
        .insert({
          session_id: sessionId,
          contact_name: contactData.fullName || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || 'Unknown',
          contact_email: contactData.email || 'Unknown',
          company_name: contactData.companyName || contactData.company || 'Unknown',
          role: contactData.role || 'Leadership Role',
          phone: contactData.phone || null,
          service_type: 'strategy_call', // Fixed: use allowed service_type
          service_title: 'AI Advisory Sprint - 90 Min Leadership Session',
          status: 'pending',
          priority: 'high',
          specific_needs: `AI Leadership Growth Benchmark inquiry - Complete 6-question assessment data included. Leadership tier and responses: ${JSON.stringify(assessmentData)}`,
          notes: `LinkedIn: ${contactData.linkedin || 'Not provided'} | Source: AI Leadership Growth Benchmark Report`,
          lead_score: scores?.aiMindmakerScore || 0
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Booking save error:', bookingError);
        throw new Error(`Failed to save booking: ${bookingError.message}`);
      }
      bookingData = data;
    }

    // Calculate lead priority
    const assessmentScore = scores?.total || 0;
    const leadPriority = calculateLeadPriority(contactData, assessmentScore);
    const qualificationContext = formatQualificationContext(contactData, leadPriority, assessmentScore);

    // Prepare email content based on priority and whether it's anonymous
    const emailSubject = isAnonymous 
      ? `🎯 ANONYMOUS AI LEADERSHIP BENCHMARK - Executive Advisory Interest`
      : `${leadPriority.emoji} ${leadPriority.label}: ${contactData?.fullName || `${contactData?.firstName || ''} ${contactData?.lastName || ''}`.trim() || 'Unknown'} from ${contactData?.companyName || contactData?.company || 'Unknown'}`;

    const contactSection = isAnonymous ? `
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: bold; color: #f59e0b;">📋 Anonymous Assessment Submission</p>
        <p style="margin: 5px 0 0; color: #92400e;">User will provide contact details when booking via Calendly</p>
        <p style="margin: 5px 0 0;"><strong>📅 Calendly Link:</strong> <a href="https://calendly.com/krish-raja/mindmaker-leaders" target="_blank">https://calendly.com/krish-raja/mindmaker-leaders</a></p>
        <p style="margin: 5px 0 0;"><strong>📋 Session ID:</strong> ${sessionId}</p>
      </div>
    ` : `
      <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">👤 Contact Information</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p><strong>Name:</strong> ${contactData?.fullName || `${contactData?.firstName || ''} ${contactData?.lastName || ''}`.trim() || 'Unknown'}</p>
            <p><strong>Email:</strong> <a href="mailto:${contactData?.email}">${contactData?.email}</a></p>
            <p><strong>Company:</strong> ${contactData?.companyName || contactData?.company || 'Unknown'}</p>
          </div>
          <div>
            <p><strong>Role/Title:</strong> ${contactData?.roleTitle || contactData?.role || 'Leadership Role'}</p>
            <p><strong>Company Size:</strong> ${contactData?.companySize || 'Not provided'}</p>
            <p><strong>Primary Focus:</strong> ${contactData?.primaryFocus || 'Not provided'}</p>
            <p><strong>Timeline:</strong> ${contactData?.timeline || 'Not provided'}</p>
            <p><strong>Consent Status:</strong> ${contactData?.consentToInsights ? '✅ Opted in' : '❌ No consent'}</p>
            <p><strong>Phone:</strong> ${contactData?.phone || 'Not provided'}</p>
            <p><strong>LinkedIn:</strong> ${contactData?.linkedin ? `<a href="${contactData.linkedin}" target="_blank">${contactData.linkedin}</a>` : 'Not provided'}</p>
          </div>
        </div>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0;"><strong>🎯 Service Requested:</strong> AI Advisory Sprint (90-minute focused session)</p>
          <p style="margin: 5px 0 0;"><strong>📋 Session ID:</strong> ${sessionId}</p>
          <p style="margin: 5px 0 0;"><strong>📅 Calendly Link:</strong> <a href="https://calendly.com/krish-raja/mindmaker-leaders" target="_blank">https://calendly.com/krish-raja/mindmaker-leaders</a></p>
        </div>
      </div>
    `;

    // Send comprehensive email to krish@themindmaker.ai using Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "AI Leadership Growth Benchmark <no-reply@fractionl.ai>",
        to: ["krish@themindmaker.ai"],
        subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          
          <div style="text-align: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎯 AI LEADERSHIP GROWTH BENCHMARK</h1>
            <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">${isAnonymous ? 'Anonymous Executive Assessment' : 'Executive Advisory Inquiry'}</p>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">Generated: ${new Date().toLocaleString()}</p>
          </div>

          ${qualificationContext}

          ${contactSection}

          ${formatScores(scores)}

          <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📋 Complete AI Leadership Assessment Responses</h2>
            <p style="color: #6b7280; margin-bottom: 20px; font-style: italic;">
              6-question leadership benchmark measuring AI strategic capabilities across key growth dimensions.
              Each response scored 1-5 scale (Strongly Disagree to Strongly Agree).
            </p>
            ${formatAssessmentData(assessmentData)}
          </div>

          <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🎯 Executive Advisory Next Steps</h2>
            <ul style="color: #374151; line-height: 1.6;">
              <li><strong>Assessment Review:</strong> This leader completed our 6-dimension AI Growth Benchmark</li>
               ${isAnonymous 
                ? '<li><strong>Follow-up Process:</strong> Executive will book 90-minute session via Calendly and provide contact details</li>'
                : `<li><strong>Executive Contact:</strong> Reach out to ${contactData?.fullName || contactData?.firstName || 'Executive'} at ${contactData?.email} or ${contactData?.phone || 'email only'}</li>`
               }
              <li><strong>Session Prep:</strong> Customize Executive Primer based on tier classification and focus areas above</li>
              <li><strong>Strategic Focus:</strong> Tailor discussion to their specific leadership growth gaps and organizational AI readiness</li>
              <li><strong>Booking Portal:</strong> <a href="https://calendly.com/krish-raja/mindmaker-leaders" target="_blank">Executive Advisory Session Booking</a></li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This notification is from the AI Leadership Growth Benchmark platform.<br>
              ${isAnonymous ? 'Anonymous executive assessment completed - contact details will be provided via Calendly booking.' : 'Executive contact data and assessment results have been securely stored in the CRM system.'}
            </p>
          </div>
        </div>
      `
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Email sending failed: ${emailResponse.status}`);
    }

    const emailResult = await emailResponse.json();

    console.log("Advisory Sprint notification sent successfully:", emailResult.id);

    // Log security audit
    await supabase
      .from('security_audit_log')
      .insert({
        action: isAnonymous ? 'anonymous_advisory_sprint_interest' : 'advisory_sprint_booking',
        resource_type: 'assessment_submission',
        resource_id: bookingData?.id || null,
        details: {
          contact_email: contactData?.email || 'anonymous',
          company: contactData?.company || 'anonymous',
          service_type: 'advisory_sprint',
          ai_mindmaker_score: scores?.aiMindmakerScore,
          session_id: sessionId,
          is_anonymous: !!isAnonymous
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResult.id,
      bookingId: bookingData?.id || null,
      isAnonymous: !!isAnonymous
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: unknown) {
    console.error("Error in send-advisory-sprint-notification:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});