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
| Anthropic (Claude) | Decision Engine reasoning (decompose/advise, and one of four cross-examine panel judges), fact-to-fact edge derivation (`memory-edges-derive`), and bet suggestion (`suggest-bets`); primary model, OpenAI GPT-4o as fallback in these paths | Decision statements/claims you submit, Memory fact labels/values, business-bet text | US | To confirm | SCCs (to confirm/sign) |
| xAI (Grok) | One of four cross-examine panel judge models in the Decision Engine (alongside Claude, GPT-4o, Gemini) | Decision statement/claim text and the prompts built from it | US | To confirm | SCCs (to confirm/sign) |
| ElevenLabs | Briefing text-to-speech audio | Briefing text derived from interests/preferences | US | To confirm | SCCs (to confirm/sign) |
| Stripe | Payment processing and subscriptions | Billing identity, Stripe customer ID, subscription status (card data tokenized by Stripe) | US | Standard terms | SCCs (to confirm/sign) |
| Resend | Transactional and notification email | Email address, name, message content | US | To confirm | SCCs (to confirm/sign) |
| Perplexity | Daily-briefing web search; Decision Engine evidence retrieval | Briefing topics/queries; decision statement/claim text | US | To confirm | SCCs (to confirm/sign) |
| Tavily | Daily-briefing web search/enrichment | Briefing topics/queries | US | To confirm | SCCs (to confirm/sign) |
| Brave Search | Daily-briefing web search; Home news-feed source; Decision Engine evidence retrieval | Briefing topics/queries; decision statement/claim text | US | To confirm | SCCs (to confirm/sign) |
| Exa | Home news-feed neural/semantic search source (fixed, non-personalized industry queries); Decision Engine evidence retrieval | None for the Home feed (fixed generic queries, not user-specific); decision statement/claim text for the Decision Engine | US | To confirm | SCCs (to confirm/sign) |
| NewsAPI.org | Mainstream news aggregator: Home news-feed source and Decision Engine evidence retrieval (recency search on factual/market claims). Note: the code accepts two secret names for the same relationship, `NEWSAPI_KEY` and `NEWSAPI_API_KEY` (fallback alias, not a second vendor) | Briefing/news topic queries; decision statement/claim text | US | To confirm | SCCs (to confirm/sign) |
| Artificial Analysis | Frontier-AI-model benchmark index, fetched generically (not per-user) and matched locally against news/decision content to attach real benchmark standing to a model claim | None - the index is pulled as a whole and matching happens in our own code; user content is never sent to Artificial Analysis | US (assumed; to confirm) | N/A (no personal data transmitted) | N/A (no personal data transmitted) |
| BuiltWith | Domain technology-stack lookup for Decision Engine claims that name a company/domain | Business domain / company name (business context) | US | To confirm | SCCs (to confirm/sign) |
| Tranco | Public domain-popularity rank lookup for Decision Engine claims that name a domain (no account/API key; public research API at tranco-list.eu) | Business domain only | EU (Belgium; tranco-list.eu; exact hosting to confirm) | To confirm | SCCs (to confirm/sign) |
| PDL (People Data Labs) | Company enrichment (employee count and related firmographics) for Decision Engine market claims that name a company | Company name (business context) | US | To confirm | SCCs (to confirm/sign) |
| Jina | Business-context enrichment (content retrieval) | Company/domain context used for enrichment | US | To confirm | SCCs (to confirm/sign) |
| Apollo | Company enrichment | Company name/domain (business context) | US | To confirm | SCCs (to confirm/sign) |
| Google (OAuth) | Sign-in / authentication | Email, name, OAuth identity | US | Standard terms | SCCs (to confirm/sign) |
| Google Sheets | Operations sync | Minimized account/usage data | US | Standard terms | SCCs (to confirm/sign) |
| GDELT | Open, no-key global news index; one of six Home news-feed gather sources, queried with a fixed, non-personalized AI-topic search string | None (fixed generic query, not user-specific; returns public news metadata) | US (assumed; to confirm) | N/A (no personal data transmitted) | N/A (no personal data transmitted) |
| Hacker News (Algolia Search API) | Open, no-key community-validated AI/dev signal source; one of six Home news-feed gather sources, queried with fixed generic search terms | None (fixed generic query, not user-specific) | US (Algolia; assumed) | N/A (no personal data transmitted) | N/A (no personal data transmitted) |
| Curated RSS allowlist (~19 reputable AI/tech publishers, e.g. TechCrunch, The Verge, MIT News, OpenAI, Hugging Face) | Open, no-key; one of six Home news-feed gather sources, fetched read-only from each publisher's public RSS/Atom feed | None (a plain HTTP GET of a publicly published feed; no data is sent about our users) | Various (each publisher's own jurisdiction) | N/A (no personal data transmitted) | N/A (no personal data transmitted) |
| PostHog | Client-side product analytics, added [2026-07-19] (`index.html`); a shared cross-venture PostHog project, events tagged with the `product: 'mm_ctrl'` super-property | Page URLs/paths, device and browser metadata, IP address (used transiently for geolocation), timestamps. `person_profiles` is configured `identified_only`; the codebase does not currently call `posthog.identify()`, so tracking is presently anonymous/session-level, but the capability to attach an identified profile exists if `identify()` is added later | US (PostHog US Cloud: us.i.posthog.com / us-assets.i.posthog.com) | To confirm | SCCs (to confirm/sign) |

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
