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
                      basedOn: { type: "array", items: { type: "string", maxLength: 60 }, description: "HUMAN-READABLE context ONLY (max 60 chars each). Examples: 'Your delegation priorities', 'Time waste patterns', 'Communication challenges'. NEVER use technical strings like 'Kpi_connection' or database field names.", maxItems: 3 },
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
        
        // Validate and clean basedOn array
        if (initiative.basedOn && Array.isArray(initiative.basedOn)) {
          const technicalPatterns = [
            /^[A-Z_]+$/, // All caps with underscores
            /_[a-z]/, // Snake_case
            /^[a-z]+_[a-z]+/i, // Any underscore patterns
          ];
          
          initiative.basedOn = initiative.basedOn
            .filter((item: string) => {
              // Filter out technical strings
              const isTechnical = technicalPatterns.some(pattern => pattern.test(item));
              if (isTechnical) {
                console.warn(`Filtering technical basedOn string: "${item}"`);
                return false;
              }
              return true;
            })
            .slice(0, 3); // Ensure max 3 items
          
          // If all items were filtered out, add fallback
          if (initiative.basedOn.length === 0) {
            initiative.basedOn = ['Your assessment responses'];
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
  // Calculate score for context (normalize to 0-100 scale)
  let totalScore = 0;
  const responses = Object.values(assessmentData);
  responses.forEach((response: any) => {
    if (typeof response === 'string') {
      const match = response.match(/^(\d+)/);
      if (match) totalScore += parseInt(match[1]);
    }
  });
  
  // Normalize to 0-100 scale (max possible is 30)
  const normalizedScore = Math.round((totalScore / 30) * 100);

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
- Overall Leadership Score: ${normalizedScore}/100 (normalized from ${totalScore}/30)

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
TASK: Generate personalized AI leadership insights that are DEEPLY GROUNDED in the executive's specific data.

**CRITICAL DATA HYGIENE RULES:**
1. NEVER use technical field names (like "kpi_connection", "time_waste") in user-facing text
2. ALWAYS reference specific numbers from their profile (scores, percentages, examples)
3. NEVER contradict their stated goals or challenges
4. Match tone to their communication style and thinking process
5. Ensure timeline recommendations align with their stated timeline preference

**SCORING CONTEXT FOR ACCURATE POSITIONING:**
- Their total score: ${totalScore}/30 (${normalizedScore}/100 normalized)
- Score tier boundaries:
  * AI-Driven Leader: 25-30 points
  * AI Growth Strategist: 19-24 points
  * AI Explorer: 13-18 points
  * AI Curious: 6-12 points
- If they scored 25+ (AI-Driven Leader), acknowledge they're in top tier BUT still show growth path
- Their individual dimension scores determine strengths and development areas

1. GROWTH READINESS:
   - Reference ACTUAL time waste percentage: ${deepProfileData?.timeWaste || 'not provided'}%
   - Cite their specific examples: "${deepProfileData?.timeWasteExamples || 'Not provided'}"
   - Calculate potential ROI based on THEIR numbers
   - If score is 25+: Frame as "optimizing at scale" not "building basics"

2. LEADERSHIP STAGE:
   - Based on ACTUAL assessment scores (current total: ${totalScore}/30)
   - Tell them EXACT score needed for next tier (e.g., "Reach 19 points for Growth Strategist level")
   - Reference specific weak areas from their 6 question responses
   - ONE concrete action tied to their lowest-scored category

3. KEY FOCUS:
   - MUST address: "${deepProfileData?.biggestChallenge || contactData.primaryFocus}"
   - Solution matched to: "${deepProfileData?.thinkingProcess || 'Not specified'}" thinking style
   - Consider: "${deepProfileData?.communicationStyle?.join(', ') || 'Not specified'}" communication preferences
   - If they're high-scoring: Focus on advanced/strategic challenges, not basics

4. 90-DAY ROADMAP (3 initiatives):
   Each initiative MUST:
   - Reference SPECIFIC delegation tasks: ${deepProfileData?.delegateTasks?.join(', ') || 'Not provided'}
   - Include quantified impact from time waste %: ${deepProfileData?.timeWaste || 'X'}%
   - Timeline matches their preference: ${contactData.timeline || 'Not specified'}
   - Stakeholder consideration: ${deepProfileData?.stakeholders?.join(', ') || 'Not specified'}
   - Work breakdown aware: ${deepProfileData?.workBreakdown ? Object.entries(deepProfileData.workBreakdown).map(([k, v]) => \`\${k}: \${v}%\`).join(', ') : 'Not provided'}
   
   **DIMENSION TAGGING LOGIC:**
   - Tag "AI Fluency" if: education, awareness, industry understanding, explaining AI
   - Tag "Delegation Mastery" if: automation, time-saving, task delegation, workflow efficiency  
   - Tag "Strategic Vision" if: KPI tracking, business outcomes, ROI, strategic planning
   - Tag "Decision Agility" if: faster decisions, real-time data, intelligence gathering
   - Tag "Impact Orientation" if: measurement, results tracking, performance metrics
   - Tag "Change Leadership" if: adoption, culture, inspiring teams, championing change
   
   Choose 1-2 most relevant dimensions per initiative based on PRIMARY action, not tangential benefits.

**ADAPTIVE CONTENT BY SCORE TIER:**
- Score 25-30 (AI-Driven): Use terms like "scale", "enterprise-wide", "strategic optimization", "advanced"
- Score 19-24 (Growth Strategist): Use "expand", "systematize", "cross-functional", "strategic"
- Score 13-18 (Explorer): Use "build momentum", "pilot", "demonstrate value", "foundational"
- Score 6-12 (Curious): Use "start", "explore", "learn", "experiment", "build basics"

**CARD CONTENT TEMPLATES:**

1. GROWTH READINESS:
   - level: Select from enum ["High", "Medium-High", "Medium", "Developing"]
   - preview: Use template "Score {X}/100 - {level} revenue potential" (max 50 chars)
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

ROADMAP INITIATIVES - CONTENT RULES:
- title: EXACTLY 18-25 characters maximum
- MUST be clear and understandable at a glance
- NO abbreviations (like "Comm.", "Fin.", "Mgmt")
- Use simple, direct language
- basedOn: **CRITICAL** - Must be HUMAN-READABLE descriptions ONLY
  * ✅ GOOD: "Your delegation priorities", "Time waste patterns", "Communication challenges"
  * ❌ BAD: "Kpi_connection", "time_waste", "delegation_tasks" (these are database field names!)
  * Always write complete sentences or clear phrases that users can understand
  * Reference actual user responses, not technical field names
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
