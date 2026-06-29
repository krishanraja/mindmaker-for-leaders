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

---

## 7. The three main areas: purpose, objectives, outcomes

CTRL does three things for a leader, on ONE shared substrate (the brain). The four tabs in section 1 are how these are navigated; these are what they are FOR. There is only one system - the three areas are facets of the same brain, never silos. ("You" is the accountability thread that runs through all three: it records how the leader's judgment ages over time; it is not a fourth job.)

### Area 1 - Home: your daily AI-native read (the curation system)
Deep-dive: `docs/CURATION-SYSTEM-SPEC.md`.
- **Purpose.** Keep a time-poor operator current on the AI shift that changes how they build/run the AI-native version of their business - without them doing the reading. Only AI-native, cross-verified stories reach them; general business news never does.
- **Objectives.** Surface only what is AI-native and corroborated; personalize on three compounding layers (the brain, the leader's explicit Tune, and their role/business fit); make Tune honest and visible (a chosen lane dominates, the scan bias reorders, the change is instant); never empty, never below 3 on-topic cards in a chosen lane; one spoken Briefing over the SAME pool.
- **Outcomes.** In one glance or one listen, the leader knows the few moves worth acting on this week; tuning visibly shapes the feed to their lane and role; the cards and the briefing agree; day-one leaders still get a sensible read.

### Area 2 - Decisions: weigh a call, AI-native
- **Purpose.** Move a real decision forward by reframing it to its AI-native version and stress-testing it against evidence (never general business advice).
- **Objectives.** Reframe general → AI-native (Stage 0 lock); decompose into claims; verify claims web-grounded (plus Artificial Analysis as an evidence retriever for model claims); show where the decision holds and where it breaks; watch load-bearing claims and raise alerts when the ground shifts (`decision-watch`).
- **Outcomes.** The leader acts with a grounded, contestable view of the decision, and is told when a load-bearing assumption weakens - judgment that compounds, not a one-shot answer.

### Area 3 - Brain / Memory: the substrate that makes every AI know you
- **Purpose.** Hold the leader's context (identity, business, goals, decisions, voice, and tuning) in ONE place so every CTRL surface and every external AI is instantly grounded - the leader never re-explains themselves.
- **Objectives.** Capture facts with low friction; keep ONE unified brain accessor (`brain-profile.ts`, no silos); stay portable (Context Export + MCP); and drive both the Home curation and the Briefing from that single brain.
- **Outcomes.** The feed, the briefing, and any connected AI all know the business; richer brain → sharper feed and briefing → more signal captured (the flywheel).

The throughline: one brain, three facets. Tune the brain and all three areas move together; that is the whole point.

---

## 8. The unified onboarding → decisions → engagement loop (state-adaptive)

Status: founder-locked (2026-06-29). The rule for how a leader ENTERS the system and how it pulls them back, so the three areas in section 7 are one continuous loop rather than three doors a newcomer has to discover.

**Why this exists.** The entry and re-entry paths had drifted into patchwork, and the seams were doing real harm:
- *Two onboardings, two homes.* A legacy 40-minute voice `OnboardingInterview` was auto-offered at first run, and `/dashboard` forked on a `VITE_COCKPIT_ENABLED` flag between the cockpit Home and the older Memory dashboards. A newcomer's first experience depended on a flag and a heavy interview, neither of which matched the "cold-start is the default state, earned-into" principle (section 2.4).
- *A loose first-decision seam.* Nothing reliably carried a freshly-onboarded leader into their first weighed decision, so the Decisions area sat unused.
- *A cold-start / dormancy trap.* The only re-engagement (`decision-watch` → alerts → `send-daily-briefing`) fired ONLY for a leader who already had decisions AND had opted into daily email. A leader who set CTRL up but never weighed a decision — or who lapsed — got zero pull-back, forever. The loop never closed for exactly the people who needed it most.

**The founder principle.** Adapt the whole experience to *who the leader is right now*:
- **New or dormant → guidance, inspiration, a kickstart.** Lead them in; teach by doing; surface the one next action.
- **Active / power → decisiveness, evidence, a thinking partner.** Fast triage; less hand-holding.
And match the **device mindset**: mobile is on-the-go (a quick read, one call worth weighing); desktop is deep work (room to think a decision through). Same information model, different lead and copy.

**The model.**
- **Lifecycle state (the spine).** `useCockpit` derives a `userState` off real timestamps (no new tracking): `new` (no brain, never weighed), `dormant` (has history but no activity in 14 days), `active`, `power`. It maps to a `posture` — `guide` (new/dormant, or simply no live decision in play) or `partner` — carried on `CockpitData`. This is a richer read than the news-only `homeState` (section 3) and supersedes nothing; the two coexist (homeState frames the news, posture frames the lead).
- **Onboarding is lightweight + inline** (`InlineProfileSetup` + `useInlineProfile`), never a gate-by-interview. It captures the two gate-critical identity facts (industry, role) straight into `user_memory` and a few interests via the reused `SeedBeatsPrompt`, rendered inside the Home feed zone. The cockpit is the one cold-start; there is no second home.
- **The first-decision seam.** In the `guide` posture, Home leads with a `KickstartCard` — a real, role-tailored starter decision (`src/lib/starterDecisions.ts`) — that routes into the decision engine pre-filled. The news deck stays pure news; the kickstart rides on top as the lead. Dormant leaders get a re-kickstart ("pick your thinking back up").
- **Re-engagement arms for everyone.** `send-reactivation-nudge` (daily cron) emails NEW (never-weighed) and DORMANT (>14d) leaders a single lifecycle nudge into a first/next decision, de-duped on `leader_notification_prefs.reactivation_nudge_sent_at` with a 30-day re-arm. It is deliberately NOT gated on the daily-briefing marketing opt-in — it is a one-off "you set this up, let's use it," which is what closes the trap.

**Outcome.** A time-poor, tool-fatigued leader with zero context lands on one home, is asked one light thing at a time, and is handed one real decision to weigh — and if they drift, the system brings them back to exactly that. The legacy fork, the legacy dashboards, and the voice interview were deleted, not flagged off; there is one loop.
