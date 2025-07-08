import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticEmailRequest {
  data: {
    deepWorkHours?: number;
    meetingHours?: number;
    adminHours?: number;
    aiUseCases?: Array<{ useCase: string; tool: string }>;
    hoursToDecision?: number;
    aiTrustLevel?: number;
    stakeholderAudiences?: string[];
    persuasionChallenge?: string;
    upskillPercentage?: number;
    skillGaps?: string[];
    hasAiSafetyPlaybook?: boolean;
    riskComfortLevel?: number;
    dailyFrictions?: string[];
    email?: string;
    company?: string;
    title?: string;
    linkedinUrl?: string;
  };
  scores: {
    aiToolFluency: number;
    aiDecisionMaking: number;
    aiCommunication: number;
    aiLearningGrowth: number;
    aiEthicsBalance: number;
    aiMindmakerScore: number;
  };
}

const formatArray = (arr: any[]) => arr ? arr.join(', ') : 'Not specified';
const formatBoolean = (val: boolean) => val ? 'Yes' : 'No';

const generateDetailedResults = (data: any, scores: any): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px;">
        <h1>${data.company || 'Organization'} - AI Sprint for Leaders</h1>
        <p>AI Leadership Diagnostic Results</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div style="text-align: center; background: #6366f1; color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h2>AI Mindmaker Score</h2>
        <div style="font-size: 48px; font-weight: bold;">${scores.aiMindmakerScore}/100</div>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Contact Information</h2>
        <p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
        <p><strong>Company:</strong> ${data.company || 'Not provided'}</p>
        <p><strong>Title:</strong> ${data.title || 'Not provided'}</p>
        <p><strong>LinkedIn:</strong> ${data.linkedinUrl || 'Not provided'}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Dimension Scores</h2>
        <ul>
          <li><strong>AI Tool Fluency:</strong> ${scores.aiToolFluency}</li>
          <li><strong>AI Decision Making:</strong> ${scores.aiDecisionMaking}</li>
          <li><strong>AI Communication:</strong> ${scores.aiCommunication}</li>
          <li><strong>AI Learning & Growth:</strong> ${scores.aiLearningGrowth}</li>
          <li><strong>AI Ethics & Balance:</strong> ${scores.aiEthicsBalance}</li>
        </ul>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Personal Productivity</h2>
        <p><strong>Deep Work Hours/Week:</strong> ${data.deepWorkHours || 'Not specified'}</p>
        <p><strong>Meeting Hours/Week:</strong> ${data.meetingHours || 'Not specified'}</p>
        <p><strong>Admin Hours/Week:</strong> ${data.adminHours || 'Not specified'}</p>
        <p><strong>AI Use Cases:</strong><br>
        ${data.aiUseCases ? data.aiUseCases.map((uc: any) => `• ${uc.useCase} (Tool: ${uc.tool || 'None'})`).join('<br>') : 'None specified'}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Decision Making & Trust</h2>
        <p><strong>Hours to Make Decisions:</strong> ${data.hoursToDecision || 'Not specified'}</p>
        <p><strong>AI Trust Level (1-5):</strong> ${data.aiTrustLevel || 'Not specified'}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Stakeholder Influence</h2>
        <p><strong>Stakeholder Audiences:</strong> ${formatArray(data.stakeholderAudiences)}</p>
        <p><strong>Persuasion Challenge:</strong> ${data.persuasionChallenge || 'Not specified'}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Learning & Growth</h2>
        <p><strong>Upskill Time (%):</strong> ${data.upskillPercentage || 'Not specified'}%</p>
        <p><strong>Skill Gaps:</strong> ${formatArray(data.skillGaps)}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Risk & Governance</h2>
        <p><strong>Has AI Safety Playbook:</strong> ${formatBoolean(data.hasAiSafetyPlaybook)}</p>
        <p><strong>Risk Comfort Level (1-10):</strong> ${data.riskComfortLevel || 'Not specified'}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Daily Challenges</h2>
        <p><strong>Daily Frictions:</strong> ${formatArray(data.dailyFrictions)}</p>
      </div>
    </div>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, scores }: DiagnosticEmailRequest = await req.json();

    console.log("Generating diagnostic email for:", data.email);

    // Send email with detailed HTML content
    const emailResponse = await resend.emails.send({
      from: "AI Mindmaker <onboarding@resend.dev>",
      to: ["krish@fractionl.ai"],
      subject: `${data.company || 'New Participant'} - AI Sprint for Leaders`,
      html: `
        <h2>New AI Leadership Diagnostic Completed</h2>
        
        <h3>Participant Information:</h3>
        <ul>
          <li><strong>Email:</strong> ${data.email || 'Not provided'}</li>
          <li><strong>Company:</strong> ${data.company || 'Not provided'}</li>
          <li><strong>Title:</strong> ${data.title || 'Not provided'}</li>
          <li><strong>LinkedIn URL:</strong> ${data.linkedinUrl || 'Not provided'}</li>
        </ul>

        <h3>AI Mindmaker Score: ${scores.aiMindmakerScore}/100</h3>

        <h3>Dimension Breakdown:</h3>
        <ul>
          <li>AI Tool Fluency: ${scores.aiToolFluency}</li>
          <li>AI Decision Making: ${scores.aiDecisionMaking}</li>
          <li>AI Communication: ${scores.aiCommunication}</li>
          <li>AI Learning & Growth: ${scores.aiLearningGrowth}</li>
          <li>AI Ethics & Balance: ${scores.aiEthicsBalance}</li>
        </ul>

        <hr style="margin: 30px 0;">
        
        ${generateDetailedResults(data, scores)}
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-diagnostic-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);