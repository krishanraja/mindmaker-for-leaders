import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildMemoryContext,
  type MemoryContextOptions,
} from "../_shared/memory-context-builder.ts";
import { callOpenAI, selectModel } from "../_shared/openai-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Capability = 'board_memo' | 'strategy_doc' | 'email' | 'meeting_agenda' | 'framework' | 'teaching_doc' | 'lean_into';

interface GenerateRequest {
  capability: Capability;
  targetKey: string;
  voiceInput?: string;
  additionalContext?: string;
  deliverToEmail?: string;
}

const CAPABILITY_CONFIG: Record<Capability, {
  title: string;
  useCase: string;
  systemPromptPrefix: string;
  outputGuidance: string;
}> = {
  board_memo: {
    title: "Board Memo",
    useCase: "board",
    systemPromptPrefix: "You are an expert executive communications writer drafting a board memo.",
    outputGuidance: `Structure the memo with:
- **Subject line** (clear, concise)
- **Executive Summary** (2-3 sentences)
- **Key Updates** (bulleted, specific to the company)
- **Decisions Required** (if any were mentioned)
- **Risks & Mitigations** (from the leader's known blockers)
- **Next Steps**

Use formal but direct language. Reference specific company data, metrics, and team context from the leader's memory. Do NOT fabricate data not present in context.`,
  },
  strategy_doc: {
    title: "Strategy Document",
    useCase: "strategy",
    systemPromptPrefix: "You are a senior strategy consultant drafting a strategy document.",
    outputGuidance: `Structure the document with:
- **Strategic Context** (the situation as the leader sees it)
- **Problem Statement** (drawn from blockers and tensions)
- **Strategic Options** (2-3 approaches)
- **Recommended Approach** (based on leader's objectives and preferences)
- **Implementation Plan** (high-level phases)
- **Success Metrics** (tied to stated objectives)
- **Risks** (from known blockers and risk signals)

Be specific to this leader's company and situation. Use their actual goals, constraints, and preferences.`,
  },
  email: {
    title: "Email Draft",
    useCase: "email",
    systemPromptPrefix: "You are drafting a professional email on behalf of a leader.",
    outputGuidance: `Draft a complete email with:
- **Subject:** (clear, action-oriented)
- **Body** (matching the leader's communication style from their preferences)
- Keep it concise and professional
- Match the formality level to the context
- Reference specific facts when relevant (team names, project names, metrics)

If the leader has a known communication style preference, match it. Default to direct and concise.`,
  },
  meeting_agenda: {
    title: "Meeting Agenda",
    useCase: "meeting",
    systemPromptPrefix: "You are preparing a structured meeting agenda for a leader.",
    outputGuidance: `Structure the agenda with:
- **Meeting Title**
- **Date/Duration** (suggest based on content)
- **Attendees** (suggest based on context if possible)
- **Objectives** (what this meeting should accomplish)
- **Agenda Items** (numbered, with time allocations)
  - For each: topic, owner, time, desired outcome
- **Pre-read Materials** (suggest based on context)
- **Action Items Template** (for tracking)

Make it specific to the leader's current priorities and team context.`,
  },
  framework: {
    title: "Framework",
    useCase: "delegation",
    systemPromptPrefix: "You are helping a leader systemize one of their strengths into a repeatable framework.",
    outputGuidance: `Create a framework document with:
- **Framework Name** (catchy, memorable)
- **When to Use This** (situations where this applies)
- **Core Principles** (3-5 principles drawn from the leader's patterns)
- **Step-by-Step Process** (actionable steps someone else can follow)
- **Common Pitfalls** (from the leader's experience/patterns)
- **Templates/Checklists** (practical tools)
- **Examples** (based on the leader's actual context)

This should capture what the leader does instinctively so others can replicate it.`,
  },
  teaching_doc: {
    title: "Teaching Document",
    useCase: "delegation",
    systemPromptPrefix: "You are helping a leader create a 'How I Think About X' document to share with their team.",
    outputGuidance: `Create a teaching document with:
- **Title:** "How I Think About [Topic]"
- **My Approach** (the leader's mental model, drawn from patterns and decisions)
- **Key Principles** (what guides their thinking)
- **Decision Criteria** (how they evaluate options)
- **What Good Looks Like** (examples from their context)
- **What to Watch Out For** (common mistakes, blind spots)
- **Questions to Ask** (the leader's go-to diagnostic questions)

Write in first person as the leader. Make it personal and specific, not generic advice.`,
  },
  lean_into: {
    title: "Mission Alignment",
    useCase: "strategy",
    systemPromptPrefix: "You are a leadership coach helping a leader find missions, projects, and opportunities that maximize one of their key strengths.",
    outputGuidance: `Create a mission alignment document with:
- **Your Strength** (restate the strength being leveraged)
- **Why This Matters** (why leaning into this strength creates outsized impact)
- **High-Impact Missions** (3-5 specific projects or initiatives that leverage this strength, drawn from the leader's actual goals, company context, and team situation)
  - For each: name, description, how it leverages the strength, expected impact
- **Delegation Opportunities** (tasks to delegate to free up time for these missions)
- **Quick Wins** (2-3 things to do this week to lean in)
- **30-Day Play** (a specific plan for the next month)

Be extremely specific to this leader's situation. Reference their actual company, team, goals, and constraints. Do NOT give generic advice.`,
  },
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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Subscription status. Pro is unlimited. Free leaders get one free,
    // watermarked board memo so they feel the value before any paywall. The
    // allowance is enforced after we know the capability (see below).
    const { data: subscription } = await serviceClient
      .from("edge_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .single();

    const isPro = !!subscription &&
      (subscription.status === "active" || subscription.status === "past_due");

    const body: GenerateRequest = await req.json();
    const { capability, targetKey, voiceInput, additionalContext, deliverToEmail } = body;

    if (!capability || !targetKey) {
      return new Response(
        JSON.stringify({ error: "capability and targetKey are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const config = CAPABILITY_CONFIG[capability];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown capability: ${capability}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Free-tier allowance: one watermarked board memo, then the paywall. Any
    // other capability stays Pro-only. This is what lets the new Edge "Make my
    // board memo" deliver real value to a free leader instead of a dead-end.
    let isFreeGeneration = false;
    if (!isPro) {
      if (capability !== "board_memo") {
        return new Response(
          JSON.stringify({ error: "Edge Pro subscription required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { count } = await serviceClient
        .from("edge_actions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("capability_key", "board_memo");
      if ((count ?? 0) >= 1) {
        return new Response(
          JSON.stringify({ error: "Edge Pro subscription required", limitReached: true }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      isFreeGeneration = true;
    }

    // Determine action type
    const actionType = ["framework", "teaching_doc", "lean_into"].includes(capability) ? "sharpen" : "cover";

    // Build memory context with appropriate use case
    const memoryResult = await buildMemoryContext(supabase, user.id, {
      includeWarm: true,
      format: "markdown",
      useCase: config.useCase as MemoryContextOptions["useCase"],
      maxTokens: 4000,
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

    // Fetch edge profile for additional context
    const { data: edgeProfile } = await serviceClient
      .from("edge_profiles")
      .select("strengths, weaknesses")
      .eq("user_id", user.id)
      .single();

    // Build the target context (the specific strength/weakness this is for)
    let targetContext = "";
    if (edgeProfile) {
      const allItems = [...(edgeProfile.strengths || []), ...(edgeProfile.weaknesses || [])];
      const target = allItems.find(
        (item: { key: string; label?: string; summary?: string }) =>
          item.key === targetKey,
      );
      if (target) {
        targetContext = `\nTHIS IS FOR: ${target.label} - ${target.summary}`;
      }
    }

    // Build user input section
    let userInput = "";
    if (voiceInput) {
      userInput += `\n\nLEADER'S KEY POINTS (from voice):\n${voiceInput}`;
    }
    if (additionalContext) {
      userInput += `\n\nADDITIONAL CONTEXT:\n${additionalContext}`;
    }

    const systemPrompt = `${config.systemPromptPrefix}

LEADER'S MEMORY CONTEXT:
${memoryResult.context}
${targetContext}

RULES:
- Be specific to THIS leader's situation. Use their actual company name, team details, goals, and constraints
- Do NOT fabricate data, metrics, or names not present in the context
- If the context is sparse for certain sections, keep those sections brief rather than inventing details
- Write in a professional tone appropriate for the artifact type
- Output in clean Markdown format

${config.outputGuidance}`;

    const userPrompt = `Generate a ${config.title} for this leader.${userInput || "\n\nUse the leader's memory context to produce a comprehensive draft."}`;

    const aiResponse = await callOpenAI(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: selectModel("complex"),
        temperature: 0.6,
        max_tokens: 3000,
      },
      { useCache: false },
    );

    // Watermark the free preview so the value is felt before any upsell.
    const WATERMARK =
      "\n\n---\n_Drafted free with CTRL. Upgrade to Edge Pro to remove this note and unlock unlimited memos, strategy docs, and emails._";
    const finalContent = isFreeGeneration
      ? aiResponse.content + WATERMARK
      : aiResponse.content;

    // Store the action
    const { data: action, error: insertError } = await serviceClient
      .from("edge_actions")
      .insert({
        user_id: user.id,
        action_type: actionType,
        capability_key: capability,
        target_key: targetKey,
        title: config.title,
        input_context: {
          voice_input: voiceInput || null,
          additional_context: additionalContext || null,
          memory_facts_used: memoryResult.factCount,
        },
        output_content: finalContent,
        output_format: "markdown",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to store edge action:", insertError);
    }

    // Also persist in the unified generated_artifacts table so the Library
    // tab on /memory can surface drafts and frameworks alongside skills.
    // Quiet on failure - if the table doesn't exist yet (migration not
    // applied), the user still gets their artifact in this response.
    // capability is already mapped to framework/teaching_doc by the client
    // before it reaches here, so key off the mapped values (not systemize/teach)
    // or frameworks get mis-saved as plain drafts in the Library.
    const isFramework =
      capability === "framework" || capability === "teaching_doc";
    const { error: artifactError } = await serviceClient
      .from("generated_artifacts")
      .insert({
        user_id: user.id,
        kind: isFramework ? "framework" : "draft",
        name: config.title,
        body: finalContent,
        metadata: {
          capability,
          action_type: actionType,
          target_key: targetKey,
          edge_action_id: action?.id || null,
        },
      });
    if (artifactError) {
      console.warn(
        "edge-generate: generated_artifacts insert failed",
        artifactError,
      );
    }

    // If email delivery requested, trigger it in the background
    if (deliverToEmail && action?.id) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/deliver-edge-artifact`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionId: action.id, email: deliverToEmail }),
      }).catch(err => console.warn("Email delivery trigger failed:", err));
    }

    return new Response(
      JSON.stringify({
        actionId: action?.id || null,
        content: finalContent,
        title: config.title,
        format: "markdown",
        isFreePreview: isFreeGeneration,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("edge-generate error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
