# CTRL Compliance Documentation Pack

Last reviewed: 2026-08-02 (updated 2026-08-02)
Owner: Krish Raja, Mindmaker
Contact: privacy@themindmaker.ai
Product: CTRL (executive leadership-clarity tool)
Production URL: https://ctrl.themindmaker.ai
Supabase project ref: bkyuxvschuwngtcdhsyg

## Honest posture statement

CTRL has a working set of privacy and security controls in production (per-user Row-Level Security on all public tables, TLS in transit, Stripe webhook signature verification, rate limiting on AI endpoints, git-versioned migrations, and functioning data-subject-rights tooling for export, deletion, retention, and consent). Memory facts additionally get an AES-256-GCM encrypted copy as defense-in-depth, but this is not yet full at-rest encryption: a plaintext `fact_value`/`fact_context` shadow is also stored and is what the application actually reads for display, search, and AI context (see [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md) Section 5). CTRL has NOT completed any third-party audit and holds NO SOC 2 report or ISO/IEC 27001 certificate; any such effort is at the planning stage only (see [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md)). Important controls remain in progress, including comprehensive data-access and AI-usage audit logging (the underlying `data_audit_log`/`ai_usage_audit` tables exist and are live, but only for a narrow set of flows), a CI gate against `console.log` in edge functions (none exists today; the CI standards check enforces only the no-em-dash rule and required CSS tokens), enforced MFA, a stronger password policy with breached-password checks, centralized log aggregation, formal access reviews, a penetration test, and signed DPAs with all subprocessors. In May-June 2026 a cross-tenant Row-Level Security misconfiguration (a `USING(true)` policy on several profile and chat tables) was found and remediated; it is documented as a worked example in [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md). The lesson-kit engine (`/kit`) is a processing surface in scope here: it stores the org/team/workflow intake users provide when forking a kit in `kit_builds.intake`, captured in full after PR #193 (pre-#193 rows are truncated), and is reflected across [PRIVACY_POLICY.md](./PRIVACY_POLICY.md), [ROPA.md](./ROPA.md), and [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md); as of this review, `kit_builds` is confirmed NOT covered by the `delete-account` cascade, a real (not just flagged) erasure gap. As of this review (2026-08-02) the [SUBPROCESSORS.md](./SUBPROCESSORS.md) register was corrected to add five subprocessors that were live in production but missing from the register: Anthropic, NewsAPI.org, Exa, Artificial Analysis, and PostHog (product analytics, added to the app 2026-07-18); [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)'s cookies/analytics section was corrected from hedged future-tense ("to the extent any non-essential analytics are used") to accurate present-tense disclosure of PostHog as a third-party analytics vendor. This pack describes what is in place as in place and clearly labels what is planned or in progress. It is not a certification claim.

## Index

| File | Purpose |
|------|---------|
| [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) | Public-facing privacy notice (GDPR Art 13/14 + CCPA/CPRA). |
| [ROPA.md](./ROPA.md) | GDPR Art 30 Record of Processing Activities. |
| [SUBPROCESSORS.md](./SUBPROCESSORS.md) | Subprocessor register and change-notification process. |
| [DSAR_RUNBOOK.md](./DSAR_RUNBOOK.md) | Operational runbook for data-subject rights requests. |
| [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md) | Retention periods and deletion mechanisms per data category. |
| [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md) | Breach detection, response, and notification duties. |
| [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md) | ISMS-lite policy backbone for an auditor. |
| [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md) | Realistic path to SOC 2 and ISO/IEC 27001:2022. |
| [CONTROL_MATRIX.md](./CONTROL_MATRIX.md) | SOC 2 / ISO control mapping with honest status and evidence pointers. |

## Scope note

CTRL does NOT process protected health information (PHI). HIPAA is out of scope and no HIPAA documentation is included in this pack.

## Maintenance

These documents are living. When subprocessors, data categories, retention rules, or security controls change, update the affected file(s) and bump the "Last reviewed" date. Material changes to processing must also be reflected in [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) and communicated per [SUBPROCESSORS.md](./SUBPROCESSORS.md).
