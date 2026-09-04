# CTRL Rebuild - Journey & Blueprint
### How Krish + Claude design and build an app together

> Two purposes: (1) a **Mindmaker live-learning** record of how this product was actually thought through, and (2) a reusable **blueprint** for the collaborative build method. The loose artifacts (mocks, framework, corpus, design log) are the evidence; this doc is the narrative that ties them together. Updated as we go.

---

## 1. The method (the repeatable part)

For each surface of the app:
1. **Diverge** - spin up 4 genuinely different design concepts in parallel (a multi-agent workflow), each committing fully to one direction, none hedging.
2. **Judge** - 3 adversarial judges score each concept on tuned lenses (e.g. founder-fatigue, design-law compliance, honesty/fidelity). They hunt for what's wrong, not what's nice.
3. **Synthesize** - one lead pass picks the strongest *spine* (best bones, not just best score), grafts the best ideas off the losers, and designs around every flaw the judges found. It also surfaces the genuine open product decisions rather than assuming them.
4. **One mock** - Claude hand-builds a single HTML/SVG prototype from the synthesis (in `prototypes/`), opens it in the browser.
5. **Krish reacts** - one mock at a time, pause for his read. He course-corrects in plain language.
6. **Lock** - the decision goes into `_DESIGN-LOG.md`, then the next surface.

**Modes.** "Ultracode" = use the multi-agent workflows for depth (token-heavy - watch real account limits). "Lean" = Claude reads the already-cached results off disk and synthesizes/builds directly, no fleets. Switch to lean when budget matters; the cached diverge/judge work is reusable for free.

**Why it works.** Divergence beats one-shot because the solution space is wide; adversarial judging kills plausible-but-wrong ideas; the founder stays the taste/decision authority and reacts to something concrete rather than debating in the abstract. "You drive, I guide" - Claude picks the next surface and proposes; Krish steers.

**Systematize emergently, not prematurely (Krish, 2026-06-12 - a load-bearing meta-principle of the method).** We did NOT impose a design system, or most of the laws, up front. We explored freely, surface by surface, and EXTRACTED the system once the patterns were earned - the styleguide came from `decision-map-2.html` (the best surface we'd built), not from a guess on day one. A premature design system would have constrained the creative freedom that actually found the good patterns, and we'd have systematized something shallower and then been stuck defending it. The sequence is **explore -> extract -> enforce**: earn the pattern on real surfaces, abstract it once it's proven, then let it be the floor and adversarially harden it. The same is true of the laws themselves - nearly every one (clarify-not-recommend, exhaustive-engine/calm-surface, mobile=stable/haptic, no-truncation) was *discovered through a wrong turn*, not specified in advance. So: build the principles in dynamically as you go; let structure crystallize out of real work rather than precede it. (This is itself a reusable build philosophy, not just a CTRL fact.)

---

## 2. The hard-won laws (the learnings that govern everything)

These emerged from real corrections in the work - each one cost a wrong turn to find:
- **CTRL clarifies, it never recommends from a thin signal.** The leader is always the decider. Never bet -> verdict off one weak signal (that gets the app blamed). Confidence-gated: state something plainly only when it's blindingly obvious + verified.
- **Exhaustive engine, calm surface.** Compute everything (~70 considerations, every failure-mode test, every scaffold); surface only the few that are decisive AND unsettled. The leader never trades thorough against simple.
- **Honesty enforced in the renderer, not the copy.** A question only the leader can answer is structurally un-paintable with a web verdict (a locked material). The cardinal rule is physics, not a writing guideline.
- **Mobile = stable, visual, haptic, near-textless.** Surface state through material, form, light, position - not walls of generated text. Never cram generated/dynamic text into fixed mobile layouts (it truncates/wraps/breaks). Rich text lives in a focused single-item drill-in with room to breathe. (Learned the hard way - twice - via truncation.)
- **Clarity AND no truncation.** Cards still need short plain-English labels so a CEO knows what each is; the fix is short + box-sized + wrap, never starve-to-cryptic and never ellipsis-clip.
- **No layout shift.** Fixed dimensions, fixed-width chip columns; content never resizes or shifts a neighbour. It must look like a built app, not free-floating divs.
- **Voice in substance, precision in chrome.** The founder's voice lives only in content; every control/label names its exact function in plain English. No personality in chrome.
- **Options, not open questions ("pick, don't type").** A tired CEO never fills a blank box; CTRL proposes, they pick/confirm/tweak.
- **Radical simplicity / one thing at a time.** Fewer surfaces; the decision-detail + briefing + pressure-test consolidated into ONE decision map.
- **Robust to any content (Krish, 2026-06-12).** The recurring trap: pixel-tuning a mock to the demo string so it shatters when real, variable-length generated text flows through. Build components content-agnostic (flex text shrinks+wraps, controls never shrink below content, regions scroll not clip, long tokens break) and STRESS-TEST every one at worst-case length. The system guarantees robustness; the styleguide proves it. Never tune a layout to a string.

---

## 3. The surface sequence (what we designed, in order)

| # | Surface | Outcome |
|---|---|---|
| 1 | Mobile shell / home cockpit | "AI decision cockpit"; glowing-infographic hero; fixed frame |
| 2 | Capture | "pick, don't type" - CTRL proposes the live AI calls, you tap |
| 3 | Decision detail | your call quoted back + the signal that moved + 2 actions |
| 4 | Onboarding anchor | "draft cockpit, corrected in place" (Spine D) |
| 5 | Pressure-test | commit-blind stance (Agree/Disagree), gut-vs-ground delta |
| 6 | Briefing | "glance card + layered depth" (Concept C); honesty governor |
| 7 | Desktop command centre | bet-rail + canvas state-machine + brain canvas (architecture locked) |
| - | **Reframe** | CTRL = a clarity instrument, not a recommender; the **decision map** is the core object |
| - | Decisioning research | Krish's Perplexity crawl -> `DECISIONING CORPUS.md` -> `CTRL-DECISIONING-FRAMEWORK.md` |
| 8 | Decision map (v1, text) | **REJECTED** - over-cooked, truncating; the lesson that birthed the mobile-haptic law |
| 8b | Decision map (rebuilt) | "the spine" - component *stones* read by material; text only in the drill-in |

---

## 4. Prototype index (`prototypes/`, open in a browser)

- `mobile-shell.html` - the 3 shell directions (A chosen)
- `mobile-home-fixed.html` / `mobile-home-ai.html` / `mobile-home-hero.html` - the cockpit + the locked glowing hero
- `capture.html` - pick-don't-type capture
- `decision-detail.html` - tap a bet -> your call + what moved
- `onboarding-anchor.html` - draft cockpit, corrected in place
- `pressure-test.html` - commit-blind stance + hold-vs-crack
- `briefing.html` - the glance card with layered depth
- `desktop-command-centre.html` - the desktop, 3 states (board / focus / brain)
- `decision-map.html` - the rejected text-heavy version (kept as the lesson)
- `decision-map-2.html` - the rebuilt stable/visual/haptic "spine"

## 5. Canonical docs

- `_STATE.md` - the live resume ledger (trigger: "CTRL Upgrades")
- `_DESIGN-LOG.md` - every locked design decision + the laws
- `CTRL-DECISIONING-FRAMEWORK.md` - the engine behind the decision map
- `DECISIONING CORPUS.md` - the decision-science research underneath it
