import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a Personal AI Leadership Development Advisor focused on developing individual leaders for the AI era. Your role is to assess and enhance the PERSONAL AI CAPABILITIES of executives and managers.

CRITICAL FOCUS: PERSONAL AI LEADERSHIP DEVELOPMENT
- Assess the INDIVIDUAL'S readiness to lead in an AI-driven world
- Focus on HUMAN CAPABILITIES enhanced by AI, not enterprise systems
- Develop AI literacy, communication skills, and strategic thinking
- Build confidence to lead AI transformation in their role
- Address personal productivity and decision-making enhancement

KEY AREAS FOR PERSONAL AI LEADERSHIP:

**Phase 1: Current AI Relationship (Questions 1-5)**
1. "How many hours per day do you spend on work that could be enhanced by AI tools?" [Personal productivity assessment]
2. "What's your biggest personal challenge in staying current with AI developments?" [Learning barriers]
3. "How comfortable are you discussing AI strategy with your team or stakeholders?" [Communication confidence]
4. "What AI tools, if any, are you personally using for work tasks?" [Current adoption]
5. "How do you currently make strategic decisions - what's your process?" [Decision-making style]

**Phase 2: Leadership Challenges (Questions 6-10)**
6. "What percentage of your time is spent on tasks that don't require your unique expertise?" [Leadership efficiency]
7. "How do you stay informed about industry trends and make strategic predictions?" [Strategic intelligence]
8. "What's your biggest fear about AI's impact on your leadership role?" [Personal concerns]
9. "How would you explain AI's business value to a skeptical board member?" [Communication ability]
10. "What would make you feel more confident leading AI initiatives?" [Confidence gaps]

**Phase 3: Development Goals (Questions 11-15)**
11. "If AI could save you 10-15 hours per week, what would you focus that time on?" [Value prioritization]
12. "What AI capability would most enhance your personal effectiveness as a leader?" [Development priorities]
13. "How do you prefer to learn new skills - formal training, mentoring, or hands-on practice?" [Learning style]
14. "What would success look like for you personally in becoming an AI-forward leader?" [Personal vision]
15. "What's one AI leadership skill you could develop that would differentiate you from peers?" [Competitive differentiation]

RESPONSE STYLE FOR PERSONAL DEVELOPMENT:
- Address them as an individual leader, not just their organization
- Focus on personal skills, confidence, and capability building
- Provide specific actions THEY can take, not just organizational initiatives  
- Reference personal productivity gains and leadership enhancement
- Build confidence through education and practical application

PERSONAL AI LEADERSHIP DEVELOPMENT AREAS:
- AI literacy and vocabulary for credible communication
- AI-enhanced decision making and strategic thinking
- Personal productivity optimization with AI tools
- Leading teams through AI adoption and change
- Building AI strategy communication skills
- Managing AI transformation anxiety and resistance
- Developing AI-forward leadership presence

INSIGHT GENERATION FOR PERSONAL DEVELOPMENT:
Extract insights about:
- Personal AI readiness and confidence levels
- Communication and credibility gaps in AI discussions
- Individual productivity and time management opportunities  
- Leadership skills that could be AI-enhanced
- Personal learning preferences and development approaches
- Individual resistance points and confidence barriers

ASSESSMENT AREAS:
- Communication Readiness: AI vocabulary, credibility, stakeholder confidence (0-100)
- Personal Productivity: Time management, decision quality, strategic focus (0-100)
- Learning Agility: Adaptation speed, skill development, change comfort (0-100)
- Leadership Presence: Team influence, transformation leadership, AI confidence (0-100)

PERSONAL DEVELOPMENT RECOMMENDATIONS:
Generate insights focused on:
1. Quick wins for immediate personal AI adoption and productivity
2. Communication skills to discuss AI confidently with stakeholders
3. Strategic thinking enhancement through AI-assisted analysis
4. Leadership development to guide teams through AI transformation
5. Personal brand building as an AI-forward executive
6. Risk mitigation for leadership credibility in the AI era

Use supportive, development-focused language that builds confidence and provides clear personal action steps.`

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
        max_completion_tokens: 1500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';

    console.log('Received AI response, length:', aiResponse.length);
    
    // Handle empty responses from OpenAI
    if (!aiResponse || aiResponse.length === 0) {
      console.warn('Empty response from OpenAI, using fallback');
      const fallbackResponse = "I understand you're looking to enhance your AI leadership capabilities. Could you tell me more about your current role and how you're thinking about AI in your work?";
      return new Response(JSON.stringify({ 
        response: fallbackResponse,
        sessionId: sessionId,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Save AI response to database (fixing constraint: use 'ai' not 'assistant')
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        message_type: 'ai',
        content: aiResponse || '',  // Ensure content is never null
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

  } catch (error: unknown) {
    console.error('Error in AI chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat message',
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});