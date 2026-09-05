/**
 * synthesize-briefing Edge Function
 *
 * Converts a briefing script to audio via ElevenLabs TTS
 * and stores the MP3 in Supabase Storage.
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { hasExactServiceCredential } from "../_shared/service-auth.ts";
import { ProviderUnavailableError } from "../_shared/with-timeout.ts";
import { synthesizeSpeech, TTSResponseError } from "../_shared/tts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRequest = hasExactServiceCredential(authHeader, [supabaseServiceKey]);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let callerId: string | null = null;
    if (!serviceRequest) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = authData.user.id;
    }

    const { briefing_id } = await req.json();
    if (!briefing_id) throw new Error("briefing_id required");

    // Fetch briefing
    const { data: briefing, error: fetchError } = await supabase
      .from("briefings")
      .select("id, user_id, briefing_date, script_text, audio_url")
      .eq("id", briefing_id)
      .single();

    if (fetchError || !briefing) throw new Error("Briefing not found");
    if (!serviceRequest && briefing.user_id !== callerId) {
      return new Response(JSON.stringify({ error: "Briefing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cost-control rate limit per briefing-owner. Each TTS run is paid bytes;
    // 12/min/user bounds cost without throttling normal use. Re-sign-existing
    // (the cheap path below) is rate-limited too - that's intentional, since
    // a tight retry loop is the primary cost-leak vector here.
    const rateLimit = await checkRateLimit(
      { maxRequests: 12, windowMs: 60_000, identifier: "synthesize-briefing" },
      briefing.user_id,
      supabase,
    );
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          message: "Audio generation rate limit hit. Try again in a minute.",
          retry_after_ms: Math.max(0, rateLimit.resetAt - Date.now()),
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Storage path for this briefing's audio (matches the upload path below).
    const storagePath = `${briefing.user_id}/${briefing.briefing_date}-${briefing.id.substring(0, 8)}.mp3`;

    // If we already have an audio URL on the briefing row, the storage object
    // likely exists but the 24h signed URL may have expired. Verify existence
    // and re-sign a fresh URL - cheap, no TTS re-run. Only fall through to a
    // full re-synthesize if the storage object has genuinely disappeared.
    if (briefing.audio_url) {
      const folder = briefing.user_id;
      const filename = `${briefing.briefing_date}-${briefing.id.substring(0, 8)}.mp3`;
      const { data: files } = await supabase.storage
        .from("ctrl-briefings")
        .list(folder, { search: filename });
      const exists = files?.some((f: { name: string }) => f.name === filename);

      if (exists) {
        const { data: signedData } = await supabase.storage
          .from("ctrl-briefings")
          .createSignedUrl(storagePath, 86400);
        const freshUrl = signedData?.signedUrl;
        if (freshUrl) {
          // Persist the fresh URL so subsequent reads don't need to re-sign.
          await supabase
            .from("briefings")
            .update({ audio_url: freshUrl })
            .eq("id", briefing.id);
          return new Response(
            JSON.stringify({ audio_url: freshUrl, already_exists: true, resigned: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      console.warn(
        `Storage object missing for briefing ${briefing.id}; re-synthesizing from script.`
      );
    }

    // Script not ready yet (preliminary briefing still being refined)
    if (!briefing.script_text) {
      return new Response(
        JSON.stringify({ status: "pending_script" }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Synthesizing audio for briefing ${briefing.id}...`);

    // Call ElevenLabs TTS (voice/model from tts_config or defaults).
    // Wrapped in fetchWithTimeout: 20s budget + 1 retry on 5xx. On terminal
    // failure surface `provider_unavailable` so the frontend renders a
    // recoverable "audio temporarily unavailable" prompt instead of a stuck
    // spinner.
    let audioBytes: Uint8Array;
    try {
      audioBytes = await synthesizeSpeech(supabase, briefing.script_text);
    } catch (e) {
      if (e instanceof ProviderUnavailableError || (e instanceof TTSResponseError && e.status >= 500)) {
        return new Response(
          JSON.stringify({
            error: "provider_unavailable",
            provider: "elevenlabs",
            message: "Audio service is temporarily unavailable. Try again in a moment.",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw e;
    }

    console.log(`Audio generated: ${audioBytes.length} bytes`);

    // Estimate duration (~150 words/min for TTS)
    const wordCount = briefing.script_text.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60);

    // Ensure bucket exists (ignore error if already exists)
    await supabase.storage.createBucket("ctrl-briefings", {
      public: false,
      fileSizeLimit: 10485760, // 10MB
    }).catch(() => {});

    const { error: uploadError } = await supabase.storage
      .from("ctrl-briefings")
      .upload(storagePath, audioBytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get signed URL (24h expiry)
    const { data: signedData } = await supabase.storage
      .from("ctrl-briefings")
      .createSignedUrl(storagePath, 86400);

    const audioUrl = signedData?.signedUrl || storagePath;

    // Update briefing row
    const { error: updateError } = await supabase
      .from("briefings")
      .update({
        audio_url: audioUrl,
        audio_duration_seconds: estimatedDuration,
      })
      .eq("id", briefing.id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    console.log(
      `Synthesis complete: ${storagePath} (~${estimatedDuration}s)`
    );

    return new Response(
      JSON.stringify({
        audio_url: audioUrl,
        duration_seconds: estimatedDuration,
        already_exists: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("synthesize-briefing error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
