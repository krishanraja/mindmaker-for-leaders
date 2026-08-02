# Record of Processing Activities (ROPA)

GDPR Article 30 record for CTRL.
Last reviewed: 2026-08-02 (updated 2026-08-02)
Controller: Mindmaker (Krish Raja) - privacy@themindmaker.ai
System: CTRL, https://ctrl.themindmaker.ai; Supabase project ref bkyuxvschuwngtcdhsyg

This record describes the processing activities Mindmaker carries out as controller. Recipient/subprocessor detail is maintained in [SUBPROCESSORS.md](./SUBPROCESSORS.md); retention detail in [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md); security measures in [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md).

## Controller details

| Field | Value |
|-------|-------|
| Controller | Mindmaker (Krish Raja) |
| Contact | privacy@themindmaker.ai |
| DPO | None appointed; enquiries via contact above |
| Categories of data subjects | Registered users (executives/leaders); prospective users completing assessments; billing contacts |

## Processing activities

### A. Account and authentication
- Personal data: email, name, display name, auth identifiers; Google OAuth identity where used.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: Supabase (auth, database, US); Google (OAuth, US); Vercel (frontend delivery, US).
- Transfers: EU/UK to US, SCCs (in progress, see [SUBPROCESSORS.md](./SUBPROCESSORS.md)).
- Retention: life of account; deleted on account deletion (delete-account, cascading).
- Security: RLS owner-scoping, TLS, provider disk encryption, password auth via Supabase.

### B. Business / work context profiling
- Personal data: company, industry, company size, website, primary challenges, AI-readiness score, communication style, thinking style.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: Supabase (US); Apollo (company enrichment, US); AI providers for processing (see Activity E).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: life of account; deleted on account deletion.
- Security: RLS owner-scoping (profiles/unified_profiles/user_business_context now owner-scoped or service-role-only after May-June 2026 remediation), TLS.

### C. Memory Web
- Personal data: structured facts extracted from user-voiced thoughts.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)); consent for optional memory features.
- Recipients/subprocessors: Supabase (US); OpenAI (embeddings text-embedding-3-small, US); Anthropic (memory-edge derivation, US); primary LLM providers (US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: configurable via user_memory_settings.retention_days; enforced by cleanup-expired-data (pg_cron). Deleted on account deletion.
- Security: RLS owner-scoping, TLS, provider disk encryption. Each fact also gets a parallel AES-256-GCM encrypted copy (defense-in-depth); the plaintext `fact_value`/`fact_context` columns remain the copy actually read for display, search, and AI context, so this is not full at-rest encryption of Memory content today (see [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md) Section 5).

### D. Conversations / chat
- Personal data: chat messages to and from CTRL assistants.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: Supabase (US); LLM providers (Google Vertex/Gemini primary, OpenAI fallback, US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: life of account / configurable; deleted on account deletion. chat_messages now owner-scoped after remediation.
- Security: RLS owner-scoping, TLS.

### E. AI generation, transcription, and embeddings
- Personal data: business context, chat, assessment answers, briefing topics, voice transcripts.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: Google Cloud Vertex AI / Gemini 2.0 Flash (primary LLM, US); OpenAI (fallback LLM, Whisper transcription, embeddings, US); Anthropic (decision-engine and bet-suggestion LLM calls, US); Artificial Analysis (evidence retriever validating model-capability/cost claims in decisions and briefings, US); ElevenLabs (briefing TTS, US).
- Transfers: EU/UK to US, SCCs/DPAs (in progress).
- Retention: providers process transiently per their API terms; we retain outputs (responses, transcripts) per their data category.
- Security: TLS, rate limiting on AI endpoints, structured edge-function logging (AI-usage audit log ai_usage_audit in progress).

### F. AI-literacy diagnostics / assessments
- Personal data: assessment and diagnostic responses, derived scores.
- Data subjects: registered users; prospective users completing assessments.
- Lawful basis: contract (Art 6(1)(b)); consent where assessment is voluntary/pre-account.
- Recipients/subprocessors: Supabase (US); LLM providers (US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: life of account; deleted on account deletion.
- Security: RLS owner-scoping, TLS.

### G. Daily briefings, enrichment, and notifications
- Personal data: briefing preferences, interests, account identity; briefing topics/queries sent to search providers.
- Data subjects: registered users.
- Lawful basis: contract (transactional delivery); consent (optional channels and marketing).
- Recipients/subprocessors: Supabase (US); Perplexity, Tavily, Brave Search, NewsAPI.org, Exa, Jina (web search/enrichment of briefing and Home-feed topics, US); Artificial Analysis (model-benchmark enrichment of news cards, US); ElevenLabs (briefing audio, US); Resend (email delivery, US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: preferences for life of account; generated briefings per retention policy.
- Security: RLS owner-scoping, TLS.

### H. Voice capture and transcription
- Personal data: voice audio, resulting transcripts.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: OpenAI Whisper (transcription, US); Supabase (transcript storage, US).
- Transfers: EU/UK to US, SCCs/DPA (in progress).
- Retention: transcripts retained per data category; raw audio handled per provider, not maintained as a long-term store.
- Security: TLS, RLS owner-scoping.

### I. Billing and subscriptions
- Personal data: Stripe customer ID, subscription status, account identity. Card data tokenized by Stripe, never stored by us.
- Data subjects: paying users.
- Lawful basis: contract (Art 6(1)(b)); legal obligation for financial records (Art 6(1)(c)).
- Recipients/subprocessors: Stripe (payments, US).
- Transfers: EU/UK to US, Stripe SCCs/DPA (confirm/sign, in progress).
- Retention: subscription metadata for life of account; financial records retained as required by tax/accounting law.
- Security: Stripe webhook signature verification + idempotency table, TLS.

### J. Consent and preference management
- Personal data: sharing-consent flags, marketing-consent flag, notification preferences, consent audit entries.
- Data subjects: registered users.
- Lawful basis: legal obligation to evidence consent (Art 7(1)); legitimate interests in record-keeping.
- Recipients/subprocessors: Supabase (US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: consent_audit retained for the life of account plus a limited evidentiary period.
- Security: RLS owner-scoping, TLS.

### K. Security, abuse prevention, and operational logging
- Personal data: account identifiers, request metadata in logs.
- Data subjects: all users.
- Lawful basis: legitimate interests (Art 6(1)(f)).
- Recipients/subprocessors: Supabase / Vercel (log surfaces, US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: short operational windows; centralized aggregation in progress. `data_audit_log` exists and is written on account deletion and scheduled retention cleanup; broader data-access logging across other write/read paths is in progress.
- Security: a shared structured-logging helper (`_shared/logger.ts`) exists and is used by many edge functions, but adoption is partial (`console.log`/`console.error`/`console.warn` calls remain in roughly 90 of ~200 edge-function files as of this review) and CI does not currently gate on `console.log` usage (the CI standards check enforces the no-em-dash rule and required CSS tokens only); no secrets in logs by convention, not by an automated check.

### L. Operations sync and product analytics
This activity covers two distinct recipients that were previously conflated under one description; both are real and both are named here explicitly.
- Personal data: (i) minimized account/usage data synced for internal operations; (ii) pageview, pageleave, and custom usage-event data captured client-side for product analytics. PostHog is configured `person_profiles: identified_only`, so analytics events for a signed-in user can be tied to that identified account, not only aggregated anonymously.
- Data subjects: registered users (and, for analytics pageviews, visitors generally).
- Lawful basis: legitimate interests (Art 6(1)(f)).
- Recipients/subprocessors: Google Sheets (internal ops sync, US); PostHog (product analytics, US, added 2026-07-18); Supabase (US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: minimized; reviewed periodically; PostHog's own data retention is per PostHog's standard terms (to confirm).
- Security: scoped service credentials, TLS.

### M. Lesson-kit builds
- Personal data: org/team/workflow intake provided when forking a lesson kit (boxes, pathway, profile, time sinks, guardrails, grind, what work involves, team maturity), stored in `kit_builds.intake`.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: Supabase (US); LLM providers for composition (see Activity E).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: life of account in principle, but confirmed as a gap: `kit_builds` is NOT included in the `delete-account` edge function's explicit table list or its comprehensive sweep list as of this review, so kit build/intake rows currently survive account deletion. Tracked as an open remediation item, see [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md).
- Security: RLS owner-scoping, TLS. Note: kit_builds.intake rows created before PR #193 are truncated (the back half of the cascade was not captured); fully captured thereafter.

## General security measures (all activities)

Per-user Row-Level Security on all public tables (~108); an AES-256-GCM encrypted copy of each Memory fact as defense-in-depth (the plaintext copy remains readable for display/search, see Activity C); TLS in transit; provider-managed disk encryption; Stripe webhook verification and idempotency; rate limiting on AI endpoints; git-versioned migrations; partial structured logging (no CI enforcement yet). data_audit_log and ai_usage_audit tables exist and are written for a narrow set of flows (account deletion, retention cleanup, and select skill-export/kit paths); comprehensive data-access and AI-usage logging across all paths is still in progress. Full detail and planned controls (audit logging, MFA, access reviews, pen test) in [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md) and [CONTROL_MATRIX.md](./CONTROL_MATRIX.md).
