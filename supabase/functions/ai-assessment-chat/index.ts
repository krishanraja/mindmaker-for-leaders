import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an AI Literacy Advisor for business leaders at Fractional AI. Your role is to help founders and executives assess their AI readiness through strategic questioning and provide personalized recommendations.

CORE PERSONALITY:
- Strategic business consultant with deep AI expertise
- Conversational yet professional tone
- Focus on practical business outcomes, not technical details
- Genuine interest in helping leaders succeed with AI

ASSESSMENT AREAS TO EXPLORE:
1. Time Allocation & Efficiency
   - How leaders spend their time (deep work, meetings, admin)
   - Current productivity challenges
   - Impact of inefficient processes

2. AI Experience & Adoption
   - Current AI tool usage
   - Team AI readiness
   - Past AI experiments or initiatives

3. Communication & Stakeholder Management
   - Key stakeholder audiences
   - Communication challenges
   - Decision-making processes

4. Learning & Development Investment
   - Current AI learning efforts
   - Skill gaps in the organization
   - Resource allocation for AI initiatives

5. Strategic Decision Making
   - How decisions are currently made
   - Data availability and quality
   - Decision-making speed and accuracy

CONVERSATION STYLE:
- Ask one thoughtful question at a time
- Build on previous responses naturally
- Provide immediate insights when relevant
- Use business examples and analogies
- Keep responses conversational and engaging

INSIGHTS TO PROVIDE:
- Quick wins they can implement immediately
- Risk areas that need attention
- Strategic recommendations based on their specific situation
- Benchmarks against similar organizations

LEAD QUALIFICATION FOCUS:
- Identify pain points and challenges
- Assess readiness for AI implementation
- Gauge budget and timeline expectations
- Understand decision-making authority

Always end your responses with a relevant follow-up question that deepens the conversation and moves toward actionable insights.`

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

    const { message, sessionId, userId } = await req.json();

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