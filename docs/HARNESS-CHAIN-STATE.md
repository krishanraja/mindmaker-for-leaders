# Harness chain: where things stand, and where to pick up

One page. Read this before touching any of the nine stages.

The ruled register is `CHALLENGE.md` at the repo root. Everything in it was accepted on 2026-08-04 and **is not relitigated**. This file says what is live, what was deferred and why, and what is genuinely still open.

## Live

Nine stages, all merged to main and deployed. Each has an acceptance script that runs against the real deployed function, not a mock.

| Stage | Function | Surface | Acceptance |
|---|---|---|---|
| 1 INGEST | `ingest-evidence` | paste / transcript | `scripts/smoke-ingest-evidence.mjs` |
| 2 SORT | `build-sort`, `grade-sort` | `/sort` | `scripts/smoke-sort.mjs` |
| 3a COMPILE | `compile-standard` | `my-standard.md` | `scripts/smoke-compile.mjs` |
| 3b GENERATE | `generate-skill-export` | Automator, `/build` | in `smoke-ingest-evidence` |
| 5-7 SCRUB / CRITIQUE / PROVENANCE | `critique-artefact` | `/review` | `scripts/smoke-critique.mjs` |
| 7b MEASURE | `scripts/eval-skill.mjs` | item 30, the standard | fixture tests in CI |
| 8 DELIVER | `mcp-context` | Library, MCP | `scripts/smoke-deliver.mjs` |
| 9 LEARN | `capture-week` (cron Sun 20:00 UTC) | `/proposals` | `scripts/smoke-capture.mjs` |

Run all six:

```bash
for s in smoke-ingest-evidence smoke-sort smoke-compile smoke-critique smoke-deliver smoke-capture; do
  node scripts/$s.mjs || echo "FAILED: $s"
done
```

They need `SUPABASE_ACCESS_TOKEN` (the `sbp_` Management API token). Each creates a throwaway user and deletes it, so they are safe against prod and they double as the account-deletion test.

**Infrastructure**: 11 tables (`evidence`, `evidence_sources`, `constructs`, `criteria`, `harness_runs`, `sort_items`, `sort_grades`, `ledger`, `proposals`, `skill_provenance`, `mcp_pulls`), all owner-RLS and all in the delete-account sweep. Storage bucket `skill-packages`. No new secrets are required: `capture-week` accepts the service-role key that pg_cron already sends, and `CAPTURE_WEEK_SECRET` is optional hardening.

**Deploy gotcha**: `verify_jwt` is per-function and security-relevant. `mcp-context` (own bearer token) and `capture-week` plus the seven cron-invoked functions (shared secret) need `verify_jwt=false`. A deploy that hardcodes `true` silently breaks them, which happened once during the build and was caught only because the acceptance test hits the live deployment. Read and preserve the deployed value.

## Deferred by decision, and what reopens it

These are not gaps. Each was ruled, and each has a named trigger.

- **Plugin, marketplace repo, `.mcp.json`, OAuth on `mcp-context`** (CH-18). Deferred behind the standard-engagement measurement, which is already instrumented. **Reopens when**: the share of sort-completers who open or download `my-standard.md` within a week is known. Above roughly 30 percent the sort is the product and this work shrinks; below it the skill is the product and this is confirmed.
- **The org layer** (`orgs`, `org_members`, `role_bundles`, `standards`, org-scoped criteria) (CH-07). Cut because it taxed the hottest read path in the chain for zero tenants. `criteria.scope` and `criteria.owner_label` remain so it lands additively. **Reopens when**: two or more paying org customers exist.
- **The sort in the kit door** (CH-20). The chain is one door: `/sort`, `/review` and `/proposals` are authed-app only. The kit shares the generator, the provenance gate, Storage persistence, the install guide, the Edge Pro path and Library visibility. **Reopens when**: kit volume materially exceeds app volume, at which point graduation (`upgradeAnonymousSession`, wired only to `/build` today) becomes the first thing to build.

## Open, and needing a human

- **The peer corpus is empty.** `supabase/functions/_shared/peer-corpus.ts` ships complete machinery with three empty shelves and a curation checklist. It needs four real, public, attributed writing samples per surface. Writing prose and attributing it to a real person is a fabricated attribution, which is why no agent filled it. Until it is filled the deck runs 29 items instead of 33 and reports `peer_shortfall` honestly. This is an editorial call.
- **The hand run has not been done.** `docs/PHASE-0.5-HANDRUN.md` is a 20-minute pack. Every `[U]` threshold in the chain still sits at its specified default, marked provisional-pending-data. This is the only input that can say whether the discrimination kill rate reflects the item generator or the threshold.
- **Three surfaces are URL-only.** `/sort`, `/review`, `/proposals` are in no nav and no prefetch list. Deliberate, and it makes CH-01's falsification test live and measurable: under roughly one check per active user per week, the MCP write tools stop being optional and the ledger needs a second writer.

## Known limits, stated rather than hidden

- **Recall is bounded by the probe grammar, not by any threshold.** Most real criteria are not regex-checkable, so they compile to `untested` and never load. Widening `_shared/discrimination.ts` is the lever. Changing a `[U]` number is not.
- **Provisional is the normal outcome. Verified is rare by design.** It needs self-agreement 3 of 3 plus 10 graded held-out items plus precision and recall at or above the floor. The release reason names which constraint is binding, so the first real sort says what to work on.
- **`baseline_unresolved_claims` reports the pre-repair number and always will.** It measures generator quality. The shipped number is `unpointed_after_demotion` and it is zero by construction. Never merge the two.
- **The imperative detector is a recognition list.** A descriptive line opening with a listed verb can be demoted and read as false humility. It errs toward under-claiming, and the `marked_awaiting` ledger rows make its precision measurable from real packages.
- **Type A grouping matches rewordings, not paraphrases.** It under-groups on purpose; over-grouping would send an owner an invented rule with two unrelated quotes under it. The tempting fix is a model that groups, which is a model that selects, which is forbidden.

## The managed path

`skills/ctrl-{intake,compile,build,check,capture}` are the runnable no-code version of the same chain, for engagements where a human facilitates. They are versioned here (`skills/registry.md`) and this directory is canonical: runtime copies sync **from** here, and edits happen here first.

Stage numbering is load-bearing and drifted once already: `ctrl-capture` is **stage 9**, because revision 3 inserted DELIVER at 8. Any exported `.skill` bundle predating that fix carries the wrong number and should be rebuilt from this directory.

The two paths must not diverge on anything except who runs the elicitation. When they do, managed engagements stop producing data the product can use.
