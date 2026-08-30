# CTRL commercial authority

Status: Current
Owner: Mindmaker
Last verified: 2026-08-30 against production application baseline `19d80f36ecda990bce4c3e1e6d18c97387d9ed33`

This is the single human-readable authority for marketing and selling CTRL. The machine-readable companion is [`public/.well-known/product.json`](../../public/.well-known/product.json). Agents must use both and may not upgrade an inference into a claim.

## Product and category

- **Product:** CTRL by Mindmaker
- **Canonical domain:** `https://makeyourmindup.ai`
- **Short line:** A quieter way through AI.
- **Category:** calm AI briefing and decision partner
**Public intake:** Make Your Mind Up, the one-question-at-a-time onboarding experience inside CTRL

CTRL helps a busy founder or small-team CEO notice the AI changes that matter to their business, weigh a real decision against evidence, retain useful context, and improve the next recommendation through explicit confirmation or correction.

It is not a generic chatbot, news feed, outsourced decision maker, implementation platform, or consulting engagement. Mindmaker may have separate service offers. Never bundle, quote, retire, or describe those offers from this repository; verify them at the point of use from the Mindmaker commercial owner.

## Beachhead buyer

The ratified beachhead is an AI-active founder or small-team CEO who:

- is still close to the work and the important calls;
- is actively building the AI-native version of the business;
- already uses at least one AI tool regularly but keeps receiving generic output;
- has more AI information, decisions, and context than they can hold;
- lacks time or staff to monitor changes and check the evidence behind important calls;
- values control, evidence, privacy, and portability more than novelty.

The highest-intent buying moments are a consequential decision, repeated re-explanation across AI tools, a missed AI shift, a daily information backlog, or the realization that useful context is scattered across conversations.

Do not target generic chatbot shoppers, enterprise procurement programs, people seeking implementation tooling, or people who want the product to make decisions for them.

## Problem, promise, and mechanism

The buyer pays two recurring taxes:

1. **The context tax.** Every AI tool starts without enough knowledge of the leader, company, priorities, and judgement.
2. **The evidence tax.** Important calls are made with incomplete research because checking the assumptions takes too long.

CTRL promises a quieter way through both. The mechanism is one connected loop:

```text
one-question intake
  -> optional company recognition with linked current evidence
  -> one-click confirmation or correction
  -> consented context
  -> First Lens
  -> corroborated AI signals ranked to the leader
  -> a decision weighed against evidence
  -> explicit confirmation or correction
  -> stronger portable memory
  -> a better next briefing or decision
```

The value is not “more AI.” It is less to process, better-grounded judgement, and context that compounds rather than resets.

## What the buyer can use now

| Job | Shipped experience | Tier |
|---|---|---|
| Notice what matters | Today and a short personalised read or listen | Free |
| Weigh a real call | AI-native reframe, claims, evidence, tensions, and advice | 3 per month on Free; unlimited on Edge Pro |
| Notice a recurring leadership pattern | One private read with dated evidence, a small experiment, and bounded advisor talk-back | Free |
| Keep useful context | Correctable memory and context export | Free |
| Use current context in an agent | Read-only MCP access to live context and any existing compiled skills | Edge Pro |
| Deepen decision support | Multi-model cross-examination, Decision Watch, generated artifacts, and artifact email delivery | Edge Pro |

Entitlements are owned by [`src/constants/planMatrix.ts`](../../src/constants/planMatrix.ts). Edge Pro is **$49 USD per month**, owned by [`supabase/functions/_shared/edge-pricing.ts`](../../supabase/functions/_shared/edge-pricing.ts). Free is a useful product, not a time-limited trial. Do not invent annual pricing, discounts, bundles, diagnostics, guarantees, or services.

## Demonstrable product truth

Use these mechanics as proof. Do not convert them into unsupported outcome statistics.

- Today, briefing, and no-login delivery use the same curated and personally ranked pool.
- Optional onboarding enrichment accepts one work email or public LinkedIn URL, shows the resolved company and fresh linked signals, and transfers the bounded dossier only after the leader confirms it. Search failure or thin evidence is shown as thin rather than filled with invented context.
- Decide decomposes a call into claims, verifies load-bearing claims, and exposes the evidence trail and judgement boundary.
- A Blind Spot pattern requires one current user-authored or verified intention plus at least two distinct recurrence records. The recurrence must span two source kinds or at least seven days. Anything weaker is labelled a tension and asks one low-cost question.
- Blind Spot displays server-owned excerpts, source labels, dates, and evidence strength. A generated candidate is not saved before confirmation.
- Rejected Blind Spot evidence is suppressed until the inputs change. A confirmed pattern can create one experiment and a later briefing check-in.
- Memory is owner-scoped, correctable, exportable, and protected by row-level security. The application also writes an AES-256-GCM encrypted shadow payload, but retains plaintext fields for display and search. Never claim end-to-end encryption, exclusively encrypted storage, or a security certification.
- The Edge Pro MCP server is read-only, uses a revocable per-leader bearer token, and exposes the leader's current context. Briefing access is opt-in.
- Delivery subscriptions can send the useful briefing by email and link to audio without requiring a dashboard visit. Do not promise WhatsApp, Slack, or another channel until it is shipped and listed in the current feature inventory.

## Message hierarchy

Use this order. Stop when the channel has enough context.

1. **Outcome:** A quieter way through AI.
2. **Buyer problem:** Too much AI information, too little context, and no time to check every important assumption.
3. **Mechanism:** CTRL filters the AI world through what the leader is deciding, weighs real calls against evidence, and remembers what matters.
4. **Proof:** Show one exact product mechanic from the section above.
5. **Action:** Start with one real question or view pricing.

Approved short description:

> CTRL is a calm AI decision partner for founders and small-team CEOs. It filters the AI world through what they are actually deciding, weighs a real call against evidence, keeps portable context, and sends a short daily read or listen.

Approved conversational pitch:

> You probably do not need more AI information. You need the useful part connected to the calls already on your desk. CTRL gives you a short daily read, helps you weigh one real decision against evidence, and remembers the context you would otherwise repeat to every AI tool.

## Voice

Sound like a trusted advisor who has done the reading: warm, direct, curious, specific, and economical. Lead with the useful observation. Use ordinary language and contractions. Keep the leader's judgement in the loop.

Do not use hype, fear, fake intimacy, corporate filler, or a barrage of features. Avoid “revolutionary,” “game-changing,” “10x,” “AI-native chief of staff,” “portable AI double,” and “replace your judgement.” Use no em dashes.

## Objection boundaries

| Question | Defensible answer |
|---|---|
| Why not use ChatGPT memory? | CTRL is designed as portable, structured context and decision support across tools. Edge Pro can expose current context through read-only MCP. Do not speculate about another product's current memory implementation. |
| Will it decide for me? | No. CTRL checks evidence and clarifies tensions, then makes the judgement boundary visible. The call stays with the leader. |
| Is this consulting? | CTRL is a self-serve software product with Free and Edge Pro tiers. Separate Mindmaker services are outside this product and require separate live verification. |
| Is my data encrypted? | Sensitive memory writes include a field-level encrypted shadow and records are owner-scoped with row-level security. Plaintext fields are retained for product use, so do not describe the system as end-to-end or exclusively encrypted. |
| Are you SOC 2, ISO 27001, or HIPAA compliant? | No. CTRL holds no SOC 2 report and no ISO/IEC 27001 certificate, and has completed no third-party audit. HIPAA is out of scope because CTRL does not process protected health information. Point the buyer at `https://makeyourmindup.ai/trust`, which states the controls in place, the ones in progress, and the ones absent. Never place a certification mark on any surface. |
| How long does setup take? | The public intake asks one question at a time by voice or text. Do not promise a completion time unless a current measured result is supplied. |
| Does it integrate with Slack or WhatsApp? | Not as a shipped current channel. Today, web, email, audio, context export, and Edge Pro MCP are the current paths. |
| Can I get this for my leadership team? | No. CTRL is built for one person: no seats, no shared workspace, no admin console. A team-level ask is a separate Mindmaker engagement and must be verified live, never quoted from this repository. |
| Can my assistant have access? | No. One person, one account. Delivery by email and export exists so a leader can share an output without sharing the account. |
| Can I think something through without it being kept? | Yes. Off the record writes nothing durable for that session, and the product says so when a session saved nothing. |

## Disclosure ladder

The operating principle for every trust question: **answer the question that was asked, at the altitude it was asked, then return to the value.**

Three rules follow. **Never pre-empt:** do not raise SOC 2, DPAs, subprocessors, incidents, or roadmap gaps before the buyer does, because raising them yourself signals that you think they are a problem. **Never evade:** if asked directly, answer completely and plainly on the first pass, because a buyer who has to ask twice stops believing the first answer. **Always land back on value.**

Move to the next tier only when asked.

### Tier 1: the default answer

| Question | Answer |
|---|---|
| Where does my data live? | On your own account, encrypted, and only you can see it. You can export the whole thing or delete it whenever you want. |
| Is it private? | Yours alone. There is no team view, no shared workspace, and no other account can reach it. |
| Do you train on it? | No. Your content is not used to train models. |
| Does it connect to my systems? | No, and that is deliberate. It works from a browser and sends what is useful to your inbox. Nothing to approve. |

These four are published at `https://makeyourmindup.ai/faq` alongside the notebook test: *if you would write it in a notebook you carry home, put it in CTRL; if it belongs in your company's systems, put it there.* That sentence hands the judgement back to the buyer instead of treating them as a compliance risk.

### Tier 2: a real follow-up

Full, plain, complete. No hedging.

- **Who else touches it?** It runs on Supabase in the United States and uses the major model providers to do the thinking, under API terms that exclude your content from training. The full subprocessor register is in the privacy policy and I am happy to walk you through it.
- **How is it protected?** Every account is isolated at the database level, sensitive memory carries an AES-256-GCM encrypted payload at rest, everything is encrypted in transit, and card details never touch us. Plaintext fields are retained for display and search, so this is not end-to-end encryption and must never be described as such.
- **Can I get my data out?** Yes, in JSON or markdown, formatted for ChatGPT, Claude, Gemini, Cursor, or Claude Code.
- **Do you read it?** The founder has operator access to the database, the way any founder of a small product does. Client memory is not read. There is no data-access audit log that proves it yet, and an agent must not pretend otherwise. Until that log ships, never claim operator access is provably unused.

### Tier 3: a technical or legal reviewer is in the room

The goal is a clean, warm exit from the process rather than a win inside it.

- **Security questionnaire.** Send exactly what exists: the privacy policy, the subprocessor register, and a straight note on what is in place and what is on the roadmap, all of which `https://makeyourmindup.ai/trust` already states. There is no SOC 2 report. CTRL is a personal tool rather than a company system, so if their process requires a certified vendor, the right answer is that company material should not go in it. Do not attempt the questionnaire.
- **Incidents.** Answer only if asked directly, and never volunteer it. One: in mid-2026 a database policy misconfiguration was found during a review, fixed, and written up in the incident record.

### The three conversations that decide the frame

| Question | Answer |
|---|---|
| Can I get this for my leadership team? | CTRL is built for one person, so there is no team version. If the real aim is to change how the team decides, that is a Mindmaker engagement rather than the app. Verify any service offer live before describing it. |
| Can I expense it? | You can, though most people use a personal card and keep it out of the company tooling conversation entirely. It is yours either way. |
| Is this just a way to sell me consulting? | Some people who use CTRL end up working with Krish. Most do not. It has to be worth using on its own or it is not worth building. |

## Vocabulary

**Use:** your account, yours alone, private, portable, export, one person, works the moment you sign in, nothing to approve, your thinking, the decision you are carrying, take it with you.

**Avoid:** enterprise, platform, deployment, rollout, seats, team, workspace, admin, integration, security posture, compliant, data governance. Each one invites a buyer to imagine a procurement process.

**Never claim** that CTRL holds no personal data. It holds email, name, company, role, voice transcripts, chat, and behavioural patterns.

The stronger line is now supportable and may be used: *CTRL holds personal data about you, and about nobody else.* The evidence, as of 2026-08-21, is that the extraction guard is live on every Memory write path and the backfill over existing rows scanned all 196 and found none requiring rewriting.

State it as the design and the current state, which is what it is. Do not upgrade it into a guarantee: the guard is a heuristic that reduces third-party capture, not a proof that no name can ever be stored. If a buyer presses on how it works, the honest Tier 2 answer is that a person named beside a role is stored as the role, a fact whose subject is someone else is refused, and stored memory was swept and found clean.

## Claim policy

An agent may state a claim only when it is supported by code, live readback, this document, or the machine record. It must label any calculation, inference, or projection as such.

Never invent or imply:

- customer counts, revenue, conversion, retention, hours saved, decision improvements, or ROI;
- named customers, testimonials, case studies, logos, or endorsements;
- guaranteed outcomes, security certifications, regulatory compliance, or legal conclusions;
- integration support, roadmap dates, annual terms, discounts, or service availability;
- competitive product behavior that has not been checked from a current primary source.

Published website copy is a marketing surface, not an authority for new claims. If it conflicts with code, current documentation, or the machine record, log the discrepancy and use the higher authority.

## Calls to action and attribution

- Primary: `https://makeyourmindup.ai/`
- Pricing: `https://makeyourmindup.ai/pricing`
- Agent-native detail: `https://makeyourmindup.ai/agents`
- Security posture: `https://makeyourmindup.ai/trust`

For approved campaign work, preserve the supported attribution fields: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `agent`, and `campaign_id`. Never put personal, confidential, or sensitive information in a URL. Link generation does not authorize publishing or sending.

## Freshness and authority

For commercial work, use this order:

1. Live product, billing, deployment, and database readback.
2. Executable owner sources for routes, entitlements, prices, evidence, and delivery.
3. [`public/.well-known/product.json`](../../public/.well-known/product.json).
4. This commercial authority and the rest of [`docs/current/`](./README.md).
5. Accepted decisions and named subsystem references.
6. Historical commercial files, public copy, roadmaps, prototypes, and Git history.

Reverify volatile facts at action time. Price, availability, domain, service offers, legal terms, integrations, deployment state, and competitors are volatile. If current evidence is unavailable, omit the claim or ask for authority. The agent procedure is in [marketing and sales instructions](../agent-instructions/marketing-sales.md).
