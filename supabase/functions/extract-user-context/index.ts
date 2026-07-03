import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { runGuardrails, type IncomingFact } from '../_shared/fact-guardrails.ts';
import { fetchWithTimeout, ProviderUnavailableError } from '../_shared/with-timeout.ts';
import { createLogger } from '../_shared/logger.ts';
import { encryptFactContent } from '../_shared/memory-crypto.ts';
import { resolveContradiction } from '../_shared/contradiction.ts';
import {
  applyCorrectionDamping,
  buildCorrectionPromptBlock,
  fetchRecentCorrections,
  type CorrectionSignal,
} from '../_shared/correction-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedFact {
  fact_key: string;
  fact_category: 'identity' | 'business' | 'objective' | 'blocker' | 'preference';
  fact_label: string;
  fact_value: string;
  fact_context: string;
  confidence_score: number;
  is_high_stakes: boolean;
  importance: number;
}

const EXTRACTION_PROMPT = `You are an expert at extracting structured facts about business leaders from their written or spoken input.

Your job is to identify DURABLE FACTS about the PERSON SPEAKING. Be precise. Only extract facts that are explicitly stated or strongly implied about the speaker themselves.

FACT CATEGORIES:
1. IDENTITY - role, title, department, who they report to, team size, seniority level
2. BUSINESS - company name, industry/vertical, company size, growth stage, revenue info
3. OBJECTIVE - main goals, quarterly priorities, success metrics, what they are trying to achieve
4. BLOCKER - personal challenges, team challenges, organizational challenges, time constraints
5. PREFERENCE - communication style, decision-making approach, delegation comfort, work style

NEVER EXTRACT (these are NOT user facts):
- META-INSTRUCTIONS to the assistant: "don't use em dashes", "write it shorter", "avoid jargon", "give me bullet points", "make sure you...". These shape the OUTPUT and are not facts about the user.
- NEGATIONS on their own: "I don't like X" alone is not a positive preference. Only capture positive statements of what the user DOES prefer or use.
- TRANSIENT CONTEXT: "I'm tired today", "running late", "feeling off". Not durable.
- THIRD-PARTY IDENTITY: "my cofounder is the CEO" does NOT make the speaker the CEO. Capture the cofounder as a relationship fact only if clearly relevant.
- COPY-EDIT, FORMATTING, OR TYPOGRAPHIC RULES under ANY category. Em dashes, bullet points, markdown, tone, voice, word count, brevity - these are style rules, never user facts.
- HYPOTHETICALS: "if I had more time I'd...", "I would like to...". Not current facts.
- SELF-ADDRESSED DIRECTIVES: "you should", "please avoid", "can you". These are for the assistant.

EXAMPLES of what to REJECT:
- "Don't ever use em dashes in my briefings." -> REJECT, this is a style rule for the assistant
- "Keep it under 200 words." -> REJECT, formatting instruction
- "I'm a bit tired today, running late." -> REJECT tired/running-late (transient); keep "has a meeting today" ONLY if named
- "My cofounder Jake is the CEO." -> REJECT "user is CEO"; keep "cofounder is named Jake" only if durable

For each fact you extract:
- fact_key: snake_case identifier (e.g., "role", "company_name", "main_blocker")
- fact_category: "identity" | "business" | "objective" | "blocker" | "preference"
- fact_label: human-readable label
- fact_value: the extracted value (concise but complete)
- fact_context: exact quote or paraphrase supporting the fact
- confidence_score: 0.0-1.0 (conservative)
- is_high_stakes: true for role, company name, main objective
- importance: integer 1-10, how load-bearing this fact is to who they are and their biggest decisions (10 = defines them or a core bet they are making; 6-7 = a real strategic fact; 4-5 = useful context; 1-2 = trivial). Be discriminating; do NOT cluster everything at 5.

RULES:
- Only extract facts actually mentioned or strongly implied
- Never invent or assume
- Be conservative with confidence
- Extract 5-15 facts maximum; fewer if input is sparse

Return a JSON object with two arrays:
{
  "facts": [ {fact_key, fact_category, fact_label, fact_value, fact_context, confidence_score, is_high_stakes, importance}, ... ],
  "rejected": [ {candidate: string, reason: string}, ... ]
}
If nothing extractable, return {"facts": [], "rejected": []}.`;

const log = createLogger('extract-user-context');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, session_id, source_type } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return new Response(
        JSON.stringify({ error: 'transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
      auth: { persistSession: false },
    });

    // Get authenticated user - REQUIRED. Any caller without a valid JWT is
    // rejected early so we never write rows with user_id=undefined which
    // would become cross-visible through the permissive RLS policy.
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId || userErr) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: valid user session required', facts: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Call OpenAI for extraction
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      log.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured', facts: [] }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === CORRECTION AWARENESS (non-blocking) ===
    // Pull the leader's recent corrections/rejections/disputes so the
    // extractor never re-infers a value they already ruled out. The prompt
    // block is best-effort guidance; applyCorrectionDamping below is the
    // deterministic guarantee.
    let corrections: CorrectionSignal[] = [];
    try {
      corrections = await fetchRecentCorrections(supabase, userId);
    } catch (correctionErr) {
      log.warn('Correction fetch error (non-blocking)', { error: correctionErr });
    }

    let openaiResponse: Response;
    try {
      openaiResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: EXTRACTION_PROMPT + buildCorrectionPromptBlock(corrections) },
            { role: 'user', content: `Extract facts from this ${source_type === 'markdown' ? 'document' : 'transcript'}:\n\n"${transcript}"` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 2000,
        }),
        provider: 'OpenAI',
        timeoutMs: 12000,
      });
    } catch (err) {
      if (err instanceof ProviderUnavailableError) {
        log.error('OpenAI extraction timed out or unavailable', { error: err.message });
      } else {
        log.error('OpenAI extraction fetch error', { error: err });
      }
      return new Response(
        JSON.stringify({ error: 'AI extraction failed', facts: [] }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      log.error('OpenAI API error', { errorText });
      return new Response(
        JSON.stringify({ error: 'AI extraction failed', facts: [] }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;
    
    let extractedFacts: ExtractedFact[] = [];

    try {
      const parsed = JSON.parse(content);
      extractedFacts = Array.isArray(parsed) ? parsed : (parsed.facts || []);
    } catch (parseError) {
      log.error('Failed to parse OpenAI response', { error: parseError });
      return new Response(
        JSON.stringify({ error: 'Failed to parse extraction', facts: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === VALIDATION PASS ===
    // Second LLM call to cross-check extracted facts against the original transcript.
    // This catches hallucinations, misinterpretations, and temporal/negation errors.
    if (extractedFacts.length > 0) {
      try {
        const validationResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a strict fact-checker. Given a transcript and a list of extracted facts, verify each fact against the transcript.

For each fact, determine:
- "valid": The fact is clearly stated or strongly implied in the transcript
- "invalid": The fact is NOT in the transcript, is hallucinated, or misinterprets what was said
- "adjusted": The fact needs correction (e.g. negation missed, temporal context wrong, value slightly off)

COMMON ERRORS TO CATCH:
- Negations: "I'm NOT a micromanager" extracted as a preference for micromanagement
- Temporal: "I was a VP" vs "I am a VP" - check tense carefully
- Hypotheticals: "If I had more time I'd..." is NOT a current fact
- Exaggerations: Numbers or claims that don't match the transcript
- Invented details: Facts that sound plausible but aren't in the transcript

Return a JSON object with a "results" array. Each entry has:
- fact_key: string (matching the input)
- status: "valid" | "invalid" | "adjusted"
- adjusted_value: string | null (only if status is "adjusted")
- adjusted_confidence: number | null (suggested confidence 0-1, only if status is "adjusted")
- reason: string (brief explanation)`,
              },
              {
                role: 'user',
                content: `TRANSCRIPT:\n"${transcript}"\n\nEXTRACTED FACTS:\n${JSON.stringify(extractedFacts, null, 2)}`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 2000,
          }),
          provider: 'OpenAI',
          timeoutMs: 12000,
        });

        if (validationResponse.ok) {
          const validationData = await validationResponse.json();
          const validationContent = validationData.choices?.[0]?.message?.content;
          const validation = JSON.parse(validationContent);
          const results = validation.results || [];

          // Build a lookup map from validation results
          const validationMap = new Map<string, {
            status: string;
            adjusted_value?: string;
            adjusted_confidence?: number;
            reason?: string;
          }>();
          for (const r of results) {
            validationMap.set(r.fact_key, r);
          }

          // Filter out invalid facts, adjust corrected ones
          extractedFacts = extractedFacts
            .filter(fact => {
              const v = validationMap.get(fact.fact_key);
              if (v?.status === 'invalid') {
                log.info(`Validation rejected fact "${fact.fact_key}": ${v.reason}`);
                return false;
              }
              return true;
            })
            .map(fact => {
              const v = validationMap.get(fact.fact_key);
              if (v?.status === 'adjusted') {
                log.info(`Validation adjusted fact "${fact.fact_key}": ${v.reason}`);
                return {
                  ...fact,
                  fact_value: v.adjusted_value || fact.fact_value,
                  confidence_score: v.adjusted_confidence ?? Math.max(fact.confidence_score - 0.15, 0.3),
                };
              }
              return fact;
            });
        } else {
          log.warn('Validation pass failed, proceeding with unvalidated facts');
        }
      } catch (validationError) {
        log.warn('Validation pass error (non-blocking)', { error: validationError });
      }
    }

    // === CONTRADICTION DETECTION ===
    // Before storing, check if any new facts contradict existing facts.
    // Uses a lightweight LLM check for facts in the same category.
    if (userId && extractedFacts.length > 0) {
      try {
        const supabaseForContradictions = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        });
        const { data: existingForContradiction } = await supabaseForContradictions
          .from('user_memory')
          .select('id, fact_key, fact_value, fact_category')
          .eq('user_id', userId)
          .eq('is_current', true)
          .eq('verification_status', 'inferred');

        if (existingForContradiction && existingForContradiction.length > 0) {
          // Group existing facts by category for efficient comparison
          const existingByCategory = new Map<string, { fact_key: string; fact_value: string }[]>();
          for (const f of existingForContradiction) {
            const list = existingByCategory.get(f.fact_category) || [];
            list.push({ fact_key: f.fact_key, fact_value: f.fact_value });
            existingByCategory.set(f.fact_category, list);
          }

          // fact_key -> id lookup for the existing facts (to supersede the loser on recency-wins)
          const existingFactIdByKey = new Map<string, string>();
          for (const f of existingForContradiction) {
            if (!existingFactIdByKey.has(f.fact_key)) existingFactIdByKey.set(f.fact_key, f.id);
          }

          // Check each new fact against existing facts in the same category
          const potentialContradictions: { newFact: string; newValue: string; existingFact: string; existingValue: string }[] = [];
          for (const fact of extractedFacts) {
            const sameCategoryFacts = existingByCategory.get(fact.fact_category);
            if (!sameCategoryFacts || sameCategoryFacts.length === 0) continue;

            for (const existing of sameCategoryFacts) {
              // Skip if same key (will be handled by dedup)
              if (existing.fact_key === fact.fact_key) continue;

              // Quick heuristic: check if values directly contradict
              // (e.g., "delegates heavily" vs "micromanages")
              potentialContradictions.push({
                newFact: `${fact.fact_key}: ${fact.fact_value}`,
                newValue: fact.fact_value,
                existingFact: `${existing.fact_key}: ${existing.fact_value}`,
                existingValue: existing.fact_value,
              });
            }
          }

          // If there are potential contradictions, use LLM to verify
          if (potentialContradictions.length > 0 && potentialContradictions.length <= 20) {
            const contradictionResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  {
                    role: 'system',
                    content: `You detect contradictions between pairs of facts about a person. For each pair, determine if they contradict each other.

Return a JSON object with a "contradictions" array. Each entry has:
- new_fact: string (the new fact)
- existing_fact: string (the existing fact)
- is_contradiction: boolean
- explanation: string (brief reason, only if contradiction)

Only flag TRUE contradictions where both facts cannot be simultaneously true. Do NOT flag:
- Facts that are simply different topics
- Facts that complement each other
- Facts where one is more specific than the other`,
                  },
                  {
                    role: 'user',
                    content: `Check these fact pairs for contradictions:\n${JSON.stringify(potentialContradictions.slice(0, 20), null, 2)}`,
                  },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
                max_tokens: 1500,
              }),
              provider: 'OpenAI',
              timeoutMs: 12000,
            });

            if (contradictionResponse.ok) {
              const contradictionData = await contradictionResponse.json();
              const contradictionContent = contradictionData.choices?.[0]?.message?.content;
              const parsed = JSON.parse(contradictionContent);
              const contradictions = (parsed.contradictions || []).filter(
                (c: { is_contradiction: boolean }) => c.is_contradiction
              );

              if (contradictions.length > 0) {
                log.info(`Found ${contradictions.length} contradictions:`);
                // Resolve each contradiction by the locked policy (resolveContradiction):
                // mutable, low-stakes -> recency wins (supersede the old fact);
                // high-stakes / identity / business -> ask user (flag the new fact).
                const flagKeys = new Set<string>();
                const retireIds = new Set<string>();
                const events: Record<string, unknown>[] = [];
                for (const c of contradictions as { new_fact: string; existing_fact: string; explanation?: string }[]) {
                  const newKey = String(c.new_fact || '').split(':')[0].trim();
                  const existingKey = String(c.existing_fact || '').split(':')[0].trim();
                  const newFact = extractedFacts.find(f => f.fact_key === newKey);
                  if (!newFact) continue;
                  const existingId = existingFactIdByKey.get(existingKey) ?? null;
                  const res = resolveContradiction(newFact.fact_category, newFact.is_high_stakes);
                  log.info(`  "${c.new_fact}" vs "${c.existing_fact}" -> ${res.strategy}`);
                  if (res.flagNew) flagKeys.add(newKey);
                  if (res.retireExisting && existingId) retireIds.add(existingId);
                  events.push({
                    user_id: userId,
                    fact_id: null,
                    kind: 'contradiction_resolved',
                    strategy: res.strategy,
                    related_fact_id: existingId,
                    payload: { new_fact_key: newKey, existing_fact_key: existingKey, explanation: c.explanation ?? null },
                  });
                }
                // ask-user: flag the new facts high-stakes for verification
                if (flagKeys.size > 0) {
                  extractedFacts = extractedFacts.map(fact =>
                    flagKeys.has(fact.fact_key)
                      ? { ...fact, confidence_score: Math.max(fact.confidence_score - 0.2, 0.3), is_high_stakes: true }
                      : fact
                  );
                }
                // recency-wins: supersede the contradicted existing facts
                // (the close_validity_on_retire trigger closes their valid_until).
                if (retireIds.size > 0) {
                  await supabaseForContradictions
                    .from('user_memory')
                    .update({ is_current: false })
                    .in('id', Array.from(retireIds))
                    .eq('user_id', userId);
                }
                // record the resolutions (audit + Calibration Mirror feed)
                if (events.length > 0) {
                  await supabaseForContradictions.from('memory_events').insert(events);
                }
              }
            }
          }
        }
      } catch (contradictionError) {
        log.warn('Contradiction detection error (non-blocking)', { error: contradictionError });
      }
    }

    // === CORRECTION DAMPING ===
    // Hard pass: drop re-extractions of values the user corrected/rejected/
    // disputed; damp + flag any other value arriving on a corrected key so it
    // goes back through verification. Also prevents rejected facts (which
    // leave the dedup set via is_current=false) from silently re-inserting.
    if (extractedFacts.length > 0 && corrections.length > 0) {
      try {
        const damped = applyCorrectionDamping(extractedFacts, corrections);
        if (damped.dropped.length > 0) {
          log.info(`Correction guard dropped ${damped.dropped.length} fact(s)`, {
            dropped: damped.dropped.map(d => `${d.fact_key}: ${d.reason}`).join('; ') });
        }
        extractedFacts = damped.kept;
      } catch (dampErr) {
        log.warn('Correction damping error (non-blocking)', { error: dampErr });
      }
    }

    // === DETERMINISTIC GUARDRAILS ===
    // Final pass before writing anything. Drops facts that match reject
    // patterns in the training material (typography rules, meta-instructions,
    // transient context, third-party identity, self-addressed directives) and
    // downgrades un-mappable preferences. Runs on ALL extraction paths.
    let guardrailTrainingVersion = 0;
    if (extractedFacts.length > 0) {
      try {
        const guarded = await runGuardrails(
          extractedFacts as IncomingFact[],
          userId,
          session_id || null,
          supabase,
        );
        extractedFacts = guarded.kept as unknown as ExtractedFact[];
        guardrailTrainingVersion = guarded.training_version;
        if (guarded.rejected.length > 0) {
          log.info(`Guardrails rejected ${guarded.rejected.length} fact(s)`, {
            rejected: guarded.rejected.map(r => `${r.reason_id}: ${r.fact.fact_key}`).join('; ') });
        }
      } catch (guardErr) {
        log.warn('Guardrails error (non-blocking)', { error: guardErr });
      }
    }

    // Store facts in database
    if (userId && extractedFacts.length > 0) {
      // Defense-in-depth: every fact must carry the authenticated user's id.
      // Any row that fails this assertion is dropped before it reaches SQL.
      extractedFacts = extractedFacts.filter(f => {
        const claimed = (f as unknown as { user_id?: string }).user_id;
        if (claimed && claimed !== userId) {
          log.error(`User-scope assertion failed for fact ${f.fact_key}; dropping`);
          return false;
        }
        return true;
      });

      // Fetch existing facts (key + value + metadata for semantic comparison)
      const { data: existingFacts } = await supabase
        .from('user_memory')
        .select('id, fact_key, fact_value, fact_category, confidence_score, verification_status')
        .eq('user_id', userId)
        .eq('is_current', true);

      const existingList = existingFacts || [];
      const existingKeys = new Set(existingList.map(f => f.fact_key));

      // === SEMANTIC DEDUPLICATION ===
      // Use embeddings to detect duplicate or contradictory facts even when
      // fact_key strings differ (e.g. "role" vs "job_title" for the same info).
      const semanticDuplicates = new Map<string, { existingId: string; existingKey: string; similarity: number }>();

      // Only run embedding-based dedup for new facts (keys not already in DB)
      const newFacts = extractedFacts.filter(f => !existingKeys.has(f.fact_key));

      if (newFacts.length > 0 && existingList.length > 0) {
        try {
          // Build embedding texts: "category: label = value" for semantic comparison
          const existingTexts = existingList.map(f => `${f.fact_category}: ${f.fact_key} = ${f.fact_value}`);
          const newTexts = newFacts.map(f => `${f.fact_category}: ${f.fact_key} = ${f.fact_value}`);
          const allTexts = [...existingTexts, ...newTexts];

          const embeddingResponse = await fetchWithTimeout('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: allTexts,
            }),
            provider: 'OpenAI',
            timeoutMs: 12000,
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            const embeddings: number[][] = embeddingData.data.map((d: { embedding: number[] }) => d.embedding);
            const existingEmbeddings = embeddings.slice(0, existingTexts.length);
            const newEmbeddings = embeddings.slice(existingTexts.length);

            // Cosine similarity helper
            const cosineSim = (a: number[], b: number[]): number => {
              let dot = 0, normA = 0, normB = 0;
              for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
              }
              return dot / (Math.sqrt(normA) * Math.sqrt(normB));
            };

            // Check each new fact against all existing facts
            const SIMILARITY_THRESHOLD = 0.85;
            for (let ni = 0; ni < newFacts.length; ni++) {
              let bestSim = 0;
              let bestExistingIdx = -1;
              for (let ei = 0; ei < existingList.length; ei++) {
                // Only compare within same category
                if (existingList[ei].fact_category !== newFacts[ni].fact_category) continue;
                const sim = cosineSim(newEmbeddings[ni], existingEmbeddings[ei]);
                if (sim > bestSim) {
                  bestSim = sim;
                  bestExistingIdx = ei;
                }
              }
              if (bestSim >= SIMILARITY_THRESHOLD && bestExistingIdx >= 0) {
                const existing = existingList[bestExistingIdx];
                log.info(
                  `Semantic duplicate: "${newFacts[ni].fact_key}" ≈ "${existing.fact_key}" (similarity: ${bestSim.toFixed(3)})`
                );
                semanticDuplicates.set(newFacts[ni].fact_key, {
                  existingId: existing.id,
                  existingKey: existing.fact_key,
                  similarity: bestSim,
                });
              }
            }
          } else {
            log.warn('Embedding API failed, falling back to key-based dedup only');
          }
        } catch (embeddingError) {
          log.warn('Semantic dedup error (non-blocking)', { error: embeddingError });
        }
      }

      // Prepare facts for insertion: exclude exact key matches AND semantic duplicates.
      // Each fact's content is field-level encrypted (AES-256-GCM, shared crypto
      // module) into encrypted_content so AI-extracted facts match the same
      // encryption shape memory-crud writes. The plaintext fact_value/fact_context
      // shadow is still kept for display/search (plaintext-shadow follow-up to remove).
      const factsToInsert = await Promise.all(
        extractedFacts
          .filter(fact => !existingKeys.has(fact.fact_key) && !semanticDuplicates.has(fact.fact_key))
          .map(async fact => ({
            user_id: userId,
            fact_key: fact.fact_key,
            fact_category: fact.fact_category,
            fact_label: fact.fact_label,
            fact_value: fact.fact_value,
            fact_context: fact.fact_context,
            encrypted_content: await encryptFactContent(fact.fact_value, fact.fact_context),
            encryption_version: 1,
            confidence_score: fact.confidence_score,
            is_high_stakes: fact.is_high_stakes,
            // LLM-assigned poignancy (1-10), written once at creation; clamped with a
            // category/high-stakes fallback if the model omits it. (CTRL Brain delta 1.)
            importance: Math.max(1, Math.min(10, Math.round(
              Number.isFinite(fact.importance) ? fact.importance : (fact.is_high_stakes ? 7 : 5),
            ))),
            // ALL new extractions are inferred; only an explicit user action
            // (update-fact-verification) may promote to 'verified'.
            verification_status: 'inferred' as const,
            fact_subtype: (fact as unknown as { fact_subtype?: string | null }).fact_subtype ?? null,
            source_type: source_type || 'voice',
            source_session_id: session_id || null,
            training_material_version: guardrailTrainingVersion,
          }))
      );

      // Update existing facts if new extraction has higher confidence
      // (handles both exact key matches and semantic duplicates)
      const factsToUpdate = extractedFacts.filter(
        f => existingKeys.has(f.fact_key) || semanticDuplicates.has(f.fact_key)
      );

      for (const fact of factsToUpdate) {
        const semanticMatch = semanticDuplicates.get(fact.fact_key);
        const matchId = semanticMatch?.existingId;
        const matchKey = semanticMatch?.existingKey || fact.fact_key;

        const { data: existing } = await supabase
          .from('user_memory')
          .select('id, confidence_score, verification_status')
          .eq('user_id', userId)
          .eq(matchId ? 'id' : 'fact_key', matchId || matchKey)
          .eq('is_current', true)
          .single();

        // Only update if new confidence is higher and fact isn't verified
        if (existing &&
            existing.verification_status === 'inferred' &&
            fact.confidence_score > existing.confidence_score) {
          await supabase
            .from('user_memory')
            .update({
              fact_value: fact.fact_value,
              fact_context: fact.fact_context,
              // Re-encrypt the content shadow so encrypted_content tracks the value.
              encrypted_content: await encryptFactContent(fact.fact_value, fact.fact_context),
              encryption_version: 1,
              confidence_score: fact.confidence_score,
            })
            .eq('id', existing.id)
            .eq('user_id', userId); // defense-in-depth: scope update by caller
        }
      }

      // Final assert: every row about to be inserted MUST carry this user's id.
      const violating = factsToInsert.filter(row => row.user_id !== userId);
      if (violating.length > 0) {
        log.error(`Refusing to insert: ${violating.length} rows failed user_id assertion`);
      }
      const safeInsert = factsToInsert.filter(row => row.user_id === userId);

      // Insert new facts
      if (safeInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_memory')
          .insert(safeInsert);

        if (insertError) {
          log.error('Error inserting facts', { error: insertError });
        }
      }

      // Get pending verifications to return
      const { data: pendingVerifications } = await supabase
        .rpc('get_pending_verifications', { p_user_id: userId });

      // Trigger Edge profile re-synthesis in the background (non-blocking)
      try {
        const serviceClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        // Check if user has an edge profile before triggering synthesis
        const { data: edgeProfile } = await serviceClient
          .from('edge_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (edgeProfile) {
          // Fire and forget - don't block the response
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/synthesize-edge-profile`, {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization')!,
              'Content-Type': 'application/json',
            },
          }).catch(err => log.warn('Edge re-synthesis trigger failed (non-critical)', { error: err }));
        }
      } catch {
        // Non-critical - don't fail the extraction
      }

      // Trigger briefing-interest inference in the background so the user
      // doesn't get asked twice for the same context. Fire-and-forget; only
      // runs when at least one fact actually landed (otherwise nothing to
      // infer from new info).
      if (safeInsert.length > 0 || factsToUpdate.length > 0) {
        try {
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/infer-briefing-interests`, {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization')!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          }).catch(err => log.warn('Briefing inference trigger failed (non-critical)', { error: err }));
        } catch {
          // Non-critical
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          facts_extracted: extractedFacts.length,
          facts_stored: factsToInsert.length,
          pending_verifications: pendingVerifications || [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return facts without storing (unauthenticated)
    return new Response(
      JSON.stringify({
        success: true,
        facts: extractedFacts,
        pending_verifications: extractedFacts.filter(f => f.is_high_stakes),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Unexpected error', { error });
    return new Response(
      JSON.stringify({ error: 'Internal server error', facts: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
