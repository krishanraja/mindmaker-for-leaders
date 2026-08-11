/**
 * Shared email utility for Resend API
 * Consolidates email sending logic across all edge functions
 */

export interface EmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  // Tracking metadata
  emailType?: string; // 'confirmation', 'booking', 'diagnostic', 'reminder', 'notification'
  metadata?: {
    user_id?: string;
    session_id?: string;
    assessment_id?: string;
    [key: string]: unknown;
  };
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  metadata?: Record<string, unknown>;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Send email using Resend API
 * @param options Email configuration
 * @returns Email result with success status and message ID
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'RESEND_API_KEY not configured'
    };
  }

  try {
    const emailPayload: ResendEmailPayload = {
      from: options.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    };

    if (options.replyTo) {
      emailPayload.reply_to = options.replyTo;
    }

    if (options.cc) {
      emailPayload.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
    }

    if (options.bcc) {
      emailPayload.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
    }

    // Add metadata and tags for webhook tracking
    if (options.metadata || options.emailType) {
      emailPayload.metadata = {
        email_type: options.emailType || 'notification',
        ...(options.metadata || {}),
      };
    }

    if (options.tags) {
      emailPayload.tags = options.tags;
    } else if (options.emailType) {
      // Auto-add email_type tag if not provided
      emailPayload.tags = [
        { name: 'email_type', value: options.emailType },
      ];
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resend API error:', response.status, errorText);
      return {
        success: false,
        error: `Resend API error: ${response.status} - ${errorText}`
      };
    }

    const result = await response.json() as { id?: string };
    console.log('✅ Email sent successfully:', result.id);
    
    return {
      success: true,
      id: result.id
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Email sending error:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get default email sender based on context
 */
export function getDefaultSender(context: 'booking' | 'diagnostic' | 'confirmation' | 'reminder' | 'notification' = 'notification'): string {
  // All emails use verified themindmaker.ai domain
  const senders = {
    booking: 'MindMaker <no-reply@themindmaker.ai>',
    diagnostic: 'AI Leadership Growth Benchmark <no-reply@themindmaker.ai>',
    confirmation: 'Krish from MindMaker <no-reply@themindmaker.ai>',
    reminder: 'MindMaker <no-reply@themindmaker.ai>',
    notification: 'CTRL by Mindmaker <no-reply@themindmaker.ai>',
  };
  
  return senders[context];
}

/**
 * Get app URL from environment or request origin
 */
export function getAppUrl(origin?: string | null): string {
  const appUrl = Deno.env.get('APP_URL');
  const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL');
  const fallback = 'https://makeyourmindup.ai';
  
  return appUrl || publicSiteUrl || origin || fallback;
}

/**
 * Create a simple HTML email template with consistent styling
 */
export function createEmailTemplate(content: string, title?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'MindMaker'}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; padding: 24px; margin: 0;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        ${title ? `<h1 style="margin: 0 0 16px; color: #0f172a; font-size: 24px; font-weight: 600;">${title}</h1>` : ''}
        <div style="color: #475569; line-height: 1.6;">
          ${content}
        </div>
      </div>
      <div style="max-width: 560px; margin: 16px auto 0; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} MindMaker. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create a button link for emails
 */
export function createEmailButton(href: string, text: string, color: string = '#0f172a'): string {
  return `
    <a href="${href}" style="display: inline-block; background: ${color}; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 10px; font-weight: 600; margin: 16px 0;">
      ${text}
    </a>
  `;
}


