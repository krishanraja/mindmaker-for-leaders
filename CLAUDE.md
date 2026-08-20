# CTRL coding instructions

Status: Current

CTRL is a Vite React application with a Supabase backend. Make Your Mind Up is its public intake; the product and canonical host are CTRL at `https://makeyourmindup.ai`.

## Commands

- Install: `npm ci`
- Develop: `npm run dev`
- Documentation: `npm run docs:check`
- Standards: `npm run standards:check`
- Typecheck: `npm run typecheck`
- Test: `npm test -- --run`
- Build: `npm run build`
- End to end: `npm run test:e2e`

Node.js must satisfy `>=22 <25`. The working shell is PowerShell on Windows: use separate commands, not Bash heredocs or Unix-only utilities.

## Universal rules

- Read [`docs/current/README.md`](./docs/current/README.md) before changing product, architecture, data, AI, or deployment behavior.
- User overwhelm is poison. Keep one primary ask, plain language, premium meaning-bearing visuals, Settings access, and 44px signature controls.
- Use Segoe UI Variable Display/Text for human-facing UI and mono only for compact metadata.
- Use no em dashes in code comments, product copy, or documentation.
- Preserve unrelated work and real brand assets. Never place server secrets in `VITE_*` variables.
- Treat executable code and live readback as truth. Update current documentation with behavior changes.
- Never apply a blanket production `supabase db push`; follow the reviewed production migration path.
- A release claim must distinguish built, committed, merged, deployed, live, and verified.

## Task-specific instructions

- [Workflow and Git](./docs/agent-instructions/workflow.md)
- [Frontend and product UX](./docs/agent-instructions/frontend.md)
- [Supabase, data, and AI](./docs/agent-instructions/supabase.md)
- [Marketing and sales](./docs/agent-instructions/marketing-sales.md)
- [Verification and release evidence](./docs/agent-instructions/verification.md)
