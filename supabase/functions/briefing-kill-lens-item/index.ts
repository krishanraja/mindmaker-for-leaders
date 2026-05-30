/**
 * briefing-kill-lens-item Edge Function
 *
 * Records an explicit "don't show me stories like this" signal against the
 * lens-item signature of a briefing segment. The next briefing won't include
 * that lens item; stories anchored to it never surface.
 *
 * Payload:
 *   { briefing_id: UUID, lens_item_id: string }
 *   OR
 *   { lens_item_type: string, lens_item_text: string }  (direct form)
 *
 * Auth: authenticated user only. Writes via service role (RLS denies INSERT
 * to end users by design - kill rows only land through this path).
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeLensSignature } from "../_shared/lens-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KILL_DELTA = -1.0;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    let lensType: string | undefined;
    let lensText: string | undefined;

    if (typeof body.lens_item_type === "string" && typeof body.lens_item_text === "string") {
      lensType = body.lens_item_type;
      lensText = body.lens_item_text;
    } else if (typeof body.briefing_id === "string" && typeof body.lens_item_id === "string") {
      // Look up the lens item in the briefing's snapshot. Restricted to
      // the caller's own briefings.
      const { data: briefing, error } = await supabase
        .from("briefings")
        .select("context_snapshot")
        .eq("id", body.briefing_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !briefing) throw new Error("Briefing not found");
      const snapshot = (briefing as { context_snapshot: Record<string, unknown> | null }).context_snapshot;
      const lens = Array.isArray(snapshot?.lens) ? snapshot!.lens as Array<{ id: string; type: string; text: string }> : [];
      const match = lens.find((l) => l.id === body.lens_item_id);
      if (!match) throw new Error("Lens item not found in briefing snapshot");
      lensType = match.type;
      lensText = match.text;
    } else {
      throw new Error("Provide either { briefing_id, lens_item_id } or { lens_item_type, lens_item_text }");
    }

    if (!lensText || lensText.trim().length === 0) throw new Error("Empty lens item text");

    const signature = await computeLensSignature(lensType!, lensText!);

    const { error: upsertErr } = await supabase
      .from("briefing_lens_feedback")
      .upsert(
        {
          user_id: user.id,
          lens_item_signature: signature,
          lens_item_type: lensType!,
          lens_item_text: lensText!.trim(),
          weight_delta: KILL_DELTA,
          source: "kill",
          evidence_count: 1,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lens_item_signature,source" },
      );
    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({
        ok: true,
        signature,
        lens_item_type: lensType,
        lens_item_text: lensText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("briefing-kill-lens-item error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
