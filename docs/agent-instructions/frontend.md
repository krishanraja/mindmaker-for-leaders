# Frontend and product UX

Status: Current
Last verified: 2026-08-10

Read [`../current/product.md`](../current/product.md) and [`../current/features.md`](../current/features.md) before changing a user-facing surface.

## Product contract

- CTRL is one product. Intake, Today, briefing, decisions, Blind Spot, and Memory share one value loop.
- Present one primary ask per state.
- Keep common actions one tap or click away and Settings always reachable.
- Preserve premium category motifs and real brand assets.
- Use approachable language. Explain genuine AI concepts with the existing hint pattern; do not invent CTRL vocabulary.
- Keep the leader's judgement in the loop and make evidence limits visible.

## Visual contract

- Use the `ctrl-ds` dark tokens and restrained emerald emphasis.
- Use `BrandLockup` for the app mark.
- Use Segoe UI Variable Display for headings and Segoe UI Variable Text for body, navigation, controls, and inputs.
- Reserve mono for evidence state, timestamps, duration, and compact metadata.
- Maintain at least 44px signature targets, visible focus, reduced-motion behavior, and honest loading and error states.
- Prevent horizontal overflow and clipped primary meaning at desktop, mobile, and 320px.

## Architecture

- Routes live in `src/router.tsx`.
- Persistent authenticated chrome lives under `AuthedLayoutRoute`.
- Reuse current components, hooks, query keys, tokens, and recovery patterns before adding a new abstraction.
- Do not create a second feed, preference control, onboarding, memory store, or navigation system.
- `/preview` is a deterministic fixture harness. It does not prove authenticated persistence or production behavior.

## Proof

Exercise the real route and the state changed: ready, loading, empty, failure, retry, persisted result, keyboard, touch, reduced motion, and relevant viewport bounds. A screenshot of a fixture is supporting evidence only.
