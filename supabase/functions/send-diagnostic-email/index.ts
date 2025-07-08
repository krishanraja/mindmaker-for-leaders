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

const generatePDFContent = (data: any, scores: any): string => {
  const formatArray = (arr: any[]) => arr ? arr.join(', ') : 'Not specified';
  const formatBoolean = (val: boolean) => val ? 'Yes' : 'No';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>AI Leadership Diagnostic Results</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        .section h2 { color: #6366f1; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .scores { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .score-item { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .score-value { font-size: 24px; font-weight: bold; color: #6366f1; }
        .main-score { text-align: center; background: #6366f1; color: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .data-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: bold; color: #4b5563; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.company || 'Organization'} - AI Sprint for Leaders</h1>
        <p>AI Leadership Diagnostic Results</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="main-score">
        <h2>AI Mindmaker Score</h2>
        <div style="font-size: 48px; font-weight: bold;">${scores.aiMindmakerScore}/100</div>
    </div>

    <div class="section">
        <h2>Contact Information</h2>
        <div class="data-grid">
            <div class="data-item"><span class="label">Email:</span> ${data.email || 'Not provided'}</div>
            <div class="data-item"><span class="label">Company:</span> ${data.company || 'Not provided'}</div>
            <div class="data-item"><span class="label">Title:</span> ${data.title || 'Not provided'}</div>
            <div class="data-item"><span class="label">LinkedIn:</span> ${data.linkedinUrl || 'Not provided'}</div>
        </div>
    </div>

    <div class="section">
        <h2>Dimension Scores</h2>
        <div class="scores">
            <div class="score-item">
                <div class="label">AI Tool Fluency</div>
                <div class="score-value">${scores.aiToolFluency}</div>
            </div>
            <div class="score-item">
                <div class="label">AI Decision Making</div>
                <div class="score-value">${scores.aiDecisionMaking}</div>
            </div>
            <div class="score-item">
                <div class="label">AI Communication</div>
                <div class="score-value">${scores.aiCommunication}</div>
            </div>
            <div class="score-item">
                <div class="label">AI Learning & Growth</div>
                <div class="score-value">${scores.aiLearningGrowth}</div>
            </div>
            <div class="score-item">
                <div class="label">AI Ethics & Balance</div>
                <div class="score-value">${scores.aiEthicsBalance}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Personal Productivity</h2>
        <div class="data-grid">
            <div class="data-item"><span class="label">Deep Work Hours/Week:</span> ${data.deepWorkHours || 'Not specified'}</div>
            <div class="data-item"><span class="label">Meeting Hours/Week:</span> ${data.meetingHours || 'Not specified'}</div>
            <div class="data-item"><span class="label">Admin Hours/Week:</span> ${data.adminHours || 'Not specified'}</div>
        </div>
        <div class="data-item">
            <span class="label">AI Use Cases:</span><br>
            ${data.aiUseCases ? data.aiUseCases.map((uc: any) => `• ${uc.useCase} (Tool: ${uc.tool})`).join('<br>') : 'None specified'}
        </div>
    </div>

    <div class="section">
        <h2>Decision Making & Trust</h2>
        <div class="data-grid">
            <div class="data-item"><span class="label">Hours to Make Decisions:</span> ${data.hoursToDecision || 'Not specified'}</div>
            <div class="data-item"><span class="label">AI Trust Level (1-5):</span> ${data.aiTrustLevel || 'Not specified'}</div>
        </div>
    </div>

    <div class="section">
        <h2>Stakeholder Influence</h2>
        <div class="data-item"><span class="label">Stakeholder Audiences:</span> ${formatArray(data.stakeholderAudiences)}</div>
        <div class="data-item"><span class="label">Persuasion Challenge:</span> ${data.persuasionChallenge || 'Not specified'}</div>
    </div>

    <div class="section">
        <h2>Learning & Growth</h2>
        <div class="data-grid">
            <div class="data-item"><span class="label">Upskill Time (%):</span> ${data.upskillPercentage || 'Not specified'}%</div>
        </div>
        <div class="data-item"><span class="label">Skill Gaps:</span> ${formatArray(data.skillGaps)}</div>
    </div>

    <div class="section">
        <h2>Risk & Governance</h2>
        <div class="data-grid">
            <div class="data-item"><span class="label">Has AI Safety Playbook:</span> ${formatBoolean(data.hasAiSafetyPlaybook)}</div>
            <div class="data-item"><span class="label">Risk Comfort Level (1-10):</span> ${data.riskComfortLevel || 'Not specified'}</div>
        </div>
    </div>

    <div class="section">
        <h2>Daily Challenges</h2>
        <div class="data-item"><span class="label">Daily Frictions:</span> ${formatArray(data.dailyFrictions)}</div>
    </div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data, scores }: DiagnosticEmailRequest = await req.json();

    console.log("Generating diagnostic email for:", data.email);

    // Generate HTML content
    const htmlContent = generatePDFContent(data, scores);

    // Send email
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

        <p>Please find the complete diagnostic results attached as a PDF.</p>
      `,
      attachments: [
        {
          filename: `${data.company || 'Diagnostic'}_AI_Leadership_Results.pdf`,
          content: Buffer.from(htmlContent).toString('base64'),
          contentType: 'text/html'
        }
      ]
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