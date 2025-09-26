import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticEmailRequest {
  data: {
    // New AI Leadership Growth Benchmark data structure
    industry_impact?: string;
    business_acceleration?: string;
    team_alignment?: string;
    external_positioning?: string;
    kpi_connection?: string;
    coaching_champions?: string;
    // Contact information
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    title?: string;
    linkedinUrl?: string;
  };
  scores?: {
    total?: number;
  };
  contactType?: string;
  sessionId?: string;
}

const formatLeadershipAssessment = (data: any): string => {
  const questionMap = {
    'industry_impact': 'I can clearly explain AI\'s impact on our industry in growth terms.',
    'business_acceleration': 'I know which areas of our business can be accelerated by AI-first workflows.',
    'team_alignment': 'My leadership team shares a common AI growth narrative.',
    'external_positioning': 'AI is part of our external positioning (investors, market).',
    'kpi_connection': 'I connect AI adoption directly to KPIs (margin, speed, risk-adjusted growth).',
    'coaching_champions': 'I actively coach emerging AI champions in my org.'
  };
  
  const sections: string[] = [];
  
  Object.entries(questionMap).forEach(([category, question]) => {
    const answer = data[category];
    if (answer) {
      sections.push(`
        <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 4px;">
          <p style="margin: 0 0 8px; font-weight: bold; color: #374151;">${question}</p>
          <p style="margin: 0; color: #6366f1; font-weight: 600;">${answer}</p>
        </div>
      `);
    }
  });
  
  return sections.length > 0 ? sections.join('') : '<p style="color: #6b7280; font-style: italic;">No assessment responses captured</p>';
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

const generateDetailedResults = (data: any, scores: any): string => {
  const total = scores?.total || 0;
  const tier = getTierClassification(total);
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px;">
        <h1>${data.company || 'Organization'} - AI Leadership Executive Primer</h1>
        <p>AI Leadership Growth Benchmark Results</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div style="text-align: center; background: ${tier.color}; color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <div style="font-size: 36px; font-weight: bold; margin-bottom: 8px;">${total}/30</div>
        <div style="font-size: 18px; font-weight: 600;">${tier.name}</div>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">${tier.description}</div>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Executive Contact Information</h2>
        <p><strong>Name:</strong> ${data.firstName || ''} ${data.lastName || ''}</p>
        <p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
        <p><strong>Company:</strong> ${data.company || 'Not provided'}</p>
        <p><strong>Title:</strong> ${data.title || 'Not provided'}</p>
        <p><strong>LinkedIn:</strong> ${data.linkedinUrl || 'Not provided'}</p>
      </div>

      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin: 0 0 10px; color: #374151;">🎯 Strategic Growth Focus Areas:</h3>
        <ul style="margin: 0; color: #6b7280;">
          ${tier.focus.map((focus: string) => `<li>${focus}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Complete AI Leadership Assessment Responses</h2>
        <p style="color: #6b7280; margin-bottom: 20px; font-style: italic;">
          6-question leadership benchmark measuring AI strategic capabilities across key growth dimensions.
          Each response scored 1-5 scale (Strongly Disagree to Strongly Agree).
        </p>
        ${formatLeadershipAssessment(data)}
      </div>
    </div>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, scores, contactType, sessionId }: DiagnosticEmailRequest = await req.json();

    console.log("Generating AI Leadership Growth Benchmark email for:", data.email);

    const total = scores?.total || 0;
    const tier = getTierClassification(total);

    // Send email with detailed HTML content using Resend API
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
        to: ["krish@fractionl.ai"],
        subject: `🎯 New Executive Lead: ${data.firstName || ''} ${data.lastName || ''} from ${data.company || 'Unknown Company'} - ${tier.name} (${total}/30) - ${contactType === 'book_call' ? 'Executive Advisory' : 'Learn More'} Request`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          
          <div style="text-align: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎯 AI LEADERSHIP GROWTH BENCHMARK</h1>
            <p style="margin: 10px 0 0; font-size: 18px; opacity: 0.9;">${contactType === 'book_call' ? 'Executive Advisory Request' : 'Learn More Request'}</p>
            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">👤 Executive Contact Information</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p><strong>Name:</strong> ${data.firstName || ''} ${data.lastName || ''}</p>
                <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email || 'Not provided'}</a></p>
                <p><strong>Company:</strong> ${data.company || 'Not provided'}</p>
              </div>
              <div>
                <p><strong>Title:</strong> ${data.title || 'Not provided'}</p>
                <p><strong>LinkedIn:</strong> ${data.linkedinUrl ? `<a href="${data.linkedinUrl}" target="_blank">${data.linkedinUrl}</a>` : 'Not provided'}</p>
                <p><strong>Action Type:</strong> ${contactType === 'book_call' ? '📞 Executive Advisory Request' : '📚 Learn More Request'}</p>
              </div>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px;">
              <p style="margin: 0;"><strong>🎯 Service Requested:</strong> AI Leadership Executive Primer Session</p>
              <p style="margin: 5px 0 0;"><strong>📋 Session ID:</strong> ${sessionId || 'Not provided'}</p>
            </div>
          </div>

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

          <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📋 Complete AI Leadership Assessment Responses</h2>
            <p style="color: #6b7280; margin-bottom: 20px; font-style: italic;">
              6-question leadership benchmark measuring AI strategic capabilities across key growth dimensions.
              Each response scored 1-5 scale (Strongly Disagree to Strongly Agree).
            </p>
            ${formatLeadershipAssessment(data)}
          </div>

          <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🎯 Executive Advisory Next Steps</h2>
            <ul style="color: #374151; line-height: 1.6;">
              <li><strong>Assessment Review:</strong> This executive completed our 6-dimension AI Growth Benchmark</li>
              <li><strong>Executive Contact:</strong> Reach out to ${data.firstName || 'Executive'} at ${data.email} for ${contactType === 'book_call' ? 'immediate advisory session' : 'further discussion'}</li>
              <li><strong>Session Prep:</strong> Customize Executive Primer based on ${tier.name} classification and focus areas above</li>
              <li><strong>Strategic Focus:</strong> Tailor discussion to their specific leadership growth gaps and organizational AI readiness</li>
              <li><strong>Booking Portal:</strong> <a href="https://calendly.com/krish-raja/mindmaker-leaders" target="_blank">Executive Advisory Session Booking</a></li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This notification is from the AI Leadership Growth Benchmark platform.<br>
              Executive contact data and assessment results have been securely stored in the CRM system.
            </p>
          </div>
        </div>
        
        <hr style="margin: 30px 0;">
        
        ${generateDetailedResults(data, scores)}
      `
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Email sending failed: ${emailResponse.status}`);
    }

    const emailResult = await emailResponse.json();

    console.log("Email sent successfully:", emailResult.id);

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-diagnostic-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);