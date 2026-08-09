# CTRL Compliance Documentation Pack

Last reviewed: 2026-07-26 (updated 2026-07-26: drift-check pass against current code; see per-file changes)
Owner: Krish Raja, Mindmaker
Contact: privacy@themindmaker.ai
Product: CTRL (executive leadership-clarity tool)
Production URL: https://ctrl.themindmaker.ai
Supabase project ref: bkyuxvschuwngtcdhsyg

## Honest posture statement

CTRL has a working set of privacy and security controls in production (per-user Row-Level Security on all public tables, AES-256-GCM encryption of Memory facts at rest, TLS in transit, Stripe webhook signature verification, rate limiting on AI endpoints, git-versioned migrations, and data-subject-rights tooling for export, deletion, and consent). CTRL has NOT completed any third-party audit and holds NO SOC 2 report or ISO/IEC 27001 certificate; any such effort is at the planning stage only (see [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md)). Important controls remain in progress, including comprehensive data-access and AI-usage audit logging, enforced MFA, a stronger password policy with breached-password checks, centralized log aggregation, formal access reviews, a penetration test, signed DPAs with all subprocessors, and a scheduled job for the retention-disposal code path (`cleanup-expired-data` exists and is correct but is not currently invoked by any pg_cron schedule - see [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md)). PostHog product analytics went live in production on 2026-07-18 and has been added to the subprocessor register and privacy policy as of this reconciliation pass (2026-07-26); founder should confirm whether existing users need direct notice of that addition. In May-June 2026 a cross-tenant Row-Level Security misconfiguration (a `USING(true)` policy on several profile and chat tables) was found and remediated; it is documented as a worked example in [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md). The lesson-kit engine (`/kit`) **was RETIRED 2026-08-07 (PR #355)** - `/kit*` now redirects to `/try` and no new kit intake is being collected. It remains a processing surface in scope here for the historical data it already collected: `kit_builds.intake` (captured in full after PR #193; pre-#193 rows are truncated) still exists, is still governed, and is not swept by the `delete-account` function's explicit sweep list (though `kit_builds.user_id` carries an `ON DELETE CASCADE` FK, so the Postgres-level cascade covers it regardless), reflected across [PRIVACY_POLICY.md](./PRIVACY_POLICY.md), [ROPA.md](./ROPA.md), and [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md). This pack describes what is in place as in place and clearly labels what is planned or in progress. It is not a certification claim.

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
