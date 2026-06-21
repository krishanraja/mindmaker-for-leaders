# CTRL System Spec (one holistic instrument, not separate parts)

Status: DRAFT, founder-locked on the spine and the home model. This is the canonical rule for making CTRL feel like ONE coherent system. It sits above the surface specs (`MAIN-APP-POLISH-SPEC.md`, `KIT-REDESIGN-SPEC.md`): those say what each surface does; this says how they all cohere into one thing.

Why this exists: the app was built surface by surface (often by separate agents in separate PRs), so the parts do not share a layout contract, a single design rhythm, one story, or a continuous feel. The literal symptom is the home news deck overlapping the other home components. The fix is a unifying system, proven on the home first, then propagated.

Founder-locked (2026-06-21):
- **The spine: CTRL is your AI-native chief of staff.** A trusted operator that greets you, surfaces the one thing that needs you, and handles the rest. Warm, advisory, human voice.
- **The home is one adaptive "one thing"**: the single most important item right now, full-frame, chosen for you, with "and N more" and a few quiet doors. Ruthless focus; nothing competes, so nothing can overlap.
- **Holistic at all four levels** (compositional, visual, conceptual, interaction). All four matter.

---

## 1. The spine: the AI-native chief of staff

Every surface speaks and behaves as one trusted operator helping you build the AI-native version of your business.
- **Home** = "the one thing I'd put in front of you today" + "I'm also tracking N more."
- **Tabs are the chief of staff's capabilities**, not a feature menu: weigh a decision, your memory, your briefing, your build. Named in plain, first-person-helpful language.
- **Voice everywhere**: warm, advisory, specific ("the agents you shelved are worth another look now"), never a dashboard barking metrics, never arrogant. Carries the approachable-language work already shipped.
- It stays AI-native (the North Star from `MAIN-APP-POLISH-SPEC.md`): the chief of staff only ever helps you make the business more AI-native, and reframes general-business inputs into that lens.

The other two metaphors are demoted to accents: the **instrument** aesthetic is the visual skin (dark, precise, calm); the **brief** is one capability (the daily read), not the whole app.

---

## 2. The home: one adaptive thing

- **One hero.** The single highest-priority item right now, full-frame, in the chief-of-staff voice. It is drawn from ONE unified ranked stream that already interleaves the news headlines (AI-native, categorized) and your own signals (decision alerts, agent metrics) and the decisions worth weighing. The top of that stream is the hero. (This is an evolution of the existing `CockpitDeck` ranking, not a new engine.)
- **"and N more"** opens the rest of that same stream (the deck), in-place. No separate "news section" stacked under a "your stuff section". One stream, one hero, one tap to the rest.
- **A minimal action footer**: briefing, weigh, build, as quiet doors (the chief of staff's main capabilities), never large competing cards.
- **The overlap is fixed by composition**: the home composes within the shared frame (section 3) as header zone + one hero zone + footer rail. With one hero and a thin footer there is nothing to collide. The current overlap is two independently-laid-out blocks (the deck and the actions) fighting; this replaces them with one composed surface.

---

## 3. The unifying system (the four levels)

### 3.1 Compositional: one frame every surface composes within
- A single app frame: a slim shared header, ONE bounded content zone, and the shared nav (bottom nav on mobile, sidebar on desktop). Every surface fills the one content zone; nothing is positioned outside the grid.
- No-scroll, one ask per screen (already the law). Depth opens IN-PLACE (a sheet or an expand), never by stacking another block that can overlap. Cards never absolutely-position over siblings.
- This is the contract the home deck and home actions lacked. Encode it once (a `SurfaceFrame` / layout primitive) and have every surface use it, so two parts can never again be laid out independently.

### 3.2 Visual: one design rhythm
- One spacing scale, one elevation/border/radius system, one card grammar, one motion language, all from the dark `ctrl-ds` instrument tokens. Consolidate any surface that drifted (its own paddings, shadows, radii) onto the shared tokens.
- The test: screenshot any two surfaces side by side and you cannot tell they were built at different times.

### 3.3 Conceptual: one story
- The chief-of-staff spine (section 1) is the story. Every label, empty state, and transition reinforces "one operator helping you go AI-native," not "a toolbox of features."

### 3.4 Interaction: one continuous feel
- Shared chrome persists across surfaces (the header and nav do not rebuild between tabs).
- Continuous transitions: moving between tabs is one consistent motion (a calm cross-fade/slide), not a hard cut, so it reads as one app moving its focus.
- One navigation grammar: tabs switch the content zone; depth always opens in-place; back is always the same gesture.

---

## 4. Build plan (proving ground, then propagate)

1. **This spec** - lock it.
2. **The home, rebuilt as the chief-of-staff one-thing surface**, composing within the shared frame (fixes the overlap, establishes the model). Mock-driven: a standalone prototype the founder reacts to, then the React build, verified live.
3. **Extract the shared primitives**: the `SurfaceFrame` layout contract + the consolidated design tokens + the transition grammar, from the home work.
4. **Propagate** to the other surfaces (decision, briefing, brain, compliance, settings, the kit): adopt the frame, the tokens, the chief-of-staff voice, and the shared transitions. Most were just polished, so this is alignment, not a rebuild.
5. Verify coherence: the side-by-side test (3.2) and a walk across tabs (3.4) feel like one instrument.

Each step: lock, mock where it is a design surface, build, verify visually (real renders), ship via PR, then the next.

---

## 5. Open decisions for the founder
1. **Is the chief of staff named/personified, or an unnamed voice?** A name (a persona) makes it warmer and more memorable but is a brand commitment; an unnamed "your chief of staff" voice is safer. Recommendation: unnamed warm voice first; a name is a later brand call.
2. **How literal is "the one thing"?** Pure single hero (everything else behind "and N more"), or hero plus a 2-card peek. The locked model is pure single hero; confirm you do not want a peek.
3. **Transition intensity**: a calm cross-fade (subtle, fast) vs a spatial slide (more "rooms in a building"). Recommendation: calm cross-fade, it is the least gimmicky and reads as one instrument.
