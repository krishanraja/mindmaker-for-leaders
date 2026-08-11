# Record of Processing Activities (ROPA)

GDPR Article 30 record for CTRL.
Last reviewed: 2026-08-10 (canonical domain and retired lesson-kit status reconciled)
Controller: Mindmaker (Krish Raja) - privacy@themindmaker.ai
System: CTRL, https://makeyourmindup.ai; Supabase project ref bkyuxvschuwngtcdhsyg

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
- Recipients/subprocessors: Supabase (US); Apollo (company enrichment, US); Jina (company-site content reads, US); AI providers for processing (see Activity E).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: life of account; deleted on account deletion.
- Security: RLS owner-scoping (profiles/unified_profiles/user_business_context now owner-scoped or service-role-only after May-June 2026 remediation), TLS.

### C. Memory Web
- Personal data: structured facts extracted from user-voiced thoughts.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)); consent for optional memory features.
- Recipients/subprocessors: Supabase (US); OpenAI (embeddings and selected extraction/generation, US); other configured AI providers where the called function requires them (US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: configurable via user_memory_settings.retention_days, enforced by the cleanup-expired-data function; NOTE (2026-07-26): no pg_cron schedule currently invokes this function (unlike send-daily-briefing, memory-sweep, and other scheduled jobs), so today it runs only when manually/externally triggered, not on an automatic cadence. See [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md). Deleted on account deletion.
- Security: AES-256-GCM encryption at rest, RLS owner-scoping, TLS.

### D. Conversations / chat
- Personal data: chat messages to and from CTRL assistants.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: Supabase (US); function-specific LLM providers. Current briefing conversation uses OpenAI; other conversation and legacy paths may use OpenAI or Google Gemini (US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: life of account / configurable; deleted on account deletion. chat_messages now owner-scoped after remediation.
- Security: RLS owner-scoping, TLS.

### E. AI generation, transcription, and embeddings
- Personal data: business context, chat, assessment answers, briefing topics, voice transcripts.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: OpenAI (current onboarding result, Blind Spot, briefing generation and conversation, claim adjudication, primary transcription, and embeddings, US); Google Cloud Vertex AI / Gemini (selected generation and transcription fallback, US); Anthropic (decision reasoning and cross-examination when configured, US); xAI (cross-examination when configured, US); ElevenLabs (briefing TTS, US).
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
- Recipients/subprocessors: Supabase (US); Perplexity, Tavily, Brave Search, Jina, NewsAPI.org, Exa (web search/enrichment of briefing and news-feed topics, US); Artificial Analysis (model-benchmark validation of claims referenced in briefing content, US); ElevenLabs (briefing audio, US); Resend (email delivery, US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: preferences for life of account; generated briefings per retention policy.
- Security: RLS owner-scoping, TLS.

### H. Voice capture and transcription
- Personal data: voice audio, resulting transcripts.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: OpenAI (primary transcription, US); Google Gemini (transcription fallback when needed, US); Supabase (transcript storage, US).
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
- Retention: short operational windows; centralized aggregation in progress. Data-access audit log (data_audit_log) in progress.
- Security: structured JSON logging with CI gate against console.log; no secrets in logs.

### L. Operations sync and product analytics
- Personal data: minimized account and usage data; ops sync to Google Sheets; page-view and in-app usage events sent to PostHog.
- Data subjects: registered users.
- Lawful basis: legitimate interests (Art 6(1)(f)).
- Recipients/subprocessors: Google Sheets (ops sync, US); PostHog (product analytics, US); Supabase (US).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: minimized; reviewed periodically.
- Security: scoped service credentials, TLS.

### M. Legacy lesson-kit records (retired collection surface)
- Personal data: org/team/workflow intake previously provided when the lesson-kit flow was active (boxes, pathway, profile, time sinks, guardrails, grind, what work involves, team maturity), stored in `kit_builds.intake`. The product no longer collects new lesson-kit intake through `/kit`.
- Data subjects: registered users.
- Lawful basis: contract (Art 6(1)(b)).
- Recipients/subprocessors: Supabase (US); LLM providers for composition (see Activity E).
- Transfers: EU/UK to US, SCCs (in progress).
- Retention: life of account; deleted on account deletion. Confirmed (2026-07-26): `kit_builds.user_id` has an `ON DELETE CASCADE` foreign key to `auth.users`, so the Postgres-level cascade covers it even though the `delete-account` function's explicit sweep list does not name the table separately.
- Security: RLS owner-scoping, TLS. Note: kit_builds.intake rows created before PR #193 are truncated (the back half of the cascade was not captured); fully captured thereafter.

## General security measures (all activities)

Per-user Row-Level Security or service-only controls on reviewed public data boundaries; AES-256-GCM encryption of Memory facts at rest; TLS in transit; provider-managed disk encryption; Stripe webhook verification and idempotency; rate limiting on AI endpoints; git-versioned migrations; structured logging with CI gate. Full detail and planned controls (audit logging, MFA, access reviews, pen test) in [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md) and [CONTROL_MATRIX.md](./CONTROL_MATRIX.md).
