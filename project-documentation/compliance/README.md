# CTRL Compliance Documentation Pack

Last reviewed: 2026-07-12 (updated 2026-07-12; verified against code: subprocessor list, retention/deletion mechanisms)
Owner: Krish Raja, Mindmaker
Contact: privacy@themindmaker.ai
Product: CTRL (executive leadership-clarity tool)
Production URL: https://ctrl.themindmaker.ai
Supabase project ref: bkyuxvschuwngtcdhsyg

## Honest posture statement

CTRL has a working set of privacy and security controls in production (per-user Row-Level Security on all public tables, AES-256-GCM encryption of Memory facts at rest, TLS in transit, Stripe webhook signature verification, rate limiting on AI endpoints, git-versioned migrations, and functioning data-subject-rights tooling for export, deletion, retention, and consent). CTRL has NOT completed any third-party audit and holds NO SOC 2 report or ISO/IEC 27001 certificate; any such effort is at the planning stage only (see [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md)). Important controls remain in progress, including comprehensive data-access and AI-usage audit logging, enforced MFA, a stronger password policy with breached-password checks, centralized log aggregation, formal access reviews, a penetration test, and signed DPAs with all subprocessors. In May-June 2026 a cross-tenant Row-Level Security misconfiguration (a `USING(true)` policy on several profile and chat tables) was found and remediated; it is documented as a worked example in [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md). The lesson-kit engine (`/kit`) is a processing surface in scope here: it stores the org/team/workflow intake users provide when forking a kit in `kit_builds.intake`, captured in full after PR #193 (pre-#193 rows are truncated), and is reflected across [PRIVACY_POLICY.md](./PRIVACY_POLICY.md), [ROPA.md](./ROPA.md), and [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md). This pack describes what is in place as in place and clearly labels what is planned or in progress. It is not a certification claim.

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
