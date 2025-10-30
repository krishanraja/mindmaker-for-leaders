import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentData, contactData, deepProfileData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating personalized insights for:', contactData.fullName);

    // Build detailed prompt with all user context
    const prompt = buildPersonalizedPrompt(assessmentData, contactData, deepProfileData);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_completion_tokens: 2000,
        messages: [
          { 
            role: 'system', 
            content: 'You are an executive AI leadership coach. Analyze assessment data and generate highly personalized, specific insights that reference the executive\'s actual responses, challenges, and context. Be direct, actionable, and quantitative.' 
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_personalized_insights",
            description: "Generate personalized AI leadership insights based on executive assessment data",
            parameters: {
              type: "object",
              properties: {
                growthReadiness: {
                  type: "object",
                  properties: {
                    level: { type: "string", enum: ["High", "Medium-High", "Medium", "Developing"] },
                    insight: { type: "string", description: "Specific insight referencing their answers" }
                  },
                  required: ["level", "insight"]
                },
                leadershipStage: {
                  type: "object",
                  properties: {
                    stage: { type: "string", enum: ["Orchestrator", "Confident", "Aware", "Emerging"] },
                    nextStep: { type: "string", description: "Concrete next action to advance" }
                  },
                  required: ["stage", "nextStep"]
                },
                keyFocus: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "One key focus area" },
                    insight: { type: "string", description: "Specific insight addressing their stated challenge" }
                  },
                  required: ["title", "insight"]
                },
                roadmapInitiatives: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string", description: "Detailed description with specific context" },
                      basedOn: { type: "array", items: { type: "string" }, description: "What user data this is based on" },
                      impact: { type: "string", description: "Quantified impact metric" },
                      timeline: { type: "string" },
                      growthMetric: { type: "string", description: "SHORT growth metric ONLY (5-15 chars). Examples: '10% faster', '20% gain', '$2M revenue', '15-25%', '3x speed'. MUST be concise number/percentage/metric, NOT a sentence." }
                    },
                    required: ["title", "description", "basedOn", "impact", "timeline", "growthMetric"]
                  },
                  minItems: 3,
                  maxItems: 3
                }
              },
              required: ["growthReadiness", "leadershipStage", "keyFocus", "roadmapInitiatives"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_personalized_insights" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Gateway response received');
    
    // Log token usage for monitoring
    if (data.usage) {
      console.log('Token usage:', data.usage);
    }

    // Extract the function call result
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call found in response:', JSON.stringify(data.choices[0]?.message));
      throw new Error('No tool call in response');
    }

    const personalizedInsights = JSON.parse(toolCall.function.arguments);
    
    // Validate response completeness
    if (!personalizedInsights.roadmapInitiatives || personalizedInsights.roadmapInitiatives.length === 0) {
      console.error('Incomplete roadmap initiatives in response');
      throw new Error('Incomplete insights generated');
    }

    return new Response(
      JSON.stringify({ personalizedInsights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating personalized insights:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Return fallback insights on error
    const fallbackInsights = generateFallbackInsights();
    console.log('Returning fallback insights due to error');
    
    return new Response(
      JSON.stringify({ personalizedInsights: fallbackInsights }),
      { 
        status: 200, // Still return 200 with fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function buildPersonalizedPrompt(assessmentData: any, contactData: any, deepProfileData: any): string {
  // Calculate score for context
  let totalScore = 0;
  const responses = Object.values(assessmentData);
  responses.forEach((response: any) => {
    if (typeof response === 'string') {
      const match = response.match(/^(\d+)/);
      if (match) totalScore += parseInt(match[1]);
    }
  });

  // Extract assessment question names and scores
  const assessmentBreakdown = Object.entries(assessmentData).map(([key, value]: [string, any]) => {
    const match = value.match(/^(\d+)/);
    const score = match ? parseInt(match[1]) : 0;
    return `- ${formatQuestionName(key)}: ${score}/5 - "${value}"`;
  }).join('\n');

  let prompt = `
EXECUTIVE PROFILE:
- Name: ${contactData.fullName}
- Role: ${contactData.roleTitle || 'Executive'} at ${contactData.companyName}
- Company Size: ${contactData.companySize || 'Not specified'}
- Industry: ${contactData.industry || 'Not specified'}
- Primary Focus: ${contactData.primaryFocus || 'Not specified'}
- Timeline: ${contactData.timeline || 'Not specified'}
- Overall Leadership Score: ${totalScore}/30

ASSESSMENT RESPONSES:
${assessmentBreakdown}
`;

  if (deepProfileData) {
    const workBreakdownText = Object.entries(deepProfileData.workBreakdown)
      .map(([k, v]) => `${k}: ${v}%`)
      .join(', ');

    prompt += `
DEEP WORK PROFILE:
- Thinking Process: ${deepProfileData.thinkingProcess}
- Communication Style: ${deepProfileData.communicationStyle.join(', ')}
- Work Time Breakdown: ${workBreakdownText}
- Information Needs: ${deepProfileData.informationNeeds.join(', ')}
- Transformation Goal: ${deepProfileData.transformationGoal}
- Non-Critical Task Time: ${deepProfileData.timeWaste}%
- Specific Time Waste Examples: "${deepProfileData.timeWasteExamples}"
- Top 3 Delegation Priorities: ${deepProfileData.delegateTasks.join(', ')}
- Biggest Communication Challenge: ${deepProfileData.biggestChallenge}
- Key Stakeholders: ${deepProfileData.stakeholders.join(', ')}
`;
  }

  prompt += `
TASK: Generate personalized AI leadership insights that:

1. GROWTH READINESS: Reference their specific score, time waste percentage, and examples to show revenue acceleration potential

2. LEADERSHIP STAGE: Based on their actual scores (especially team alignment, business acceleration), tell them EXACTLY what score they need to reach the next tier and one concrete action to get there

3. KEY FOCUS: Address their stated communication challenge or transformation goal with a specific AI solution matched to their thinking/communication style

4. 90-DAY ROADMAP (3 initiatives):
   - Each must reference SPECIFIC data from their profile (delegation tasks, time waste examples, stakeholder needs)
   - Include quantified impact based on their time waste % and work breakdown
   - Timeline should match their stated timeline
   - Should align with their role and industry
   - **CRITICAL: growthMetric must be EXTREMELY SHORT (5-15 characters) - just a number/percentage like '15%' or '10% faster' or '$500K', NOT a description or sentence**

BE SPECIFIC. Use their actual words and numbers. Don't be generic.`;

  return prompt;
}

function formatQuestionName(key: string): string {
  // Convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function generateFallbackInsights(): any {
  return {
    growthReadiness: {
      level: "Medium",
      insight: "Based on your assessment, focus on identifying specific AI use cases that align with your strategic priorities."
    },
    leadershipStage: {
      stage: "Aware",
      nextStep: "Build a cross-functional AI champion network to accelerate adoption across your organization."
    },
    keyFocus: {
      title: "Strategic AI Integration",
      insight: "Develop a roadmap for integrating AI into your core business processes to drive measurable outcomes."
    },
    roadmapInitiatives: [
      {
        title: "AI Pilot Program",
        description: "Launch a focused pilot program in your highest-impact area to demonstrate ROI and build organizational confidence.",
        basedOn: ["Assessment responses", "Current maturity level"],
        impact: "15-20% efficiency gain in target area",
        timeline: "30-45 days",
        growthMetric: "15-20%"
      },
      {
        title: "Leadership AI Fluency",
        description: "Develop executive-level AI literacy through hands-on experimentation with business-relevant use cases.",
        basedOn: ["Leadership assessment scores"],
        impact: "Enhanced strategic decision-making capability",
        timeline: "60-90 days",
        growthMetric: "25-35%"
      },
      {
        title: "AI Culture Building",
        description: "Create an organizational framework for AI adoption including guidelines, training, and success metrics.",
        basedOn: ["Organizational readiness assessment"],
        impact: "Accelerated team adoption and innovation",
        timeline: "90-120 days",
        growthMetric: "30-40%"
      }
    ]
  };
}
