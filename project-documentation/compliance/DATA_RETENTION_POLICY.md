# CTRL Data Retention Policy

Last reviewed: 2026-07-12 (updated 2026-07-12)
Owner: Krish Raja, Mindmaker - privacy@themindmaker.ai

Defines how long CTRL keeps each category of personal data and how it is deleted. Supports [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) Section 12 and [ROPA.md](./ROPA.md).

## Principles

- Keep personal data only as long as needed for the purpose it was collected, or as required by law.
- Default to deletion on account closure; honor user-configured retention for Memory data.
- Prefer automated, scheduled deletion over manual cleanup.

## Retention by category

| Data category | Retention | Deletion mechanism |
|---------------|-----------|--------------------|
| Account identity (email, name, display name) | Life of account | `delete-account` (cascading) on account deletion |
| Business / work context | Life of account | `delete-account` cascade |
| Memory Web facts | User-configurable via `user_memory_settings.retention_days`; otherwise life of account | `cleanup-expired-data` (pg_cron) enforces per-user retention window; `delete-account` cascade on closure |
| Conversation / chat messages | Life of account (subject to any configured retention) | `delete-account` cascade; retention cleanup where applicable |
| Assessment / diagnostic responses | Life of account | `delete-account` cascade |
| Kit builds / lesson-kit inputs (`kit_builds.intake`) | Life of account | `delete-account` cascade intended; verified by code review (2026-07-12) that `kit_builds` is NOT currently in `delete-account`'s deleted-table list - this is a confirmed open gap, not yet remediated in code |
| Daily-briefing preferences and interests | Life of account | `delete-account` cascade |
| Generated briefings | Rolling window per briefing settings; not retained indefinitely | Scheduled cleanup / superseded by new briefings |
| Voice transcripts | Treated as user content; life of account or per Memory retention if stored as Memory | `delete-account` cascade; retention cleanup where applicable |
| Raw voice audio | Not maintained as a long-term store; handled transiently by transcription provider | Provider-side per OpenAI Whisper terms |
| Billing metadata (Stripe customer ID, subscription status) | Life of account for service; financial records retained as required by tax/accounting law (commonly up to 6-7 years) | Local subscription records are removed by `delete-account`; verified by code review (2026-07-12) that `delete-account` does not itself call the Stripe API to cancel the live Stripe subscription, so cancellation is currently a manual operator step, not an automated deletion mechanism (flagged for founder/legal confirm on the intended process); financial records retained then deleted at legal expiry |
| Consent records (consent_audit, marketing consent) | Life of account plus a limited evidentiary period after closure to prove lawful consent handling | Aged out after the evidentiary period |
| Operational / edge-function logs | Short operational window (current default short retention on provider log surfaces) | Provider log rotation; centralized aggregation with defined retention is in progress |
| DSAR records | Retained as compliance evidence for a limited period after fulfillment | Manual/scheduled purge |

Where a row says "in progress," see [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md).

## Deletion mechanisms in detail

- Account deletion: `delete-account` edge function performs a cascading delete of the user's records across CTRL tables. Triggered by the user in-app or by an operator fulfilling an erasure DSAR (see [DSAR_RUNBOOK.md](./DSAR_RUNBOOK.md)).
- Scheduled retention enforcement: `cleanup-expired-data` runs on pg_cron and removes Memory data older than the user's `user_memory_settings.retention_days` and other time-bound records.
- Stripe: local subscription records are removed on account deletion; canceling the live Stripe subscription itself is currently a manual operator step (code review, 2026-07-12, found no automated Stripe cancellation call in `delete-account`), flagged for founder/legal confirm. Card data is never stored by Mindmaker (tokenized by Stripe).

## Backups

- Supabase provides managed, encrypted backups of the Postgres database.
- Backups exist to support disaster recovery and are not used for normal data access.
- When a record is deleted from primary stores, residual copies persist in backups until those backups age out of their retention window, after which they are no longer recoverable.
- We do not selectively edit historical backups to remove individual records; instead, deletions propagate naturally as old backups expire. This approach, and the backup retention window, is disclosed to users in erasure responses (see [DSAR_RUNBOOK.md](./DSAR_RUNBOOK.md)).
- Documenting the exact backup retention window and a tested restore procedure is part of business continuity work in [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md).

## Legal holds

If data is subject to a legal hold or ongoing legal/regulatory obligation, deletion of the affected records is suspended until the obligation ends, overriding the schedules above.

## Review

Review this policy at least annually, and whenever a new data category or subprocessor is introduced.
