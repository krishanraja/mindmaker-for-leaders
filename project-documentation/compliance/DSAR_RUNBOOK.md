# Data Subject Access Request (DSAR) Runbook

Last reviewed: 2026-07-19
Owner: Krish Raja, Mindmaker - privacy@themindmaker.ai

Operational runbook for handling data-subject rights requests for CTRL: access, rectification, erasure, portability, restriction/objection, and CCPA opt-out. Supports [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) Section 9.

## 1. SLAs

| Regime | Acknowledge | Fulfill | Extension |
|--------|-------------|---------|-----------|
| GDPR / UK GDPR | Promptly, target within 72 hours | Within 1 month of receipt | +2 months for complex/numerous requests, with notice within the first month |
| CCPA / CPRA | Within 10 business days (confirm receipt) | Within 45 days | +45 days with notice |

Start the clock at the date of receipt (verified or not). If identity verification is pending, the clock for substantive fulfillment still runs; do not let verification stall the SLA.

## 2. Intake

Requests arrive via:
- In-app self-service controls (preferred): data export, account deletion, consent and notification toggles.
- Email to privacy@themindmaker.ai.

On receipt of an emailed request, log it (Section 7) and send the acknowledgement template (Section 6).

## 3. Identity verification

Verify the requester is the data subject before disclosing or deleting data.

- Primary method: require the request to be made from, or confirmed via, the email address on the account. Send a verification link/code to that address and require action from it.
- For deletion and export, in-app actions are inherently authenticated by the user's logged-in session and Supabase Auth; treat a successfully completed in-app action as verified.
- Do not accept identity documents unless strictly necessary; if escalated verification is needed, collect the minimum and delete it after verification.
- For authorized agents (CCPA), require written authorization and verify the underlying consumer.

If verification fails after reasonable effort, decline with the refusal template and log the reason.

## 4. Locating the data

CTRL data is in the Supabase project (ref bkyuxvschuwngtcdhsyg), keyed by the user's auth ID. Use existing tooling rather than ad hoc SQL where possible.

| Request type | Tooling / location | Notes |
|--------------|--------------------|-------|
| Access / Portability | `memory-export` edge function (JSON + markdown); `generate-custom-export` edge function | Produces user-scoped export of Memory and related data |
| Memory data specifically | `memory-crud`, `memory-export`, `memory-settings` edge functions; Memory tables | Memory facts are AES-256-GCM encrypted at rest; export decrypts for the owner |
| Profile / business context | profiles, unified_profiles, profile_insights, user_business_context (owner-scoped after May-June 2026 RLS remediation) | |
| Conversations | chat_messages (owner-scoped) | |
| Assessments / diagnostics | assessment/diagnostic tables | |
| Briefing preferences | briefing preference/interest tables | |
| Billing | Stripe customer record + local subscription status | Card data lives only in Stripe |
| Consent history | consent_audit table; `upsert-sharing-consent`; notification prefs via `upsert-notification-prefs` | |
| Erasure | `delete-account` edge function (cascading) | Removes user data across tables |
| Retention settings | `user_memory_settings.retention_days`; enforced by `cleanup-expired-data` (pg_cron) | |

## 5. Fulfillment steps by request type

### Access / Portability
1. Verify identity (Section 3).
2. Run the user's in-app export, or invoke `memory-export` / `generate-custom-export` scoped to the user's ID.
3. Review output to confirm it is the requester's data only and contains no other person's personal data.
4. Deliver via a secure channel (in-app download preferred; if emailed, use a time-limited link).
5. Log completion.

### Rectification
1. Verify identity.
2. Direct the user to in-app editing for self-correctable fields, or apply the correction to the relevant table.
3. Where the data was shared with a subprocessor, note that processors generally hold transient copies; no propagation typically required.
4. Confirm to the user and log.

### Erasure
1. Verify identity.
2. Use the in-app account deletion or invoke `delete-account` (cascading).
3. Confirm Stripe-side handling (cancel subscription; financial records retained where legally required, then deleted).
4. Note that backups expire on their own cycle (see [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md)); deleted data is purged from primary stores immediately and ages out of backups.
5. Confirm to the user and log.

### Restriction / Objection
1. Verify identity.
2. For consent-based or legitimate-interest processing, disable the relevant processing via consent/notification toggles or by flagging the account.
3. For marketing, clear the marketing-consent flag.
4. Confirm and log.

### CCPA opt-out of sale/sharing
- Mindmaker does not sell or share personal information. Respond with confirmation that no sale/sharing occurs; no further action needed. Log the request.

## 6. Response templates

Acknowledgement:
> Subject: We received your privacy request
> Hello, we have received your request regarding your CTRL account and are processing it. To protect your data we first need to verify your identity; please follow the verification step we have sent to the email on file. We will complete your request within the timeframe required by law. Reference: [TICKET]. - Mindmaker Privacy, privacy@themindmaker.ai

Fulfillment (access/portability):
> Subject: Your CTRL data export
> Hello, your data export is ready. [Secure link / attached file]. This contains the personal data associated with your account. If anything looks incorrect, reply and we will help. Reference: [TICKET].

Fulfillment (erasure):
> Subject: Your CTRL account has been deleted
> Hello, your CTRL account and associated personal data have been deleted from our active systems. Residual copies in encrypted backups will age out within the standard backup retention window. Certain records may be retained where required by law (for example, financial records). Reference: [TICKET].

Refusal / clarification:
> Subject: Your CTRL privacy request
> Hello, we are unable to proceed because [reason: identity not verified / request out of scope / exemption applies]. Please [next step]. You may also contact your data protection authority. Reference: [TICKET].

## 7. Logging the request

Record every request in the DSAR log (interim: a tracked sheet; will migrate to the data-access audit log, data_audit_log, once built):
- Reference/ticket ID
- Date received; date acknowledged; date fulfilled
- Requester identity and verification method/outcome
- Request type and regime (GDPR/CCPA)
- Data located and actions taken (functions/tables touched)
- Outcome (fulfilled / partially fulfilled / refused) and reason
- Handler

Retain DSAR records as evidence of compliance per [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md).

## 8. Escalation

If a request indicates a possible breach (for example, a user reporting they can see another user's data), stop and trigger [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md) immediately, in parallel with handling the DSAR.
