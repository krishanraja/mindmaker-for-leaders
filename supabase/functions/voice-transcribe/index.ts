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
    const formData = await req.formData();
    const audioBlob = formData.get('audio');
    const sessionId = formData.get('sessionId');
    const moduleType = formData.get('moduleType');

    if (!audioBlob || !sessionId) {
      throw new Error('Audio and sessionId are required');
    }

    console.log(`Transcribing audio for session ${sessionId}, module ${moduleType}`);
    
    const startTime = Date.now();

    // Send to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioBlob, 'audio.webm');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Whisper API error: ${errorText}`);
    }

    const { text } = await response.json();
    const duration = (Date.now() - startTime) / 1000;

    console.log(`Transcription complete in ${duration}s: "${text.substring(0, 100)}..."`);

    // Log instrumentation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('voice_instrumentation').insert({
      session_id: sessionId,
      event_type: 'transcription_complete',
      module_name: moduleType,
      metadata: {
        duration_seconds: duration,
        transcript_length: text.length,
        confidence: 0.95
      }
    });

    return new Response(
      JSON.stringify({
        transcript: text,
        confidence: 0.95,
        duration_seconds: duration,
        needs_clarification: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in voice-transcribe:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
