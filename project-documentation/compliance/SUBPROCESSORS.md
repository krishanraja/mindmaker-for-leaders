# CTRL Subprocessor Register

Last reviewed: 2026-07-19
Controller: Mindmaker (Krish Raja) - privacy@themindmaker.ai

This register lists the third parties that process personal data on Mindmaker's behalf when you use CTRL. It supports [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) (Section 6) and [ROPA.md](./ROPA.md).

DPA status legend:
- Signed: a Data Processing Agreement is executed and on file.
- Standard terms: we rely on the provider's published DPA / data terms incorporated by their standard terms of service, but we have not yet executed and filed a countersigned copy.
- To confirm: relationship in use; DPA review/signature is an open action item.

As of 2026-07-19, none of the DPAs below are marked "Signed". Formalizing signed DPAs and SCCs with all subprocessors is an in-progress action tracked in [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md). The table reflects current honest status, not an aspiration.

This review (2026-07-19) reconciled the register against the actual API keys and outbound integrations referenced in `supabase/functions/` and `index.html`. Twelve rows were added that were in code but missing from the register (see the "Added 2026-07-19" note on each); the Perplexity, Brave Search, and NewsAPI.org rows were also widened to reflect that the Decision Engine (not just the Daily Briefing) now calls them. Nothing was removed; no existing DPA status was upgraded.

## Register

| Subprocessor | Purpose | Personal data shared | Location | DPA status | Transfer mechanism (EU/UK to US) |
|--------------|---------|----------------------|----------|------------|----------------------------------|
| Supabase | Database, authentication, storage, edge compute | All stored categories (identity, business context, Memory facts, chat, assessments, preferences, transcripts, billing metadata) | US (AWS) | To confirm | SCCs (to confirm/sign) |
| Vercel | Frontend hosting and CDN | Account identity, request metadata | US | To confirm | SCCs (to confirm/sign) |
| Google Cloud (Vertex AI / Gemini 2.0 Flash) | Primary LLM generation | Business context, chat, assessments, briefing topics, transcripts | US | Standard terms | SCCs (to confirm/sign) |
| OpenAI | Fallback LLM, Whisper transcription, text-embedding-3-small embeddings | Chat, business context, assessments, voice audio/transcripts, text for embeddings | US | Standard terms | SCCs (to confirm/sign) |
| ElevenLabs | Briefing text-to-speech audio | Briefing text derived from interests/preferences | US | To confirm | SCCs (to confirm/sign) |
| Stripe | Payment processing and subscriptions | Billing identity, Stripe customer ID, subscription status (card data tokenized by Stripe) | US | Standard terms | SCCs (to confirm/sign) |
| Resend | Transactional and notification email | Email address, name, message content | US | To confirm | SCCs (to confirm/sign) |
| Perplexity | Daily-briefing web search | Briefing topics/queries (not directly identity) | US | To confirm | SCCs (to confirm/sign) |
| Tavily | Daily-briefing web search/enrichment | Briefing topics/queries | US | To confirm | SCCs (to confirm/sign) |
| Brave Search | Daily-briefing web search | Briefing topics/queries | US | To confirm | SCCs (to confirm/sign) |
| Jina | Daily-briefing content retrieval/enrichment | Briefing topics/URLs | US | To confirm | SCCs (to confirm/sign) |
| Apollo | Company enrichment | Company name/domain (business context) | US | To confirm | SCCs (to confirm/sign) |
| Google (OAuth) | Sign-in / authentication | Email, name, OAuth identity | US | Standard terms | SCCs (to confirm/sign) |
| Google Sheets | Operations sync | Minimized account/usage data | US | Standard terms | SCCs (to confirm/sign) |

Notes:
- Search/enrichment providers (Perplexity, Tavily, Brave, Jina) primarily receive briefing topics and queries rather than direct account identifiers, but topics can be personal where you have personalized them; they are treated as subprocessors.
- Apollo receives company-level data used for enrichment; treat as processing of business context.
- Card data is never stored by Mindmaker; Stripe tokenizes it.

## How we notify customers of changes

1. This register is the authoritative list of subprocessors and is maintained in the repository.
2. When we intend to add or replace a subprocessor that processes personal data, we will update this file and the "Last reviewed" date, and reflect the change in [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) Section 6.
3. For material additions, we will provide advance notice through the Service or by email to affected users before the new subprocessor begins processing, with a reasonable window to raise objections.
4. Where a signed customer DPA requires a specific notice period or objection right, that contractual term governs.

## Open actions (human/legal)

- Execute and file signed DPAs and SCCs with each subprocessor above.
- Capture, for each AI provider, written confirmation that API content is excluded from model training.
- Record each provider's sub-subprocessor list and security posture (e.g., the provider's own SOC 2 report) as vendor evidence.

See [CONTROL_MATRIX.md](./CONTROL_MATRIX.md) (CC9 / vendor management) for status tracking.
