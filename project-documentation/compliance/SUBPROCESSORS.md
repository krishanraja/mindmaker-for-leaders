# CTRL Subprocessor Register

Last reviewed: 2026-07-26
Controller: Mindmaker (Krish Raja) - privacy@themindmaker.ai

This register lists the third parties that process personal data on Mindmaker's behalf when you use CTRL. It supports [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) (Section 6) and [ROPA.md](./ROPA.md).

DPA status legend:
- Signed: a Data Processing Agreement is executed and on file.
- Standard terms: we rely on the provider's published DPA / data terms incorporated by their standard terms of service, but we have not yet executed and filed a countersigned copy.
- To confirm: relationship in use; DPA review/signature is an open action item.

As of 2026-06-02, none of the DPAs below are marked "Signed". Formalizing signed DPAs and SCCs with all subprocessors is an in-progress action tracked in [SOC2_ISO27001_ROADMAP.md](./SOC2_ISO27001_ROADMAP.md). The table reflects current honest status, not an aspiration.

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
| Jina | Business-context enrichment (company site reads) and briefing content retrieval | Company URLs/content, briefing topics | US | To confirm | SCCs (to confirm/sign) |
| Apollo | Company enrichment | Company name/domain (business context) | US | To confirm | SCCs (to confirm/sign) |
| Google (OAuth) | Sign-in / authentication | Email, name, OAuth identity | US | Standard terms | SCCs (to confirm/sign) |
| Google Sheets | Operations sync | Minimized account/usage data | US | Standard terms | SCCs (to confirm/sign) |
| NewsAPI.org | News aggregation for the daily briefing and the Home news feed | Briefing/news topics (not directly identity) | US | To confirm | SCCs (to confirm/sign) |
| Exa | Neural/semantic search for the daily briefing, the Home news feed, and decision-engine evidence retrieval | Briefing/decision topics and queries | US | To confirm | SCCs (to confirm/sign) |
| Artificial Analysis | AI-model benchmark data used to validate news/decision claims about specific models | Model names/claims referenced in briefing or decision content (not account identity) | US | To confirm | SCCs (to confirm/sign) |
| PostHog | Product analytics (page views, in-app usage events) | Account/session identifiers, page and event metadata | US | To confirm | SCCs (to confirm/sign) |

Notes:
- Search/enrichment providers (Perplexity, Tavily, Brave, Jina, NewsAPI.org, Exa, Artificial Analysis) primarily receive briefing/decision topics and queries rather than direct account identifiers, but topics can be personal where you have personalized them; they are treated as subprocessors.
- Apollo and Jina (company-site reads) receive company-level data used for enrichment; treat as processing of business context.
- PostHog is loaded client-side (`index.html`) and tags events `product: mm_ctrl` so a shared Mindmaker-wide PostHog project can separate ventures; it captures page views and in-app usage, not Memory Web content.
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
