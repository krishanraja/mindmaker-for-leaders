import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildMemoryContext } from "../_shared/memory-context-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { format = "markdown", useCase = "general", maxTokens = 4000 } = body;

    const result = await buildMemoryContext(supabase, user.id, {
      includeWarm: true,
      format,
      useCase,
      maxTokens,
    });

    // Fire-and-forget reliance signal on the facts that shipped into the
    // context. Never awaited; user-JWT client is fenced by auth.uid().
    {
      const touchIds = result.touchedFactIds ?? [];
      if (touchIds.length) {
        void supabase.rpc("touch_memory_facts", { p_fact_ids: touchIds })
          .then(({ error }) => { if (error) console.warn("touch failed:", error.message); });
      }
    }

    // Surface artefacts + primary-file hints for the client wizard. Keep
    // `context` for legacy callers that grab the first blob.
    const primary = result.artefacts?.[0];
    return new Response(
      JSON.stringify({
        ...result,
        primary_filename: primary?.filename,
        primary_mime: primary?.mime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
