# Agentic UI Testing Guide

Status: Reference
Owner: Mindmaker
Last verified: 2026-08-20

The Playwright and agent-driven UI testing approach. Complements the gates in [`docs/agent-instructions/verification.md`](./agent-instructions/verification.md), which owns what must be run.

A comprehensive guide for autonomous AI agents to perform thorough end-to-end testing of web applications. This document provides structured test scenarios, expected behaviors, and debugging procedures.

---

## Pre-Test Setup

### 1. Environment Verification

```bash
# Verify the application is deployed and accessible
curl -I https://your-app-url.com

# Check for any build errors
npm run build

# Verify edge functions are deployed (Supabase)
npx supabase functions list
```

### 2. Test Account Credentials

| Purpose | Email | Password |
|---------|-------|----------|
| Primary Test | `test@example.com` | `testpassword` |
| Admin Test | `admin@example.com` | `adminpassword` |

### 3. Browser Configuration

- **Viewport**: Mobile-first (375x812 for iPhone X simulation)
- **User Agent**: Mobile Chrome
- **Permissions**: Allow clipboard, deny microphone (for text-input testing)

---

## Test Scenarios

### A. Authentication Flow

#### A1. Landing Page Load
```yaml
URL: /
Expected:
  - Page loads within 3 seconds
  - Hero section visible
  - CTA buttons clickable
  - No console errors (except expected analytics)
```

#### A2. Sign In (Email/Password)
```yaml
URL: /auth
Steps:
  1. Navigate to auth page
  2. Enter email in email field
  3. Enter password in password field
  4. Click "Sign In" button
  5. Wait for redirect to /dashboard
Expected:
  - Form validates inputs
  - Loading state shows during auth
  - Successful redirect to authenticated area
  - User session persisted
```

#### A3. Sign Out
```yaml
Steps:
  1. Navigate to settings/profile
  2. Click "Sign Out" button
  3. Confirm sign out if prompted
Expected:
  - Session cleared
  - Redirect to landing or auth page
  - Protected routes no longer accessible
```

---

### B. Core Feature Testing

#### B1. Voice-First Components (Text Input Fallback)

**Critical**: All voice-first UIs must have text input alternatives for automated testing.

```yaml
Components to Test:
  - Onboarding flow (GuidedFirstExperience)
  - Dashboard voice capture
  - Decision Advisor
  - Stream of Consciousness

Test Pattern:
  1. Navigate to component
  2. Look for "Type instead" or keyboard icon
  3. Click to switch to text input mode
  4. Enter test data
  5. Submit and verify processing
  6. Check for successful data storage
```

#### B2. Data Extraction & Storage

```yaml
Test Input: |
  I'm a CEO at a tech startup called TestCo with 50 employees. 
  I'm known for strategic thinking and building high-performing teams.
  My background is in software engineering.

Expected Extractions:
  - Role: CEO
  - Company: TestCo
  - Company Size: 50 employees
  - Strength: Strategic thinking, building teams
  - Background: Software engineering

Verification:
  1. Navigate to Memory page
  2. Verify extracted facts appear
  3. Check fact categories are correct
  4. Verify source attribution shows "voice" or "text"
```

#### B3. Export Functionality

```yaml
URL: /context or /export
Steps:
  1. Select export format (ChatGPT, Claude, etc.)
  2. Select use case (General, Meeting Prep, etc.)
  3. Wait for generation
  4. Click "Copy to Clipboard"
  5. Verify clipboard contains expected content

Expected:
  - Token count displayed
  - Preview shows formatted context
  - Copy button becomes enabled after generation
  - Download option available
```

---

### C. Navigation & Routing

#### C1. Bottom Navigation (Mobile)
```yaml
Tabs:
  - Home → /dashboard
  - Think → /think
  - Memory → /memory
  - Export → /context

Test:
  1. Click each tab
  2. Verify correct page loads
  3. Verify active state indicator
  4. Test back navigation
```

#### C2. Protected Routes
```yaml
Test (Unauthenticated):
  - /dashboard → Redirect to /auth
  - /memory → Redirect to /auth
  - /settings → Redirect to /auth

Test (Authenticated):
  - All routes accessible
  - No redirect loops
```

---

### D. Error Handling

#### D1. Network Errors
```yaml
Simulate:
  - Offline mode
  - Slow connection (3G throttling)
  - API timeout

Expected:
  - Graceful error messages
  - Retry buttons where appropriate
  - No infinite loading states
  - Offline indicator visible
```

#### D2. Form Validation
```yaml
Test Cases:
  - Empty required fields
  - Invalid email format
  - Password too short
  - Special characters in text fields

Expected:
  - Clear error messages
  - Field-level validation
  - Form not submitted with errors
```

---

## Debugging Procedures

### Console Error Categories

| Error Type | Severity | Action |
|------------|----------|--------|
| `net::ERR_CONNECTION_REFUSED` to localhost | Low | Expected in production (dev analytics) |
| `CORS policy` errors | Critical | Check edge function deployment |
| `404` on API calls | Critical | Check database tables/RLS policies |
| `401 Unauthorized` | Medium | Check auth token/session |
| `500 Internal Server Error` | Critical | Check edge function logs |

### Common Issues & Fixes

#### Issue: "Failed to load memories" / 404 on user_memory
```yaml
Cause: Database table doesn't exist
Fix:
  1. Run migration in Supabase SQL Editor
  2. Verify table exists: SELECT * FROM user_memory LIMIT 1;
  3. Check RLS policies are enabled
```

#### Issue: Extraction hangs at "Processing..."
```yaml
Cause: Edge function timeout or API key issue
Fix:
  1. Check Supabase function logs
  2. Verify OPENAI_API_KEY is set in function secrets
  3. Check for rate limiting
```

#### Issue: Voice input not working
```yaml
Cause: Browser permissions or API unavailable
Fix:
  1. Use text input alternative (always available)
  2. Check getUserMedia permissions
  3. Verify HTTPS (required for microphone)
```

---

## Test Data Templates

### User Profile Data
```json
{
  "identity": "I'm a VP of Engineering at a 200-person fintech startup",
  "work": "Currently leading a team of 15 engineers building a payment platform",
  "goals": "Ship v2.0 by Q2, reduce technical debt by 30%, hire 3 senior engineers",
  "blockers": "Too many meetings, unclear product requirements, legacy code"
}
```

### Decision Scenario
```json
{
  "decision": "Should we build AI features in-house or use a third-party API?",
  "context": "We have 3 engineers with ML experience, $50k budget, 6-month timeline",
  "constraints": "Must integrate with existing Python backend"
}
```

---

## Automated Test Checklist

```markdown
## Pre-Flight
- [ ] Application accessible at production URL
- [ ] Test account credentials working
- [ ] No critical console errors on page load
- [ ] Database migrations applied

## Authentication
- [ ] Landing page loads correctly
- [ ] Sign in with email/password works
- [ ] Session persists across page refreshes
- [ ] Sign out clears session

## Core Features
- [ ] Text input alternative available on all voice components
- [ ] Data extraction completes successfully
- [ ] Extracted facts appear in Memory page
- [ ] Export generates valid context
- [ ] Copy to clipboard works

## Navigation
- [ ] All nav tabs route correctly
- [ ] Protected routes redirect when unauthenticated
- [ ] No 404 errors on valid routes

## Mobile UX
- [ ] No horizontal scroll
- [ ] Touch targets are adequate size (44x44px minimum)
- [ ] Bottom nav is always visible
- [ ] Forms are usable on mobile keyboard

## Performance
- [ ] Initial page load < 3 seconds
- [ ] Navigation between pages < 1 second
- [ ] No memory leaks during extended use
```

---

## Reporting Format

### Test Run Summary
```markdown
# UI Test Report - [DATE]

## Environment
- URL: https://app.example.com
- Browser: Chrome 120 (Mobile Emulation)
- Test Account: test@example.com

## Results
| Category | Pass | Fail | Skip |
|----------|------|------|------|
| Auth     | 4    | 0    | 0    |
| Features | 8    | 1    | 0    |
| Nav      | 5    | 0    | 0    |
| Mobile   | 6    | 0    | 0    |

## Critical Issues
1. [ISSUE]: Description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshot/console output

## Recommendations
- [Priority] Action item
```

---

## Appendix: Browser Automation Commands

### Playwright/Puppeteer Patterns

```javascript
// Wait for element with retry
await page.waitForSelector('[data-testid="submit-btn"]', { timeout: 10000 });

// Fill form field
await page.fill('input[name="email"]', 'test@example.com');

// Click with navigation wait
await Promise.all([
  page.waitForNavigation(),
  page.click('button[type="submit"]')
]);

// Check console for errors
page.on('console', msg => {
  if (msg.type() === 'error') console.log('Console error:', msg.text());
});

// Screenshot on failure
try {
  await testStep();
} catch (e) {
  await page.screenshot({ path: `error-${Date.now()}.png` });
  throw e;
}
```

### LocalStorage Manipulation

```javascript
// Bypass onboarding for testing
await page.evaluate(() => {
  localStorage.setItem('app_onboarded', 'true');
});

// Clear all app state
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-14 | Initial release |

---

*This document should be updated whenever new features are added or test procedures change.*
