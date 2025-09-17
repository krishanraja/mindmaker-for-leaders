import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  };
  assessmentData: any;
  sessionId: string;
  scores: any;
  isAnonymous?: boolean;
}

const formatAssessmentData = (data: any): string => {
  const sections = [];
  
  if (data) {
    const keys = Object.keys(data);
    
    keys.forEach(key => {
      if (data[key] && data[key] !== '') {
        sections.push(`<li><strong>${key}:</strong> ${data[key]}</li>`);
      }
    });
  }
  
  return sections.length > 0 ? `<ul>${sections.join('')}</ul>` : 'No assessment data provided';
};

const formatScores = (scores: any): string => {
  if (!scores || Object.keys(scores).length === 0) {
    return 'No scores available';
  }
  
  return `
    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0;">
      <h3>📊 AI Leadership Assessment Scores</h3>
      <ul>
        ${scores.aiMindmakerScore ? `<li><strong>Overall AI Mindmaker Score:</strong> ${scores.aiMindmakerScore}/100</li>` : ''}
        ${scores.aiToolFluency ? `<li><strong>AI Tool Fluency:</strong> ${scores.aiToolFluency}/100</li>` : ''}
        ${scores.aiDecisionMaking ? `<li><strong>AI Decision Making:</strong> ${scores.aiDecisionMaking}/100</li>` : ''}
        ${scores.aiCommunication ? `<li><strong>AI Communication:</strong> ${scores.aiCommunication}/100</li>` : ''}
        ${scores.aiLearningGrowth ? `<li><strong>AI Learning & Growth:</strong> ${scores.aiLearningGrowth}/100</li>` : ''}
        ${scores.aiEthicsBalance ? `<li><strong>AI Ethics & Balance:</strong> ${scores.aiEthicsBalance}/100</li>` : ''}
      </ul>
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
          specific_needs: `AI Literacy for Leaders inquiry - Complete assessment data included. Assessment responses: ${JSON.stringify(assessmentData)}`,
          notes: `LinkedIn: ${contactData.linkedin || 'Not provided'} | Source: AI Literacy for Leaders Report`,
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

    // Prepare email content based on whether it's anonymous or not
    const emailSubject = isAnonymous 
      ? `🚀 ANONYMOUS AI LITERACY ASSESSMENT - Advisory Sprint Interest`
      : `🚀 NEW ADVISORY SPRINT BOOKING: ${contactData?.fullName || `${contactData?.firstName || ''} ${contactData?.lastName || ''}`.trim() || 'Unknown'} from ${contactData?.companyName || contactData?.company || 'Unknown'}`;

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
            <p><strong>Role/Title:</strong> ${contactData?.role || 'Leadership Role'}</p>
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

    // Send comprehensive email to krish@fractionl.ai
    const emailResponse = await resend.emails.send({
      from: "AI Literacy for Leaders <no-reply@fractionl.ai>",
      to: ["krish@fractionl.ai"],
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          
          <div style="text-align: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🚀 AI LITERACY FOR LEADERS INQUIRY</h1>
            <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">${isAnonymous ? 'Anonymous Assessment Submission' : 'Advisory Sprint Booking Request'}</p>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">Generated: ${new Date().toLocaleString()}</p>
          </div>

          ${contactSection}

          ${formatScores(scores)}

          <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📋 Complete Assessment Responses</h2>
            ${formatAssessmentData(assessmentData)}
          </div>

          <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🎯 Next Steps</h2>
            <ul style="color: #374151; line-height: 1.6;">
              <li><strong>Immediate:</strong> Review this comprehensive assessment data</li>
               ${isAnonymous 
                ? '<li><strong>Follow-up:</strong> User will book via Calendly and provide contact details</li>'
                : `<li><strong>Follow-up:</strong> Contact ${contactData?.fullName || contactData?.firstName || 'User'} at ${contactData?.email} or ${contactData?.phone || 'email only'}</li>`
               }
              <li><strong>Preparation:</strong> Use assessment insights to customize the Advisory Sprint session</li>
              <li><strong>Calendar:</strong> Watch for booking via the Calendly link above</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This is an automated notification from the AI Literacy for Leaders assessment platform.<br>
              ${isAnonymous ? 'Anonymous assessment data provided - contact details will come via Calendly booking.' : 'All data has been securely stored in the CRM system.'}
            </p>
          </div>
        </div>
      `,
    });

    console.log("Advisory Sprint notification sent successfully:", emailResponse);

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
      emailId: emailResponse.data?.id,
      bookingId: bookingData?.id || null,
      isAnonymous: !!isAnonymous
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-advisory-sprint-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});