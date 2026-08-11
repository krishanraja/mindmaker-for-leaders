# CTRL documentation standards

Status: Current
Owner: Mindmaker
Last verified: 2026-08-10

Documentation is part of the release. Its job is to let a new engineer, operator, or agent find current truth without reading chronology or guessing which overlay wins.

## Document classes

| Class | Meaning | Required header |
|---|---|---|
| Current | Describes the product or system now | Status, owner, last verified |
| Reference | Detailed subsystem, policy, or runbook that remains valid | Purpose and review date |
| Historical | Records a decision, release, prototype, or prior state | A clear “not current guidance” notice |

Only `docs/current/` may claim to be the general current product and architecture layer. A subsystem reference may be authoritative inside its named boundary.

## Writing rules

- Lead with the answer or operating rule.
- Keep one topic per paragraph and one source of truth per mutable fact.
- Use tables for repeated mappings; use diagrams only when relationships are easier to see than read.
- Prefer concrete paths, commands, states, and pass signals.
- Link to the owner of mutable pricing, routes, schema, and entitlements instead of copying it.
- Separate verified state, inference, planned work, and history.
- Use no em dashes.
- Do not preserve stale prose by placing a “current overlay” above it.

## Authority and history

- Executable state and authoritative readback outrank prose.
- Current docs explain the present. Git and explicitly historical records explain the past.
- Decisions use append-only, unique numeric IDs. A later decision may supersede an earlier one but may not reuse its ID.
- Delivery state records evidence, not a conversation transcript or unapproved next action.
- Compliance claims name the capability and provider path. Do not describe one global primary model unless code actually has one.

## Freshness

Update documentation in the same change when any of these move:

- product name, domain, audience, value loop, navigation, or price authority;
- route, auth boundary, core data ownership, provider order, or cron contract;
- setup, test, build, deployment, rollback, or recovery command;
- production revision, verification evidence, or known material constraint.

Review dates are evidence only when the body was checked. Changing a date without reconciling the content is documentation drift.

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
- known unsafe or stale claims in the current path;
- pricing consistency between the public product record and code constants;
- size budgets that prevent current docs becoming release journals.

CI runs the same command. If a deliberate system change breaks the gate, update both the owner source and the documentation check in the same pull request.

## Review checklist

Before calling documentation complete:

1. Start from the root README as a new engineer.
2. Follow every job path in `docs/current/README.md`.
3. Run the documented setup and verification commands or mark an inaccessible boundary explicitly.
4. Compare product, routes, providers, pricing, counts, and release state with their owner sources.
5. Run `npm run docs:check`, tests, typecheck, and build.
6. Inspect the Git diff for unrelated edits, secrets, placeholders, and future-state claims.
