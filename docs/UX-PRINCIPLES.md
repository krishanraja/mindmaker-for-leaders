# CTRL UX principles

Status: Reference
Owner: Mindmaker
Last verified: 2026-08-20

The enumerated experience laws are owned by [`docs/current/product.md`](./current/product.md). This file is the reasoning and the worked examples behind them: why the rule exists, and what following it looks like on a real screen. When the two differ, product.md wins on the rule and this file explains it.

Read this when a screen gets cluttered, when a flow grows a step, or when it is
not obvious how to present a choice.

## Who we design for

A time-poor, context-switching executive. Attention is the scarce resource, not
information. The product wins by *removing* decisions and steps, not by adding
capability the user has to assemble themselves.

## 1. One baby step at a time

Every screen resolves to **exactly one primary action**. The user should never
have to choose between five stacked cards. Secondary actions collapse behind a
single, calm affordance (e.g. "Adjust") rather than competing for the same
visual weight.

- A screen with 8 stacked sections is a screen with no priority.
- If a section is not the next step, it is either hidden until it is, or it lives
  one tap away behind a single control.
- State machines render one state. Empty, cold-start, generating, error, ready —
  show the one that is true, never two at once.

## 2. Collapse the workflow behind the outcome

The CEO wants the **outcome**, not the machinery that produces it. Do not make
them run the pipeline.

- Wrong: "Generate audio" → wait → "Listen". Two steps, two icons, two
  decisions.
- Right: **"Listen."** One button. It synthesizes if needed and starts playback
  the moment it is ready. The pipeline is real; it is just invisible.
- Apply this everywhere: prefer a single verb that names the result over a chain
  of intermediate verbs that name the process.

## 3. AI automates time so the human reinvests it upward

This is the decision philosophy CTRL is built on. AI's first job is to **give the
leader their time back** — by doing the gathering, drafting, scanning, and
first-pass reasoning. The value is not the saved minutes; it is what the leader
does with them: **upgrade their own mental models and skills.**

So every decision-support surface should:

1. **Automate the legwork first** — collapse the research/synthesis/triage the
   leader would otherwise do by hand.
2. **Hand back a reusable model, not just an answer** — surface *why* (the
   anchor, the lens, the load-bearing claim) so the leader learns the pattern,
   not just the verdict.
3. **Compound** — each use should make the next decision faster and the leader
   sharper, not create dependence on a black box.

If a feature saves time but teaches nothing, it is half-built. If it explains but
saves no time, it is friction. We want both: time back *and* a better operator.

## 4. Minimal, consistent iconography

- One metaphor per concept. Audio playback is `Play`; the briefing's identity is
  `Radio`; voice input is `Mic`. We do not stack three audio-adjacent glyphs on
  one screen.
- No decorative `Sparkles`. Icons carry meaning or they are removed. Default
  semantic set: `Brain` (AI/intelligence), `Lightbulb` (suggestion/tip), `Zap`
  (upgrade/instant action), `Star` (featured), `ListChecks` (pick/set up),
  `Settings2` (adjust/tune).

## 5. Works on every screen

The same screen must cohere on a small phone and a wide desktop. Fixed-height,
no-scroll mobile layouts use viewport-relative floors (not hard pixel minimums)
so the primary input is never clipped behind the nav on short devices.

---

*If a new surface violates one of these, fix the surface. Do not weaken the
principle.*
