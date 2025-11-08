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
    const { sessionId, roiTranscript, manualOverrides } = await req.json();

    if (!sessionId || !roiTranscript) {
      throw new Error('sessionId and roiTranscript are required');
    }

    console.log(`Estimating ROI for session ${sessionId}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are a pragmatic ROI analyst. Extract from this transcript:
- hoursPerWeek: number (0 if not stated)
- peopleInvolved: number (1 if not stated)
- averageSalary: number (infer from role/industry if not stated; use conservative estimate)
- reductionPotential: 0.3-0.7 (default 0.4 for conservative, 0.6 for likely)

If hoursPerWeek OR peopleInvolved is 0, set needsClarification to true and provide a clarificationQuestion.

Calculate TWO estimates:
- Conservative: use reductionPotential = 0.3
- Likely: use reductionPotential = 0.5

Formula:
monthlyValue = (hoursPerWeek * 4.33) * (averageSalary / 2080) * reductionPotential * peopleInvolved

Transcript:
${roiTranscript}

Return ONLY valid JSON in this exact format:
{
  "inputs": {
    "hoursPerWeek": 10,
    "peopleInvolved": 3,
    "avgSalary": 90000,
    "reductionPotential": 0.4
  },
  "conservativeValue": {
    "monthly": 8500,
    "quarterly": 25500,
    "annual": 102000
  },
  "likelyValue": {
    "monthly": 14000,
    "quarterly": 42000,
    "annual": 168000
  },
  "assumptions": [
    "Based on 10 hrs/week per person",
    "3 team members @ $90k avg salary",
    "30-50% reduction realistic with AI automation"
  ],
  "summary": "Your team could save $8,500-$14,000/month by optimizing this process with AI.",
  "needsClarification": false,
  "clarificationQuestion": null,
  "forecast": {
    "day30": 8500,
    "day60": 17000,
    "day90": 25500
  }
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
            content: 'You are an ROI analyst. Always return valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
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

    // Apply manual overrides if provided
    if (manualOverrides) {
      Object.assign(results.inputs, manualOverrides);
      
      // Recalculate with new inputs
      const { hoursPerWeek, peopleInvolved, avgSalary } = results.inputs;
      const hourlyRate = avgSalary / 2080;
      
      const conservativeMonthly = (hoursPerWeek * 4.33) * hourlyRate * 0.3 * peopleInvolved;
      const likelyMonthly = (hoursPerWeek * 4.33) * hourlyRate * 0.5 * peopleInvolved;
      
      results.conservativeValue = {
        monthly: Math.round(conservativeMonthly),
        quarterly: Math.round(conservativeMonthly * 3),
        annual: Math.round(conservativeMonthly * 12)
      };
      
      results.likelyValue = {
        monthly: Math.round(likelyMonthly),
        quarterly: Math.round(likelyMonthly * 3),
        annual: Math.round(likelyMonthly * 12)
      };
      
      results.forecast = {
        day30: Math.round(conservativeMonthly),
        day60: Math.round(conservativeMonthly * 2),
        day90: Math.round(conservativeMonthly * 3)
      };
    }

    // Store in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('voice_sessions').upsert({
      session_id: sessionId,
      voice_enabled: true,
      roi_transcript: roiTranscript,
      roi_inputs: results.inputs,
      roi_conservative_value: results.conservativeValue.monthly,
      roi_likely_value: results.likelyValue.monthly,
      roi_assumptions: results.assumptions,
      roi_completed_at: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

    console.log(`ROI estimate complete for ${sessionId}: $${results.conservativeValue.monthly}-${results.likelyValue.monthly}/month`);

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in roi-estimate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
