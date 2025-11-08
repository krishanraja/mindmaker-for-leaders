import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, transcripts } = await req.json();

    if (!sessionId || !transcripts) {
      throw new Error('sessionId and transcripts are required');
    }

    console.log(`Analyzing compass for session ${sessionId}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build the prompt with all transcripts
    const transcriptText = Object.entries(transcripts)
      .map(([dimension, text]) => `${dimension}: ${text}`)
      .join('\n\n');

    const prompt = `You are an executive AI leadership assessor. Analyze these 7 voice transcripts (brief, 12-15s answers) and score the executive across our dimensions (0-100 each):

1. AI Literacy & Vocabulary
2. Strategic Vision & Business Acumen
3. Cultural Leadership & Change Management
4. Operational Implementation Readiness
5. Risk Management & Ethics
6. Innovation & Competitive Mindset
7. Stakeholder Communication & Influence

**CRITICAL:** Use tier bands, NOT percentiles:
- Emerging (0-40): Beginning AI awareness, limited vocabulary
- Establishing (41-65): Developing AI fluency, experimenting with tools
- Advancing (66-85): Strong AI strategy, leading initiatives
- Leading (86-100): AI-native leader, shaping industry standards

Transcripts:
${transcriptText}

Return ONLY valid JSON in this exact format:
{
  "scores": {
    "ai_literacy": 75,
    "strategic_vision": 68,
    "cultural_leadership": 72,
    "operational_readiness": 65,
    "risk_management": 70,
    "innovation_mindset": 78,
    "stakeholder_engagement": 73
  },
  "tier": "Advancing",
  "tierDescription": "Advancing Strategist—building momentum with tactical gaps.",
  "focusAreas": ["Build AI vocabulary for board conversations", "Establish team AI adoption metrics", "Prototype one AI tool in a low-risk area"],
  "quickWins": ["This week: Test ChatGPT for meeting summaries", "This month: Schedule AI lunch-and-learn for team"]
}`;

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a leadership assessment AI. Always return valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response
    const results = JSON.parse(content);

    // Store in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('voice_sessions').upsert({
      session_id: sessionId,
      voice_enabled: true,
      compass_scores: results.scores,
      compass_tier: results.tier,
      compass_focus_areas: results.focusAreas,
      compass_completed_at: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

    console.log(`Compass analysis complete for ${sessionId}: Tier ${results.tier}`);

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in compass-analyze:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
