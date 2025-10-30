import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sessionId, 
      userId, 
      contactData, 
      assessmentData, 
      profileData 
    } = await req.json();

    console.log('Generating prompt library for session:', sessionId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare AI synthesis prompt
    const synthesisPro = `You are an expert AI implementation strategist creating a personalized "AI Command Center" for an executive.

IMPORTANT: Use ONLY gender-neutral language throughout (they/their/them). Never assume the executive's gender.

EXECUTIVE PROFILE:
- Name: ${contactData.fullName}
- Role: ${contactData.roleTitle}
- Company: ${contactData.companyName} (${contactData.companySize})
- Primary Focus: ${contactData.primaryFocus}
- Timeline: ${contactData.timeline}

ASSESSMENT SCORES:
${Object.entries(assessmentData).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

DEEP PROFILE:
- Thinking Process: ${profileData.thinkingProcess}
- Communication Style: ${profileData.communicationStyle.join(', ')}
- Work Breakdown: ${Object.entries(profileData.workBreakdown).map(([k, v]) => `${k}: ${v}%`).join(', ')}
- Information Needs: ${profileData.informationNeeds.join(', ')}
- Transformation Goal: ${profileData.transformationGoal}
- Time on Non-Critical Work: ${profileData.timeWaste}%
- Specific Time Wasters: ${profileData.timeWasteExamples}
- Top Delegation Priorities: ${profileData.delegateTasks.join(', ')}
- Biggest Communication Challenge: ${profileData.biggestChallenge}
- Key Stakeholders: ${profileData.stakeholders.join(', ')}

YOUR TASK:
Generate a comprehensive "Master Prompt Library Package" in JSON format:

{
  "executiveProfile": {
    "summary": "150-word summary of their thinking style, communication preferences, and work patterns",
    "transformationOpportunity": "The single biggest way AI can create value for them"
  },
  "recommendedProjects": [
    {
      "name": "Project name (e.g., Strategic Brief Generator)",
      "purpose": "One sentence on specific value",
      "whenToUse": "Specific use case scenarios",
      "masterInstructions": "300-400 word custom prompt incorporating their style, role, and context. Include: who they are, how they think, what they need, and constraints.",
      "examplePrompts": [
        "Starter prompt 1",
        "Starter prompt 2",
        "Starter prompt 3"
      ],
      "successMetrics": [
        "Metric 1",
        "Metric 2"
      ]
    }
  ],
  "promptTemplates": [
    {
      "name": "Template name",
      "category": "Category (e.g., Decision-Making, Stakeholder Communication)",
      "prompt": "The actual prompt template with placeholders"
    }
  ],
  "implementationRoadmap": {
    "week1": "Start with these 2 projects (specify which ones and why)",
    "week2to4": "Expand to these additional use cases",
    "month2plus": "Advanced techniques to try"
  }
}

CRITICAL REQUIREMENTS:
- Generate 3-5 projects (MVP scope)
- Every prompt must reflect THEIR specific communication style
- Address THEIR specific bottlenecks from the profile
- Match THEIR stakeholder context
- Use THEIR language and terminology
- Focus on THEIR transformation goal

Return ONLY valid JSON, no markdown formatting.`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI for synthesis...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert AI implementation strategist. Generate detailed, personalized AI prompt libraries in valid JSON format.' },
          { role: 'user', content: synthesisPro }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from AI');
    }

    console.log('AI generation successful, parsing response...');

    // Parse JSON response
    let parsedLibrary;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedLibrary = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content:', generatedContent);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Store in database
    const { data: profileRecord, error: dbError } = await supabase
      .from('prompt_library_profiles')
      .insert({
        user_id: userId,
        session_id: sessionId,
        executive_profile: parsedLibrary.executiveProfile || {},
        communication_style: {
          styles: profileData.communicationStyle,
          thinkingProcess: profileData.thinkingProcess,
          biggestChallenge: profileData.biggestChallenge
        },
        bottleneck_analysis: {
          timeWaste: profileData.timeWaste,
          examples: profileData.timeWasteExamples,
          delegatePriorities: profileData.delegateTasks
        },
        stakeholder_map: {
          stakeholders: profileData.stakeholders
        },
        workflow_preferences: {
          workBreakdown: profileData.workBreakdown,
          informationNeeds: profileData.informationNeeds,
          transformationGoal: profileData.transformationGoal
        },
        trust_calibration: {},
        recommended_projects: parsedLibrary.recommendedProjects || [],
        prompt_templates: parsedLibrary.promptTemplates || [],
        implementation_roadmap: parsedLibrary.implementationRoadmap || {},
        generation_model: 'google/gemini-2.5-pro'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Prompt library generated and stored successfully');

    return new Response(
      JSON.stringify({
        success: true,
        profileId: profileRecord.id,
        library: parsedLibrary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-prompt-library:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});