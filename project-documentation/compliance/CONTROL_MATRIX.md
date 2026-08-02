# CTRL Control Matrix (SOC 2 + ISO 27001:2022)

Last reviewed: 2026-08-02 (updated 2026-08-02)
Owner: Krish Raja, Mindmaker - privacy@themindmaker.ai

Maps the SOC 2 Trust Services Criteria (Common Criteria CC1-CC9 plus Availability, Confidentiality, Privacy) and key ISO/IEC 27001:2022 Annex A controls to CTRL's honest current status, the specific implementation or gap, and where evidence lives. This is a gap analysis, not a claim of conformance.

Status legend: IN PLACE / PARTIAL / PLANNED.

Cross-references: [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md), [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md), [SUBPROCESSORS.md](./SUBPROCESSORS.md), [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md), [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md).

## SOC 2 Common Criteria

| Ref | Criterion | ISO 27001:2022 overlap | Status | Implementation or gap | Evidence |
|-----|-----------|------------------------|--------|-----------------------|----------|
| CC1 | Control environment, integrity, governance | Clauses 5.1-5.3; A.5.1-5.4 | PARTIAL | Single accountable owner (Krish Raja); ISP exists. Formal org structure, HR security, policy acknowledgements PLANNED | INFORMATION_SECURITY_POLICY.md |
| CC2 | Communication of policies | A.5.1, A.6.3 | PARTIAL | Policies documented in this pack; privacy notice public. Internal acknowledgement process PLANNED | This compliance pack; PRIVACY_POLICY.md |
| CC3 | Risk assessment | Clause 6.1; A.5.7 | PLANNED | No formal documented risk assessment / treatment plan / SoA yet | Roadmap Phase 0/4 |
| CC4 | Monitoring of controls | Clause 9.1; A.8.16 | PARTIAL | Ad hoc review via logs/code review. Continuous monitoring + alerting PLANNED (depends on log aggregation) | INFORMATION_SECURITY_POLICY.md s7 |
| CC5 | Control activities | A.5, A.8 | PARTIAL | Technical controls exist (RLS, encryption, webhook verification); formal control-activity catalog maturing | CONTROL_MATRIX.md (this file) |
| CC6.1 | Logical access - authentication and authorization | A.5.15-5.18, A.8.2-8.5 | PARTIAL | Supabase Auth; per-user RLS on all 108 tables; profiles/unified_profiles/profile_insights/user_business_context/chat_messages owner-scoped or service-role-only after May-June 2026 RLS remediation. MFA, password policy + HIBP, access reviews PLANNED | Migrations (git); INCIDENT_RESPONSE_PLAN.md s7 |
| CC6.2/6.3 | Provisioning/deprovisioning, least privilege | A.5.18, A.8.2 | PARTIAL | Service-role keys server-side only; least privilege partial. Formal joiner/mover/leaver + periodic reviews PLANNED | INFORMATION_SECURITY_POLICY.md s4 |
| CC6.6 | Boundary protection | A.8.20-8.23 | IN PLACE | TLS in transit; CDN/edge boundary; rate limiting on AI endpoints | Edge function config; ISP s7 |
| CC6.7 | Data in transit/at rest protection | A.8.24 | PARTIAL | TLS in transit IN PLACE; Supabase-managed disk encryption IN PLACE (covers all data including Memory); Memory facts additionally get an AES-256-GCM encrypted copy as defense-in-depth, but a plaintext `fact_value`/`fact_context` shadow is also stored and is what the app actually reads, so this is not full field-level at-rest encryption yet | ISP s5; ROPA Activity C |
| CC6.8 | Malicious/unauthorized software | A.8.7, A.8.19 | PARTIAL | Managed platforms (Supabase/Vercel) reduce surface; CI SAST/SCA PLANNED | Roadmap Phase 1 |
| CC7.1 | Vulnerability detection | A.8.8 | PLANNED | No recurring dependency/SAST scanning or pen test yet | Roadmap Phase 1 |
| CC7.2/7.3 | Monitoring and incident detection/response | A.5.24-5.28, A.8.15-8.16 | PARTIAL | Structured JSON logging exists (adoption uneven, not CI-gated); Stripe webhook verification IN PLACE; IR plan documented. data_audit_log + ai_usage_audit tables exist and are live for a narrow set of flows (account deletion, retention cleanup, select skill-export/kit paths); comprehensive coverage + log aggregation/alerting PLANNED/IN PROGRESS | INCIDENT_RESPONSE_PLAN.md; ISP s7 |
| CC7.4/7.5 | Incident response and recovery | A.5.24-5.27 | IN PLACE (plan) / PARTIAL (drilled) | IR plan with GDPR Art 33/34 + CCPA duties and worked RLS example. Tabletop exercise PLANNED | INCIDENT_RESPONSE_PLAN.md |
| CC8.1 | Change management | A.8.32 | PARTIAL | Git-versioned migrations; code review. Formal change policy + RLS regression tests PLANNED | Git history; ISP s6 |
| CC9.1 | Risk mitigation (business disruption) | Clause 6.1; A.5.29-5.30 | PARTIAL | Managed-platform redundancy; backups. Documented BCP/DR with RTO/RPO + tested restore PLANNED | DATA_RETENTION_POLICY.md; ISP s10 |
| CC9.2 | Vendor / subprocessor management | A.5.19-5.23 | PARTIAL | Subprocessor register maintained. Signed DPAs/SCCs + vendor security evidence PLANNED | SUBPROCESSORS.md |

## SOC 2 - Availability (A1)

| Ref | Criterion | ISO overlap | Status | Implementation or gap | Evidence |
|-----|-----------|-------------|--------|-----------------------|----------|
| A1.1 | Capacity / availability monitoring | A.8.6, A.8.16 | PARTIAL | Inherited from Supabase/Vercel platform monitoring. Own uptime monitoring/alerting PLANNED | Roadmap Phase 1 |
| A1.2 | Backup and recovery | A.8.13 | PARTIAL | Supabase managed encrypted backups IN PLACE; documented retention + tested restore PLANNED | DATA_RETENTION_POLICY.md |
| A1.3 | Recovery testing | A.5.30 | PLANNED | No documented restore test / DR drill yet | Roadmap Phase 1 |

## SOC 2 - Confidentiality (C1)

| Ref | Criterion | ISO overlap | Status | Implementation or gap | Evidence |
|-----|-----------|-------------|--------|-----------------------|----------|
| C1.1 | Identify/protect confidential data | A.5.12-5.13, A.8.24 | PARTIAL | Data classification in ISP; owner-scoped RLS IN PLACE; AES-256-GCM applied to Memory facts as a defense-in-depth copy, but the readable plaintext copy is also stored and used (see ISP s5) | ISP s3/s5 |
| C1.2 | Disposal of confidential data | A.8.10 | IN PLACE | cleanup-expired-data (pg_cron) + delete-account cascade; backups age out | DATA_RETENTION_POLICY.md |

## SOC 2 - Privacy (P)

| Ref | Criterion | ISO overlap | Status | Implementation or gap | Evidence |
|-----|-----------|-------------|--------|-----------------------|----------|
| P1 Notice | Privacy notice | A.5.34 | IN PLACE | Public privacy policy (GDPR Art 13/14 + CCPA) | PRIVACY_POLICY.md |
| P2 Choice/Consent | Consent capture | A.5.34 | IN PLACE | upsert-sharing-consent; consent_audit table; marketing consent flag | ROPA Activity J |
| P3 Collection | Lawful, minimized collection | A.5.34 | IN PLACE | Lawful bases mapped per category | PRIVACY_POLICY.md s4; ROPA.md |
| P4 Use/Retention/Disposal | Retention and deletion | A.8.10 | IN PLACE | Configurable retention + scheduled cleanup + cascading deletion | DATA_RETENTION_POLICY.md |
| P5 Access | Subject access/portability | A.5.34 | IN PLACE | memory-export (JSON+markdown), generate-custom-export; DSAR runbook | DSAR_RUNBOOK.md |
| P6 Disclosure/Transfers | Third-party disclosure and transfers | A.5.34 | PARTIAL | Subprocessors registered; "we do not sell". SCCs/DPAs PLANNED | SUBPROCESSORS.md |
| P7 Quality | Accuracy/rectification | A.5.34 | IN PLACE | In-app edit + rectification path | DSAR_RUNBOOK.md |
| P8 Monitoring/Enforcement | Complaint handling, breach notice | A.5.34, A.5.24 | PARTIAL | IR plan covers breach notice; formal complaint workflow maturing | INCIDENT_RESPONSE_PLAN.md |

## Selected ISO 27001:2022 Annex A controls (not already above)

| Annex A | Control | Status | Implementation or gap | Evidence |
|---------|---------|--------|-----------------------|----------|
| A.5.7 | Threat intelligence | PLANNED | No formal process | Roadmap |
| A.5.9-5.11 | Asset inventory and acceptable use | PARTIAL | Acceptable use in ISP; formal asset/data inventory partial (ROPA + table list) | ISP s12; ROPA.md |
| A.5.31 | Legal/contractual/regulatory requirements | PARTIAL | GDPR/CCPA addressed in policy; full register PLANNED | PRIVACY_POLICY.md |
| A.5.34 | Privacy and protection of PII | IN PLACE | Privacy program documented | PRIVACY_POLICY.md; ROPA.md |
| A.8.9 | Configuration management | PARTIAL | IaC-style via migrations; full config baseline PLANNED | Git history |
| A.8.12 | Data leakage prevention | PARTIAL | RLS; no-secrets-in-logs is a coding convention, not an automated CI gate (no secret-scanning check exists in `standards/check-standards.mjs` or `.github/workflows`); broader DLP + secret-scanning in CI PLANNED | ISP s6 |
| A.8.15 | Logging | PARTIAL | Structured edge logs exist but adoption is uneven and not CI-gated; data_audit_log/ai_usage_audit live for a narrow set of flows, comprehensive coverage IN PROGRESS | ISP s7 |
| A.8.16 | Monitoring activities | PLANNED | Centralized monitoring/alerting PLANNED | Roadmap Phase 1 |
| A.8.24 | Use of cryptography | PARTIAL | TLS + disk encryption IN PLACE; AES-256-GCM applied to Memory facts as a defense-in-depth copy alongside the plaintext columns actually read (not full at-rest encryption yet) | ISP s5 |
| A.8.28 | Secure coding | PARTIAL | Code review + CI log gate; SAST + RLS regression tests PLANNED | ISP s6 |
| A.8.32 | Change management | PARTIAL | Git-versioned migrations; formal policy PLANNED | Git history |

## Summary of biggest open gaps

1. Audit logging: data_audit_log and ai_usage_audit exist and are live for a narrow set of flows (account deletion, retention cleanup, select skill-export/kit paths); comprehensive coverage across all data-access and AI-call paths is IN PROGRESS - needed for monitoring and forensic impact assessment.
2. Risk assessment + SoA (CC3 / ISO 6.1) - not started.
3. MFA, password policy + HIBP, formal access reviews (CC6).
4. CI security scanning + RLS regression tests + a CI gate for console.log usage + penetration test (CC7).
5. Signed DPAs/SCCs and vendor evidence (CC9 / SUBPROCESSORS), now covering a longer subprocessor list after the 2026-08-02 review added Anthropic, NewsAPI.org, Exa, Artificial Analysis, and PostHog to the register.
6. Documented and tested BCP/DR with RTO/RPO (A1 / CC9).
7. Memory-fact plaintext shadow: the AES-256-GCM encrypted copy of each Memory fact is defense-in-depth only; the plaintext `fact_value`/`fact_context` columns are what the app actually reads, so this is not full field-level at-rest encryption (CC6.7 / C1.1 / A.8.24).
8. `kit_builds` is confirmed missing from the `delete-account` cascade (a real erasure gap, not just a documentation caveat); see [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md).

These map directly to the phases in [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md).
