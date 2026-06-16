# CTRL Email Templates for Supabase

These branded email templates are designed to match the CTRL dark theme and branding.

## Setup Instructions

### 1. Go to Supabase Dashboard
Navigate to: **Authentication** → **Email Templates**

### 2. Update Each Template

For each email type, copy the corresponding HTML content:

| Email Type | File | Subject Line |
|------------|------|--------------|
| Confirm sign up | `confirm-signup.html` | Confirm your email - CTRL |
| Invite user | `invite-user.html` | You're invited to CTRL |
| Magic link | `magic-link.html` | Sign in to CTRL |
| Change email address | `change-email.html` | Confirm your new email - CTRL |
| Reset password | `reset-password.html` | Reset your password - CTRL |

### 3. Template Variables

These templates use Supabase's built-in template variables:

- `{{ .SiteURL }}` - Your site URL (used for logo)
- `{{ .ConfirmationURL }}` - The action URL
- `{{ .Email }}` - User's email address
- `{{ .CurrentYear }}` - Current year for copyright

### 4. Logo Setup

Ensure `mindmaker-full-logo.png` is accessible at your site URL:
- Production: `https://yourdomain.com/mindmaker-full-logo.png`
- The logo should be in your `/public` folder

## Design Specifications

### Colors
- **Background**: `#121212` (dark)
- **Card Background**: `#1a1a1a`
- **Border**: `#2e2e2e`
- **Primary Text**: `#f2f2f2`
- **Secondary Text**: `#999999`
- **Muted Text**: `#666666`
- **Accent (CTA)**: `#00D9B6` (CTRL emerald)

### Typography
- Font: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
- Heading: 24px, 600 weight
- Body: 15px
- Small: 12-13px

### Button Style
- Background: `#00D9B6`
- Text: `#121212` (dark on green)
- Border radius: 10px
- Padding: 14px 32px

## Testing

1. Use Supabase's "Send test email" feature
2. Check rendering in:
   - Gmail (web & mobile)
   - Outlook (web & desktop)
   - Apple Mail
   - Yahoo Mail

## Troubleshooting

### Logo not showing
- Ensure the logo URL is publicly accessible
- Check that `{{ .SiteURL }}` is configured correctly in Supabase

### Styling issues in Outlook
- The templates use inline styles for maximum compatibility
- MSO conditionals are included for Outlook-specific fixes
