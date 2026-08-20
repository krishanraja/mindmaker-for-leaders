# CTRL pricing

Status: Historical
Superseded: 2026-08-20
Owner: Mindmaker

> **Not current guidance.** This file is retained because `CHALLENGE.md` cites it as the pricing record of the 2026-08-04 ruling, and that citation must keep resolving. It is no longer canon.
>
> Current authority: [`docs/current/commercial.md`](./current/commercial.md) for the human-readable offer, [`public/.well-known/product.json`](../public/.well-known/product.json) for the machine record, `supabase/functions/_shared/edge-pricing.ts` for the price, and `src/constants/planMatrix.ts` for entitlements. Where this file and those disagree, they win.

Last reconciled: 2026-08-10

CTRL has two self-serve tiers. Free is a useful daily instrument, not a trial. Edge Pro deepens the decision engine and makes CTRL's context available to the leader's own agents.

The price is canonical in `supabase/functions/_shared/edge-pricing.ts` (`EDGE_PRO_UNIT_AMOUNT_CENTS = 4900`). The capability matrix is canonical in `src/constants/planMatrix.ts`.

| Capability | Free | Edge Pro ($49 / month) |
|---|---|---|
| Memory Web (read-write) | Yes | Yes |
| Blind Spot reflections | Yes | Yes |
| Daily personalised briefing | Yes | Yes |
| Decision engine (weigh + verify) | 3 / month | Unlimited |
| Multi-model cross-examination | No | Yes |
| Decision watch | No | Yes |
| Edge artifacts (memos, docs, emails, agendas) | No | Yes |
| Live MCP pull of context and built skills | No | Yes |
| Artifact email delivery | No | Yes |

The lesson-kit product is retired. Automator/Skill Builder is not a promoted product or entitlement; any surviving skill-generation machinery is a nested portability harness. The dormant voice-profile capture component is also not a current marketed capability.

Free earns trust through the daily read, portable memory, careful Blind Spot reflections, and three complete decision weighs. Edge Pro earns its price where depth compounds: unlimited weighs, a second independent model, ongoing assumption monitoring, usable artifacts, and agent access.

All upgrade calls use the same Stripe Checkout flow through `useEdgeSubscription().subscribe()`. Entitlement is restored through the webhook and `verify-edge-subscription` fallback. If product copy conflicts with the code constants, fix the product copy and this document together.
