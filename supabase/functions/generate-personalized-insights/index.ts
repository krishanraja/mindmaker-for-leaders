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
            content: 'You are an executive AI leadership coach. Generate personalized insights based on assessment data. Be direct, actionable, and quantitative. Use clear templates for preview text and save detailed personalization for the details section.' 
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
                    preview: { type: "string", description: "Ultra-concise preview (max 50 chars) - punchy one-liner", maxLength: 50 },
                    details: { type: "string", description: "Full insight (max 120 chars) - specific, actionable", maxLength: 120 }
                  },
                  required: ["level", "preview", "details"]
                },
                leadershipStage: {
                  type: "object",
                  properties: {
                    stage: { type: "string", enum: ["Orchestrator", "Confident", "Aware", "Emerging"] },
                    preview: { type: "string", description: "Ultra-concise preview (max 50 chars) - punchy one-liner", maxLength: 50 },
                    details: { type: "string", description: "Full next step (max 120 chars) - concrete action", maxLength: 120 }
                  },
                  required: ["stage", "preview", "details"]
                },
                keyFocus: {
                  type: "object",
                  properties: {
                    category: { 
                      type: "string", 
                      enum: [
                        "Team Alignment",
                        "Process Automation", 
                        "Strategic Planning",
                        "Communication",
                        "Decision Making",
                        "Change Management",
                        "Innovation Culture",
                        "Data Strategy"
                      ],
                      description: "Select ONE category that best matches the executive's primary challenge"
                    },
                    preview: { type: "string", description: "Clear preview (max 50 chars)", maxLength: 50 },
                    details: { type: "string", description: "Specific action plan (max 120 chars)", maxLength: 120 }
                  },
                  required: ["category", "preview", "details"]
                },
                roadmapInitiatives: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "CRITICAL: Exactly 18-25 chars ONLY. Must be clear, NO abbreviations.", maxLength: 25 },
                      description: { type: "string", description: "Concise description (max 180 chars) with specific context", maxLength: 180 },
                      basedOn: { type: "array", items: { type: "string", maxLength: 50 }, description: "What user data this is based on (max 50 chars each)", maxItems: 3 },
                      impact: { type: "string", description: "Quantified impact metric (max 40 chars)", maxLength: 40 },
                      timeline: { type: "string", description: "Timeline (max 20 chars)", maxLength: 20 },
                      growthMetric: { type: "string", description: "SHORT growth metric ONLY (5-15 chars). Examples: '10% faster', '20% gain', '$2M revenue', '15-25%', '3x speed'. MUST be concise number/percentage/metric, NOT a sentence.", maxLength: 15 },
                      scaleUpsDimensions: { 
                        type: "array", 
                        items: { 
                          type: "string",
                          enum: [
                            "AI Fluency",
                            "Delegation Mastery", 
                            "Strategic Vision",
                            "Decision Agility",
                            "Impact Orientation",
                            "Change Leadership"
                          ]
                        },
                        minItems: 1,
                        maxItems: 2,
                        description: "1-2 leadership dimensions this initiative addresses"
                      }
                    },
                    required: ["title", "description", "basedOn", "impact", "timeline", "growthMetric", "scaleUpsDimensions"]
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
    
    // Validate keyFocus category
    if (personalizedInsights.keyFocus?.category) {
      console.log(`keyFocus category selected: "${personalizedInsights.keyFocus.category}"`);
    }

    // Validate and truncate roadmap initiative titles
    if (personalizedInsights.roadmapInitiatives) {
      personalizedInsights.roadmapInitiatives.forEach((initiative: any, index: number) => {
        if (initiative.title) {
          if (initiative.title.length > 25) {
            console.warn(`Initiative ${index} title too long: "${initiative.title}"`);
            let truncated = initiative.title.substring(0, 22).trim();
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > 12) {
              truncated = truncated.substring(0, lastSpace);
            }
            initiative.title = truncated;
          }
          
          if (/\b\w{2,4}\./g.test(initiative.title)) {
            console.warn(`Initiative ${index} contains abbreviations: "${initiative.title}"`);
          }
        }
      });
    }
    
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
   - **CRITICAL**: Tag each initiative with 1-2 relevant leadership dimensions:
     * AI Fluency - for understanding/speaking AI, education initiatives
     * Delegation Mastery - for time-saving, workflow optimization, automation
     * Strategic Vision - for connecting AI to business outcomes, KPI tracking
     * Decision Agility - for decision-making speed, real-time intelligence
     * Impact Orientation - for measurement, results tracking, strategic focus
     * Change Leadership - for adoption, culture building, inspiring transformation
   
**CARD CONTENT GENERATION**

1. GROWTH READINESS:
   - level: Select from enum ["High", "Medium-High", "Medium", "Developing"]
   - preview: Use template "Score {X}/30 - {level} revenue potential" (max 50 chars)
   - details: 2-3 sentences with specific recommendations based on their score (max 120 chars)

2. LEADERSHIP STAGE:
   - stage: Select from enum ["Orchestrator", "Confident", "Aware", "Emerging"]
   - preview: Use template "Reach {next_stage}: Focus on {specific_area}" (max 50 chars)
   - details: Concrete action plan with score targets (max 120 chars)

3. KEY FOCUS AREA:
   - category: Select ONE from the predefined list that best matches their primary challenge:
     * "Team Alignment" - for collaboration/cross-functional issues
     * "Process Automation" - for efficiency/workflow optimization
     * "Strategic Planning" - for vision/roadmap/long-term strategy
     * "Communication" - for stakeholder/internal comms
     * "Decision Making" - for data-driven decisions/analytics
     * "Change Management" - for adoption/transformation challenges
     * "Innovation Culture" - for experimentation/AI culture
     * "Data Strategy" - for data infrastructure/governance
   - preview: Use template "Focus on {category} to unlock {quantified_benefit}" (max 50 chars)
   - details: Specific strategy matched to their challenge (max 120 chars)

ROADMAP INITIATIVES - TITLE RULES:
- title: EXACTLY 18-25 characters maximum
- MUST be clear and understandable at a glance
- NO abbreviations (like "Comm.", "Fin.", "Mgmt")
- Use simple, direct language
- Examples:
  ✅ GOOD: "AI for Sales Teams" (19 chars) - clear, direct
  ✅ GOOD: "Revenue Automation" (18 chars) - understandable
  ✅ GOOD: "Stakeholder Updates" (19 chars) - specific
  ❌ BAD: "AI for Comm. & Fin. Alignment" (30 chars) - too long, unclear abbreviations
  ❌ BAD: "AI Comm. Strategy" (18 chars) - confusing abbreviations
  ❌ BAD: "Communication & Financial Alignment" (35 chars) - way too long

Write in executive-level, punchy language. Every word must add value. NO filler. Be SPECIFIC using their actual data, words, and numbers.`;

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
      preview: "Focus on high-impact AI use cases",
      details: "Based on your assessment, identify specific AI use cases that align with your strategic priorities and drive measurable outcomes."
    },
    leadershipStage: {
      stage: "Aware",
      preview: "Build AI champion network",
      details: "Create a cross-functional AI champion network to accelerate adoption and drive organizational change across teams."
    },
    keyFocus: {
      category: "Strategic Planning",
      preview: "Integrate AI into core processes",
      details: "Develop a roadmap for integrating AI into your core business processes to drive measurable outcomes and competitive advantage."
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
