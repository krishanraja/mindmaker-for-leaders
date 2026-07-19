# SOC 2 and ISO/IEC 27001:2022 Roadmap

Last reviewed: 2026-07-19
Owner: Krish Raja, Mindmaker - privacy@themindmaker.ai

A realistic path for CTRL to a SOC 2 report and, if pursued, an ISO/IEC 27001:2022 certificate. CTRL holds neither today. This roadmap is honest about what code can deliver and what requires human, vendor, or legal action.

## What each is (and is not)

- SOC 2 is an attestation report issued by a licensed CPA firm against the AICPA Trust Services Criteria (Security plus optionally Availability, Confidentiality, Processing Integrity, Privacy). It is not a "certification".
  - Type I: design of controls at a point in time.
  - Type II: operating effectiveness over a period (commonly 3-12 months).
- ISO/IEC 27001:2022 is a certifiable standard for an Information Security Management System (ISMS), issued by an accredited certification body after a Stage 1 and Stage 2 audit.

## What overlaps

A single control set serves both. Build once, map to both frameworks. Overlapping foundations:
- Risk assessment and treatment (ISO Clauses 6.1.2-6.1.3; SOC 2 CC3).
- Access control, cryptography, logging, change management, vendor management, incident response, BCP/DR (ISO Annex A; SOC 2 CC6-CC9, A1, C1).
- Documented policies, defined roles, evidence of operation over time.

ISO adds management-system clauses (4-10): scope, leadership, planning, internal audit, management review, continual improvement. SOC 2 adds the CPA examination and a written system description.

## Phases

### Phase 0 - Readiness (weeks 0-4)
- Define scope (CTRL production system and supporting Supabase/Vercel/subprocessors).
- Adopt a compliance automation platform (see Tooling).
- Confirm the policy set (this pack is the seed). Assign an owner.
- Run a gap assessment against the chosen criteria; reconcile with [CONTROL_MATRIX.md](./CONTROL_MATRIX.md).

### Phase 1 - Remediate the known gaps (weeks 2-12)
Close the [PLANNED]/[PARTIAL] items in [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md) and [CONTROL_MATRIX.md](./CONTROL_MATRIX.md):
- Widen data_audit_log and ai_usage_audit write coverage to every data-access and AI-call path (the tables, RLS, and a handful of writers already exist; in progress).
- Enforce MFA (users + admin consoles).
- Stronger password policy + HaveIBeenPwned check.
- Centralized log aggregation with retention and alerting.
- SAST/SCA/secret-scanning in CI; RLS regression tests.
- Documented key rotation, access-review cadence, backup retention + tested restore (RTO/RPO).

### Phase 2 - SOC 2 Type I (weeks 8-16)
- Controls designed and evidenced as of a point in time.
- Engage a CPA firm; provide the system description and evidence; obtain the Type I report.

### Phase 3 - SOC 2 Type II (observation period 3-12 months)
- Operate controls continuously; automation platform collects evidence.
- Obtain the Type II report covering the period.

### Phase 4 - ISO/IEC 27001:2022 (parallel or after, 3-6 months)
- Complete management-system clauses: scope, risk assessment + Statement of Applicability, objectives.
- Run an internal audit and a management review.
- Engage an accredited certification body for Stage 1 (documentation) then Stage 2 (implementation) audit; address findings; receive certificate (3-year cycle with surveillance audits).

## Recommended tooling

Compliance automation: Vanta, Drata, or Secureframe. Any one connects to Supabase/Vercel/Stripe/GitHub/cloud, maps controls to SOC 2 and ISO, automates evidence collection and access reviews, and provides policy templates and auditor access. Choose one in Phase 0; it materially reduces manual effort for a small team.

## Required policies (target ~20)

This pack already provides several. Full set typically includes: Information Security Policy (have); Acceptable Use (in ISP); Access Control; Cryptography/Encryption; Data Classification (in ISP); Data Retention (have); Privacy (have); Incident Response (have); Business Continuity / DR; Backup; Change Management / SDLC; Vendor/Third-Party Management (SUBPROCESSORS seeds it); Risk Assessment; Vulnerability Management; Logging and Monitoring; Asset Management; Password Policy; Secure Development; HR Security (onboarding/offboarding, background checks); Physical Security (largely vendor-inherited).

## Controls to implement (beyond policies)

See [CONTROL_MATRIX.md](./CONTROL_MATRIX.md) for the authoritative status. Priorities: audit logging (data_audit_log, ai_usage_audit), MFA, log aggregation + alerting, CI security scanning, RLS regression tests, formal access reviews, tested DR restore, signed DPAs/SCCs, penetration test.

## Evidence collection

- Automated via the chosen platform (config snapshots, access lists, scan results).
- Manual artifacts to keep: incident records, DSAR log, access-review records, management-review minutes (ISO), policy acknowledgements, vendor DPAs and vendor SOC 2 reports, pen-test report, change/migration history (git already provides this).

## Internal audit and management review (ISO)

- Internal audit: independent check that the ISMS conforms and is effective; for a tiny team this is often done by an external consultant.
- Management review: documented leadership review of ISMS performance, risks, incidents, and improvements, on a defined cadence.

## External engagement

- SOC 2: a licensed CPA firm performs the examination and issues the report.
- ISO 27001: an accredited certification body performs Stage 1 and Stage 2 audits and issues the certificate.
- Optional readiness consultant to accelerate.

## Indicative timeline and cost

- SOC 2 Type I: roughly 3-4 months to first report.
- SOC 2 Type II: add the 3-12 month observation period.
- ISO 27001: roughly 4-9 months including internal audit and certification audits.
- Indicative cost band (small SaaS): compliance platform low-to-mid five figures per year; CPA SOC 2 audit mid five figures; ISO certification-body audit mid five figures; optional consultant additional. Treat as rough planning figures, not quotes.

## Items that REQUIRE human / vendor / legal action (cannot be done in code)

- Selecting and contracting a compliance automation platform.
- Engaging and paying a CPA firm (SOC 2) and an accredited certification body (ISO).
- Engaging a third party for the penetration test.
- Negotiating and signing DPAs and SCCs with every subprocessor in [SUBPROCESSORS.md](./SUBPROCESSORS.md); obtaining their security evidence; confirming AI-training exclusions in writing.
- Establishing HR security practices (background checks, onboarding/offboarding, policy acknowledgements) as the team grows.
- Conducting management reviews and (for ISO) an independent internal audit.
- Legal review of the privacy policy, customer DPA template, and breach-notification approach.
- Appointing/declaring a security owner and, if required, an EU/UK representative or DPO.
