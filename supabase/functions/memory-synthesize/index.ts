import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWithTimeout } from "../_shared/with-timeout.ts";
import { hasExactServiceCredential } from "../_shared/service-auth.ts";

type MemoryFact = {
  id: string;
  fact_category: string;
  fact_value: string;
};

type DetectedPattern = {
  pattern_type: string;
  pattern_text: string;
  confidence: number;
  supporting_fact_ids?: string[];
};

type ExistingPattern = {
  id: string;
  pattern_type: string;
  pattern_text: string;
  evidence_count: number;
  confidence: number;
  status: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const corsJson = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Dual-mode auth: service-role { user_id } sweep mode OR user-JWT getUser() mode.
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRole = hasExactServiceCredential(authHeader, [serviceRoleKey]);

    let userId: string;
    let supabase;

    if (isServiceRole) {
      let bodyUserId: string | null = null;
      try { const b = await req.json(); if (b && typeof b.user_id === "string") bodyUserId = b.user_id; } catch { /* ignore */ }
      if (!bodyUserId) return corsJson({ error: "service-role call requires user_id" }, 400);
      userId = bodyUserId;
      supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
    } else {
      supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return corsJson({ error: "Unauthorized" }, 401);
      userId = user.id;
    }

    // Load hot + warm facts
    const { data: facts } = await supabase
      .from("user_memory")
      .select("id, fact_category, fact_label, fact_value, temperature, verification_status, confidence_score")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .in("temperature", ["hot", "warm"])
      .order("created_at", { ascending: false });

    if (!facts || facts.length < 5) {
      return new Response(
        JSON.stringify({
          success: true,
          patterns_found: 0,
          patterns_new: 0,
          patterns_updated: 0,
          patterns_confirmed: 0,
          message: "Need at least 5 facts to detect patterns",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build facts summary for LLM
    const factsSummary = facts.map((f: MemoryFact) =>
      `[${f.id}] (${f.fact_category}) ${f.fact_value}`
    ).join("\n");

    // Call OpenAI for pattern detection
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are analyzing facts about a person to identify behavioral patterns. Given these facts, identify:
- Recurring themes or priorities (type: preference)
- Things they consistently avoid or reject (type: anti_preference)
- Behavioral tendencies in how they work or decide (type: behavior)
- Potential blind spots based on what's missing or overemphasized (type: blindspot)
- Clear strengths evidenced by multiple facts (type: strength)

Only identify patterns supported by 2+ facts. Return JSON:
{"patterns": [{"pattern_type": "preference|anti_preference|behavior|blindspot|strength", "pattern_text": "specific actionable pattern", "confidence": 0.0-1.0, "supporting_fact_ids": ["uuid1", "uuid2"]}]}

Be specific and actionable, not generic. Max 10 patterns.`,
          },
          {
            role: "user",
            content: `Here are the facts:\n\n${factsSummary}`,
          },
        ],
      }),
      provider: "OpenAI",
      timeoutMs: 12000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // R2 (live-ops): OpenAI billing exhausted. A 429 / insufficient_quota is a soft skip,
      // NOT a throw - so the sweep counts it as skipped and does NOT stamp last_synthesized_at
      // (this user is retried next night). Lifecycle is unaffected (no API).
      if (response.status === 429 || errorText.includes("insufficient_quota")) {
        return corsJson({ success: true, patterns_found: 0, skipped: "openai_quota" }, 200);
      }
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const parsed = JSON.parse(content) as { patterns?: DetectedPattern[] };
    const detectedPatterns = parsed.patterns || [];

    let patternsNew = 0;
    let patternsUpdated = 0;
    let patternsConfirmed = 0;

    // Load existing patterns
    const { data: existingPatterns } = await supabase
      .from("user_patterns")
      .select("id, pattern_text, pattern_type, evidence_count, confidence, status")
      .eq("user_id", userId)
      .neq("status", "deprecated");

    for (const detected of detectedPatterns) {
      // Check if a similar pattern already exists (fuzzy match by type + text similarity)
      const existing = (existingPatterns || []).find((ep: ExistingPattern) =>
        ep.pattern_type === detected.pattern_type &&
        (ep.pattern_text.toLowerCase().includes(detected.pattern_text.toLowerCase().slice(0, 30)) ||
         detected.pattern_text.toLowerCase().includes(ep.pattern_text.toLowerCase().slice(0, 30)))
      );

      if (existing) {
        // Update existing pattern
        const newEvidence = existing.evidence_count + 1;
        const newConfidence = Math.min(1, Math.max(detected.confidence, existing.confidence));
        const newStatus = newConfidence > 0.8 && newEvidence > 3 ? "confirmed" : existing.status;

        await supabase
          .from("user_patterns")
          .update({
            evidence_count: newEvidence,
            confidence: newConfidence,
            last_confirmed_at: new Date().toISOString(),
            source_facts: detected.supporting_fact_ids || [],
            status: newStatus,
          })
          .eq("id", existing.id);

        patternsUpdated++;
        if (newStatus === "confirmed" && existing.status !== "confirmed") {
          patternsConfirmed++;
        }
      } else {
        // Insert new pattern
        await supabase
          .from("user_patterns")
          .insert({
            user_id: userId,
            pattern_type: detected.pattern_type,
            pattern_text: detected.pattern_text,
            confidence: detected.confidence,
            evidence_count: 1,
            source_facts: detected.supporting_fact_ids || [],
            status: "emerging",
          });
        patternsNew++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        patterns_found: detectedPatterns.length,
        patterns_new: patternsNew,
        patterns_updated: patternsUpdated,
        patterns_confirmed: patternsConfirmed,
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
