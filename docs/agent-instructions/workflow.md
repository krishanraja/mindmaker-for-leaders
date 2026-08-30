# Workflow and Git

Status: Current
Last verified: 2026-08-30

## Before editing

1. Read the root instructions and the current document for the boundary being changed.
2. Inspect `git status`, the active branch, and overlapping user changes.
3. State the target, source of truth, pass signals, rollback, and any external approval gate.
4. Work on an agent-prefixed branch, `claude/` or `codex/` by convention. An agent never pushes directly to `main`; only the repository owner may choose to merge locally.

## Editing

- Make the smallest coherent change that fixes the owner source.
- Keep current state, historical context, and future plans separate.
- Preserve unrelated edits and assets.
- Update `CHANGELOG.md` for a user-visible or operating-contract change.
- Do not add temporary screenshots, secrets, browser state, or generated debug files to Git.

## PowerShell

- Run commands separately instead of using Bash `&&` chains.
- Use PowerShell cmdlets such as `Select-Object`; do not assume `head`, `tail`, or Bash heredocs.
- Use `npm.cmd` or `npx.cmd` if command resolution requires it.
- Avoid inline SQL blocks whose quoting can be changed by PowerShell interpolation.

## Pull requests and releases

When commit and release authority is explicit:

1. Run the full applicable verification set.
2. Inspect and stage only intended files.
3. Commit atomically with an outcome-focused message.
4. Push the branch, create a pull request, wait for CI, and address failures.
5. Merge through the pull request. Return to `main` and pull.
6. Verify the deployed revision and canonical user path before claiming live.

Local implementation authority alone does not authorise deployment, production data writes, domain changes, spending, secret rotation, or deletion.
