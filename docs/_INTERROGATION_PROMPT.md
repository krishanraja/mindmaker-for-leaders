# CTRL Experience Compass — artifact build prompt

> Paste everything below the line into a new conversation at claude.ai to build the data-collection artifact. The exported Markdown comes back into the CTRL Upgrades project and gets mapped into `_STATE.md` §6A, then synthesized into the big-picture experience design.

---

Build me a single-file interactive React artifact called **"CTRL Experience Compass."**

**PURPOSE:** It walks me (the founder) through ~22 "rank these scenarios" questions to design the big-picture EXPERIENCE of my product, CTRL (an AI-native decision/leadership app for time-poor CEOs). For each question I rank the options from best to worst and explain WHY. **The WHY is the most important data.** It must be fast, frictionless, impossible to lose input, and export everything cleanly at the end.

**CRITICAL UX REQUIREMENTS — these fix real pain, honor them exactly:**
1. **One question per screen.** Calm, large, readable. No walls of text.
2. **Ranking = a vertical list of the options that I order from BEST (top) to WORST (bottom).** Support BOTH drag-and-drop AND up/down arrow buttons on every row (the arrows must always work even if drag is finicky on mobile). Show a 1..N rank badge on each row. Ranking must never be a single irreversible click — I can always reorder.
3. **Reasoning capture is mandatory and prominent:** a "Why this order? (What makes your #1 great, and your last one wrong?)" textarea sits directly under the ranking. I cannot advance to the next question until it has text — BUT include a small, low-emphasis "skip reasoning" link that records "(skipped)" if I truly choose to. Also give each option an optional "+ note" affordance for a one-line reaction to that specific option.
4. **Optional intensity:** a "How strongly do you feel about this? (1–5)" slider per question, default 3.
5. **Autosave EVERYTHING to localStorage on every change.** On reload, restore all answers and jump me to the first unanswered question. Show a subtle "Saved ✓" indicator. Losing my input is the worst possible failure — guard against it.
6. **Progress:** a progress bar + "Q x of 22". A **Back** button to revise any earlier answer without losing later ones. Let me jump to any question via a small list/menu.
7. **Export — in the header at all times AND on a final summary screen. The export MUST be fully self-describing, because whoever reads it later has ZERO prior context about this exercise or the app.**
   - **"Copy as Markdown"** (clipboard) → a document that begins with a header block: the title "CTRL Experience Compass — Results"; a one-line description ("A directional ranking interrogation to design the big-picture experience of CTRL, an AI-native decision/leadership app for time-poor CEOs. Each scenario was ranked best→worst, with the reasoning being the key data."); the date; and "Answered: X / 22". Then, per question: the question number + theme, the SCENE text, my RANKING as a numbered list 1→N using each option's FULL label **and** full text (never just letters), my WHY verbatim, any per-option notes, and intensity (1–5). End with the final "Anything else" free-text. It must stand completely on its own without the app.
   - **"Copy as JSON"** / **"Download .json"** → a complete object: `meta` { tool, version, exportedAt, answeredCount } ; `finalThoughts` ; and `answers` keyed by question id, each with { theme, scene, ranked: [ {rank, key, label, text, note} ], why, intensity }. Include every option's full text.
   - **"Download .md"**.
   - The Markdown is what I send to my collaborator (who is mid-project on this) AND what I might read cold months later — so make it clean, complete, and unambiguous.
8. **A final free-text box:** "Anything else about the big-picture experience you want to capture?" — included in the export.

**DESIGN:** Dark theme (near-black background, e.g. zinc-950), emerald accent `#00D9B6`, generous whitespace, large type, subtle transitions (use framer-motion if available, otherwise CSS). Mobile-first and genuinely pleasant to use one-handed — it should feel like a premium product, because ranking + reasoning should feel like a fun design exercise, not a form.

**TECH:** Single file, React + Tailwind, **client-side only, no network calls, no backend, localStorage only.** Do NOT change the question content below — render it verbatim. Default to robustness over cleverness; make sure drag, arrows, autosave, and export all actually work.

Use exactly this content:

```js
const QUESTIONS = [
  { id: 1, theme: "The first five seconds (morning open)",
    scene: "It's 7:42am. A time-poor CEO who barely reads the news opens CTRL one-handed on the train. Before they tap anything, here's what the screen could greet them with.",
    options: [
      { key: "A", label: "The synthesized signal", text: "One beautiful, already-made visual card: 'Here's the single thing moving against your move upmarket this morning' — a fresh real-world signal tied to a priority they told you mattered, with one clear move beneath it." },
      { key: "B", label: "The open prompt", text: "A warm, open question: 'Morning, Sarah. What's the biggest decision on your mind today?' — the app hands them the wheel and waits." },
      { key: "C", label: "The living decision", text: "Their own decision from last week, resurfaced because something changed: 'One assumption behind your hiring call just shifted. Want to re-examine it?'" },
      { key: "D", label: "The digest", text: "A crisp, scannable 3-item digest: the top 3 AI/market signals relevant to their business, readable in 15 seconds, each tappable for more." }
    ],
    why: "Why this order? What makes the winner feel like a tangible step toward where they're going, and the loser feel like noise or a chore?" },

  { id: 2, theme: "What 'one step forward' feels like",
    scene: "They have five minutes. What should the session actually DO so they leave feeling they moved forward on what matters to them?",
    options: [
      { key: "A", label: "Made a call", text: "They committed one real decision they'd been putting off." },
      { key: "B", label: "Offloaded a task", text: "They handed one recurring task to AI and saw it's now handled." },
      { key: "C", label: "Learned something sharp", text: "They learned one specific, useful thing about their business they didn't know this morning." },
      { key: "D", label: "Taught the app", text: "They corrected/taught the app one thing and watched it visibly get smarter about them." }
    ],
    why: "Which of these is most the 'I'm closer to my objective' feeling for a CEO — and which is weakest?" },

  { id: 3, theme: "The app's role / who it is to you",
    scene: "If CTRL were a person on your leadership team, who are they?",
    options: [
      { key: "A", label: "Chief of Staff", text: "A razor-sharp chief of staff who pre-digests everything and surfaces only what needs you." },
      { key: "B", label: "Coach", text: "An executive coach who asks the hard question and makes you think, rarely hands you answers." },
      { key: "C", label: "Sparring partner", text: "A sparring partner who argues the other side so your decision gets stress-tested." },
      { key: "D", label: "Operator / governor", text: "A quiet operator who runs your agents and asks approval only on the ~20 calls that truly need a human." }
    ],
    why: "Which relationship should CTRL embody — and which would feel wrong or annoying?" },

  { id: 4, theme: "Proof it's working (earning trust)",
    scene: "How should CTRL prove it's genuinely valuable, not theatre, to a skeptical CEO?",
    options: [
      { key: "A", label: "Show the receipts", text: "'I read 47 sources; here are the 3 that matter and why' — transparent reasoning on tap." },
      { key: "B", label: "Let quality speak", text: "Just deliver an uncannily relevant, synthesized answer — no plumbing shown." },
      { key: "C", label: "Reflect them back", text: "'Because you told me X and you're betting on Y, this matters' — visibly personal." },
      { key: "D", label: "Show momentum", text: "'Your context is 12% sharper than last week; here's what changed.'" }
    ],
    why: "What earns trust fastest, and what reads as a gimmick?" },

  { id: 5, theme: "How 'it learns from me' should FEEL",
    scene: "The app is meant to compound over time. What's the felt experience of it learning?",
    options: [
      { key: "A", label: "Visible rules forming", text: "'Got it — I'll never recommend that again' appears the instant you correct it." },
      { key: "B", label: "Quietly better", text: "Fewer dumb suggestions over time, no announcement — you just notice it." },
      { key: "C", label: "Weekly recap", text: "A periodic 'here's what I learned about you this week' you confirm or correct." },
      { key: "D", label: "Thickening memory", text: "You watch a living map of 'what CTRL knows about you' grow and sharpen." }
    ],
    why: "Which makes 'it learns from me' believable and satisfying — and which feels creepy or hollow?" },

  { id: 6, theme: "The feeling of being known (memory)",
    scene: "How should your context get INTO CTRL so it feels like it truly knows you?",
    options: [
      { key: "A", label: "You curate it", text: "You deliberately tell it your role, voice, standards, never-do's — like onboarding a hire." },
      { key: "B", label: "It infers", text: "It watches what you do and say, builds the picture, and you just confirm." },
      { key: "C", label: "Import once", text: "You import your history (chats, docs) once; it extracts the picture; you tidy it." },
      { key: "D", label: "Fast hybrid", text: "A 2-minute guided 'tell me who you are,' then it infers and asks as it goes." }
    ],
    why: "What makes 'this app gets me' feel earned and accurate vs presumptuous or like work?" },

  { id: 7, theme: "Drafting in your voice",
    scene: "CTRL drafts a board memo 'in your voice.' When is that great vs uncanny?",
    options: [
      { key: "A", label: "Nails it", text: "It matches your phrasing so well you barely edit — like you wrote it on a good day." },
      { key: "B", label: "Sharp scaffold", text: "An 80% scaffold in a neutral-professional voice you make yours in 2 minutes." },
      { key: "C", label: "Generic exec", text: "A confident 'executive' voice that's good but generic — not specifically you." },
      { key: "D", label: "Over-mimics", text: "It copies your tics and all, tipping into uncanny or embarrassing." }
    ],
    why: "Where's the line between 'in my voice' and 'weird'?" },

  { id: 8, theme: "Helped to a hard call WITHOUT being handed the answer",
    scene: "You're facing a genuinely hard decision. What's the ideal CTRL interaction?",
    options: [
      { key: "A", label: "Commit then stress-test", text: "It makes YOU commit a first call, then stress-tests it — counter-case + the single breakpoint assumption." },
      { key: "B", label: "Options + bands", text: "It lays out options with confidence bands and trade-offs; you pick." },
      { key: "C", label: "Tells you", text: "It tells you what it would do, with reasoning; you take it or leave it." },
      { key: "D", label: "Socratic", text: "It asks three reframing questions, then steps back." }
    ],
    why: "Which sharpens your judgment, and which makes you a passenger?" },

  { id: 9, theme: "Handing work off + the reinvestment moment",
    scene: "You just automated something that used to eat your time. What should happen next?",
    options: [
      { key: "A", label: "Offer the next rung", text: "'That's handled — now point the time you freed at amplifying [a strength].'" },
      { key: "B", label: "Bank the reclaim", text: "'You just saved ~3 hrs/week' — celebrated and left there." },
      { key: "C", label: "Silent", text: "It quietly files the automation and says nothing; you move on." },
      { key: "D", label: "Nudge later", text: "A day later: 'Your automation ran twice — want to aim that saved time at your big bet?'" }
    ],
    why: "Which makes saving time feel like climbing a ladder vs just a feature?" },

  { id: 10, theme: "The give/take ratio",
    scene: "How much should CTRL ask of you before it gives value?",
    options: [
      { key: "A", label: "Give first", text: "Instant value cold — it earns the right to ask for more later." },
      { key: "B", label: "Fair trade", text: "Answer 2 quick things, get something visibly better back, immediately." },
      { key: "C", label: "Invest upfront", text: "A proper 10-minute setup that makes everything afterward excellent." },
      { key: "D", label: "Continuous", text: "Little prompts throughout, always trading input for sharper output." }
    ],
    why: "For a CEO with no time, what ratio feels respectful vs extractive?" },

  { id: 11, theme: "What's worth interrupting you for",
    scene: "CTRL can send a push notification or claim the top of the screen. What earns it?",
    options: [
      { key: "A", label: "Assumption broke", text: "A watched assumption behind a live decision just broke — your call may now be wrong." },
      { key: "B", label: "Move against a bet", text: "A major real-world move directly against one of your named bets." },
      { key: "C", label: "Artifact ready", text: "Something you requested is ready — a memo, brief, or skill." },
      { key: "D", label: "Streak nudge", text: "'You haven't sharpened your context in 3 days.'" }
    ],
    why: "What's worth pulling a busy CEO's attention, and what's just nagging?" },

  { id: 12, theme: "Closure (end of a 5-minute session)",
    scene: "The five minutes are up. What's the ideal closing beat?",
    options: [
      { key: "A", label: "Completion", text: "A crisp 'here's the one thing you moved forward today.'" },
      { key: "B", label: "Teaser", text: "'I'm watching X overnight — check back tomorrow.'" },
      { key: "C", label: "No ceremony", text: "It just ends; they got what they came for and close the app." },
      { key: "D", label: "Hand back agency", text: "A tiny 'what should I keep an eye on?' that sets up next time." }
    ],
    why: "What makes them close the app feeling accomplished vs unfinished?" },

  { id: 13, theme: "Mobile vs desktop register",
    scene: "Same user, two contexts. Rank these as the RIGHT division of labor.",
    options: [
      { key: "A", label: "Decide vs command", text: "Mobile = one decision/move, calm and finished in 5 min. Desktop = the deep command center." },
      { key: "B", label: "Triage vs build", text: "Mobile = capture & triage on the go. Desktop = where you actually decide and build." },
      { key: "C", label: "Same, bigger", text: "Both do the same things; desktop is just larger." },
      { key: "D", label: "Consume vs create", text: "Mobile = consume (read/listen the brief). Desktop = create (decide, draft, curate)." }
    ],
    why: "What's the right split of emotional labor between the two?" },

  { id: 14, theme: "Tone & personality",
    scene: "How should CTRL talk to you?",
    options: [
      { key: "A", label: "Warm & personal", text: "Uses your name, feels on your side, a touch of humanity." },
      { key: "B", label: "Crisp & executive", text: "Minimal words, respects your time, zero fluff." },
      { key: "C", label: "Provocative", text: "Challenges you, a bit of edge, makes you sit up." },
      { key: "D", label: "Neutral & invisible", text: "Just the information, no personality at all." }
    ],
    why: "What tone makes a CEO trust and enjoy it vs roll their eyes?" },

  { id: 15, theme: "Pace",
    scene: "How should CTRL move you through anything multi-step?",
    options: [
      { key: "A", label: "One per screen", text: "Sequenced — it decides the path, you take each step." },
      { key: "B", label: "Guided but free", text: "A clear path you can also jump around in." },
      { key: "C", label: "Open canvas", text: "Everything available; you self-direct." },
      { key: "D", label: "Adaptive", text: "Guided when you're unsure, out of the way when you're decisive." }
    ],
    why: "What feels like effortless progress vs hand-holding or chaos?" },

  { id: 16, theme: "Density",
    scene: "On any given screen, how much should be present?",
    options: [
      { key: "A", label: "One hero + one action", text: "Everything else a tap away." },
      { key: "B", label: "A focused few", text: "About three related things." },
      { key: "C", label: "Rich dashboard", text: "Lots visible; you scan and pick." },
      { key: "D", label: "Adaptive density", text: "Sparse on mobile, rich on desktop." }
    ],
    why: "When does 'more on screen' help a CEO vs overwhelm them?" },

  { id: 17, theme: "Agency (tell vs help-decide)",
    scene: "The core stance of the product:",
    options: [
      { key: "A", label: "Opinionated", text: "'Here's what I'd do and why' — decisive, you can override." },
      { key: "B", label: "Informs", text: "'Here are the forces; you decide' — you own the call." },
      { key: "C", label: "Co-reason", text: "'Let's figure it out together' — neither leads." },
      { key: "D", label: "You lead, it challenges", text: "'You decide, then I'll pressure-test it.'" }
    ],
    why: "What makes a leader feel more capable vs more dependent?" },

  { id: 18, theme: "The felt outcome",
    scene: "After weeks of using CTRL, the feeling you most want them to have:",
    options: [
      { key: "A", label: "Earned conviction", text: "'I make my big calls with more certainty and less second-guessing.'" },
      { key: "B", label: "Calm command", text: "'The chaos is handled; I only touch what matters.'" },
      { key: "C", label: "Sharper edge", text: "'I'm visibly becoming a better, more future-proofed leader.'" },
      { key: "D", label: "Time freedom", text: "'I got hours back and my business runs without me in the weeds.'" }
    ],
    why: "Which is THE promise to build around — and which is secondary?" },

  { id: 19, theme: "Status / identity reflection",
    scene: "Does using CTRL change how the leader sees themselves?",
    options: [
      { key: "A", label: "Loudly", text: "It should make them feel like an elite, AI-native operator ahead of peers." },
      { key: "B", label: "Quietly", text: "Competence without ego — they just feel more on top of things." },
      { key: "C", label: "Just a tool", text: "No identity story; it simply works." },
      { key: "D", label: "Reflects growth", text: "It shows them becoming the leader they're trying to be." }
    ],
    why: "How much should CTRL trade in identity/status vs pure utility?" },

  { id: 20, theme: "The correction moment ('this isn't me')",
    scene: "CTRL got something wrong about you. How should fixing it feel?",
    options: [
      { key: "A", label: "One tap, final", text: "Correct in one tap + instant 'got it, that's now a permanent rule.'" },
      { key: "B", label: "Short dialogue", text: "It asks one clarifying question so it learns the principle, not just the fact." },
      { key: "C", label: "Edit directly", text: "You edit it like a doc — full manual control." },
      { key: "D", label: "Thumbs-down", text: "You just thumbs-down and it figures out the fix silently." }
    ],
    why: "What makes correcting it feel powerful and worth doing vs tedious?" },

  { id: 21, theme: "A decision's life over time",
    scene: "You made a call last month. CTRL has been watching it. What's the ideal 'living decision'?",
    options: [
      { key: "A", label: "Only if it breaks", text: "It pings you only when a load-bearing assumption actually breaks — otherwise silence." },
      { key: "B", label: "Scoreboard", text: "A visible board of your decisions and how they're tracking." },
      { key: "C", label: "Periodic re-exam", text: "A short 'still holds / here's a wobble' update now and then." },
      { key: "D", label: "Silent log", text: "It quietly logs everything; you check in when you want." }
    ],
    why: "What makes ongoing decision-watching feel like a superpower vs surveillance or noise?" },

  { id: 22, theme: "The 'borrowed conviction' moment",
    scene: "The leader is hesitating on a big move. CTRL's single highest-value moment is:",
    options: [
      { key: "A", label: "The spine to act", text: "'You've stress-tested this; the evidence backs you — go.'" },
      { key: "B", label: "The missing piece", text: "Surfacing the one thing they're missing that changes everything." },
      { key: "C", label: "Remove the fear", text: "Showing the downside is survivable and the counter-case is weak." },
      { key: "D", label: "Tie to their goal", text: "'This IS the upmarket bet you committed to.'" }
    ],
    why: "What does a leader most need from CTRL at the moment of truth?" }
];
```

Build it complete and working.
