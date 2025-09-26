import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { diagnosticData, userResponses } = await req.json();

    console.log('Generating executive insights for:', { 
      challenges: diagnosticData.allChallenges,
      role: userResponses?.role,
      industry: userResponses?.industry 
    });

    // Construct personalized prompt based on actual user data
    const personalizedPrompt = `
You are an elite executive consultant analyzing a C-Suite leader's AI readiness assessment. Generate deeply personalized insights based on their specific responses.

EXECUTIVE PROFILE:
- Role: ${userResponses?.role || 'Senior Executive'}
- Industry: ${userResponses?.industry || 'Not specified'}
- Company Size: ${userResponses?.companySize || 'Not specified'}

ASSESSMENT DATA:
- Time Allocation: ${diagnosticData.deepWorkHours}h deep work, ${diagnosticData.meetingHours}h meetings, ${diagnosticData.adminHours}h admin
- Decision Making Speed: ${diagnosticData.decisionMakingSpeed}/5
- AI Trust Level: ${diagnosticData.aiTrustLevel}/5
- Learning Investment: ${diagnosticData.upskillPercentage}% of time
- Key Challenges: ${diagnosticData.allChallenges?.join(', ') || 'None specified'}
- AI Use Cases: ${diagnosticData.aiUseCases?.map((uc: any) => uc.useCase).join(', ') || 'None specified'}
- Skill Gaps: ${diagnosticData.skillGaps?.join(', ') || 'None specified'}

Generate 4-6 highly specific, actionable insights that would impress a seasoned executive. Each insight should:
1. Reference their specific challenges/responses
2. Provide non-obvious strategic value
3. Include concrete implementation steps
4. Estimate ROI/impact timeframes

Format as JSON array with: type, title, description, impact, effort, timeline, implementation, successMetrics
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an elite executive consultant specializing in AI transformation for C-Suite leaders. Generate insights that demonstrate deep business acumen and strategic thinking.'
          },
          { role: 'user', content: personalizedPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated insights:', generatedContent);

    // Try to parse as JSON, fallback to structured text parsing
    let insights;
    try {
      insights = JSON.parse(generatedContent);
    } catch {
      // Fallback: create structured insights from text response
      insights = [{
        type: 'strategic_opportunity',
        title: 'Personalized AI Strategy',
        description: generatedContent.substring(0, 200) + '...',
        impact: 'high',
        effort: 'medium',
        timeline: '3-6 months',
        implementation: ['Review generated recommendations', 'Develop implementation roadmap'],
        successMetrics: ['Improved decision quality', 'Enhanced strategic positioning']
      }];
    }

    return new Response(JSON.stringify({ 
      insights,
      overallScore: calculateOverallScore(diagnosticData),
      executiveSummary: generateExecutiveSummary(diagnosticData, userResponses)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-executive-insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      insights: getFallbackInsights({})
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateOverallScore(diagnosticData: any): number {
  let score = 50; // Base score
  
  // Time management efficiency
  if (diagnosticData.deepWorkHours > 15) score += 10;
  if (diagnosticData.meetingHours < 20) score += 5;
  
  // AI adoption
  if (diagnosticData.aiUseCases?.length > 3) score += 15;
  if (diagnosticData.aiTrustLevel > 3) score += 10;
  
  // Learning investment
  if (diagnosticData.upskillPercentage > 15) score += 10;
  
  return Math.min(100, score);
}

function generateExecutiveSummary(diagnosticData: any, userResponses: any): string {
  const score = calculateOverallScore(diagnosticData);
  const role = userResponses?.role || 'Executive';
  
  if (score >= 80) {
    return `${role}, you demonstrate exceptional AI leadership readiness with strong strategic vision and implementation capability.`;
  } else if (score >= 60) {
    return `${role}, you show solid AI awareness with clear opportunities to accelerate your competitive advantage.`;
  } else {
    return `${role}, significant opportunities exist to leverage AI for transformational business impact.`;
  }
}

function getFallbackInsights(diagnosticData: any) {
  return [{
    type: 'quick_win',
    title: 'AI-Powered Decision Support',
    description: 'Implement AI assistants for your most time-consuming analytical tasks.',
    impact: 'high',
    effort: 'low',
    timeline: '2-4 weeks',
    implementation: ['Identify repetitive analysis tasks', 'Deploy AI tools', 'Measure time savings'],
    successMetrics: ['20% reduction in analysis time', 'Faster decision cycles']
  }];
}