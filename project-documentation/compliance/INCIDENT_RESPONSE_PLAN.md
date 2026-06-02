# CTRL Incident Response Plan

Last reviewed: 2026-06-02
Owner: Krish Raja, Mindmaker - privacy@themindmaker.ai

How Mindmaker detects, responds to, and reports security incidents and personal-data breaches affecting CTRL. Supports [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) Section 14 and [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md).

## 1. Roles

CTRL is operated by a very small team. One person may hold several roles; the responsibilities below still apply.

| Role | Responsibility |
|------|----------------|
| Incident Lead (default: Krish Raja) | Owns the incident end to end; declares severity; makes notification decisions |
| Technical Responder | Investigates, contains, and remediates in the codebase and Supabase/Vercel |
| Privacy/Legal point | Assesses notification duties (GDPR Art 33/34, CCPA), drafts notices |
| Communications point | Drafts user/customer messaging |

External help (legal counsel, a forensics/DFIR contractor) is engaged for High/Critical incidents; engaging these is a human action (see [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md)).

## 2. Severity classification

| Severity | Definition | Examples |
|----------|------------|----------|
| Critical | Confirmed unauthorized access to, or exposure/loss of, personal data at scale; or full service compromise | Cross-tenant data exposure affecting many users; database exfiltration; key compromise |
| High | Confirmed exposure of a limited set of personal data, or a vulnerability that makes such exposure readily possible | A specific RLS gap exposing some records; leaked credential with data access |
| Medium | Security weakness with limited or no confirmed data impact | Misconfiguration caught before exploitation; isolated abuse |
| Low | Minor issue, no personal-data impact | Noisy alert; non-sensitive misconfig |

## 3. Detection

Current sources:
- Structured JSON edge-function logs (CI gate prevents console.log) reviewed when investigating issues.
- Stripe webhook signature/idempotency failures.
- Rate-limit triggers on AI endpoints.
- User and DSAR reports (a user reporting they can see another's data is an automatic escalation).
- Code review and migration review surfacing RLS or access issues.

In progress (improves detection): comprehensive data-access audit log (data_audit_log), AI-usage audit log (ai_usage_audit), centralized log aggregation, and alerting. Tracked in [CONTROL_MATRIX.md](./CONTROL_MATRIX.md).

## 4. Response workflow

1. Triage and declare: Incident Lead confirms the report and assigns a severity.
2. Contain: stop ongoing exposure (deploy a fix/migration, revoke a credential, disable an endpoint, or tighten RLS). Preserve evidence (logs, migration diffs) before destructive changes where feasible.
3. Eradicate: remove the root cause (for an RLS issue, replace the offending policy and verify owner-scoping across affected tables).
4. Recover: confirm normal operation and that the fix holds; redeploy edge functions if needed.
5. Assess impact: identify which data subjects and data categories were affected, the likelihood of actual access/harm, and the time window.
6. Notify (Section 5) if thresholds are met.
7. Post-incident review (Section 6).
8. Log the incident throughout (timeline, decisions, evidence).

## 5. Notification duties

### GDPR Article 33 (authority)
If a personal-data breach is likely to result in a risk to individuals' rights and freedoms, notify the relevant supervisory authority without undue delay and, where feasible, within 72 hours of becoming aware. The notice describes the nature of the breach, categories and approximate numbers of subjects/records, likely consequences, and measures taken. If the full picture is not yet known, notify in phases.

### GDPR Article 34 (data subjects)
If the breach is likely to result in a high risk to individuals, notify affected data subjects without undue delay, in clear language, describing the breach, likely consequences, and steps taken and recommended. Notification may be avoided if data was rendered unintelligible (for example, strongly encrypted such as the AES-256-GCM Memory facts) or if subsequent measures eliminate the high risk.

### CCPA / CPRA
California requires notifying affected California residents of a breach of unencrypted/unredacted personal information without unreasonable delay, and may require notifying the California Attorney General above statutory thresholds. Coordinate with the Privacy/Legal point.

### Decision aid
- Personal data exposed AND risk to individuals -> Art 33 authority notice within 72 hours.
- High risk to individuals -> Art 34 subject notice, unless data was unintelligible/encrypted or risk mitigated.
- California residents' unencrypted personal info breached -> CCPA notice.
- No personal-data exposure (for example, a vulnerability fixed before exploitation, with logs showing no access) -> document, no external notice.

## 6. Post-incident review

Within 5 business days of closing a High/Critical incident, the Incident Lead runs a blameless review: timeline, root cause, what detection/controls failed or worked, and concrete follow-ups (with owners and dates). Feed gaps into the secure SDLC and [CONTROL_MATRIX.md](./CONTROL_MATRIX.md).

## 7. Worked example: RLS cross-tenant exposure (May-June 2026)

This is a real, remediated incident, documented here as a reference example.

- Detection: during the RLS hardening pass, a `USING(true)` Row-Level Security policy was identified on several tables (profiles, unified_profiles, profile_insights, user_business_context, chat_messages). `USING(true)` evaluates the read policy as always-true, meaning any authenticated user could read other users' rows in those tables: a cross-tenant data-access misconfiguration.
- Severity: classified High (a clear path to exposure of profile and chat personal data across tenants).
- Containment and eradication: the permissive policies were replaced so each table is now owner-scoped (rows restricted to `auth.uid()` ownership) or restricted to the service role where appropriate. Changes were delivered as git-versioned migrations and verified across the affected tables.
- Impact assessment: reviewed available logs/usage for evidence of actual cross-tenant access. (At the time, comprehensive data-access audit logging, data_audit_log, was not yet in place, which limited forensic certainty; this directly motivated building it.)
- Notification: assessed against GDPR Art 33/34. Where evidence indicated the gap was found and closed without confirmed unauthorized access, the conclusion documented was no external notification required; had logs shown actual cross-tenant reads, an Art 33 authority notice within 72 hours and likely Art 34 subject notices would have followed.
- Follow-ups: (1) audit all 108 public tables for any remaining permissive policies (completed as the broader hardening); (2) build data_audit_log to make future impact assessment evidence-based (in progress); (3) add RLS regression coverage so a permissive policy cannot ship again. See [CONTROL_MATRIX.md](./CONTROL_MATRIX.md) CC6.

## 8. Logging incidents

Maintain an incident record for each event: ID, date detected, detector, severity, affected data/subjects, timeline of actions, notification decisions and rationale, root cause, and follow-ups. Retain per [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md). These records are auditor evidence.
