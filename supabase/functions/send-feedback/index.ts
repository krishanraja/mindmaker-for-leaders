/**
 * Send Feedback Edge Function
 * 
 * Stores feedback in Supabase and sends email notification to krish@themindmaker.ai
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail, createEmailTemplate } from '../_shared/email-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackRequest {
  feedback: string;
  userEmail?: string;
  pageContext?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role for inserting feedback
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header if present
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let userEmailFromAuth: string | null = null;

    if (authHeader) {
      const userClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
        userEmailFromAuth = user.email || null;
      }
    }

    // Parse request body
    const { feedback, userEmail, pageContext }: FeedbackRequest = await req.json();

    if (!feedback || feedback.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Feedback text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finalEmail = userEmail || userEmailFromAuth;
    const userAgent = req.headers.get('User-Agent') || null;

    // 1. Store feedback in Supabase
    const { data: feedbackData, error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        user_email: finalEmail,
        feedback_text: feedback.trim(),
        page_context: pageContext || 'homepage',
        user_agent: userAgent,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to store feedback:', insertError);
      // Continue to send email even if storage fails
    } else {
      console.log('✅ Feedback stored:', feedbackData.id);
    }

    // 2. Send email notification to Krish
    const emailContent = `
      <p><strong>New feedback received!</strong></p>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #00D9B6;">
        <p style="margin: 0; white-space: pre-wrap;">${feedback.trim()}</p>
      </div>
      
      <p style="color: #64748b; font-size: 14px;">
        <strong>From:</strong> ${finalEmail || 'Anonymous user'}<br/>
        <strong>Page:</strong> ${pageContext || 'Homepage'}<br/>
        <strong>User ID:</strong> ${userId || 'Not logged in'}<br/>
        <strong>Time:</strong> ${new Date().toISOString()}
      </p>
    `;

    const emailResult = await sendEmail({
      from: 'MindMaker Feedback <no-reply@themindmaker.ai>',
      to: 'krish@themindmaker.ai',
      subject: `[Feedback] ${finalEmail || 'Anonymous'} - ${pageContext || 'Homepage'}`,
      html: createEmailTemplate(emailContent, 'New User Feedback'),
      emailType: 'feedback',
      metadata: {
        user_id: userId || undefined,
        feedback_id: feedbackData?.id,
      },
    });

    if (!emailResult.success) {
      console.error('❌ Failed to send email notification:', emailResult.error);
    } else {
      console.log('✅ Email notification sent:', emailResult.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thank you for your feedback!',
        feedbackId: feedbackData?.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error processing feedback:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process feedback' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
