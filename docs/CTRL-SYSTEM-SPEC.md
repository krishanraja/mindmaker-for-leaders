# CTRL System Spec (one holistic instrument, not separate parts)

Status: founder-locked. The canonical rule for making CTRL feel like ONE coherent system. It sits above the surface specs (`MAIN-APP-POLISH-SPEC.md`, `KIT-REDESIGN-SPEC.md`): those say what each surface does; this says how they all cohere into one thing.

Why this exists: the app was built surface by surface, so the parts did not share a layout contract, a single design rhythm, one story, or a continuous feel. The first symptom was the home news deck overlapping its siblings. A live authed walk (2026-06-21) then exposed deeper issues: real-data overflow behind the nav, the same content duplicated across tabs, tabs that ask too much, a brain that does not centre, and surfaces that look identical at session 1 and session 100. This spec is the unifying rule that fixes those.

---

## 0. Founder-locked decisions

Spine (2026-06-21): **CTRL is your AI-native chief of staff.** A trusted operator that greets you, surfaces what matters, helps with the rest. Warm, advisory, first-person voice. AI-native always (it only ever helps you build the AI-native version of your business; it reframes general inputs into that lens).

Home model (REVISED 2026-06-21, supersedes the earlier "one thing" hero): **Home is the industry headlines (a browsable "worth a look" set you can move through) plus the three action buttons beneath (Briefing, Weigh, Build).** Not a single committed hero. The headlines are browsable; the three buttons have a fixed, reserved place above the nav.

Session-adaptivity (2026-06-21): **promoted, but inside a familiar, stable shell.** Tabs never change identity or move things around. What grows with use is each tab's content and depth, from a cold-start invitation to a power-user instrument. Home is home, Brain is brain, Decisions move decisions forward, You tracks over time, at session 1 and at session 100.

---

## 1. The stable tab identities (each tab has ONE job, always)

| Tab | One job (never shifts) | The one primary ask |
|---|---|---|
| **Home** | What is worth a look now: the industry headlines + the three doors | Browse the headlines; or take one of the three actions |
| **Decisions** | Move a decision forward (pressure-test it) | Weigh one decision |
| **Brain** | Your context/memory, so every AI knows you | Add to or verify your memory (centred canvas) |
| **You** | Your judgment, tracked over time | See how your calls are aging |

Structure is stable; only depth grows. A leader who learns where something lives never has to relearn it.

---

## 2. The six principles (the laws these surfaces must obey)

1. **One canonical home per thing (no duplication across tabs).** Each surface shows a DIFFERENT FACET of a thing, never the same card twice. A decision is a headline on Home, a thing-to-move-forward on Decisions, a call-aging-over-time on You. (Live bug: the DeepSeek decision-alert appeared as both the Home hero and the Decisions top alert.)
2. **The frame holds the real content's MAX, not the demo's.** No-scroll means the slot is sized so the tallest real headline + body still leaves the peek and the rail their reserved space above the nav. Every element has a reserved, bounded place; nothing floats into another's space; nothing clips behind the nav. (Live bug: the home hero had no height ceiling and pushed the rail behind the bottom nav.)
3. **One ask per screen is a hard ceiling.** One primary action per surface; everything else is progressive depth you opt into. (Live bug: Decisions stacked an alert + a 50-word explainer + a Record button + a textarea + a floating mic; You stacked zero-scoreboards + a watching list with 3-way actions per card.)
4. **The cold-start IS the default state, and must feel earned-into, not empty.** A newcomer must see a promise and an invitation, never a guilt-list ("30 memories to verify") or a scoreboard of zeros ("0 Banked, 0/2"). The quiet state is designed first, and feels intentional.
5. **Focal content sits in the optical centre.** A canvas/visualisation centres its content in the viewport, balanced. (Live bug: the brain graph clusters top-left with dead space.)
6. **Interaction matches the mental model.** If the content is a stream the leader wants to triage, let them move through it (the headlines are browsable). If it is one committed thing, commit. Do not strand a stream behind a single static card.

---

## 3. The session journey (what the ICP actually wants, by state)

The ICP is a time-poor senior operator (CEO/COO/founder) using CTRL as a chief of staff. Define each tab by the NEED at each state (the UI comes later, per-tab, mock-driven).

- **Cold-start (session ~1, knows nothing about them):** orientation + one quick win. Near-empty, warm, a single inviting action that teaches by doing. No empty dashboards, no explainer walls, no "30 to verify", no zero-scoreboards.
  - Home: industry headlines (generic AI-native, no personal data yet) + the three doors + a light "here is how I will work for you."
  - Decisions: "weigh your first call", one clean invitation.
  - Brain: "let's start your memory", almost empty, inviting.
  - You: an empty You is a PROMISE ("your judgment record starts the first time you bank a call"), not zeros.
- **Warming (session ~10, knows some):** surface what changed and what needs them; deepen context with near-zero friction; no re-reading explainers.
  - Home: headlines tuned to their interests, their own signals woven in.
  - Decisions: fast capture + their 1-2 live pressure-tests.
  - Brain: a small but real graph + a gentle "verify these 3 while you're here" (a nudge, never a backlog of 30).
  - You: first banked calls starting to show a pattern.
- **Rich (session ~100, knows them well):** speed, density, the payoff of accumulated data. Glance, triage, trust.
  - Home: fast triage of what is worth attention (browsable headlines earn their keep here).
  - Decisions: instant capture + a rich active board.
  - Brain: a dense, centred, navigable graph.
  - You: a real track record that proves judgment, the reward for 99 sessions.

The throughline: each tab keeps one job, one ask, one home for each thing, and a state that grows from invitation to instrument.

---

## 4. The four coherence levels (carried, still hold)

- **Compositional:** one frame every surface composes within (`MobileFrame` mobile, `DesktopShell` desktop). Bounded, no-scroll, reserved places, depth opens in-place, never overlapping siblings.
- **Visual:** one rhythm, all from the dark `ctrl-ds` tokens (one spacing/radius/elevation/hover scale).
- **Conceptual:** the chief-of-staff voice everywhere; one story, not a toolbox.
- **Interaction:** persistent chrome, continuous transitions, one nav grammar; browsable where the content is a stream.

---

## 5. Build plan + the verification rule

Tab by tab, mock-driven, one at a time (do not batch): lock the tab's rule -> mock -> founder reacts -> build -> verify. Order: **Home first** (the live bug), then Decisions, Brain, You.

VERIFICATION RULE (the process fix from this round): every surface is verified on the **REAL authed surface with real data** (a local Playwright login as a test user), NOT a synthetic harness/component render. The live-walk issues all hid behind harness renders that used short, fake content. Do not claim a surface done until it is seen working on the real page with real data, on a real mobile viewport.

---

## 6. The design language (the 2028 radical-focus refactor)

The bar: what the CEO of Apple or Google ships in 2028. Stunning, world-class, calm. The job is to make CTRL experientially 10x better through RADICAL FOCUS, never overwhelm.

- **Radical focus, not density.** Every screen has ONE focus and one primary action. Generous, calm negative space. The UI recedes so the content leads (deference). If a screen makes the leader anxious, it has failed. Kill stacked asks, walls of words, scoreboards of zeros.
- **State is the experience.** The app always answers, beautifully: what do you need to do next, what have you done, what have you not done yet. Loading, empty, in-progress, and done are FIRST-CLASS designed moments, never afterthoughts. No raw spinners: loading is purposeful, branded, anticipatory (it tells you what is coming and feels like progress). Empty is an invitation. Done has a moment of closure.
- **Device-native, not one UI scaled.** Mobile is a focused, gestural, thumb-first instrument (large targets, swipe to move through, bottom-anchored actions, one thing per thumb-reach). Desktop is a calm, spacious, keyboard-fluent command surface (room to breathe, hover/keyboard affordances, multi-zone where it earns it). Design each for its body, not the other's.
- **Motion with meaning.** Physics-based, deferential, fast. Transitions show where things came from and go (continuity), never decoration for its own sake. Respect reduced-motion.
- **The dark instrument, elevated.** The `ctrl-ds` dark palette and emerald, but more craft: real depth, soft light, precise type, tactile surfaces. Premium, quiet, confident, never loud or arrogant.
- **Craft in the details.** Type rhythm, optical alignment, consistent grid, micro-interactions on every touch, haptic-feeling feedback. The difference between good and world-class lives here.

This language applies to every surface and every state, within the stable tab identities (section 1) and the session journey (section 3).
