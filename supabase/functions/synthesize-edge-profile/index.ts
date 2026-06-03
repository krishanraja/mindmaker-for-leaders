import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildMemoryContext } from "../_shared/memory-context-builder.ts";
import { callOpenAI, selectModel, selectModelDynamic } from "../_shared/openai-utils.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { resolveLeaderIds } from "../_shared/user-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EdgeStrength {
  key: string;
  label: string;
  summary: string;
  confidence: number;
  evidence: string[];
  capabilities: string[];
}

interface EdgeWeakness {
  key: string;
  label: string;
  summary: string;
  confidence: number;
  evidence: string[];
  capabilities: string[];
}

interface IntelligenceGap {
  key: string;
  category: string;
  prompt: string;
  impact: string;
  priority: number;
  resolution: string;
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

    // Rate limiting: 5 requests per minute (expensive AI synthesis)
    const rateLimitResult = checkRateLimit(user.id, { maxRequests: 5, windowMs: 60_000 });
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Service-role client for writing to edge_profiles
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Build full memory context
    const memoryResult = await buildMemoryContext(supabase, user.id, {
      includeWarm: true,
      format: "markdown",
      useCase: "edge",
      maxTokens: 4000,
    });

    // 2. Fetch additional data sources not in memory context. Assessment data
    // (dimension scores, tensions, risk signals) keys off assessment_id, which
    // is reached via leaders -> leader_assessments, not user_id. The old code
    // queried by user_id with column names that do not exist, so it silently
    // returned nothing. Resolve the leader's latest assessment first, with the
    // service client so RLS never hides the leader's own data.
    const leaderIds = await resolveLeaderIds(serviceClient, user.id);
    let assessmentId: string | null = null;
    if (leaderIds.length > 0) {
      const { data: la } = await serviceClient
        .from("leader_assessments")
        .select("id")
        .in("leader_id", leaderIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      assessmentId = (la as { id: string } | null)?.id ?? null;
    }
    const assessmentFilter = assessmentId ?? "00000000-0000-0000-0000-000000000000";

    const [
      { data: dimensionScores },
      { data: tensions },
      { data: riskSignals },
      { data: existingFeedback },
    ] = await Promise.all([
      serviceClient
        .from("leader_dimension_scores")
        .select("dimension_key, score_numeric, dimension_tier, explanation")
        .eq("assessment_id", assessmentFilter)
        .order("score_numeric", { ascending: false }),
      serviceClient
        .from("leader_tensions")
        .select("dimension_key, summary_line, priority_rank")
        .eq("assessment_id", assessmentFilter)
        .order("priority_rank", { ascending: true }),
      serviceClient
        .from("leader_risk_signals")
        .select("risk_key, level, description, priority_rank")
        .eq("assessment_id", assessmentFilter)
        .order("priority_rank", { ascending: true }),
      serviceClient
        .from("edge_feedback")
        .select("feedback_type, target_key")
        .eq("user_id", user.id),
    ]);

    // 3. Build supplementary context
    const supplementary: string[] = [];

    if (dimensionScores?.length) {
      const dimLines = dimensionScores.map(
        (d: any) => `- ${d.dimension_key}: ${d.score_numeric}/100 (${d.dimension_tier})${d.explanation ? ` - ${d.explanation}` : ""}`,
      );
      supplementary.push(`## Assessment Dimension Scores\n${dimLines.join("\n")}`);
    }

    if (tensions?.length) {
      const tensionLines = tensions.map(
        (t: any) => `- ${t.dimension_key}: ${t.summary_line}`,
      );
      supplementary.push(`## Strategic Tensions\n${tensionLines.join("\n")}`);
    }

    if (riskSignals?.length) {
      const riskLines = riskSignals.map(
        (r: any) => `- ${r.risk_key} (${r.level}): ${r.description}`,
      );
      supplementary.push(`## Risk Signals\n${riskLines.join("\n")}`);
    }

    // Include feedback to guide re-synthesis
    const rejectedStrengths = (existingFeedback || [])
      .filter((f: any) => f.feedback_type === "strength_reject")
      .map((f: any) => f.target_key);
    const rejectedWeaknesses = (existingFeedback || [])
      .filter((f: any) => f.feedback_type === "weakness_reject")
      .map((f: any) => f.target_key);

    let feedbackContext = "";
    if (rejectedStrengths.length || rejectedWeaknesses.length) {
      feedbackContext = `\n\nIMPORTANT USER FEEDBACK:`;
      if (rejectedStrengths.length) {
        feedbackContext += `\nThe user has REJECTED these as strengths (do not include them): ${rejectedStrengths.join(", ")}`;
      }
      if (rejectedWeaknesses.length) {
        feedbackContext += `\nThe user has REJECTED these as weaknesses (do not include them): ${rejectedWeaknesses.join(", ")}`;
      }
    }

    // 4. Compute intelligence gaps
    const gaps = computeIntelligenceGaps(
      memoryResult,
      dimensionScores || [],
      tensions || [],
    );

    // 5. Call AI to synthesize profile
    const fullContext = [memoryResult.context, ...supplementary].join("\n\n");

    const systemPrompt = `You are analyzing a leader's data to identify their top strengths and key gaps.

LEADER'S FULL CONTEXT:
${fullContext}
${feedbackContext}

AVAILABLE CAPABILITIES:
For strengths (sharpen): "systemize" (turn instinct into framework), "teach" (create shareable doc), "lean_into" (suggest leveraging missions)
For weaknesses (cover): "board_memo" (draft board memos), "strategy_doc" (draft strategy docs), "email" (draft emails), "meeting_agenda" (draft meeting agendas), "template" (pre-filled templates)

RULES:
- Identify 3-5 strengths and 3-5 weaknesses based on ALL available evidence
- Each strength/weakness must have a unique key (snake_case), a human-readable label, and a plain-language summary (2-3 sentences, no jargon)
- Each must list the evidence sources that support it (e.g., "pattern:people_first", "dimension:delegation:82", "fact:manages_team_of_20", "tension:communication_gap")
- Assign a confidence score (0-1) based on evidence strength. More evidence = higher confidence.
- Map each to 1-3 relevant capabilities from the lists above
- Weaknesses should be prioritized by impact on the leader's stated objectives
- Do NOT include any strength/weakness the user has explicitly rejected
- Be specific to THIS leader. No generic advice

OUTPUT FORMAT (respond in valid JSON):
{
  "strengths": [
    {
      "key": "people_leadership",
      "label": "People Leadership",
      "summary": "You have a natural ability to build trust and develop your team. People come to you when they need guidance.",
      "confidence": 0.85,
      "evidence": ["pattern:team_builder", "dimension:delegation_augmentation:82"],
      "capabilities": ["systemize", "teach"]
    }
  ],
  "weaknesses": [
    {
      "key": "written_communication",
      "label": "Written Communication",
      "summary": "Board memos and strategy documents take you longer than they should. You think clearly but struggle to get it on paper.",
      "confidence": 0.72,
      "evidence": ["blocker:writing_takes_too_long", "tension:board_reporting_gap"],
      "capabilities": ["board_memo", "strategy_doc", "email"]
    }
  ]
}`;

    const aiResponse = await callOpenAI(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Analyze this leader's data and produce their Edge profile." },
        ],
        model: await selectModelDynamic("complex", "edge_synthesis", createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { persistSession: false } }
        )),
        temperature: 0.5,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );

    // 6. Parse response
    let strengths: EdgeStrength[] = [];
    let weaknesses: EdgeWeakness[] = [];
    try {
      const parsed = JSON.parse(aiResponse.content);
      strengths = parsed.strengths || [];
      weaknesses = parsed.weaknesses || [];
    } catch {
      console.error("Failed to parse AI response:", aiResponse.content);
      return new Response(
        JSON.stringify({ error: "Failed to synthesize profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Upsert edge profile
    const { data: existing } = await serviceClient
      .from("edge_profiles")
      .select("id, profile_version")
      .eq("user_id", user.id)
      .single();

    const profileData = {
      user_id: user.id,
      strengths,
      weaknesses,
      intelligence_gaps: gaps,
      profile_version: (existing?.profile_version || 0) + 1,
      last_synthesized_at: new Date().toISOString(),
      synthesis_inputs: {
        fact_count: memoryResult.factCount,
        pattern_count: memoryResult.patternCount,
        decision_count: memoryResult.decisionCount,
        dimension_scores: dimensionScores?.length || 0,
        tensions: tensions?.length || 0,
        risk_signals: riskSignals?.length || 0,
      },
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await serviceClient
        .from("edge_profiles")
        .update(profileData)
        .eq("id", existing.id);
    } else {
      await serviceClient
        .from("edge_profiles")
        .insert(profileData);
    }

    return new Response(
      JSON.stringify({
        strengths,
        weaknesses,
        intelligence_gaps: gaps,
        profile_version: profileData.profile_version,
        isNew: !existing,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("synthesize-edge-profile error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Compute intelligence gaps - what data is missing for a 10/10 profile
 */
function computeIntelligenceGaps(
  memoryResult: { factCount: number; patternCount: number; context: string },
  dimensionScores: any[],
  tensions: any[],
): IntelligenceGap[] {
  const gaps: IntelligenceGap[] = [];

  // Check for missing assessment
  if (!dimensionScores?.length) {
    gaps.push({
      key: "assessment_missing",
      category: "assessment_missing",
      prompt: "Taking the 10-minute AI Literacy Diagnostic would sharpen your Edge profile significantly.",
      impact: "Would add 6 leadership dimension scores to your profile",
      priority: 9,
      resolution: "diagnostic",
    });
  }

  // Check fact category coverage
  const context = memoryResult.context.toLowerCase();
  const categoryChecks: Array<{ keyword: string; category: string; prompt: string; impact: string }> = [
    {
      keyword: "business context",
      category: "fact_gap",
      prompt: "Tell me about your company: what does it do, how big is the team, what stage are you at?",
      impact: "Would make generated artifacts much more specific to your situation",
    },
    {
      keyword: "current priorities",
      category: "fact_gap",
      prompt: "What are your top priorities this quarter?",
      impact: "Would help prioritize which gaps matter most to cover",
    },
    {
      keyword: "blockers",
      category: "fact_gap",
      prompt: "What's the biggest challenge you're facing right now?",
      impact: "Would help identify gaps in your leadership profile",
    },
    {
      keyword: "preferences",
      category: "fact_gap",
      prompt: "How do you prefer to communicate: direct or diplomatic? Fast or thorough?",
      impact: "Would tune drafted artifacts to match your voice",
    },
  ];

  for (const check of categoryChecks) {
    if (!context.includes(check.keyword)) {
      gaps.push({
        key: `missing_${check.keyword.replace(/\s/g, "_")}`,
        category: check.category as any,
        prompt: check.prompt,
        impact: check.impact,
        priority: 7,
        resolution: "voice_capture",
      });
    }
  }

  // Check if data is sparse overall
  if (memoryResult.factCount < 5) {
    gaps.push({
      key: "sparse_context",
      category: "fact_gap",
      prompt: "The more you share, the sharper your Edge gets. Tell me about your role, your goals, and what keeps you up at night.",
      impact: "More facts mean higher-confidence strengths and gaps",
      priority: 10,
      resolution: "voice_capture",
    });
  }

  // Check for external context import opportunity
  gaps.push({
    key: "external_context",
    category: "external_context",
    prompt: "If you have a CLAUDE.md, ChatGPT Custom Instructions, or similar context file, uploading it would give me months of context instantly.",
    impact: "Would immediately enrich your profile with existing AI context",
    priority: 5,
    resolution: "md_upload",
  });

  // Sort by priority descending
  gaps.sort((a, b) => b.priority - a.priority);

  return gaps;
}
