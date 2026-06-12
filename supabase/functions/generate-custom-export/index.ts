import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildMemoryContext } from "../_shared/memory-context-builder.ts";
import { callOpenAI, selectModel } from "../_shared/openai-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

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

    // Check paid tier
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subscription } = await serviceClient
      .from("edge_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (!subscription || (subscription.status !== "active" && subscription.status !== "past_due")) {
      return new Response(
        JSON.stringify({ error: "Edge Pro subscription required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { transcript, format = "markdown" } = body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "A voice transcript is required (minimum 5 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the user's full memory context
    const memoryResult = await buildMemoryContext(supabase, user.id, {
      includeWarm: true,
      format: "markdown",
      useCase: "general",
      maxTokens: 3000,
    });

    // Fire-and-forget reliance signal on the facts that shipped into the
    // context. Never awaited; user-JWT client is fenced by auth.uid().
    {
      const touchIds = memoryResult.touchedFactIds ?? [];
      if (touchIds.length) {
        void supabase.rpc("touch_memory_facts", { p_fact_ids: touchIds })
          .then(({ error }) => { if (error) console.warn("touch failed:", error.message); });
      }
    }

    // Also fetch edge profile for strengths/weaknesses
    const { data: edgeProfile } = await serviceClient
      .from("edge_profiles")
      .select("strengths, weaknesses")
      .eq("user_id", user.id)
      .single();

    let profileContext = "";
    if (edgeProfile) {
      const strengths = (edgeProfile.strengths || [])
        .map((s: any) => `- ${s.label}: ${s.summary}`)
        .join("\n");
      const weaknesses = (edgeProfile.weaknesses || [])
        .map((w: any) => `- ${w.label}: ${w.summary}`)
        .join("\n");
      if (strengths) profileContext += `\nLEADER'S STRENGTHS:\n${strengths}`;
      if (weaknesses) profileContext += `\nLEADER'S GAPS TO COVER:\n${weaknesses}`;
    }

    const systemPrompt = `You are an expert AI configuration specialist. Your job is to create a custom system prompt / context file that a leader can paste into an AI tool to get personalized help with a specific task.

LEADER'S MEMORY CONTEXT:
${memoryResult.context}
${profileContext}

RULES:
- Create a system prompt that combines the leader's personal context with their specific request
- The output should be a self-contained context file that any AI tool can use
- Include relevant facts about the leader (role, company, goals, constraints, style) that are pertinent to their request
- Add specific instructions for the AI tool on how to help with this task
- Be specific to THIS leader's situation; use their actual company, team, and goals
- Do NOT fabricate data, metrics, or names not present in the context
- Keep the tone professional and direct
- Output in clean Markdown format
- The result should be 500-2000 words, practical and actionable`;

    const userPrompt = `The leader said (via voice): "${transcript.trim()}"

Generate a custom AI context file that will help them accomplish this specific task. The context file should:
1. Set up the AI with relevant background about the leader
2. Frame the specific task/challenge they described
3. Give the AI clear instructions on how to help
4. Include any relevant constraints, preferences, or context from the leader's profile`;

    const aiResponse = await callOpenAI(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: selectModel("complex"),
        temperature: 0.5,
        max_tokens: 3000,
      },
      { useCache: false },
    );

    const content = aiResponse.content || "";
    const tokenCount = estimateTokens(content);

    // Extract a short title from the AI output (first heading or first line)
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch
      ? titleMatch[1].slice(0, 60)
      : "Custom AI Context";

    return new Response(
      JSON.stringify({
        context: content,
        tokenCount,
        title,
        lastUpdated: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("generate-custom-export error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
