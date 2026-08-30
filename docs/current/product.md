# CTRL product

Status: Current
Owner: Mindmaker
Last verified: 2026-08-30 against production application baseline `19d80f36ecda990bce4c3e1e6d18c97387d9ed33`, `src/router.tsx`, and the deployed onboarding and Blind Spot contracts

CTRL is a calm AI decision partner for founders and small-team CEOs building the AI-native version of their business. Make Your Mind Up is its warm public intake. The product lives at [makeyourmindup.ai](https://makeyourmindup.ai).

## The user and the job

The core user is already using AI but has no time to assemble context, follow the market, or verify every important assumption. CTRL reduces two costs:

- The context cost: repeating the business, priorities, and judgement to every AI tool.
- The evidence cost: making consequential calls from a partial feed and an untested instinct.

The product succeeds when the leader can make a better call with less interface time.

## One value loop

```text
one-question intake
  -> optional company recognition and fresh evidence
  -> one-click confirmation or correction
  -> consented context
  -> one useful First Lens
  -> shared, corroborated AI intelligence
  -> personal ranking and briefing
  -> one decision weighed against evidence
  -> explicit correction or confirmation
  -> stronger memory and future ranking
```

Every surface must strengthen this loop. A new feed, profile, assistant, or workflow that creates a second loop is a product defect.

## Primary experience

| Surface | One job | Primary ask |
|---|---|---|
| Today | Show the useful part of today through the leader's lens | Read, listen, or take one next step |
| Decide | Test one real call against live evidence | Weigh this decision |
| Blind Spot | Offer one private, grounded read with visible proof | Try one small experiment, correct the read, or talk it through |
| Memory | Keep portable context and corrections | See the graph, correct facts, or open generated artifacts |
| Briefing | Deliver the same ranked truth in a human voice | Listen, read, or ask one follow-up |
| Settings | Keep control and privacy reachable | Change one preference or data choice |

The primary navigation is Today, Decide, Blind spot, and Memory. Briefing is a signature control and dedicated route. Settings is always reachable without competing with the core navigation.

Memory keeps only three facets: Graph, All facts, and Library. Privacy, retention, import, and data export have one owner in Settings rather than duplicate controls inside Memory.

## Entry and delivery

- The public intake asks one warm question at a time and requires no account.
- A work email or LinkedIn URL may resolve a company dossier in the background. The result shows the company, role, source strength, and at most three fresh linked signals before the leader confirms it.
- Thin or failed enrichment stays quiet and honest. It never fabricates a company, news item, or completed search step.
- Only consented, bounded context crosses the handoff into CTRL.
- First Lens must make the handoff feel immediately useful, not like another setup step.
- Email and audio are first-class delivery modes. A user can receive value without opening the dashboard.
- Home, audio, email, and future channels consume the same ranked pool. Channels do not curate separate versions of reality.

## Experience laws

1. User overwhelm is poison.
2. Present one primary ask at a time.
3. Keep common actions one tap or one click away.
4. Preserve premium category visuals when they carry meaning.
5. Use plain language. Explain real AI concepts; never make users learn CTRL jargon.
6. Keep judgement with the leader. Confidence follows evidence.
7. Treat loading, empty, error, retry, and done states as part of the experience.
8. Keep visible meaning inside the viewport. No horizontal overflow or clipped primary copy.
9. Use 44px minimum targets for signature controls.
10. Use Segoe UI Variable Display for display text and Segoe UI Variable Text for human-facing body and controls. Reserve mono for compact metadata.
11. Use a dark, quiet, instrument-grade visual system with restrained emerald emphasis.
12. Let the public intake begin in Make Your Mind Up warmth, then progressively converge its mark and palette on CTRL as context becomes useful. The result state must match the main app exactly.
13. Use no em dashes in product copy or documentation.

## Voice

CTRL sounds like a curious, well-informed person who wants to help the leader see more clearly. It is warm, direct, specific, and willing to say when evidence is thin. It does not sound therapeutic, grandiose, corporate, or certain without grounds.

The audio briefing follows the same voice. Spoken follow-up must remain grounded in the briefing and the leader's authorised context.

## Learning and consent

- Explicit facts may enter durable memory after a clear user action.
- Company and role enrichment remain provisional until the leader chooses the result-state action. `Not quite` replaces the starting identity with one work email or LinkedIn URL and reruns the same pipeline.
- Tentative inferences remain candidates until confirmed.
- Content reactions tune ranking; they do not become personality facts.
- Skipping is neutral.
- Blind Spot saves no pattern until the leader confirms it and the evidence floor is met.
- A Blind Spot pattern needs one current verified intention and two independent recurrence records. Anything thinner is labelled as a tension and asks one question.
- Rejecting a read stores only the reason and evidence fingerprint. CTRL does not repeat it until those inputs change.
- An accepted read creates one 15-minute experiment and one later briefing check-in. It does not create another history surface.
- Talk-back respects memory and transcript settings and says when nothing durable was saved.

## Commercial contract

The machine-readable authority is [`public/.well-known/product.json`](../../public/.well-known/product.json). The price constant lives in [`supabase/functions/_shared/edge-pricing.ts`](../../supabase/functions/_shared/edge-pricing.ts), and capability entitlement lives in [`src/constants/planMatrix.ts`](../../src/constants/planMatrix.ts).

Free is a useful daily instrument. Edge Pro is the decision tier. Documentation must never duplicate a mutable Stripe amount without a validation check.

## Shape

CTRL is a private thinking instrument for one person. The enterprise conversation is triggered by the data class a user puts into the product, not by who pays for it, so the only durable answer is structural. These four boundaries are product contract, not backlog order:

1. **One person, one account.** No seats, no invites, no shared workspaces.
2. **No admin console, no SSO, no company directory.**
3. **If an IT administrator has to approve it, we do not build it.** This rules out Google Workspace, Microsoft Graph and workspace-level Slack scopes, calendar read scopes, and anything with an admin consent screen. Delivery reaches the leader through paths they control on their own: email, downloads, clipboard, `.ics` files, and read-only MCP that runs inside their own client.
4. **No meeting recording.** Recording is a multi-party consent problem and the fastest route from personal notebook to company system.

A leader who wants their team to decide differently is describing an engagement, not a product tier. Redirect rather than build seats.

## Non-goals

- A generic business chatbot.
- A second news feed for each channel.
- A visible toolbox of every backend capability.
- A profile-completion game, streak, score, or setup chore.
- An advisory-services funnel.
- The retired lesson-kit product.
- Skill Builder as a primary destination. Export and MCP generation may exist only as nested portability harnesses.
- Teams, seats, shared workspaces, an admin console, SSO, or a company directory.
- Meeting recording or transcription of a call.
- Any integration that requires an IT administrator to approve a scope.

## Product acceptance

A material product change is acceptable only when it preserves the single value loop, reduces or holds cognitive load, keeps Settings and recovery reachable, respects consent, and works on the real authenticated surface at desktop, mobile, and 320px.
