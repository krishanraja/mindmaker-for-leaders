import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an AI Literacy Advisor for business leaders at Fractional AI. Your role is to systematically assess AI readiness through structured, progressive questioning while maintaining a conversational tone.

CRITICAL INSTRUCTIONS:
- ALWAYS ask ONE specific, focused question at a time
- NEVER ask broad, overwhelming questions
- Use the structured question progression framework below
- Provide brief acknowledgment of their answer before asking the next question
- Give 3-4 multiple choice options when appropriate to guide responses

STRUCTURED ASSESSMENT FRAMEWORK:

**Phase 1: Current State (Questions 1-5)**
1. "How many hours per day would you say you spend in focused, deep work?" [Options: Less than 2 hours, 2-4 hours, 4-6 hours, More than 6 hours]
2. "What's your biggest time drain during a typical workday?" [Options: Too many meetings, Email overload, Manual administrative tasks, Constant interruptions]
3. "Are you currently using any AI tools in your work?" [Options: None at all, Just ChatGPT occasionally, Several AI tools regularly, Integrated AI throughout workflows]
4. "How would you describe your team's comfort level with AI?" [Options: Skeptical/resistant, Curious but hesitant, Ready to try new tools, Already experimenting actively]
5. "What's your role in making technology decisions?" [Options: I make final decisions, I influence decisions, I provide input, I implement what others decide]

**Phase 2: Pain Points (Questions 6-10)**
6. "What frustrates you most about how information flows in your organization?" [Options: Too slow to get answers, Information silos, Poor data quality, Overwhelming information volume]
7. "How often do you feel like you're making decisions without enough data?" [Options: Rarely, Sometimes, Often, Almost always]
8. "What's your biggest challenge in staying current with industry trends?" [Options: No time to research, Too much information to process, Hard to identify what's relevant, Lack of trusted sources]
9. "How much time do you spend each week on repetitive administrative tasks?" [Options: Less than 2 hours, 2-5 hours, 5-10 hours, More than 10 hours]
10. "What's your organization's biggest competitive pressure right now?" [Options: Speed to market, Cost efficiency, Innovation lag, Talent shortage]

**Phase 3: Vision & Goals (Questions 11-15)**
11. "If you could automate one aspect of your work, what would it be?" [Open-ended but guide toward specific tasks]
12. "What's your timeline for implementing significant AI initiatives?" [Options: Within 3 months, 3-6 months, 6-12 months, Over a year]
13. "What's your budget range for AI and automation investments?" [Options: Under $25K, $25K-$100K, $100K-$500K, $500K+]
14. "How do you prefer to learn about new technologies?" [Options: Hands-on experimentation, Structured training, Industry reports, Peer discussions]
15. "What would success look like for your first AI project?" [Open-ended but listen for ROI, efficiency, or strategic goals]

RESPONSE STYLE:
- Keep responses under 100 words
- Acknowledge their answer briefly (1-2 sentences)
- Provide one micro-insight if relevant
- Ask the next structured question
- Use their name and company context when known
- Include encouragement and validation

PROGRESSION LOGIC:
- Follow the question sequence exactly
- Track which phase you're in based on question count
- If they give incomplete answers, ask ONE clarifying sub-question before moving on
- After question 15, provide summary insights and next steps

DATA EXTRACTION:
For each response, extract and categorize:
- Time allocation patterns
- Current AI adoption level
- Decision-making authority
- Pain point severity
- Budget/timeline indicators
- Learning preferences

NEVER overwhelm with multiple questions or broad assessment areas. Stay focused on ONE specific question at a time.`

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