# The CTRL Decisioning Framework
### A thorough engine behind a calm surface

> Synthesized 2026-06-12 from `DECISIONING CORPUS.md` (the research) + the locked design laws in `_DESIGN-LOG.md`. This is the spine under the decision-map surface. It governs how a "bet" becomes a living decision map - exhaustive under the hood, radically simple on the surface, and structurally incapable of recommending from a thin signal.

---

## 0. The one-sentence model

CTRL turns a **bet** (a live AI decision the leader is weighing) into a living **decision map**: the bet decomposes - under the hood, exhaustively, across the corpus's 12 dimensions and ~70 sub-components - into **components**; the live signal engine **substantiates** each component with an evidence verdict and a confidence the surface never prints as a number; every component is labelled by **who can answer it** (external evidence / only you / nobody yet), which gates whether CTRL is even allowed to speak; the leader marks **where they stand** and **what would change their mind**, and CTRL watches the world against exactly that.

- **Exhaustiveness is a property of the COMPUTATION** - CTRL provably ran all ~70 and can show its work in one tap.
- **Simplicity is a property of the SURFACE** - it shows the 3-7 components that are both decisive AND unsettled, plus the gaps only the leader can fill, plus at most one thing they hadn't framed.
- The bridge between the two, invisible, is the `load_bearing_score` and the source-reliability gate.

The leader never chooses between thorough and simple; they get a simple surface backed by a thorough engine. **CTRL clarifies; the leader decides.**

---

## 1. The atomic unit: the COMPONENT object

Everything on the map is one component object, with fixed fields so it renders in a no-layout-shift grid. The same object whether surfaced or silent:

- `claim` - a plain one-line **consideration** this bet rides on, in founder voice, phrased as a question/consideration NOT a recommendation ("Whether your CRM data is clean enough to build on"). Hard-guarded against imperative phrasing.
- `verdict` (**AXIS 1 - what the evidence says**) - the locked vocab, engine-enum mapped: **Holds / Contested / Thin / Assumption / Checking**. The state of the EVIDENCE on the consideration, never a verdict on the decision.
- `source_class` (**AXIS 2 - who can answer; the trust keystone**) - **External** (corpus a-d) / **Only you** (category e, the wall) / **Nobody yet** (category f). Fixed when framed; fails toward "Only you" when uncertain.
- `confidence` - the corpus 0-5 level, **computed, NEVER displayed as a number**. Projects into the verdict word, the provenance-stamp thickness, and whether numbers render as a point or a range.
- `load_bearing_score` - computed, hidden = f(decisiveness, movement, fragility, leader-uncertainty); drives selection + ordering only.
- `leader_stance` - Agree / Disagree / Not sure (null until marked); renders in a distinct outlined "you marked this" style, never the evidence-verdict style.
- `change_trigger` - the machine-checkable thing that would move the leader; arms the WATCH loop scoped to this component.
- `movement` - null | "moved" when a fresh signal crosses a verdict boundary since last look.
- `haircut_badges[]` - computed honesty flags on the underlying evidence; at most the heaviest surfaces, +N.

**The cardinal rule, enforced in the RENDERER (un-bypassable):** if `source_class` is "Only you" or "Nobody yet", the engine is FORBIDDEN to emit a verdict from external signal. The verdict slot draws a structural placeholder (a lock for Only-you, a range/scenario marker for Nobody-yet), never a guessed call. You cannot accidentally ship a confident web verdict onto a question only a human inside the business can answer. When `source_class` is uncertain, the engine **fails toward "Only you."** This is how clarify-never-recommend is enforced in CODE, not style - and why, on the surface, honesty and simplicity become the SAME mechanism.

---

## 2. The map surface: a single bet, radically simple

Tapping a bet opens its map on the fixed mobile frame (pinned chrome, at most one contained scroll band, the page never scrolls):

- **HEADER** - the leader's own call, quoted back from capture: "Buy the agent stack, or build our own." One silent context subline. Two controls only, both naming their function: `[Where I stand]` and `[Archive bet]`. No verdict, no recommendation.
- **DOOR CHIP** - one always-on reversibility classification: **One-way door / Two-way door / Checking**. The one scaffold allowed to state plainly (reversibility is usually obvious + verifiable). A classification, never a recommendation.
- **THE ROWS** - 3 to 7 component rows, each a single fixed-height line: `[claim, left-aligned] [VERDICT chip, fixed-width column] [SOURCE chip, fixed slot] [stance dot]`. Two chips on EVERY row (one stable grid the leader learns; a faint always-present External dot makes the lock/circle read as a state-change in a stable column, not a new element appearing). One tap expands a row IN PLACE (hero compresses, page never scrolls) to 1-2 facts + one quiet provenance stamp + at most one haircut badge.
- **AT MOST ONE "New angle"** - a single promoted component the leader never framed.
- **COMPLETENESS LINE** - one honest tally: "5 considerations carry this bet. 65 more checked and quiet right now." Tappable. Plus the map-level honesty read: "CTRL can speak to 2 of these. 3 only you can answer. Nobody can know 1 yet."
- **FULL DECOMPOSITION (one tap)** - the exhaustive floor. Mobile: the 12 dimensions as collapsed one-line roll-up headers (verdict + internal-gap count), expand one at a time, fits the frame. Full per-component depth + side-by-side branch comparison = the desktop command-centre handoff.

---

## 3. Selection: which 3-7 surface, how the other ~63 stay honest

Every bet is decomposed against ALL ~70 sub-components on every signal refresh (the completeness guarantee). A component is promoted to a surfaced row only by an explicit, auditable gate:

`load_bearing_score = f(decisiveness, movement, fragility, leader-uncertainty)`
- **Decisiveness** - would flipping this component's answer flip the whole bet?
- **Movement** - did a live signal cross a verdict boundary recently?
- **Fragility** - low confidence on a decisive component beats high confidence on a decisive one. CTRL surfaces what is BOTH decisive AND unsettled, because that is where clarity is worth most.
- **Leader-uncertainty** - a row marked "Not sure" or with an armed trigger gets a standing boost.

Surface the top N, capped at 7, floored at 3. **Two mandatory floors** keep selection honest: (1) the most decisive INTERNAL-ONLY gap always surfaces when one exists; (2) a structurally load-bearing row surfaces even with ZERO live signal (dimmed at Thin/Checking, never faked settled). Ties break toward **dimension diversity** so the surfaced few are never five flavours of TCO. Everything else collapses behind the one honest, tappable tally line - accounted for, never disappeared.

---

## 4. The "New angle" - the "I hadn't thought of that" magic, rationed to one

The corpus flags ~45 sub-components as commonly-overlooked. CTRL diffs the components the leader has ENGAGED against the high-decisiveness overlooked set for THIS bet's shape, and promotes at most ONE per visit, tagged "New angle", with a founder-voice one-liner naming why it bites this bet ("The cost of leaving is the bet, not the licence"). Bound to high confidence that the component is LOAD-BEARING (never to a verdict on the answer); copy hard-guarded to "here is an angle this bet rides on", never "you should worry about X". If nothing un-engaged is decisive, no New angle renders - CTRL never manufactures a surprise to look smart.

---

## 5. Confidence + source + honesty badges (two visible axes, the number invisible)

- **AXIS 1 = VERDICT** (what the evidence says): Holds / Contested / Thin / Assumption / Checking.
- **AXIS 2 = SOURCE** (who can answer; the ceiling on trust): External / Only you / Nobody yet.
- The **0-5 confidence never gets a surface** (a dial = precision-theatre, banned). It projects deterministically: 5/4 -> Holds + thick provenance; 3 -> thinner stamp + range on numbers; 2 -> Thin; conflicting sources -> Contested; 1 -> Source flips to Only you (verdict suppressed); 0 -> Nobody yet (number degrades to a range).

**Honesty badges** - the corpus's 12 failure modes collapse to 8 plainly-named trust-haircut badges, each doubling as a human label AND a numeric movement governor: **Vendor source / Benchmark / Hype peak / Success-only / Stale / Unverified claim / Wide range / Only you**. Heavy badges HARD-CAP the verdict at Contested/Thin no matter how many such signals pile up - ten vendor blogs are still vendor blogs and cannot manufacture Holds. The worst badge on the evidence sets the ceiling. Green Holds is reachable only by the absence of heavy badges plus multiple independent, applicable, recent sources. The classifier is deterministic-first (vendor-domain list, benchmark detector, freshness math, primary-source trace; LLM only for residuals) and fails toward heavier discount. On the surface: at most ONE glyph (heaviest) + "+N", never a banner. The calm aggregate is the briefing honesty stamp ("Read 23 sources, kept the 6 that move this bet, discounted 4 vendor, 2 stale").

---

## 6. The internal-only wall (the trust keystone made physical)

Corpus category (e) - the ten things no external source can cross (your data quality, change-management capability, real moat, leadership alignment, architecture/tech-debt, proprietary-data volume, negotiated contract terms, risk tolerance, process interdependencies, culture/incentives). These ARE what every Source = "Only you" component looks like by default.

The verdict slot is structurally vacant (a quiet lock glyph). The component is NOT hidden and NOT blank - it sits in the map as a named, load-bearing GAP with its real consideration visible ("Is your CRM data clean enough to fine-tune on?"). An un-filled wall is the legitimate default and is itself a finding: "Only you can answer this." The completeness read counts them ("CTRL can speak to 5 of these. 4 only you can answer - unanswered so far. 1 nobody can know yet").

Filling a wall is **pick-don't-type** and an earned upgrade: tapping opens the stance primitive - Agree/Disagree/Not sure on a CTRL-proposed plain claim, or for data-shaped walls a 3-rung chip rail ("Clean & structured / Patchy / Not audited"), never a survey. The answer renders in a distinct outlined "you marked this" style; the Source chip STAYS "Only you". A self-report is internal evidence, not external verification, so it stays a leader-attested Assumption and never silently launders into a green Holds (the corpus is explicit that leaders over-rate their own data readiness). CTRL only nudges "mark where you stand" AFTER a live signal moved a related external component and the leader engaged. "Nobody yet" (category f) stays distinct from "Only you" because they demand opposite moves: "Only you" is homework you can do; "Nobody yet" is unknowable, so build for reversibility / set a watch.

---

## 7. How signals substantiate a component over time

The shipped hourly decision-watch loop returns a signal; before it touches a bet:
1. **ROUTE** - map the signal to the component(s) it touches. A signal mapping to NO live component is SUPPRESSED, never faked onto an unrelated bet.
2. **HAIRCUT** - apply badge haircuts; clamp the achievable verdict to the heaviest badge.
3. **UPDATE** - Bayesian-nudge confidence from the corpus's ~80-95% base-rate prior (not vendor optimism), shifting the verdict by at most ONE step within what the haircut allows. Accumulation is the mechanism: the third independent clean non-vendor source is what finally earns a promotion - and the leader sees that it took three.
4. **RENDER MOVEMENT** - show the movement, not just the new state: a small "moved" mark with before -> after and a one-line, bet-specific, AI-scoped why ("Two more independent reports - the cost gap is now real, not noise"). A single weak signal renders an honest nudge ("Moved Thin to Contested. One source, early. Worth a look, not a verdict."), never "your moat is gone."

Demotion is asymmetric to keep the map calm (confidence updates under the hood always; a visible demotion fires only when contradicting evidence is itself badge-clean and crosses the same multi-source bar a promotion requires - no whiplash on one new blog). A signal that contradicts the leader's stance is surfaced as honestly as one that confirms it. Hero-promotion is debounced hard: only a verdict-crossing move OR a hit on the leader's own armed trigger earns hero salience.

---

## 8. Decision-science scaffolds - silent lenses, not seven tabs

The seven Part-5 scaffolds become an invisible lens library that runs over every bet; the map only surfaces a lens when it is load-bearing AND moving for THIS bet (a hard engine gate, not UI discretion).

- **Reversibility -> the Door Chip** (always-on, the sharpest simple lens). One-way / Two-way / Checking, computed from lock-in + data-portability + contract-exit. A classification ("a door you can't easily re-open, so it's worth more of your attention"), never "don't do it". Defaults to Checking until evidenced; can flip as evidence lands.
- **Base rate -> the Prior Line**, once at map creation: "Reference point: most enterprise AI builds like this miss their year-one target" immediately followed by the inside-view adjustment ("What moves your odds: the 2-3 internal components only you can fill"). Suppressed when CTRL has no honest reference class. The harsh figure lives under the hood as the Bayesian prior.
- **Load-bearing assumptions -> the "Rests on this" tag** on the 2-3 components both decisive AND uncertain. This IS the selection spine.
- **Pre-mortem** - runs silently at creation; its failure causes become watched failure-path components, surfaced only when a trigger fires, as a neutral "watching for X".
- **Disconfirming evidence** - literally how the signal engine searches: for what would BREAK the leader's stance, not confirm it.
- **Opportunity cost** - one plain companion line, only when concrete and tied to a real onboarding-captured goal ("Capacity you spend building here is capacity not on shipping the Q3 launch"). Never a TCO calculator.
- **Decision-vs-outcome** - governs how a banked call is judged later: on process (was the load-bearing component stanced? a trigger set?), never on luck.

Only the Door Chip and the Prior Line state plainly (both pass the confidence gate); the other five shape WHAT the map watches and HOW a call is judged.

---

## 9. "Where do you stand + what would change your mind" (replaces Pressure-test)

The separate "Pressure-test" verb DISSOLVES into the map. No second screen; the map and pressure-test are one surface.

- **COMMIT-FIRST STANCE** - on the ONE breakpoint component the bet rides on, BEFORE CTRL's read on that component is mounted, the leader records a stance (Agree / Disagree / Not sure) on the plain claim. Reuses the shipped recordCall gate (no peek, no skip, fail-open). THEN CTRL reveals its evidence state and the gut-vs-ground delta is rendered visually - the leader's white stance notch offset from the evidence band whose width = uncertainty. Mandatory on the single breakpoint component only (one tap), optional everywhere else.
- **WHAT WOULD CHANGE MY MIND** - after stancing, the leader sets the disconfirming trigger by PICKING from 3-4 CTRL-proposed, machine-checkable triggers ("Inference at your real volume stays above buy price" / "Your data audit comes back dirty" / "A renewal-price hike clause shows up"). Pick-don't-type; "Add your own" is the secondary escape. The pick-list only offers triggers the watch loop can actually detect. The chosen trigger banks to decision_events and arms the hourly WATCH loop scoped to that component. When a future signal trips it, that component auto-promotes into the surfaced few with a "moved since you looked" tag and earns hero salience (it is the leader's OWN stated breakpoint moving). Archiving the bet stands down all its watches.

---

## 10. The resolution of the governing tension

**Exhaustiveness is a property of the COMPUTATION**: CTRL scores all ~70 sub-components every refresh, applies every failure-mode test, runs all seven scaffolds, holds the base-rate prior and the dependency tree - and can show its work in one tap. A missed consideration is structurally impossible; a thin signal can never be promoted to a decision.

**Simplicity is a property of the SURFACE**: the promotion gate, the two mandatory floors, the fixed three-fact row, the one-per-visit New angle, the single honesty stamp. A tired CEO reads trust in one glance and never meets a 0-5 score, a six-category taxonomy, a calibration gauge, twelve badge types, or 70 rows.

The leader never trades thorough against simple. The single hardest honesty guarantee - a web verdict can never appear on a question only a human inside the business can answer - is enforced in the RENDERER, so on the surface simplicity and honesty are the same mechanism, not a trade-off.

---

## 11. Canonical demo - "Buy vs build our agent stack" (40-person SaaS; open model just matched the frontier at ~1/10 cost)

On open, the engine silently decomposes against all 12 dimensions / ~70 sub-components, scores each, applies badges, runs the scaffolds, holds the base-rate prior. It promotes 5 rows.

- **HEADER** - "Buy the agent stack, or build our own." / subline: "40 people. The cost math just moved." / `[Where I stand]` `[Archive bet]`
- **DOOR CHIP** - "Checking" -> tap: "Buy is a two-way door IF the contract keeps a data-export clause. Build on your own fine-tuned data leans one-way. Which it is depends on terms only you can see."
- **PRIOR LINE** (once) - "Reference point: most enterprise AI builds like this miss their first-year target. What moves your odds is below - three of those, only you can answer."
- **ROWS:**
  - Cost crossover · **Holds** (on headline price) · External -> "A free open model just matched the paid frontier at about a tenth of the cost. Headline price is no longer the reason to buy." · provenance: "6 sources, last 24h"
  - Data readiness · 🔒 **Only you can answer** -> "Is your data clean enough to fine-tune on? [Clean & structured] [Patchy] [Not audited]"
  - Engineering capacity · 🔒 **Only you can answer** -> "Could you spare the people to build and keep this running? [Yes] [Maybe] [No]"
  - Strategic differentiation · 🔒 **Only you can answer** -> "Is your agent stack a real edge, or table stakes? [Edge] [Not sure] [Table stakes]"
  - **New angle** · "The cost of leaving is the bet, not the licence" · Thin · External
- **SIGNAL LIMIT** (on the moved row) - "Headline price just collapsed. That is one row of five. It does not touch your data, your capacity, or lock-in - and it is not a reason to decide." Mini-viz: two cost curves crossing, the build-side dashed because inference-at-your-real-volume is unconfirmed.
- **WALL CALLOUT** - "External evidence can't see inside your business. Three of the five things this bet rides on are yours to answer. CTRL won't pretend a web signal settled them."
- **WHERE I STAND** (commit-first on 'Cost crossover') - leader taps Agree/Disagree/Not sure BEFORE CTRL's read mounts; then: "You disagreed. CTRL's read: Holds on headline price - but Contested at your real volume. The gap between your gut and the ground is the thing to sit with."
- **WHAT WOULD CHANGE MY MIND** (pick) - "Inference at our real volume stays above buy price" / "Our data audit comes back dirty" / "A renewal-price hike clause shows up" · footer: "CTRL watches for exactly these."
- **COMPLETENESS LINE** - "5 considerations carry this bet. 65 more checked and quiet right now."
- **CLOSING BAND** (clarity, never recommend) - "Clearer, not decided. External evidence can speak to 2 of these. Three are yours. Most build initiatives miss year-one value, so start there. Watching: inference cost at your real volume."

The leader leaves with a sharper map and one armed trigger - holding the decision themselves.

---

## 12. OPEN PRODUCT DECISIONS (the live agenda - Krish's calls, not assumed)

> **Status note (updated 2026-06-17):** this framework is now realized in the shipped product - the decision spine + StoneRead surfaces (plus evidence tiers) went live under the dark redesign (PR #186, 2026-06-16; brain/evidence work in PRs #153-164 and #187-189). The core methodology below stands; what changed is which of these open decisions got a ruling in the build:
> - **#3 ("Pressure-test" dissolves into the map)** - effectively **RESOLVED**: shipped as the decision spine, "Where I stand" on the breakpoint row is the commit (commit-before-reveal kept).
> - **#2 (how far a self-reported "Only you" answer may move the read)** - the StoneRead surface ships the honest version (self-report stays a leader-attested Assumption, Source stays "Only you"); confirm the exact movement rule still matches the live behaviour before treating it fully closed.
> - Evidence-state honesty (axes / haircut badges / verdict ceiling from §5) is realized via the shipped **evidence tiers**.
> - **Still open / Krish's calls:** #1 (surfaced-component cap), #5 (Door Chip ever lightly directive - the clarify-never-recommend lock), #6 (Prior Line honesty), #7 (mobile full-decomposition ceiling), #8 (naming the scaffolds). These remain product decisions, not assumed.


1. **Surfaced-component cap** - hard 3-7 always, or flex with bet weight? (lean: hard cap; signal heaviness via the Door Chip + count of internal-only gaps, not more rows)
2. **How far may a self-reported "Only you" answer move the bet's read?** (lean A+: stays a leader-attested Assumption, distinct style, Source stays "Only you", never a green Holds, but unblocks the leader's OWN downstream exploration framed as "given your call") - **HIGHEST-STAKES HONESTY LINE; needs Krish's ruling.**
3. **Does "Pressure-test" fully dissolve into the map?** (lean: yes - "Where I stand" on the breakpoint row IS the commit; commit-before-reveal kept as a hard property of that row; consolidates detail + briefing + pressure-test into one map surface)
4. **May a contradicting signal ever visibly DEMOTE a verdict, or only add a counter-case?** (lean B+: stable display, honest confidence underneath, demotion only when the contradiction is badge-clean and crosses the same bar a promotion needs)
5. **May the Door Chip ever be lightly DIRECTIVE on a one-way + under-evidenced bet?** (lean b: a caution about the EVIDENCE STATE - "irreversible and three things it rides on are unanswered" - not the decision) - **touches the clarify-never-recommend lock; needs Krish's ruling.**
6. **How is the base-rate Prior Line kept honest per bet?** (lean a+c: one plainly-generic class line glued to the inside-view levers; suppress rather than fabricate a reference class)
7. **Mobile "Full decomposition" ceiling** - 12 dimension roll-ups (proof of exhaustiveness) on mobile, full 70 via the desktop handoff (lean c+a)
8. **Do we NAME any of the seven scaffolds?** (lean c: name only "one-way door" + "base rate" - already CEO vocabulary; keep the other five invisible)
