# CTRL design delivery state

Status: Current
Owner: Mindmaker
Last verified: 2026-08-11 against the `codex/blind-spot-trusted-advisor` working tree and locked prototype hash below

This is the single resumable state route for material CTRL interface work. Product and architecture truth remain in the other `docs/current/` documents. Accepted product decisions remain in `project-documentation/DECISIONS_LOG.md`.

## Current phase

- Surface: Blind Spot trusted-advisor redesign
- Phase: Verified preview candidate
- Gate: Founder preview acceptance against the built production vertical slice
- Production implementation: Authorised locally on `codex/blind-spot-trusted-advisor`
- Data mode: Synthetic fixture only

## Design task contract

| Field | Current truth |
|---|---|
| State of use | Busy leader, morning or between meetings, one-handed mobile and desktop web |
| User and action | Understand one evidence-backed read, inspect its basis, then test or correct it |
| Governing rule | A pattern is a supported inference, never a model claim presented as fact |
| Data truth | One verified intention plus independent recurrences; sparse evidence becomes an honest tension |
| Materiality | Material redesign |
| Brand and voice | CTRL visual system; MakeYourMindUp warmth and directness |
| Authority | Founder-approved v1 prototype plus locally verified production components and data contract |
| Proof | 1440×900, 1280×720, 390×844 and 320×568; visual, keyboard, focus, target and overflow checks |

## Concept trace

Sanitized brief revision: `BS-2026-08-11-A`

Invariant constraints: one short read; conclusion before proof; exact dated evidence; visible evidence strength without a confidence percentage; one experiment; low-cost correction; quiet grounded conversation; CTRL typography, navigation and surface tokens; rose only as a tension signal; no nested component scroll; no stored candidate before confirmation.

### Independent spines

| ID | Governing metaphor | Sequencing | Primary interaction | Information and state model |
|---|---|---|---|---|
| A | Tension instrument | Read, relationship, test | Inspect connected anchors | One intention opposed by repeated evidence around a semantic tension axis |
| B | Signal trail | Evidence over time, read, test | Scrub or expand chronology | A dated trail converges on a supported inference |
| C | Confidential case note | Private note, proof, response | Disclose and annotate | A restrained advisor dossier with source stamps and correction paths |

Pairwise distance: A/B differ on sequencing, spatial structure and primary interaction. A/C differ on spatial structure, agency and state model. B/C differ on sequencing, information structure and interaction. Diversity gate passed.

### Judging

Rubric: clarity, evidence honesty, CTRL consistency, confidentiality, mobile fit and implementation feasibility.

| Candidate | Clarity | Evidence honesty | CTRL fit | Confidentiality | Mobile fit | Feasibility | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| A | 5 | 4 | 5 | 4 | 4 | 5 | Winner |
| B | 4 | 5 | 4 | 3 | 3 | 4 | Strong proof, wrong sequence and too dense |
| C | 4 | 4 | 4 | 5 | 4 | 5 | Warmest, but too close to a text card |

The second rubric pass reached the same winner. No hard-constraint or diversity disagreement required a tiebreaker. The synthesis uses A's spatial causality, B's dated source labels and C's private-state framing. It does not preserve B's chronology-first sequence or C's dossier container.

### Feasibility evidence

- Existing CTRL tokens already provide deep instrument surfaces, emerald navigation, the Segoe Variable family and a rose challenge signal.
- Existing Blind Spot confirmation already reloads and re-grounds evidence idempotently; v2 must retain that boundary while replacing flattened strings with owner-scoped anchors.
- Existing voice capture, transcription, recovery and TTS paths can serve the bounded advisor sheet without a second conversation stack.
- Existing shared desktop rail, mobile navigation and public preview route can host the deterministic instrument and fixture range.

## Artifact under review

- Revision: `BLIND-SPOT-INSTRUMENT-v1`
- File: `prototypes/blind-spot-instrument-v1.html`
- SHA-256: `0515f1dbb745e587694fc9b3c4aca60a205a5cd4120bac6bb6b4ebf9841a579a`
- File size: 33,989 bytes
- Data: Synthetic and explicitly labelled
- Approval state: Explicitly approved by Krish on 2026-08-11
- Locked scope: Blind Spot instrument hierarchy, tension map, evidence treatment, experiment action, correction path, advisor sheet, responsive behavior and CTRL visual system
- Downstream owner: `krish-build`
- Next action: Founder preview acceptance against the matching Git revision

### Rendered evidence

| Viewport | Result |
|---|---|
| 1440×900 | No horizontal overflow, no undersized controls, full primary state visible |
| 1280×720 | No horizontal or vertical overflow after compact-height correction, full primary state visible |
| 390×844 | No horizontal or vertical overflow, read, evidence overview and all response controls visible without scrolling |
| 320×568 | No horizontal overflow, one natural page scroll, experiment and controls clear bottom navigation |

Interactive evidence inspection, all three rejection reasons, stop-after-rejection, experiment acceptance, grounded talk sheet and dialog close behavior passed in the rendered fixture. Browser console returned no warnings or errors. Display, body and metadata resolve to the intended CTRL font roles. Visible controls meet the 44px minimum target in all four viewports. Keyboard focus styling resolves to a 2px light outline; production implementation still requires the full automated keyboard-order and reduced-motion suite.

## Implemented candidate

- Deterministic production instrument split from its data container
- Structured source-ID evidence contract, server-held excerpts, qualification, signing, suppression, and confirmation adjudication
- Additive owner-scoped evidence-link, rejection, and experiment migration plus pgTAP contract
- Bounded voice and text advisor using existing transcription, recovery, and TTS infrastructure
- One due experiment check-in through the existing briefing learning slot
- Public state fixtures rendered inside the shared desktop and mobile shells
- Product, feature, architecture, release, decision, privacy, retention, ROPA, DSAR, and changelog documentation

## Verification evidence

- 870 Vitest tests pass across 53 files.
- 37 Blind Spot Playwright checks pass at 1440x900, 1280x720, 390x844, and 320x568 inside the shared app shells.
- Typecheck adds zero diagnostics to the 221-diagnostic baseline.
- Changed-file ESLint, standards, documentation drift, production build, and 3/3 prerender checks pass.
- Local pgTAP execution is blocked only because Docker Desktop is not running. No remote database was mutated to bypass that local environment constraint.

## Remaining gates

- Preview acceptance against the matching Git revision
- Reviewed pull request and merge
- Separate exact production deployment approval and deployed-revision verification
