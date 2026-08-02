# Ideal Customer Profile

**Last reconciled:** 2026-08-02.

> RECONCILIATION BANNER. The firmographics below (senior leaders, 50 to 5,000-person companies, already using AI) are a reasonable carry-over frame and are unchanged this pass. The Pain Points, Jobs to Be Done, and Buying Triggers sections have been rewritten below to lead with the AI-native fit signals (build/orchestrate/productize/go-to-market, the reframe rule, the autonomy line) instead of the retired "decision-speed / zero-context tax" framing; the Information Overload (Briefing) and Repetition (Automator) pain sections are kept because those mechanics are still real and unchanged. Two corrections folded in below: (1) the "first session" language no longer describes a voice onboarding - see PR #298 - onboarding is now a ~20-second tap-based industry/role/interests setup; (2) references to the standalone "Decision Advisor" / "Meeting Prep" / "Prompt Coach" tools are replaced with the current single decision engine ("weigh it") and Edge artifacts, which is what those names now map to in the product. TODO(founder), scoped: confirm whether the AI-native positioning narrows or shifts the ICP itself (for example toward leaders actively trying to make their business AI-native, versus the broader "senior leader already using AI" frame below); until then, do not narrow the ICP in outbound beyond what is written here.

---

## Primary ICP - Individual Senior Leaders

This is the buyer the product is designed for, the persona sales/marketing AI agents should write to first.

---

### Demographics
- **Titles**: C-suite (CEO, COO, CFO, CTO), VPs, Senior Directors, Founders
- **Company Size**: 50-5,000 employees (mid-market to enterprise). Sweet spot: 100-1,000.
- **Industries** (priority order, mapped to the 11 industry-aware briefing seeds we already ship):
  1. Creator economy / media / publishing
  2. SaaS / software
  3. Financial services / fintech
  4. Professional services / consulting
  5. Healthcare
  6. E-commerce / retail
  7. Education / EdTech
  8. Biotech / life sciences
  9. Legal services
  10. Manufacturing / industrial
  11. Generic (catchall - leaders outside the seeded verticals still get value)
- **Geography**: Global (English-speaking markets priority)
- **AI Usage**: Already using at least one AI tool (ChatGPT, Claude, Gemini). Not starting from zero.

---

### Psychographics

- **Identity**: Sees themselves as a decisive leader. Speed is a point of pride. Hates being the bottleneck.
- **AI Frustration**: Uses AI daily but knows the output is generic. Has felt the gap between what AI could do and what it actually does for them. Suspects the problem is context, not the tool.
- **Time Relationship**: Guards their calendar ruthlessly. Will not sit through a course, a webinar, or a 30-minute onboarding flow. If it takes more than 2 minutes to show value, it is dead to them.
- **Decision Style**: Makes 20+ consequential decisions per week. Relies on pattern recognition, trusted advisors, and gut. Knows AI could sharpen all three - if it actually knew their world.
- **Competitive Awareness**: Watches peers and competitors closely. When a rival moves faster, they feel it personally. The idea that someone else's AI knows their context and theirs doesn't is deeply uncomfortable.
- **Tech Posture**: Pragmatic adopter. Not an enthusiast. Not a skeptic. Judges tools by outcomes in the first 60 seconds. Will abandon anything that feels like setup.
- **Privacy Posture**: Burned at least once by a tool that wanted Slack/calendar access. Defaults to skepticism on integrations. Self-contained tools clear faster.

---

### Pain Points

**AI-Native Transformation Pain (Primary - CTRL solves this)**
1. They know their business needs to become AI-native and do not know where to start; AI sits on a board deck, not in the org chart, the product, or the go-to-market motion.
2. They cannot see which parts of a workflow are safe to hand to an agent, where the human checkpoint belongs, and what the human role becomes once it does.
3. They are trying to figure out the AI-native version of what they sell, and every general-business framework they reach for (a strategy deck, a consultant, a generic AI course) answers the question as general business, with no AI-native angle.
4. Every AI conversation still starts from zero: they re-explain who they are, what they do, and what matters, every time, and across every tool they switch between.
5. They suspect competitors who are rebuilding around agents are pulling ahead by default, and they cannot yet name the specific moves that would close the gap.

**Information Overload Pain (CTRL Daily Briefing solves this)**
6. Subscribed to 5+ newsletters. Skim two, skip three. Still feel like they're missing things.
7. Twitter/X, LinkedIn, and Substack take 30+ minutes a day and produce one or two useful insights at best.
8. Existing "personalized" feeds (Feedly, Techmeme, morning briefs) serve everyone the same stories with light reordering. The personalization is theatre.
9. By the time a story is relevant, it's already late. Decision-relevant intel needs to surface in the same morning, anchored to a specific call on their desk.

**Repetition Pain (CTRL Skill Builder / Automator solves this, free for now)**
10. Runs the same 3-5 workflows every week: Monday board update, Friday hiring sync, monthly investor update, RFP triage, weekly metrics review.
11. Every iteration is re-typed from a blank prompt, even after building a rich Memory Web and exporting context. The repetition tax compounds.
12. Has tried "save this prompt to a library" tools - dead context they have to remember to paste. Has tried generic macro / automation tools - they generate junk from any input because there's no triage gate.
13. Wants permanent agent infrastructure they own (an installable Claude Skill in `~/.claude/skills/`), not a saved prompt or a brittle no-code automation. Pain signal: "I've explained this exact format to Claude 12 times this quarter."

**Strategic Pain (Secondary - compounds over time)**
14. Cannot distinguish real AI value from vendor theatre in proposals and pitches.
15. Unable to challenge technical teams credibly on AI decisions.
16. Feels pressure to "do something with AI" without a clear framework for what is worth doing, or which decision to make AI-native first.
17. Suspects competitors are building AI-native advantages they cannot see.
18. Making AI decisions without AI literacy. The equivalent of approving a budget in a language they do not speak.

---

### Jobs to Be Done

**Immediate (First Session, roughly 20 seconds to set up)**
- Set the AI-native lens with three taps: industry, role, a few interests to watch. No typing, no forms, no voice required.
- Land on a role-tailored starter decision (a real "weigh it" call, not a demo) so the first session ends with an actual decision in motion, not just a profile.
- Start building the Memory Web from there through natural voice or text conversation, deepening over time rather than gating the first session.

**Day 1 (Briefing kicks in)**
- Accept industry-aware seed beats with one tap. Get a relevant briefing on day one, not week three.
- Hear 3 minutes of audio that's actually about their world while making coffee.
- Bookmark a story they care about. Ban a topic they don't. Watch the system learn in real time.

**Week 1 (Speed Compounds)**
- Stop re-explaining context in every AI conversation. Permanently.
- Weigh a real decision through the engine: reframed to its AI-native version, decomposed, verified against evidence, cross-examined, closed with a decision memo.
- Use AI as a thinking partner that is actually informed, not a blank-slate chatbot.
- Generate a board memo or strategy doc on demand from the Edge view, in their own register.

**Month 1+ (The Gap Widens)**
- Build richer AI context over time through natural voice conversation. No maintenance burden.
- Surface strengths to amplify and blind spots to address. Patterns they cannot see themselves.
- Stay current as goals, challenges, and context evolve. The AI double grows with them.
- Briefing learns from explicit Bans (-1.0 weight delta immediately) and from accumulated thumbs-down (-0.4 delta after 3+ negatives via the nightly aggregator). Topics fade from the feed without manual policing.

**Strategic (Ongoing)**
- Develop enough AI literacy to challenge any proposal or vendor pitch.
- Know where AI creates real value in their specific context, not in general.
- Lead AI conversations in their organization from a position of informed confidence.

---

### Buying Triggers

**AI-native triggers (highest intent)**
- Watched a competitor rebuild a workflow around an agent and felt the gap personally: "they are building with AI, we are just buying it."
- Cannot answer, in the moment, which part of a workflow is safe to hand to an agent versus keep human. Asked the question out loud and had no framework to answer it.
- Just spent 10 minutes re-explaining their role and priorities to ChatGPT before getting a mediocre, generic answer. Thought: "There has to be a better way."
- Switched from ChatGPT to Claude and lost all their context. Felt the friction of starting over.
- Watched a peer or direct report get dramatically better AI output and asked how.

**Information-overload triggers (high intent)**
- Cancelled three newsletters in the last month. Still drowning.
- Missed a competitor move and read about it on LinkedIn three days late. Decided "never again."
- Tired of news apps optimizing for engagement instead of relevance. Want something accountable.

**Strategic triggers (high intent)**
- Board or investor asking pointed questions about AI strategy. Need to sound credible in 48 hours.
- Competitor announced an AI initiative. Need to understand what is real and what is theatre.
- Received an AI budget request they cannot evaluate. Do not have the language to push back or approve with confidence.
- Preparing for an offsite or strategy session where AI will be a topic. Do not want to be the least informed person in the room.

---

### Success Indicators (what good looks like by stage)

**Week 1**
- Exported context to at least 2 AI tools
- Noticed tangibly better AI responses, specific enough to describe the difference
- Added voice input beyond initial onboarding
- Accepted at least 3 seed beats and received a relevant first Briefing

**Month 1**
- Uses CTRL context across 3+ AI tools as standard workflow
- Weighed a real decision through the engine, not a test run
- Reports saving 5-10 minutes per AI conversation in context setup alone
- Briefing is now the morning ritual; story-level Bans + Bookmarks have visibly tightened the feed
- Generated a board memo or strategy doc via Edge (Pro) and shipped a version of it

**Month 3**
- AI interactions feel like talking to an informed advisor, not a stranger
- Leading AI conversations in leadership team with credibility
- Has redirected or stopped at least one low-value AI initiative based on sharper judgment
- Has referred CTRL to at least one other senior leader

---

## Anti-ICPs (Not Target Customers)

### Do Not Target

1. **Early-stage startups** (<20 employees, pre-revenue)
   - Wrong stage. Insufficient budget. Decisions are fast already because the org is small.

2. **Technical AI roles** (ML engineers, data scientists)
   - They need implementation tools, not portable leader context. Different problem entirely.

3. **General workforce** (individual contributors, junior managers)
   - Wrong scope. Their decisions do not carry the same organizational weight. Different product needed.

4. **AI enthusiasts and hobbyists**
   - They want depth on models and architectures. CTRL solves a workflow problem, not a curiosity.

5. **Companies wanting AI implementation services**
   - CTRL provides context infrastructure for leaders, not consulting or implementation.

6. **Leaders who do not use AI tools at all yet**
   - They need to be convinced to use AI first. We accelerate people who are already using it. Wrong sequence.

7. **Single-platform loyalists**
   - If they only use one AI tool and are satisfied with it, portability is not a pain point. Our value is cross-tool context.

8. **Buyers who require deep integrations** (Slack/email/calendar/CRM)
   - CTRL is deliberately self-contained. Buyers who need agentic email or calendar automation should be redirected to a different category.

---

## Sales & Marketing Anchors (for AI agents)

When prospecting, scoring fit, or writing copy:

- **Strongest signal**: "I use ChatGPT and Claude every day but the output is generic" + "I'm a [C-suite / VP / founder] at a [50-5000 person] company in [creator economy / SaaS / fintech / consulting / healthcare]."
- **Second-strongest signal**: Just cancelled newsletters or expressed frustration with information overload + role/scale fit.
- **Disqualifier**: Asks about Slack/email/calendar integration → not us.
- **Deal-blocker**: Requires SOC 2 / vendor security review for an individual purchase → wrong motion (drive them to enterprise/Sprint).
- **Channel sequencing**: LinkedIn DM → email → optional follow-up post that demonstrates the auditable-relevance angle (screenshot of "Anchored to:" chip).
- **Pricing anchors to use in copy**: Free to start (the daily briefing, the Automator, Memory, Voice, the Kit program, and 3 decision weighs a month are all free). $49/month for Edge Pro (the decision tier: unlimited weighs + cross-examination + decision watch + Edge artifacts + the live MCP pull of your skills). $49 for the full Diagnostic (one-time). Bundle saves $10.
