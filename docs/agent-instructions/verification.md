# Verification and release evidence

Status: Current
Last verified: 2026-08-30

## Repository gates

Run the applicable focused test first, then the adjacent and full gates:

```bash
npm run docs:check
npm run standards:check
npm run typecheck
npm test -- --run
npm run build
```

Run strict ESLint on changed JavaScript and TypeScript files. The repository typecheck and lint gates are baseline-scoped; report that honestly.

Playwright needs an active target. Start `npm run dev` in another terminal, or set `E2E_BASE_URL` to an authorised preview, then run `npm run test:e2e`. Most authenticated specs remain skipped until their auth seed helper is wired, so report executed and skipped counts instead of calling the whole user journey covered.

## Runtime proof

- Frontend: exercise the real route, auth state, persistence, recovery, console, network, keyboard, touch, and target viewports.
- Edge Function: verify the configured auth contract, bounded failure, provider response shape, durable write, and retry behavior.
- Database: read back schema, policies, constraints, row invariants, and ledger state without printing secret values.
- Vercel: match the production deployment revision to the intended source revision and verify the canonical host body.
- Domain: verify canonical content and permanent redirects separately.

## Evidence rules

- Record exact revision, environment, viewport or fixture, command, and observed result.
- Separate built, committed, merged, deployed, live, and verified.
- A local fixture cannot prove production. A green deployment status cannot prove the user path.
- Existing failures remain disclosed. New or worsened failures block completion.
- After a correction, rerun the original failure and the nearest regression checks.

## Rollback

Before a release, record the known-good commit or deployment, the exact restore action, required access, and post-rollback readback. Additive schema changes remain dormant unless a separate destructive rollback is reviewed.

The complete release matrix lives in [`project-documentation/REPLICATION_GUIDE.md`](../../project-documentation/REPLICATION_GUIDE.md).
