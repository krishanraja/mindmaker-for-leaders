# Common Issues

Recurring bugs, architectural pain points, and solutions.

**Last reconciled:** 2026-08-02 (previously 2026-06-21, AI-native reconciliation pass).

> **Status**: This is a developer bug/pain log dated 2026-04-26. Most pre-2026-04 issues are closed. The April 2026 six-week audit (Phase 7) covered revenue path, data path, UX, reliability, observability, and cleanup. New issues added at the bottom under "Audit Phase Aftermath." It predates the dark redesign (PR #186), the brain engine, the kit redesign, and the main-app polish, so for current known issues also read `CLAUDE.md` (the live architecture quick-reference, which lists the honest residual gaps). Checked 2026-08-02 against `CLAUDE.md`'s "honest residual gaps": the brain canvas Strengthen/Fix actions this file never actually listed as a gap went LIVE in PR #321 (2026-07-03) - nothing to correct there. Two items below ARE now stale and are called out inline where they occur: (1) the "V3 Implementation Checklist" (~line 227) still checklists "Using light mode color system" and "Test both light and dark mode" as things to verify - the app has run globally forced dark with no light fallback since PR #186 (2026-06-16, see `DECISIONS_LOG.md` Decision 44); read those two checklist lines as retired. (2) Issue 24's suggested fix (`supabase db push`) is no longer valid guidance - `CLAUDE.md` now documents that the local migration history is out of sync with remote and directs migrations through the Supabase Management API instead; see the correction inline at Issue 24.

---

## Architecture Issues

### Issue 1: Dual Architecture Conflict
**Symptom**: UI shows empty/stale data despite successful backend generation
**Root Cause**: V1 components (prop-based) coexisted with V2 (DB-based)
**Solution**: Deleted `AILeadershipBenchmark.tsx` and `PromptLibraryResults.tsx`
**Status**: ✅ Resolved (Jan 2025)

### Issue 2: Null/Undefined Cascade
**Symptom**: UI crashes or shows "undefined" text
**Root Cause**: Missing null guards in data aggregation
**Solution**: Implemented `pipelineGuards.ts` with safe defaults
**Status**: ✅ Resolved (Jan 2025)

### Issue 3: Edge Function Timeouts
**Symptom**: Assessment hangs on "Generating insights..."
**Root Cause**: Sequential edge function calls, LLM timeouts
**Solution**: Parallelised calls, added timeout protection
**Status**: ⚠️ Improved but monitor

---

## Data Flow Issues

### Issue 4: AssessmentId Not Passed
**Symptom**: Results page shows loading spinner forever
**Root Cause**: `assessmentId` not in URL or state after completion
**Solution**: Store in `AssessmentContext` and URL params
**Status**: ✅ Resolved

### Issue 5: Missing Dimension Scores
**Symptom**: Benchmark chart shows 0s or empty
**Root Cause**: `storeDimensionScores()` not called in orchestration
**Solution**: Added explicit call in `orchestrateAssessmentV2.ts`
**Status**: ✅ Resolved

---

## UI Issues

### Issue 6: Dark Mode Contrast
**Symptom**: Text unreadable in dark mode
**Root Cause**: Hardcoded colors (e.g., `text-white`, `bg-black`)
**Solution**: Use semantic tokens (`text-foreground`, `bg-background`)
**Prevention**: Enforce token usage in code reviews
**Status**: ✅ Resolved

### Issue 7: Mobile Layout Breaks
**Symptom**: Content overflows, buttons cut off
**Root Cause**: Fixed widths, missing responsive classes
**Solution**: Use `max-w-{size}`, `grid-cols-1 md:grid-cols-2`
**Prevention**: Test on mobile before shipping
**Status**: ⚠️ Ongoing monitoring

---

## LLM Issues

### Issue 8: Hallucinated Insights
**Symptom**: Insights reference data user didn't provide
**Root Cause**: LLM generating plausible but false content
**Solution**: Require evidence citations, validate against user answers
**Prevention**: Use `quality-guardrails.ts` validation
**Status**: ⚠️ Improved but not eliminated

### Issue 9: Generic Prompts
**Symptom**: Prompts don't feel personalised
**Root Cause**: Insufficient context in LLM call
**Solution**: Enhanced `context-builder.ts` with deep profile
**Status**: ✅ Improved

---

## Payment Issues

### Issue 10: Payment Success But No Upgrade
**Symptom**: User pays but still sees free tier
**Root Cause**: `has_full_diagnostic` flag not set
**Solution**: Update flag in `handlePaymentSuccess.ts`
**Status**: ✅ Resolved

---

## Dec 2024 Audit Fixes

### Issue 11: Broken Assessment History Viewing
**Symptom**: Users couldn't view past assessments from history
**Root Cause**: `viewingAssessmentId` state was set but never used
**Solution**: Implemented complete viewing flow in `Index.tsx` with data loading
**Status**: ✅ Resolved

### Issue 12: NotFound Using Wrong Design Tokens
**Symptom**: 404 page looked inconsistent with rest of app
**Root Cause**: Hardcoded gray/blue colors instead of design system
**Solution**: Complete redesign using Card, Button, and proper tokens
**Status**: ✅ Resolved

### Issue 13: Unlock Form Not Creating Accounts
**Symptom**: Users "unlocked" results but no account was created
**Root Cause**: `handleUnlock` had TODO - no Supabase auth implementation
**Solution**: Implemented proper signUp flow with existing account handling
**Status**: ✅ Resolved

### Issue 14: Eternal Loading on Missing Assessment ID
**Symptom**: Results page would show spinner forever if ID not found
**Root Cause**: No retry logic or error state for assessment ID restoration
**Solution**: Added 3-attempt retry with proper error messaging
**Status**: ✅ Resolved

### Issue 15: Checkbox Boolean/String Mismatch
**Symptom**: Consent checkbox validation sometimes failed incorrectly
**Root Cause**: Converting boolean to string in onChange handler
**Solution**: Direct boolean assignment with proper state update
**Status**: ✅ Resolved

---

## Dec 2024 Pipeline Anti-Fragile Update

### Pipeline Failure Points Enumeration

The following failure points have been identified and guarded in `pipelineGuards.ts`:

#### 1. CREATE-LEADER-ASSESSMENT FUNCTION
| Failure Point | Guard |
|--------------|-------|
| contactData.email null/undefined | `validateContactData()` with fallback |
| leader lookup fails (RLS/network) | Fallback to create new leader |
| assessment insert fails (schema mismatch) | Explicit column mapping |

#### 2. AI-GENERATE FUNCTION
| Failure Point | Guard |
|--------------|-------|
| OpenAI timeout/fail | Gemini fallback |
| Gemini timeout/fail | Static fallback content |
| JSON parse fails | Regex extraction + parse retry |
| Enum values invalid | `sanitizeEnums()` normalization |
| Response validation fails | `validateResponse()` checks |

#### 3. RUN-ASSESSMENT ORCHESTRATOR
| Failure Point | Guard |
|--------------|-------|
| assessmentId null after create | Throw with clear message |
| aiContent arrays empty | `safeInsert` handles gracefully |
| DB insert fails (FK constraint) | Logged + continues |
| generation_status update fails | Caught + logged |

#### 4. AGGREGATE-LEADER-RESULTS
| Failure Point | Guard |
|--------------|-------|
| assessmentId fetch fails (RLS) | Compute from dimension scores |
| dimension_scores empty | Safe defaults array |
| Type casting fails | Explicit type guards |
| leadershipComparison generation fails | Returns null safely |

#### 5. UI AGGREGATION
| Failure Point | Guard |
|--------------|-------|
| data null | `safeDefaults` object |
| arrays null/undefined | `ensureArray()` |
| nested properties missing | `safeAccess()` |
| component receives wrong shape | Type validation |

---

## V3 Visual Issues (Jan 2026)

### Issue 16: Mobile Viewport Overflow
**Symptom**: Pages required vertical scrolling on mobile devices
**Root Cause**: Fixed heights, large padding, non-responsive components
**Solution**: Use `--mobile-vh`, compact padding on mobile, responsive components
**Status**: ✅ Resolved

### Issue 17: Peer Comparison Matrix Squashed on Mobile
**Symptom**: Chart was 500px height with large margins, unusable on mobile
**Root Cause**: Fixed chart dimensions, large font sizes
**Solution**: Responsive height (280px mobile, 400px desktop), compact labels
**Status**: ✅ Resolved

### Issue 18: Video Background Blocked
**Symptom**: Video background not visible, solid black background instead
**Root Cause**: `bg-background` on App.tsx root creating opaque layer
**Solution**: Remove `bg-background` from App.tsx, control backgrounds at component level
**Prevention**: ESLint rule, build validation script
**Status**: ✅ Resolved

### Issue 19: Double Underlines
**Symptom**: Text with SVG decorative underline also had CSS underline
**Root Cause**: Using both `underline` class and SVG underline
**Solution**: Remove `underline` class when using SVG decorative underlines
**Status**: ✅ Resolved

### Issue 20: Buttons With Visible Borders
**Symptom**: Primary buttons had visible borders that didn't match design
**Root Cause**: Default button styles not overridden
**Solution**: Add `border-0` explicitly to all button variants
**Status**: ✅ Resolved

### Issue 21: Inconsistent Card Padding
**Symptom**: Cards had varying padding across the app
**Root Cause**: No standardised padding scale
**Solution**: Standardised to `p-8 sm:p-12 md:p-16 lg:p-20` for cards
**Status**: ✅ Resolved

### Issue 22: Animation Too Bouncy
**Symptom**: Animations felt playful rather than executive
**Root Cause**: Spring physics too bouncy
**Solution**: Adjusted to stiffness: 400, damping: 35, mass: 0.8
**Status**: ✅ Resolved

---

## V3 Implementation Checklist

Use this checklist when implementing new features to ensure V3 standards are met.

### Design System Setup
- [ ] ~~Using light mode color system~~ RETIRED 2026-08-02: the app has run globally forced dark, no light fallback, since PR #186 (2026-06-16). See `DECISIONS_LOG.md` Decision 44.
- [ ] All CSS variables defined (colors, shadows, spacing)
- [ ] Typography scale correct
- [ ] Border radius system followed
- [ ] Color contrast ratios tested

### Core Components
- [ ] Button component has all variants with `border-0`
- [ ] Card component uses correct padding and shadows
- [ ] All button states work (hover, focus, active, disabled)
- [ ] Card hover states work
- [ ] Accessibility verified (ARIA, keyboard navigation)

### Motion System
- [ ] Using `src/lib/motion.ts` variants
- [ ] Spring animations use correct physics
- [ ] Animation performance verified
- [ ] Tested on mobile devices

### Landing Page
- [ ] HeroSection uses no-scroll pattern
- [ ] Video background at 12% opacity
- [ ] Animated underline SVG works
- [ ] Trust indicators present
- [ ] Responsive breakpoints tested

### Dashboard
- [ ] MobileDashboard uses correct layout
- [ ] HeroStatusCard displays correctly
- [ ] PriorityCardStack works
- [ ] BottomNav fixed at bottom
- [ ] VoiceButton floating correctly
- [ ] Sheet component animates properly

### Content Pages
- [ ] Today page uses no-scroll pattern
- [ ] Voice page centered correctly
- [ ] Pulse page scrolls internally
- [ ] All pages fit mobile viewport

### Mobile Optimization
- [ ] Using `--mobile-vh` for heights
- [ ] Tested on real mobile devices
- [ ] No-scroll verified on all pages
- [ ] Safe areas handled (notch, home indicator)
- [ ] Touch targets minimum 44x44px

### Polish & Refinement
- [ ] Visual audit on desktop (1920x1080)
- [ ] Visual audit on mobile (375x812)
- [ ] All animations smooth
- [ ] Color consistency verified
- [ ] Typography hierarchy correct
- [ ] Loading states present
- [ ] Error states handled

---

## Memory Center Implementation (Jan 2026)

### Issue 23: Memory Table Not Found
**Symptom**: Memory Center shows "Failed to load memories" error
**Root Cause**: Database migrations not applied to Supabase instance
**Solution**: ~~Run migrations via Supabase CLI: `supabase db push`~~ CORRECTED 2026-08-02: do NOT use `supabase db push` (the local migration history is out of sync with remote per `CLAUDE.md`). Apply the missing table/columns via the Supabase Management API instead (see `CLAUDE.md` "Supabase Deployment" for the current SQL-via-API workflow).
**Status**: ⚠️ Requires migration deployment

### Issue 24: Memory Settings Not Loading
**Symptom**: Privacy tab shows error loading settings
**Root Cause**: `user_memory_settings` table doesn't exist
**Solution**: Apply `20260125000000_memory_privacy_settings.sql` migration
**Status**: ⚠️ Requires migration deployment

### Memory Center Patterns

**React Query Integration:**
- All memory operations use `useMemoryQueries.ts` hook
- Optimistic updates for create/update/delete
- Automatic cache invalidation on mutations
- Inline error states (no toasts)

**Offline Draft Storage:**
- Drafts stored in localStorage with key `mindmaker-memory-draft`
- 24-hour expiration on drafts
- User prompted to restore or discard on sheet open

**Encryption:**
- Memory content encrypted at rest using AES-256-GCM
- Encryption key stored in `MEMORY_ENCRYPTION_KEY` env var
- Decryption only happens in edge functions, never client-side
- Never log raw memory content in console

---

## Prevention Checklist

Before shipping:
- [ ] ~~Test both light and dark mode~~ RETIRED 2026-08-02: there is no light mode; the app is forced dark only (PR #186). Test dark mode only.
- [ ] Test mobile, tablet, desktop
- [ ] Verify null guards on all data paths
- [ ] Check `assessmentId` flows through pipeline
- [ ] Validate LLM outputs against schemas
- [ ] Test free vs paid gating
- [ ] Confirm edge functions complete successfully
- [ ] Verify all forms handle all input types correctly
- [ ] Check loading states and error states display
- [ ] Test assessment history viewing (if logged in)
- [ ] Verify no-scroll on mobile pages
- [ ] Check video background visibility
- [ ] Test all animations
- [ ] Verify touch targets are adequate
- [ ] Memory Center: verify RLS prevents cross-user access
- [ ] Memory Center: verify encryption key is set in production
- [ ] Missions: verify First Moves display after assessment
- [ ] Missions: verify check-in flow works end-to-end
- [ ] Progress: verify snapshot generation
- [ ] Progress: verify drift computation accuracy
- [ ] Weekly Check-in: verify AI response generation

---

## Missions System Issues (Feb 2026)

### Issue 25: First Moves Not Displaying
**Symptom**: Assessment completes but no First Moves shown on results page
**Root Cause**: `leader_first_moves` table migration not applied or `ai-generate` not returning first moves in response
**Solution**: Verify migration `20251119111446` is applied, check `ai-generate` response includes `first_moves` array
**Status**: ⚠️ Monitor on deployment

### Issue 26: Mission Status Not Updating
**Symptom**: Completing or skipping a mission doesn't update status
**Root Cause**: RLS policy may prevent update if `leader_id` doesn't match
**Solution**: Verify RLS policy allows status updates for own missions
**Status**: ⚠️ Requires verification

---

## Progress Tracking Issues (Feb 2026)

### Issue 27: Drift Score Calculation
**Symptom**: Drift score shows unexpected values or NaN
**Root Cause**: Missing baseline assessment data or null dimension scores
**Solution**: Add null guards in `compute-drift` function, ensure baseline exists before computing
**Status**: ⚠️ Monitor

### Issue 28: Batch Drift Timeout
**Symptom**: `batch-compute-drift` edge function times out
**Root Cause**: Processing too many leaders in a single invocation
**Solution**: Implement pagination/batching within the function, increase timeout
**Status**: ⚠️ Monitor

---

## AI Model Issues (Feb 2026)

### Issue 29: Vertex AI Authentication Failure
**Symptom**: AI generation falls back to OpenAI consistently
**Root Cause**: Google service account key expired or misconfigured
**Solution**: Verify `GOOGLE_SERVICE_ACCOUNT_KEY` in Supabase secrets, check OAuth token caching
**Status**: ⚠️ Monitor

### Issue 30: AI Cache Stale Content
**Symptom**: Users with similar profiles get identical insights
**Root Cause**: AI cache too aggressive, matching on insufficient key dimensions
**Solution**: Review cache key generation in `_shared/ai-cache.ts`, ensure profile-specific differentiation
**Status**: ⚠️ Monitor

---

## Daily Briefing Issues (Apr 2026 - v2 pipeline)

### Issue 31: Briefing Headlines Are Wildly Off-Topic for the User
**Symptom**: User opens today's briefing and sees 4-5 generic stories (geopolitics, executive tech conferences, generic fintech) instead of anything relevant to their actual industry or role.
**Root Cause (most common)**: User has not declared any `briefing_interests`, AND the inferred profile from voice sessions is shallow or generic (typical pattern: "grow the business", "hire a team"). The v2 lens has nothing specific to anchor against.
**Diagnosis**: Call `briefing-diagnose` from the browser console. Check `profile.interests` (empty?), `lens[0..2]` (generic goals?), and `last_briefing.segments[*].matched_profile_fact` (is it tied to anything specific?).
**Solution**:
  1. Get the user to Settings → Interests and declare 3-5 beats + 3-5 entities + 1-2 excludes (fastest fix).
  2. Or: have them accept the `SeedBeatsPrompt` on the dashboard (industry-aware one-tap seeds).
  3. Regenerate the briefing with force=true (`Refresh stories` on the card). The new lens will include the declared interests at weight 1.0.
**Status**: ✅ Resolved via Interests feature + SeedBeatsPrompt (PR #87, PR #88).

### Issue 32: User Can't Find the Interests UI After v2 Ship
**Symptom**: User was told "go to Interests" but doesn't see the tab.
**Root Cause**: Frontend cache (Vercel's CDN can serve stale index.html with old chunk hashes for 24h+ on some paths). OR the user merged main but didn't trigger a fresh Vercel production deploy. OR they have an old tab/window open.
**Solution**:
  1. Check `ctrl.themindmaker.ai` main bundle hash (`curl -s ... | grep 'assets/index-'`). Compare to latest Vercel deployment output. Mismatch = stale.
  2. Force a redeploy via Vercel API (`POST /v13/deployments` with `forceNew=1` and the main sha).
  3. User hard-refresh (Cmd+Shift+R) or incognito window.
  4. Confirm the `Interests` tab sits at position 3 in Settings (after Account + Work).
**Status**: ⚠️ Monitor - CDN cache behaviour is the recurring culprit.

### Issue 33: `generate-briefing` Throws "Lens Empty" on New Users
**Symptom**: v2 pipeline returns 500 with message "Lens empty - user has no profile data to personalise against".
**Root Cause**: The user has zero entries in `user_memory`, `user_missions`, `user_decisions`, and `briefing_interests`. `deterministicLens` produces an empty array and v2 refuses to proceed.
**Solution**: Either (a) send the user through onboarding to seed `user_memory`, (b) have them declare 3+ `briefing_interests`, or (c) temporarily flip them to v1 via `user_memory` row `{fact_key: 'briefing_v2_enabled', fact_value: 'false', is_current: true}`.
**Status**: ⚠️ Monitor - probably needs a graceful fallback to industry-only seeds when lens is empty.

### Issue 34: Killed Lens Item Reappears Next Day
**Symptom**: User taps Ban on a segment; next day the same topic is back.
**Root Cause (unlikely but possible)**: The kill wrote a signature that doesn't match what the new lens generates. Likely culprit: the v2 lens used an `interest_beat_*` id whose `lens_item_id` starts with `interest_` - the Ban button is hidden for those (users remove interests from Settings instead, intentionally). If still repeating: check `briefing_lens_feedback` for the signature, verify `is_active = true`, and that `applyFeedbackDeltas` is running (log line `briefing-lens: loadLensFeedbackDeltas`).
**Solution**: Check DB row. If present and active, debug `computeLensSignature` bucketing. If absent, the kill endpoint failed - check function logs.
**Status**: ⚠️ Monitor.

### Issue 35: Nightly Aggregator Not Promoting Obvious Negatives
**Symptom**: User has banned "geopolitics" repeatedly via thumbs-down, but no `not_useful_aggregate` row appears.
**Root Cause**: Aggregator requires >= 3 not_useful reactions on the SAME lens signature within 30 days. Different wording of "geopolitics" across briefings produces different signatures.
**Diagnosis**: `SELECT lens_item_text, COUNT(*) FROM briefing_feedback f JOIN briefings b ON b.id = f.briefing_id CROSS JOIN LATERAL jsonb_array_elements(b.context_snapshot->'lens') li WHERE f.reaction = 'not_useful' AND li->>'id' = f.lens_item_id GROUP BY 1 ORDER BY 2 DESC;`
**Solution**: User should Ban explicitly instead of thumbs-down (kills at -1.0 immediately, no threshold). Or: widen the signature bucketing in `_shared/lens-signature.ts` if the pattern shows up repeatedly.
**Status**: ⚠️ Monitor.

### Issue 36: Briefing Takes > 30 Seconds on Cold Start
**Symptom**: User triggers a briefing and it takes 30-45 seconds before the preliminary row even appears.
**Root Cause**: All five v2 LLM hops run sequentially on cache miss: lens (1.5s) → planner (1.5s) → providers (up to 12s) → embeddings + scoring (1s) → curation (3s) = ~19s + script gen (4-6s). If Perplexity is slow (often), total can exceed 30s.
**Solution**:
  1. Trigger provider warmup speculatively alongside the query planner (not yet implemented).
  2. Confirm Perplexity is responsive via direct test call.
  3. Ensure `lens` cache is warm: regeneration within 24h uses cached lens (saves ~1.5s).
  4. As a last resort, bump the generation timeout in `useBriefing.ts` (currently 60s).
**Status**: ⚠️ Monitor. The 12s Stage 3 wall-clock cap + `with-timeout` per call (Audit Week 4) protects against worst-case provider hangs.

---

## Audit Phase Aftermath (April 2026, post-Phase 7)

### Issue 37: Stripe Webhook Replays Now Visible in Logs
**Symptom**: Operator sees `stripe_events_processed` rows where the same event id is logged with `idempotent_skip: true`.
**Root Cause**: Normal Stripe behaviour. Webhooks are retried on any non-2xx response or network blip.
**Solution**: This is by design. The presence of these log lines confirms idempotency is working. No action required.
**Status**: ✅ Resolved by design (Audit Week 1).

### Issue 38: Account Deletion Slow on Active Users
**Symptom**: A user who has used CTRL for months and accumulated thousands of memory facts, hundreds of briefings, and dozens of decisions sees the deletion flow take 5-10 seconds.
**Root Cause**: We delete in a careful FK-aware order. Larger users have more rows.
**Solution**: Acceptable for an end-to-end-deletion guarantee. If perception becomes a problem, consider chunked async deletion with a confirmed-pending UI state. For now, the wait is honest.
**Status**: ⚠️ Monitor (Audit Week 2).

### Issue 39: External Provider Slowness Now Bounded but Still Visible
**Symptom**: A briefing finishes with fewer-than-expected segments because Perplexity or Tavily timed out.
**Root Cause**: `with-timeout` (Audit Week 4) caps each provider call. Slow providers are dropped rather than blocking the pipeline.
**Solution**: This is the desired tradeoff. If recall drops materially, retune timeouts in `_shared/with-timeout.ts` per provider. The structured logger (Audit Week 5) makes per-provider success rates queryable.
**Status**: ✅ Working as designed.

### Issue 40: Lint Warnings High but Stable
**Symptom**: ~1600 ESLint warnings persist in the codebase.
**Root Cause**: Accepted technical debt (Audit Week 6). CI runs ESLint on PR-diff only - new violations block, historical baseline does not.
**Solution**: Treat as a known number, not a problem. Ratcheting down can be a future quarterly initiative.
**Status**: 🟡 Accepted debt.

### Issue 41: Briefing Has No Audio Yet
**Symptom**: Briefing card shows segments and script, but the audio MP3 isn't ready immediately.
**Root Cause**: ElevenLabs synthesis is fire-and-forget from `generate-briefing` to `synthesize-briefing`. The frontend polls every 3s. Audio Failure UX (Audit Week 4) ensures segments + script render even if synthesis ultimately fails.
**Solution**: User can read segments immediately. Audio appears when synthesis completes. If `audio_url` stays null after a minute, check `synthesize-briefing` logs.
**Status**: ✅ Resolved (Audit Week 4 audio failure UX).