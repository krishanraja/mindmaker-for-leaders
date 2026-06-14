# CTRL Information Security Policy (ISMS-lite)

Last reviewed: 2026-06-14
Owner: Krish Raja, Mindmaker - privacy@themindmaker.ai
Applies to: CTRL (https://ctrl.themindmaker.ai), its codebase, Supabase backend (ref bkyuxvschuwngtcdhsyg), Vercel frontend, and all personnel/contractors with access.

This is the policy backbone an auditor will ask for. It states what is in place today and clearly flags what is planned/in-progress. Status tags: [IN PLACE], [PARTIAL], [PLANNED]. Control mapping is in [CONTROL_MATRIX.md](./CONTROL_MATRIX.md).

## 1. Purpose and scope

Protect the confidentiality, integrity, and availability of CTRL and the personal data it processes, and provide a documented basis for SOC 2 / ISO 27001 work (see [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md)).

## 2. Roles and responsibilities

- Krish Raja (Mindmaker) is accountable for information security and is the Incident Lead (see [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md)).
- Anyone with access to CTRL systems must follow this policy.
- Formal, periodic access reviews and a named security-owner sign-off cadence are [PLANNED].

## 3. Data classification

| Class | Examples | Handling |
|-------|----------|----------|
| Sensitive personal | Memory Web facts, chat, assessments, transcripts | Encrypt (Memory facts AES-256-GCM at rest), owner-scoped RLS, never in logs |
| Personal | Account identity, business context, briefing preferences, billing metadata | Owner-scoped RLS, TLS, minimized in logs |
| Secrets | API keys, service-role keys, signing secrets | Stored as platform secrets (Supabase/Vercel env), never committed, never logged |
| Public | Marketing pages | No special handling |

No payment card numbers are stored (tokenized by Stripe). [IN PLACE]

## 4. Access control

- Authentication via Supabase Auth. [IN PLACE]
- Per-user Row-Level Security on all 108 public tables; profiles, unified_profiles, profile_insights, user_business_context, and chat_messages are owner-scoped or service-role-only after the May-June 2026 remediation. [IN PLACE]
- Service-role keys used only server-side in edge functions, never exposed to the client. [IN PLACE]
- Least privilege for service credentials and operator access. [PARTIAL]
- Enforced multi-factor authentication for users and for administrative access to Supabase/Vercel/Stripe. [PLANNED]
- Stronger password policy plus HaveIBeenPwned breached-password check. [PLANNED]
- Formal, periodic access reviews and joiner/mover/leaver process. [PLANNED]

## 5. Cryptography

- Memory Web facts encrypted at rest with AES-256-GCM. [IN PLACE]
- TLS for all data in transit. [IN PLACE]
- Supabase-managed disk encryption for the database. [IN PLACE]
- Documented key-management and rotation procedure (encryption keys, API keys, service-role keys). [PARTIAL] Ad hoc rotation occurs; a documented schedule is [PLANNED].

## 6. Change management and secure SDLC

- All database schema changes are git-versioned migrations. [IN PLACE]
- Structured JSON logging in edge functions with a CI gate that fails builds containing console.log. [IN PLACE]
- Code review before merge; RLS and access changes reviewed with extra care. [PARTIAL]
- Automated security scanning in CI (SAST, dependency/SCA, secret scanning). [PLANNED]
- RLS regression tests so a permissive policy (for example a `USING(true)`) cannot ship again. [PLANNED]

## 7. Logging and monitoring

- Structured JSON edge-function logging; secrets excluded from logs. [IN PLACE]
- Stripe webhook signature verification plus idempotency table. [IN PLACE]
- Rate limiting on AI endpoints. [IN PLACE]
- Comprehensive data-access audit log (data_audit_log) and AI-usage audit log (ai_usage_audit). [PLANNED / IN PROGRESS]
- Centralized log aggregation with retention and alerting. [PLANNED]

## 8. Vulnerability management

- Issues found via code review, dependency updates, and provider advisories are remediated and shipped as migrations/deploys. [PARTIAL]
- Defined SLAs per severity, recurring dependency scanning, and a third-party penetration test. [PLANNED]

## 9. Vendor / subprocessor management

- Subprocessors are inventoried in [SUBPROCESSORS.md](./SUBPROCESSORS.md). [IN PLACE]
- Signed DPAs and SCCs with all subprocessors, plus collection of vendor security evidence (their SOC 2 reports), confirmation that AI providers exclude API content from training. [PLANNED]

## 10. Business continuity, backup, and disaster recovery

- Supabase managed, encrypted database backups. [IN PLACE]
- Frontend is statically hosted/CDN-delivered on Vercel with platform redundancy. [IN PLACE]
- Documented backup retention window, a tested restore runbook, and defined RTO/RPO. [PLANNED]

## 11. Incident response

- Documented in [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md), including GDPR Art 33/34 and CCPA duties and a worked RLS example. [IN PLACE]
- Tabletop exercise of the plan. [PLANNED]

## 12. Acceptable use

- Access CTRL systems only for legitimate operational purposes.
- Do not export, copy, or share user personal data outside approved tooling.
- Keep credentials in approved secret stores; never hardcode or paste secrets into code, logs, chat, or tickets.
- Use up-to-date, secured devices for administrative access.
- Report suspected security issues immediately to the Incident Lead.

## 13. Policy maintenance

Review at least annually and after any material incident or architecture change. Update status tags as controls move from [PLANNED] to [IN PLACE], and keep [CONTROL_MATRIX.md](./CONTROL_MATRIX.md) in sync.
