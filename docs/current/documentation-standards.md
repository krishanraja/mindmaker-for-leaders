# CTRL documentation standards

Status: Current
Owner: Mindmaker
Last verified: 2026-08-16

Documentation is part of the release. Its job is to let a new engineer, operator, or agent find current truth without reading chronology or guessing which overlay wins.

## Document classes

| Class | Meaning | Required header |
|---|---|---|
| Current | Describes the product or system now | Status, owner, last verified |
| Reference | Detailed subsystem, policy, or runbook that remains valid | Purpose and review date |
| Historical | Records a decision, release, prototype, or prior state | A clear “not current guidance” notice |

Only `docs/current/` may claim to be the general current product, commercial, and architecture layer. A subsystem reference may be authoritative inside its named boundary.

## Writing rules

- Lead with the answer or operating rule.
- Keep one topic per paragraph and one source of truth per mutable fact.
- Use tables for repeated mappings; use diagrams only when relationships are easier to see than read.
- Prefer concrete paths, commands, states, and pass signals.
- Link to the owner of mutable pricing, routes, schema, entitlements, and claims instead of copying it.
- Separate verified state, inference, planned work, and history.
- Use no em dashes.
- Do not preserve stale prose by placing a “current overlay” above it.

## Authority and history

- Executable state and authoritative readback outrank prose.
- Current docs explain the present. Git and explicitly historical records explain the past.
- [`commercial.md`](./commercial.md) is the one human-readable authority for buyer, offer, proof, messaging, objections, and commercial claim boundaries.
- `public/.well-known/product.json` is its machine-readable companion. Both must agree with executable owner sources.
- Public marketing copy is a published surface, not an authority when it conflicts with code or the current set.
- Decisions use append-only, unique numeric IDs. A later decision may supersede an earlier one but may not reuse its ID.
- Delivery state records evidence, not a conversation transcript or unapproved next action.
- Compliance claims name the capability and provider path. Do not describe one global primary model unless code actually has one.

## Freshness

Update documentation in the same change when any of these move:

- product name, domain, audience, value loop, navigation, or price authority;
- buyer qualification, offer, proof, claim boundary, or approved call to action;
- route, auth boundary, core data ownership, provider order, or cron contract;
- setup, test, build, deployment, rollback, or recovery command;
- production revision, verification evidence, or known material constraint.

Price, availability, domains, separate service offers, legal terms, integrations, deployment state, and competitor behavior require action-time verification. Review dates are evidence only when the body was checked. Changing a date without reconciling the content is documentation drift.

## Autonomous-agent contract

- Agents use progressive disclosure: the current authority first, then only the subsystem needed for the task.
- Agents may research, plan, draft, and recommend within scope.
- Drafting or link creation never authorizes sending, publishing, discounting, contracting, or changing an external system.
- An unsupported outward-facing claim is omitted. It is not converted into plausible language.
- Personal Memory, briefings, decisions, or Blind Spot evidence may not be repurposed for marketing without explicit, purpose-specific authority.
- Historical commercial files may teach chronology or taste, but never current price, capability, proof, privacy, or service availability.

## Automated gate

Run:

```bash
npm run docs:check
```

The gate checks:

- local Markdown links;
- required current-document metadata;
- measured Edge Function, hook, and migration counts;
- unique decision IDs;
- root agent-instruction length;
- current commercial and marketing-agent authority links;
- known unsafe or stale claims in current and machine-readable truth;
- pricing consistency between the public product record and code constants;
- size budgets that prevent current docs becoming release journals.

CI runs the same command. If a deliberate system change breaks the gate, update both the owner source and the documentation check in the same pull request.

## Review checklist

Before calling documentation complete:

1. Start from the root README as a new engineer, operator, and commercial agent.
2. Follow every job path in `docs/current/README.md`.
3. Run the documented setup and verification commands or mark an inaccessible boundary explicitly.
4. Compare product, buyer, offer, claims, routes, providers, pricing, counts, and release state with their owner sources.
5. Parse the machine record and compare it with the human commercial authority.
6. Run `npm run docs:check`, standards, tests, typecheck, and build.
7. Inspect the Git diff for unrelated edits, secrets, placeholders, unsupported metrics, and future-state claims.
