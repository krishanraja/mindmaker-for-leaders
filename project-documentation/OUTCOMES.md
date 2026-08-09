# User Outcomes

**Last reconciled:** 2026-07-26 (drift-check pass; see correction below).

> RECONCILIATION BANNER. Three corrections. (1) Positioning: outcomes now tie back to **building the AI-native version of your business** (a workflow handed to an agent, the autonomy line drawn, the AI-native version of an offer named), not "decision speed". (2) Honesty: the percentage metrics in this doc (for example "90%+ report better responses", "80%+ export to a second tool") are ASPIRATIONAL TARGETS, not measured results. Per the agent guardrails, do NOT quote them as proof in outbound. Use only the documented, grounded proof points (the kit flow exists and is live, Edge Pro is $49/month, the surfaces are no-scroll one-ask, the app is globally dark). TODO(founder): define the real AI-native success metrics and replace the placeholder percentages. (3) North Star correction (2026-07-26): this file's line below calling AI-native progress "the North Star" predates the actual, founder-signed North Star metric. CTRL's North Star is now the instrumented **flywheel** (context in, judgment out, recurring): a leader who both holds a real brain (5+ current facts) and weighs a decision in the same week. See `NORTH_STAR.md` for the definition and how it's measured; "getting more AI-native, move by move" is the qualitative story the metric is meant to prove, not a separate North Star.

Expected outcomes for CTRL users, reframed to the AI-native positioning. The North Star metric is the flywheel (see `NORTH_STAR.md`); AI-native progress, move by move, is the story that metric tells.

---

## Leader Outcomes

### Immediate Outcomes (First Session - 2 Minutes)

**Portable AI Double Created**
- AI double built from 3 guided voice questions. No typing. No forms.
- Context exported to at least one AI tool (ChatGPT, Claude, Gemini, Cursor, Claude Code).
- Leader experiences personalized AI output for the first time and immediately feels the gap from what they had before.

**Decision Speed Unlocked**
- The next AI conversation starts with context, not a blank page.
- First real decision gets sharper input because the AI knows their role, priorities, and constraints.
- The cost of switching between AI tools drops to zero.

**Cognitive Shift**
- "I just talked for two minutes and now Claude knows my entire world."
- "Why was I typing system prompts by hand?"
- "This is what AI was supposed to feel like."

**Measurable:**
- 100% have exportable context within 2 minutes
- 90%+ report noticeably better AI responses after first export
- 80%+ export to a second AI tool within 24 hours

---

### Day 1-2 Outcomes (Briefing kicks in)

**Cold-start solved with one tap**
- `SeedBeatsPrompt` surfaces on the dashboard with industry-relevant beats and entities (one of 11 pre-seeded industries: creator economy, SaaS, fintech, healthcare, consulting, e-commerce, media, edtech, biotech, legal, generic).
- One tap accepts a starter set of beats, weight 1.0.
- First briefing lands with 3-5 stories, each visibly anchored to something the leader cares about ("Anchored to: <beat or decision>").

**Auditable relevance from day one**
- The leader can tell, at a glance, WHY each story earned the slot. No mystery algorithm.
- Confidence in the system established on the first interaction, before any tuning.

---

### 7-Day Outcomes

**Decision Speed Compounding**
- AI conversations that used to take 10 minutes of setup now take zero.
- Decision Advisor or Meeting Prep used for at least one real decision, not a test.
- Leader starts reaching for AI first when facing a complex decision, because the output is actually useful now.

**Memory Web Growth**
- Added voice input beyond initial onboarding. Context is deepening.
- Memory Web has 15+ verified facts across categories.
- Pattern detection surfacing initial strengths and blind spots the leader had not articulated.
- Context exports getting richer. Each AI tool gets a more complete picture.

**Briefing Tightening**
- Leader has declared 4-8 interests (beats + entities) via seed acceptance or manual add.
- Excluded 1-3 topics they never want to see again.
- At least one **Bookmark** tap (promoting a story's anchor to a persistent beat).
- Briefing is noticeably tighter than day-1 because the lens now weights declared interests at 1.0.

**Behavioral Change**
- Stopped writing manual system prompts. CTRL export replaced them.
- Started narrating context updates when priorities or challenges shift.
- Using AI for real decisions weekly, not occasional experiments.

**What Leaders Say:**
- "I used to dread switching to a new AI tool. Now I just export and go."
- "My meeting prep brief knew things about my team dynamics that I forgot to mention."
- "I made a hiring decision faster this week because the Decision Advisor already knew my team structure."
- "The Briefing showed me a competitor move that I would have missed for two days. That alone is worth it."

**Measurable:**
- 70%+ have used built-in AI tools (Decision Advisor, Meeting Prep, Prompt Coach)
- 60%+ exported to 2+ platforms
- 50%+ added voice input beyond onboarding
- 40%+ report making at least one decision faster due to CTRL context
- 80%+ of new users accept at least 3 seed beats within first dashboard session

---

### 30-Day Outcomes

**Decision Speed as Standard**
- Every AI tool the leader uses is personalized. Generic AI interactions are gone.
- Time saved: 5-10 minutes of context setup eliminated per AI conversation.
- AI is now a genuine thinking partner: informed, specific, and fast.

**Decision Quality Improvement**
- Decision Advisor used for real strategic decisions: hiring, investment, priority calls.
- Meeting Prep generating contextual briefs that surface relevant history and stakeholder dynamics.
- Decisions are faster and sharper. The leader can articulate why.

**Briefing Learning Loop Activated**
- Feedback loop activating: 3+ thumbs-downs on generic topics automatically promote to persistent `-0.4` weight deltas (via the nightly `sp_aggregate_briefing_feedback` job at 03:07 UTC). Topics start disappearing even without explicit Bans.
- Leader catches a decision-relevant story in a briefing (something on their watchlist moved, a regulatory shift, a pricing change) and acts on it same-day.
- Briefing becomes a ritual. The 3-minute audio fits into the morning commute / first coffee window.
- Custom briefings (vendor_landscape, competitive_intel, boardroom_prep) used for specific prep moments.

**AI Literacy Gained**
- Can ask 3-5 sharp questions about any AI proposal or vendor pitch.
- Using AI as a weekly thinking partner for analysis and strategic decisions.
- Has redirected or reduced spend on at least one low-ROI AI initiative.

**Edge Pro Upgrade Path**
- Used Edge to generate a board memo, strategy doc, or email in their own register.
- ~25-30% of engaged users convert to Edge Pro at $49/month within 30 days.

**First Agent Skill Shipped**
- The leader has hit a pain-anchored zap (Edge `AutomatePainCard`, Memory blocker, Briefing `decision_trigger`) at least once and generated their first Agent Skill.
- ZIP downloaded and installed into Claude Code / Claude.ai / Cursor - they paste a test prompt and watch the skill auto-trigger. That moment ("the skill just fired in my Claude with my voice") is the second "aha" after the first Context Export.
- The Three Honest Tests gate routed at least one input to Memory Web or Custom Instructions instead of generating a junk skill - they learn to trust the triage, not work around it.
- ~15-20% of Edge Pro users have at least one shipped skill within 30 days of subscribing.

**What Leaders Say:**
- "My CFO asked how I prepared that board memo so fast. I just smiled."
- "I killed an AI project this week that would have wasted six months. I knew the right questions to ask."
- "I cannot go back to using AI without context. It would be like losing my phone."
- "I banned 'geopolitics' once. It's gone. That's how this should work."

**Measurable:**
- 80%+ using context export as standard workflow (not optional, not experimental)
- 70%+ report "AI is dramatically more useful now"
- 60%+ challenged or redirected an AI initiative with sharper judgment
- 50%+ report saving 30+ minutes per week on AI-related context setup
- 40%+ use the Ban action at least once in first 30 days (semantic feedback working)
- 70%+ of v2 briefings have every segment carrying a `matched_profile_fact` (evidence coverage)
- 15-20% of Edge Pro users have shipped at least one Agent Skill within 30 days of subscribing

---

### 90-Day Outcomes

**Compounding AI Advantage**
- Memory Web is rich, comprehensive, and current. It evolves as the leader evolves.
- Every AI interaction feels like talking to an informed chief of staff, not a stranger.
- Pattern detection has surfaced actionable strengths and blind spots that changed how the leader operates.
- The gap between this leader and peers using AI generically is now significant and widening.

**Strategic Capability**
- Leading AI conversations in leadership team and board meetings with earned credibility.
- Contributing meaningfully to AI strategy, not just approving what others propose.
- Mentoring direct reports on effective AI usage. Creating a multiplier effect.

**Organizational Impact**
- Team members asking sharper AI questions because they see the leader modeling it.
- Fewer "AI theatre" projects. More focused, outcome-driven AI initiatives.
- Faster organizational decision cycles because the leader is faster.

**What Leaders Say:**
- "AI used to be something my team did. Now it is how I think."
- "I am making decisions in hours that used to take weeks. Not because I am rushing, but because I have better input."
- "Three board members asked me to help them set up CTRL. That tells you everything."
- "The Briefing changed a decision last quarter. That ROI alone covers the year."

**Measurable:**
- 50%+ led an AI discussion in a leadership or board meeting
- 50%+ of leaders report "the briefing changed a decision" within 90 days
- 40%+ initiated a workflow redesign conversation based on AI-informed insight
- 30%+ report measurable competitive advantage gained
- 20%+ have referred CTRL to another senior leader

---

## New-Surface Outcomes (Brain engine, Kit Program, Redesign - 2026-06)

These outcomes attach to surfaces that shipped after the original 30/90-day framing above. They are stated with their honest caveats; do not market past the caveat.

### Brain engine (PRs #153-164, "limits" phases #187-189)

**Memory becomes a connected map, not a flat list**
- The leader sees their Memory Web as a fact-to-fact edge graph (the four-world rope canvas in the redesign), so they can read how their facts relate, not just what they are.
- Evidence tiers and track-record depth make the "why does CTRL believe this" question answerable at a glance, extending the auditable-relevance promise from the Briefing into the Memory itself.
- Reaction numbers on the canvas are reliable post-#187-189, so the leader can trust the counts they see rather than guessing.

**Honest caveats (disclose, never hide):**
- The canvas **Strengthen / Fix actions are UI-disabled** - the buttons exist but no backend RPC is wired yet, so they do not change anything. Do not promise the leader they can act on the graph from the canvas today.
- Brain **edges are derived, not stored**, so the map is recomputed rather than a persisted record.
- **Number-heroes fall back to a words-led display** when the current data is thin, so a leader early in their Memory Web will see prose where a richer profile would show numbers.

### Kit Program (`/kit`; PRs #190-193)

> **RETIRED 2026-08-07 (PR #355).** `/kit*` now redirects to `/try`. Everything below describes deleted product; kept as historical outcome record only.

**A class or lesson turns into a usable, forkable artifact**
- The leader can fork any of the four kits (including the Agentic Org Chart kit), run its pick-cascade, and watch a live picks-board assemble their choices - the lesson becomes a thing they built, not a thing they watched.
- The composed org chart carries an **honesty floor** (PR #193): a box that touches a flagged guardrail can never be left agent-led, so the output cannot quietly recommend an unsafe hand-off.

**Honest caveats (disclose, never hide):**
- **Pre-#193 `kit_builds.intake` rows are TRUNCATED and untrustworthy.** A latent bug silently dropped the back half of every cascade for all users since launch - guardrails, grind, involves, and maturity were never captured - so historical kit builds only contain `[boxes, pathway, profile, timeSink]`. Do not report or benchmark on pre-#193 intake data.
- The fix (live step refs in `goNext`) and the honesty floor are both prod-verified, but they only protect builds from PR #193 (merge 090dda2, 2026-06-17) forward.

### Redesigned surfaces (PR #186, merge 1c01db5, 2026-06-16)

**The product finally looks like the instrument it claims to be**
- Every authenticated surface is now the forced-dark `ctrl-ds` instrument cockpit with the emerald `ctrl.` wordmark - the rebuilt mobile cockpit, decision spine, StoneRead reader, brain four-world rope canvas, capture flow, and onboarding ship together.
- "Live" here means prod-verified with screenshots, not asserted. The earlier claim that the redesign was live while the app still showed the old UI was a trust breach; PR #186 is the real ship.

**Honest caveats (disclose, never hide):**
- Residual green remains in `index.html` OG / theme-color meta, the `tokens.css` `--mint` alias, and the EdgeOnboarding / SampleResultsDialog surfaces. The product is forced-dark emerald everywhere else; these are the known stragglers.

---

## Cross-Outcome Success Indicators

### Qualitative Indicators (What Leaders Actually Say)

**Speed and Context**
- "I talked for two minutes and now every AI tool knows me."
- "I exported to Claude and it was like briefing a new advisor who already read my entire file."
- "I stopped writing system prompts. CTRL does it better and keeps it current."
- "My AI conversations went from generic to genuinely useful overnight."

**Decisions and Judgment**
- "I made a better call on that acquisition because the Decision Advisor already knew our risk profile."
- "I can now challenge AI proposals without faking it."
- "We stopped a bad AI project early. That alone paid for a year of CTRL."
- "I know which questions to ask. That changed everything."

**Briefing and Auditable Relevance**
- "I finally have a news feed that doesn't waste my time."
- "It caught a competitor move that I would have missed. That alone is worth it."
- "I can see exactly why each story is there. No more AI mystery box."
- "I banned 'geopolitics' once. It's gone. That's how it should work."

### Quantitative Indicators

**Engagement Metrics**
- Onboarding completion rate >80%
- Context export within first session >90%
- Weekly voice input updates >50%
- Multi-platform export >60%
- Briefing open rate (audio play started) >60% by day 7

**Decision Speed Metrics**
- AI conversation setup time: reduced from 5-10 min to 0
- Time to first useful AI output per session: reduced by 70%+
- Decision cycle time reduction: 20-40% (user-reported)
- AI tool switching cost: eliminated

**Briefing Quality Metrics**
- % of segments with `matched_profile_fact` populated: 90%+ on v2 briefings
- Bookmark rate per briefing: 0.5-1.5 segments (depending on engagement)
- Ban rate per briefing: <0.5 (a healthy briefing rarely needs banning; sustained > 0.5 indicates the lens is too generic)
- Time-to-decision-relevant story: median <7 days

**Impact Metrics**
- AI interaction quality improvement (user-reported): 80%+ rate "significantly better"
- AI spend efficiency: reduction in low-ROI AI initiatives
- Leadership AI confidence: self-reported improvement in ability to lead AI conversations

**Revenue Indicators (for product/marketing)**
- Free → $49 Diagnostic conversion: 5-10% in first 30 days
- Free → $49/mo Edge Pro conversion: 15-25% by day 30 (higher among Memory Web active users)
- Bundle ($69) attach rate: ~30% of Diagnostic buyers
- Net revenue retention on Edge Pro: target 110%+ via expansion to add-ons

---

### Anti-Metrics (What We Do Not Measure)

- **Number of facts stored** - Quality of context over quantity. A Memory Web with 30 sharp facts beats 300 generic ones.
- **Time spent in CTRL** - We measure value delivered per second, not time on platform. The goal is speed, not engagement.
- **Feature usage breadth** - Focused outcomes over feature bloat. Using one tool well beats touching every feature.
- **Quiz scores** - The diagnostic is a mirror, not an exam. We do not gamify literacy.
- **Daily active usage** - Leaders are busy. If CTRL makes them faster three times a week, that is a win. We do not need daily dopamine loops.
- **Briefing word count** - A 500-word briefing that surfaces one decision-changing story beats a 1,500-word one that surfaces none.

---

## Sales & Marketing Anchors (for AI agents)

Use these outcomes as proof points in copy:

- **"2 minutes to first export"** - verified by GuidedFirstExperience telemetry
- **"30+ minutes a day reclaimed"** - context-setup time + news scrolling time eliminated
- **"Anchored to:" promise** - every Briefing segment can prove its relevance with a specific profile fact
- **"Bans persist forever"** - semantic, not keyword; signature-keyed so feedback survives daily lens regeneration
- **"3-minute audio briefing"** - concrete, time-boxed, measurable
- **"Edge Pro $49/month"** - anchor pricing in copy; the decision tier (unlimited weighs + cross-examination + decision watch), priced against a board-ready answer, not against the free daily habit
- **Earliest "WOW" moment** - accept seed beats → first Briefing audio plays → leader says "this is actually about me" within first 24h
- **Strongest retention signal** - first Bookmark tap; correlates with continued usage and Pro upgrade

---

**End of OUTCOMES**
