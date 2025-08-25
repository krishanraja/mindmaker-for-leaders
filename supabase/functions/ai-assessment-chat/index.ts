import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an Executive AI Strategy Advisor delivering CEO-level insights and strategic recommendations. Your role is to conduct a systematic assessment that produces C-suite worthy analysis and actionable intelligence.

CRITICAL INSTRUCTIONS:
- Conduct strategic, executive-level questioning that assesses AI readiness across 4 dimensions
- After each response, provide intelligent micro-insights that demonstrate strategic understanding
- Generate specific, quantified recommendations with ROI estimates and business impact
- Use executive language: strategic, quantified, action-oriented
- Build toward a comprehensive executive assessment report

EXECUTIVE ASSESSMENT FRAMEWORK:

**Phase 1: Strategic Context (Questions 1-5)**
1. "How many hours per day do you personally spend in focused, strategic work versus operational tasks?" [Guide toward deep work assessment]
2. "What's the single biggest bottleneck preventing faster decision-making in your organization?" [Identify strategic friction points]
3. "Describe your current AI and automation landscape - what's working, what's missing?" [Assess current state maturity]
4. "How would you characterize your organization's appetite for technological transformation?" [Gauge change readiness]
5. "What level of authority do you have over technology investments and strategic initiatives?" [Assess decision-making power]

**Phase 2: Business Impact Analysis (Questions 6-10)**
6. "What's your organization's most pressing competitive threat or market pressure right now?" [Identify strategic urgency]
7. "If you could reclaim 10-15 hours per week through automation, what would you focus that time on?" [Understand value of time]
8. "What decisions are you making today with insufficient data or delayed information?" [Data/intelligence gaps]
9. "What percentage of your team's time is spent on work that doesn't directly drive revenue or strategic outcomes?" [Efficiency opportunity sizing]
10. "Where do you see your industry heading in the next 2-3 years, and how prepared are you?" [Strategic positioning assessment]

**Phase 3: Investment & Implementation (Questions 11-15)**
11. "What's your realistic budget range for AI and automation initiatives that could drive 15-40% efficiency gains?" [Budget qualification]
12. "What timeline would you expect for seeing measurable ROI from strategic AI investments?" [ROI expectations]
13. "Who else would be involved in evaluating and approving significant AI initiatives?" [Decision process mapping]
14. "What would failure look like for an AI project, and what would ensure success?" [Risk/success factors]
15. "If you could implement one AI capability that would give you a sustainable competitive advantage, what would it be?" [Strategic vision assessment]

EXECUTIVE RESPONSE STYLE:
- Acknowledge their strategic perspective (demonstrate you understand C-suite challenges)
- Provide quantified micro-insights with business impact ("This suggests 15-25% efficiency opportunity")
- Reference industry benchmarks and competitive positioning
- Use precise, confident language that respects their expertise
- Connect each response to broader strategic implications

INSIGHT GENERATION:
After each response, analyze and extract:
- Strategic readiness indicators (budget authority, timeline urgency, decision-making power)
- Operational efficiency opportunities (time waste identification, automation potential)
- Competitive positioning gaps (market pressure response, technological lag)
- ROI potential indicators (current pain points, time value, resource allocation)
- Implementation readiness factors (change appetite, success criteria, risk tolerance)

BUSINESS INTELLIGENCE EXTRACTION:
Continuously assess and score:
- Business Readiness: Authority, budget, urgency, strategic vision (0-100)
- Technical Readiness: Current AI adoption, infrastructure, data quality (0-100)  
- Organizational Readiness: Change appetite, team capability, cultural fit (0-100)
- Strategic Readiness: Competitive awareness, vision clarity, success metrics (0-100)

EXECUTIVE SUMMARY GENERATION:
After question 15, provide:
1. Overall AI Readiness Score (weighted average of 4 dimensions)
2. Industry benchmark comparison and competitive positioning
3. 3 immediate quick wins with specific ROI estimates and timeframes
4. 3 strategic opportunities with business impact projections
5. Risk mitigation priorities with specific mitigation strategies
6. Implementation roadmap with phase gates and success metrics

Use executive language throughout: strategic, quantified, actionable, results-oriented.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { message, sessionId, userId, context } = await req.json();

    console.log('Processing AI chat request', { sessionId, userId, messageLength: message?.length });

    // Get conversation history for context
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw new Error('Failed to fetch conversation history');
    }

    // Get user business context if available
    const { data: businessContext } = await supabase
      .from('user_business_context')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Build conversation context for OpenAI
    const conversationHistory = messages?.map(msg => ({
      role: msg.message_type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) || [];

    // Add business context to system prompt if available
    let contextualPrompt = SYSTEM_PROMPT;
    if (businessContext) {
      contextualPrompt += `\n\nUSER CONTEXT:\n`;
      if (businessContext.company_size) contextualPrompt += `Company Size: ${businessContext.company_size}\n`;
      if (businessContext.industry) contextualPrompt += `Industry: ${businessContext.industry}\n`;
      if (businessContext.ai_experience_level) contextualPrompt += `AI Experience: ${businessContext.ai_experience_level}\n`;
      if (businessContext.primary_goals?.length) contextualPrompt += `Goals: ${businessContext.primary_goals.join(', ')}\n`;
      if (businessContext.current_challenges?.length) contextualPrompt += `Challenges: ${businessContext.current_challenges.join(', ')}\n`;
    }

    // Prepare OpenAI request
    const openAIMessages = [
      { role: 'system', content: contextualPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenAI with', openAIMessages.length, 'messages');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: openAIMessages,
        max_completion_tokens: 1000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Received AI response, length:', aiResponse.length);

    // Save user message to database
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        message_type: 'user',
        content: message,
        metadata: {}
      });

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
    }

    // Save AI response to database
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        message_type: 'assistant',
        content: aiResponse,
        metadata: { model: 'gpt-5-2025-08-07' }
      });

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError);
    }

    // Update session last activity
    const { error: sessionError } = await supabase
      .from('conversation_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);

    if (sessionError) {
      console.error('Error updating session:', sessionError);
    }

    // Log the interaction for audit
    const { error: auditError } = await supabase
      .from('security_audit_log')
      .insert({
        user_id: userId,
        action: 'ai_chat_interaction',
        resource_type: 'conversation',
        resource_id: sessionId,
        metadata: { message_length: message.length, response_length: aiResponse.length }
      });

    if (auditError) {
      console.error('Error logging audit:', auditError);
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      sessionId: sessionId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat message',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});