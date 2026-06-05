import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weekly_checkin_enabled, preferred_day, timezone, daily_briefing_enabled } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      throw new Error("Database configuration error (unexpected project).");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (userErr || !user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email ?? null;
    const allowedDays = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    const day = typeof preferred_day === "string" && allowedDays.has(preferred_day) ? preferred_day : null;
    const tz = typeof timezone === "string" ? timezone.slice(0, 64) : null;

    // Only write the fields the caller actually provided, so toggling the daily
    // briefing email never clobbers the weekly check-in prefs (and vice versa).
    const payload: Record<string, unknown> = {
      user_id: user.id,
      email,
      updated_at: new Date().toISOString(),
    };
    if (typeof weekly_checkin_enabled !== "undefined") {
      payload.weekly_checkin_enabled = Boolean(weekly_checkin_enabled);
      payload.preferred_day = day;
      payload.timezone = tz;
    }
    if (typeof daily_briefing_enabled !== "undefined") {
      payload.daily_briefing_enabled = Boolean(daily_briefing_enabled);
    }

    const { data, error } = await supabase
      .from("leader_notification_prefs" as never)
      .upsert(payload as never, { onConflict: "user_id" } as never)
      .select("weekly_checkin_enabled, preferred_day, timezone, email, daily_briefing_enabled")
      .single();

    if (error) {
      console.error("upsert notification prefs error:", error);
      return new Response(JSON.stringify({ error: "Failed to update preferences" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, prefs: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("upsert-notification-prefs error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

