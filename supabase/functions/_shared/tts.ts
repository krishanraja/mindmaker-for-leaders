import { fetchWithTimeout } from './with-timeout.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_VOICE_ID = '7ApmIXLoWa0cKUtJqfHc';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

export class TTSResponseError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'TTSResponseError';
  }
}

async function loadTTSConfig(supabase: SupabaseClient): Promise<{ voiceId: string; modelId: string }> {
  try {
    const { data } = await supabase
      .from('tts_config')
      .select('voice_id, model_id')
      .eq('is_active', true)
      .limit(1)
      .single();
    if (data?.voice_id && data?.model_id) {
      return { voiceId: data.voice_id, modelId: data.model_id };
    }
  } catch {
    // The deployment may not have the optional config table yet.
  }
  return { voiceId: DEFAULT_VOICE_ID, modelId: DEFAULT_MODEL_ID };
}

/** One voice contract for daily briefings and their spoken follow-up answers. */
export async function synthesizeSpeech(supabase: SupabaseClient, text: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

  const config = await loadTTSConfig(supabase);
  const response = await fetchWithTimeout(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`,
    {
      method: 'POST',
      provider: 'elevenlabs',
      timeoutMs: 20_000,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: config.modelId,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
          style: 0.45,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new TTSResponseError(
      response.status,
      `ElevenLabs error: ${response.status} ${detail.slice(0, 200)}`,
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}
