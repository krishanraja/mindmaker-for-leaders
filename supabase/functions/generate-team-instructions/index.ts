import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildMemoryContext } from "../_shared/memory-context-builder.ts";
import { callOpenAI, selectModel } from "../_shared/openai-utils.ts";

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
    const { recipientName, recipientRole, briefDescription, focusAreas } = body;

    if (!recipientName || !recipientRole || !briefDescription) {
      return new Response(
        JSON.stringify({ error: "recipientName, recipientRole, and briefDescription are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the leader's memory context using delegation use case
    const memoryResult = await buildMemoryContext(supabase, user.id, {
      includeWarm: true,
      format: "markdown",
      useCase: "delegation",
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

    const focusAreasText = focusAreas?.length
      ? `\n\nFocus areas to emphasize:\n${focusAreas.map((a: string) => `- ${a}`).join("\n")}`
      : "";

    const systemPrompt = `You are a leadership communication expert. Your job is to help leaders create clear, structured instructions for their team members.

You have access to this leader's Memory Web: their accumulated context, decisions, patterns, and preferences. Use this context to make the instructions rich, specific, and aligned with the leader's thinking.

LEADER'S MEMORY CONTEXT:
${memoryResult.context}

RULES:
- Write instructions as if the leader is speaking directly to the team member
- Be specific. Reference real context from the leader's memory where relevant
- Structure the output into clear sections
- Keep it actionable. Every section should tell the team member what to DO
- Include relevant constraints, preferences, or decisions the leader has recorded
- Be concise but thorough. Respect the team member's time
- Do NOT fabricate information not present in the memory context
- If the memory context is sparse, focus on the brief description and make the instructions clear and professional

OUTPUT FORMAT (respond in valid JSON):
{
  "sections": [
    { "title": "Context", "content": "What the team member needs to understand about the situation" },
    { "title": "Key Actions", "content": "Numbered list of specific things to do" },
    { "title": "Constraints & Preferences", "content": "Important guardrails or preferences to follow" },
    { "title": "Background", "content": "Relevant context from the leader's thinking that helps with execution" }
  ]
}

Only include sections that have meaningful content. Skip sections that would be empty or redundant.`;

    const userPrompt = `Generate instructions for ${recipientName} (${recipientRole}).

Brief: ${briefDescription}${focusAreasText}`;

    const aiResponse = await callOpenAI(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: selectModel("analysis"),
        temperature: 0.6,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );

    // Parse the AI response
    let sections: Array<{ title: string; content: string }> = [];
    try {
      const parsed = JSON.parse(aiResponse.content);
      sections = parsed.sections || [];
    } catch {
      // If JSON parsing fails, treat the whole response as a single section
      sections = [{ title: "Instructions", content: aiResponse.content }];
    }

    // Build plain-text instructions from sections
    const instructionsText = sections
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n");

    const fullInstructions = `# Instructions for ${recipientName}\n**Role:** ${recipientRole}\n\n${instructionsText}`;

    return new Response(
      JSON.stringify({
        instructions: fullInstructions,
        sections,
        generatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("generate-team-instructions error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
