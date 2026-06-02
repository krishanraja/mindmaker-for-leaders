# CTRL Privacy Policy

Effective date: 2026-06-02
Last reviewed: 2026-06-02

This Privacy Policy explains how Mindmaker ("Mindmaker", "we", "us") collects, uses, and shares personal data when you use CTRL (the "Service") at https://ctrl.themindmaker.ai. CTRL is an executive leadership-clarity tool. This notice is written to satisfy the transparency obligations of the EU/UK General Data Protection Regulation (GDPR Articles 13 and 14) and the California Consumer Privacy Act as amended by the CPRA.

Related internal documents: [ROPA.md](./ROPA.md), [SUBPROCESSORS.md](./SUBPROCESSORS.md), [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md), [DSAR_RUNBOOK.md](./DSAR_RUNBOOK.md).

## 1. Who we are (data controller)

Mindmaker (Krish Raja) is the controller of your personal data.
Contact for privacy matters: privacy@themindmaker.ai

We have not appointed a statutory Data Protection Officer; privacy enquiries are handled by the contact above.

## 2. Scope

This policy covers personal data processed through the CTRL web application and its supporting backend (Supabase database, authentication, storage, and edge functions; project ref bkyuxvschuwngtcdhsyg). CTRL does not process protected health information (PHI); HIPAA is out of scope.

## 3. Personal data we collect

| Category | Examples | Source |
|----------|----------|--------|
| Account identity | Email address, name, display name | You, at sign-up; Google OAuth if used |
| Business / work context | Company, industry, company size, website, primary challenges, AI-readiness score, communication style, thinking style | You, during onboarding and use |
| Memory Web facts | Thoughts and statements you voice that are extracted into structured facts (encrypted at rest with AES-256-GCM) | Derived from your inputs |
| Conversation / chat messages | Messages you send to and receive from CTRL's assistants | You, during use |
| AI-literacy diagnostic / assessment responses | Answers to AI-fluency and leadership assessments | You, during assessments |
| Daily-briefing preferences and interests | Topics, interests, briefing settings | You; inferred from your stated interests |
| Voice recordings and transcripts | Audio you record, transcribed to text (transcripts retained; audio handled per the transcription provider, see Section 7) | You, during voice use |
| Billing data | Stripe customer ID, subscription status | Created when you subscribe |

Payment card data is tokenized and processed by Stripe. We never receive or store full card numbers.

## 4. How and why we use your data, and the lawful basis

For users in the EU/UK, the GDPR requires a lawful basis for each purpose. The table maps purpose to basis.

| Purpose | Data categories used | GDPR lawful basis |
|---------|----------------------|-------------------|
| Provide the Service (auth, core features) | Account identity, business context, chat, assessments | Contract (Art 6(1)(b)) |
| Build and maintain your Memory Web | Memory Web facts, chat, voice transcripts | Contract (Art 6(1)(b)); consent where you enable optional memory features |
| Generate AI responses, briefings, and assessments | Business context, chat, assessments, preferences, transcripts | Contract (Art 6(1)(b)) |
| Daily briefings and notifications | Briefing preferences, interests, account identity | Contract for transactional delivery; consent for optional channels |
| Process payments and manage subscriptions | Billing data, account identity | Contract (Art 6(1)(b)); legal obligation for tax/accounting records (Art 6(1)(c)) |
| Transactional email (confirmations, security, billing) | Account identity | Contract (Art 6(1)(b)) |
| Marketing email | Account identity, marketing-consent flag | Consent (Art 6(1)(a)) |
| Service security, abuse prevention, rate limiting | Account identity, request metadata | Legitimate interests (Art 6(1)(f)) |
| Product improvement and aggregate analytics | Usage events (minimized) | Legitimate interests (Art 6(1)(f)) |
| Sharing of profile/insights data you choose to share | Business context, insights | Consent (Art 6(1)(a)), via in-app consent toggles |

Where we rely on consent, you may withdraw it at any time (see Section 9) without affecting prior processing. Where we rely on legitimate interests, you may object (see Section 9).

## 5. Special note on AI processing

CTRL sends your inputs (chat, business context, assessment answers, briefing topics, and voice transcripts) to third-party AI providers to generate responses, transcriptions, and embeddings (see [SUBPROCESSORS.md](./SUBPROCESSORS.md)). We instruct these providers to act as processors on our behalf. We do not use your content to train our own foundation models. Provider-side training is governed by each provider's terms; we rely on their enterprise/API terms, which generally exclude API content from model training. Confirming and documenting this contractually with each provider via a signed DPA is an in-progress action (see [SUBPROCESSORS.md](./SUBPROCESSORS.md) and [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md)).

## 6. How we share your data

We share personal data only with subprocessors that help us operate the Service, and where required by law. We do not sell your personal data. The full subprocessor register, including purpose, data shared, and location, is maintained in [SUBPROCESSORS.md](./SUBPROCESSORS.md). Subprocessors include Supabase, OpenAI, Google Cloud (Vertex AI / Gemini), ElevenLabs, Stripe, Resend, Perplexity, Tavily, Brave Search, Jina, Apollo, Google (OAuth and Sheets), and Vercel.

## 7. Voice and audio

When you use voice features, your audio is transcribed to text. We retain the resulting transcripts as part of your data. The audio itself is handled by our transcription provider (OpenAI Whisper) under that provider's terms; we do not maintain a long-term store of raw audio as a product feature.

## 8. International data transfers

Mindmaker and substantially all of our subprocessors operate in the United States (commonly on AWS, Google Cloud, or comparable infrastructure). If you are in the EEA, UK, or Switzerland, your personal data is transferred to the United States. For these transfers we rely, or intend to rely, on the European Commission's Standard Contractual Clauses (SCCs) and, for UK transfers, the UK International Data Transfer Addendum, together with supplementary technical measures (encryption in transit and at rest). Executing SCCs/DPAs with every subprocessor is an in-progress action item, tracked in [SUBPROCESSORS.md](./SUBPROCESSORS.md). You may request a copy of the relevant transfer-mechanism information at privacy@themindmaker.ai.

## 9. Your rights

Depending on where you live, you have some or all of the following rights. Mechanisms to exercise them are built into CTRL; the operational detail is in [DSAR_RUNBOOK.md](./DSAR_RUNBOOK.md).

GDPR / UK GDPR rights:
- Access: get a copy of your data. CTRL provides in-app data export (JSON and markdown).
- Rectification: correct inaccurate data (editable in-app, or contact us).
- Erasure: delete your account and associated data (in-app account deletion, which cascades across your records).
- Restriction and objection: limit or object to certain processing, including processing based on legitimate interests.
- Portability: receive your data in a structured, machine-readable format (JSON export).
- Withdraw consent: via in-app consent and notification toggles, or by contacting us.
- Lodge a complaint with your supervisory authority.

CCPA / CPRA rights (California residents):
- Right to know and access the categories and specific pieces of personal information collected.
- Right to delete.
- Right to correct inaccurate personal information.
- Right to opt out of sale or sharing. We do not sell or share (as defined by the CPRA) your personal information for cross-context behavioral advertising.
- Right to limit use of sensitive personal information.
- Right to non-discrimination for exercising your rights.

How to exercise: use the in-app controls (export, delete account, consent toggles, notification preferences) or email privacy@themindmaker.ai. We respond to GDPR requests within one month and to CCPA requests within 45 days (each extendable as permitted by law, with notice). We verify your identity before fulfilling a request (see [DSAR_RUNBOOK.md](./DSAR_RUNBOOK.md)).

## 10. "Do Not Sell or Share My Personal Information"

Mindmaker does not sell personal information and does not share it for cross-context behavioral advertising. No opt-out is necessary for sale/sharing because neither occurs. If this ever changes, we will provide a clear opt-out mechanism and update this policy first.

## 11. Cookies and similar technologies

CTRL uses strictly necessary cookies and local/session storage to keep you signed in and to operate the application (for example, authentication tokens managed by Supabase Auth). We do not use third-party advertising cookies. To the extent any non-essential analytics are used, they are limited to first-party, minimized usage events under our legitimate interest in improving the Service, and we will surface consent controls where required by law.

## 12. Data retention

We retain personal data for as long as your account is active and as needed to provide the Service, then delete or anonymize it per [DATA_RETENTION_POLICY.md](./DATA_RETENTION_POLICY.md). Memory data honors your configurable retention setting (`user_memory_settings.retention_days`), enforced by a scheduled cleanup job. Account deletion removes your data via a cascading deletion process.

## 13. Children

CTRL is a business tool intended for adults and is not directed to children. We do not knowingly collect personal data from anyone under 16. If you believe a child has provided us data, contact privacy@themindmaker.ai and we will delete it.

## 14. Security

We apply technical and organizational measures including per-user Row-Level Security, AES-256-GCM encryption of Memory facts at rest, TLS in transit, provider-managed disk encryption, Stripe webhook signature verification, and rate limiting. See [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md). No system is perfectly secure; if a breach affects you, we will notify you as required by law (see [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md)).

## 15. Changes to this policy

We may update this policy. Material changes will be communicated through the Service or by email before they take effect, and the "Effective date" above will be updated.

## 16. Contact

Privacy enquiries and rights requests: privacy@themindmaker.ai
