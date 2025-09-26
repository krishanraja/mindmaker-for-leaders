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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { booking, service, leadScore, sessionId } = await req.json();

    console.log('Processing booking notification', { 
      serviceType: service.type, 
      leadScore: leadScore.overall,
      sessionId 
    });

    // Create booking request record if not already created
    const { error: bookingError } = await supabase
      .from('booking_requests')
      .upsert({
        session_id: sessionId,
        service_type: service.type,
        service_title: service.title,
        contact_name: booking.name,
        contact_email: booking.email,
        company_name: booking.company,
        role: booking.role,
        phone: booking.phone,
        preferred_time: booking.preferredTime,
        specific_needs: booking.specificNeeds,
        lead_score: leadScore.overall,
        priority: service.priority,
        status: 'pending'
      });

    if (bookingError) {
      console.error('Error saving booking request:', bookingError);
    }

    // Prepare email content
    const serviceTypeMap: Record<string, string> = {
      consultation: 'Executive AI Strategy Session',
      workshop: 'AI Leadership Workshop',
      assessment: 'AI Readiness Assessment',
      implementation: 'AI Implementation Partnership'
    };

    const priorityEmoji: Record<string, string> = {
      high: '🔥',
      medium: '⭐',
      low: '📋'
    };

    const emailSubject = `${priorityEmoji[service.priority] || '📋'} New ${serviceTypeMap[service.type] || 'Service'} Booking Request - Lead Score: ${leadScore.overall}`;

    const emailHtml = `
      <h2>New Booking Request</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Service Details</h3>
        <p><strong>Service:</strong> ${service.title}</p>
        <p><strong>Priority:</strong> ${service.priority.toUpperCase()} ${priorityEmoji[service.priority] || '📋'}</p>
        <p><strong>Lead Score:</strong> ${leadScore.overall}/100</p>
      </div>

      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Contact Information</h3>
        <p><strong>Name:</strong> ${booking.name}</p>
        <p><strong>Email:</strong> <a href="mailto:${booking.email}">${booking.email}</a></p>
        <p><strong>Company:</strong> ${booking.company}</p>
        <p><strong>Role:</strong> ${booking.role}</p>
        <p><strong>Phone:</strong> ${booking.phone || 'Not provided'}</p>
        <p><strong>Preferred Time:</strong> ${booking.preferredTime}</p>
      </div>

      <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Lead Qualification Breakdown</h3>
        <ul>
          <li><strong>Business Readiness:</strong> ${leadScore.qualification.budget + leadScore.qualification.authority + leadScore.qualification.need + leadScore.qualification.timeline}/100</li>
          <li><strong>AI Readiness:</strong> ${leadScore.readiness.aiMaturity + leadScore.readiness.teamReadiness + leadScore.readiness.organizationSize}/50</li>
          <li><strong>Engagement Level:</strong> ${Math.min(leadScore.engagement.sessionDuration + leadScore.engagement.messageCount + leadScore.engagement.topicsExplored, 30)}/30</li>
        </ul>
      </div>

      ${booking.specificNeeds ? `
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Specific Needs</h3>
          <p>${booking.specificNeeds}</p>
        </div>
      ` : ''}

      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>AI Recommendation Reasoning</h3>
        <p>${service.reasoning}</p>
        
        <h4>Recommended Next Steps:</h4>
        <ul>
          ${service.nextSteps.map((step: string) => `<li>${step}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <p><strong>Session ID:</strong> ${sessionId}</p>
        <p><em>This booking was generated from the AI Assessment Chat based on the user's conversation and qualification scores.</em></p>
      </div>
    `;

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AI Assessment <noreply@fractional-ai.com>',
        to: ['hello@fractional-ai.com'],
        subject: emailSubject,
        html: emailHtml,
        reply_to: booking.email
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Email sending failed: ${emailResponse.status}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult.id);

    // Send confirmation email to the user
    const confirmationHtml = `
      <h2>Thank you for your booking request!</h2>
      
      <p>Hi ${booking.name},</p>
      
      <p>We've received your request for <strong>${service.title}</strong> and will contact you within 24 hours to schedule your session.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>What's Next?</h3>
        <ul>
          ${service.nextSteps.map((step: string) => `<li>${step}</li>`).join('')}
        </ul>
      </div>
      
      <p>Based on your AI Assessment, we've identified this as a ${service.priority} priority opportunity for your organization.</p>
      
      <p>If you have any immediate questions, feel free to reply to this email or call us at +1 (234) 567-8900.</p>
      
      <p>Best regards,<br>
      The Fractional AI Team</p>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Fractional AI <hello@fractional-ai.com>',
        to: [booking.email],
        subject: `Confirmation: Your ${service.title} Request`,
        html: confirmationHtml
      }),
    });

    // Log the successful booking for analytics
    await supabase
      .from('security_audit_log')
      .insert({
        action: 'booking_request_submitted',
        resource_type: 'booking',
        metadata: {
          service_type: service.type,
          lead_score: leadScore.overall,
          priority: service.priority,
          session_id: sessionId
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResult.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in booking notification function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: 'Failed to process booking notification',
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});