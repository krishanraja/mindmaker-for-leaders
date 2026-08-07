/**
 * The approved copy for CTRL's five public front doors.
 *
 * Signed off by Krish on 2026-08-05 from the copy-desk deck, slot for slot.
 * Every string a visitor reads on /, /try, /upgrade, /agents and /auth lives
 * here so the surfaces cannot drift from each other and a copy edit is a
 * one-file job. The slot ids from the deck are kept as key names.
 *
 * House rules that apply to everything below: no em dashes, plain language,
 * no app jargon a leader would have to learn.
 */

/** Shared across every public header. */
export const NAV = {
  cta: 'Start free',
} as const;

export const LANDING = {
  // hero
  eyebrow: 'CTRL',
  h1: 'Build your AI brain.',
  sub: 'Leaders are overwhelmed with how to best use AI for themselves and their business. CTRL brings together the AI news you need, builds your digital brain and helps you battle test the next million dollar business decision.',
  cta1: 'Watch it work',
  cta2: 'Start free',
  trust: 'Voice-first, built for busy executives.',
  toolsLbl: 'Works with',

  // judgement
  judgeEy: 'don’t hire another AI consultant, take ctrl.',
  judgeH: 'A new era of AI advisory is here, and it’s in your pocket.',
  judgeBody:
    'CTRL builds your private AI brain to power your decision making on all things AI. Backed up by decades of practical expertise, world class memory-theory and leadership knowledge from across the globe, verify or counter your next business idea and sharpen your mind, ready for you to be an AI-native leader.',
  // Describes the brain demo directly above it. The tension edge is the honest
  // part and the part worth pointing at: a brain that only ever agrees with
  // itself is not holding anything.
  judgeCap:
    'Your facts, and how they hold each other up. It keeps the ones that pull against each other too.',
  judgeCta: 'Put one of yours in',

  // taste
  tasteEy: 'Taste',
  tasteH: 'Standards, taste and judgement are your moat; CTRL gets more out of your mind than prompting AI.',
  tasteBody:
    'The next moat is your expertise, and this tool is built for leaders who have it in spades. Your AI tool sounds like everyone else’s, and it hides a deeper problem: AI risks making humans become the same, and become replaceable. CTRL incorporates world class harness engineering and behavioural theory to encode your standards, taste and judgement, so you can amplify your mind, not dilute it.',

  // daily read
  readEy: 'Your daily read',
  readH: 'Three minutes in your ear, before your first meeting.',
  readBody:
    'Every morning CTRL reads the industry for you, keeps only what touches what you are actually working on, and ends on the one thing worth acting on. No greeting, no throat-clearing; it opens on your name and gets straight into it.',
  // The honesty label under the player. It has to say plainly that the words
  // are a sample, because the voice and the format are real and someone could
  // reasonably assume the story is too.
  readNote:
    'A sample, in the voice CTRL actually uses. Yours is built each morning from real headlines and what CTRL knows about your business.',

  // portable
  portEy: 'Portable',
  portH: 'The race for your data is over. The next big tech companies are coming for your brain. It’s time to own your context.',
  portBody:
    'AI’s first rule is that it generates, and hallucinates. If you just chat to Claude or ChatGPT like you use Google, you’re training it and not levelling your brain up in return. Leaving your memory inside an AI tool disrespects your unique mind. CTRL is privatized and portable; you deserve your second brain to compound and stay yours only.',
  portCta: 'Integrated safely with where you work',

  // what we count
  countEy: 'Years of expertise, built in to the product',
  countH: 'Hiring consultants is over. Take CTRL.',
  countBody:
    'When intelligence is everywhere, the value of a consultant lies in how they help you compound your intelligence. CTRL is a fact based, evidenced and trusted AI advisor. It doesn’t give you the answer to your next big business challenge, it helps you find it. Leaders holding at least five current facts about their business in here, who weighed at least one real decision in the last seven days. Context in, judgement out, weekly.',

  // price
  priceH: 'Free is free forever.',
  priceBody: 'Memory, voice, unlimited skill builds, the daily read, three full weighs a month.',
  freeDesc:
    'Memory web, voice profile, unlimited skill builds, the daily read, and three decision weighs a month.',
  proDesc:
    'Unlimited weighs, a second model arguing against the first, decision watch, Edge artifacts, and the live MCP that sends your brain where it needs to be.',
  // The approved deck ended this on a half sentence ("...has made him realize
  // that"). It was never shipped, and Krish confirmed on 2026-08-06 that it
  // stays out, so the one complete sentence below is the whole note. Not a
  // placeholder waiting on an ending.
  priceNote:
    'Mindmaker was built by Krish Raja, an operator and advisor to enterprise and SMBs across the globe on GenAI and data infrastructure commercial and corporate strategy.',

  // close and footer
  closeH: 'Your mind is an asset. Treat it as one.',
  closeCta: 'Start free',
  footMani: 'Your context is the most valuable thing you own. It should not live inside someone else’s product.',
  footMM: 'If you would rather have this built with you, Mindmaker works with a small number of teams directly.',
} as const;

export const TRY = {
  eyebrow: 'A real decision, weighed',
  h1: 'Watch it work on a real decision. Then give it one of yours.',
  // These two lines used to say "This one actually ran" and carry a run date.
  // The example above the input is a worked one, not a stored run, so the claim
  // was not true and the date was decoration. What survives is the part that is
  // checkable: open a consideration and every source behind it resolves.
  sub: 'A decision worked through end to end. Open any consideration to see the sources behind it, and every link resolves.',
  prov: 'A worked example. The decision you put in below runs live, against today’s sources.',
  act2H: 'Now put one of yours in.',
  act2Sub: 'No account, no card. Same engine, your decision.',
  placeholder: 'Should we build our own agent stack or buy one?',
  button: 'Weigh it',
  fine: 'Takes about a minute. Three free weighs, then it asks for an account so your work is kept.',
  handoff: 'Your weigh is here. Make an account and it stays, and the next one is sharper because it will know your business.',
  keepCta: 'Keep this',
  shareCta: 'Share this',
} as const;

export const PRICING = {
  h1: 'Free is a real product. Edge Pro is the decision tier.',
  sub: 'No add-ons, no one-time upsells. The daily instrument is free and stays free. Edge Pro is for when weighing becomes the way you think.',
  cta: 'Upgrade to Edge Pro',
  note: 'The cap is three weighs a month. If you are not hitting it, free is the right tier.',
  fine: 'Cancel anytime. Your daily read, memory and skill builds stay free.',
} as const;

export const AGENTS = {
  eyebrow: 'Agent-native',
  h1: 'Your agents, on your live mind.',
  sub: 'CTRL gives your own agents a read-only feed of your current context and your built skills, so every call starts from who you are today.',
  probH: 'Pasted context is dead context.',
  probBody:
    'You paste who you are into ChatGPT or Claude and it is stale the second you close the tab. Your agents act on yesterday’s you.',
  t1: 'Your live operating context, ranked by what matters.',
  t2: 'Today’s priorities as a feed. Opt in.',
  t3: 'The skills you have built in CTRL.',
  t4: 'One skill in full, pulled live, never a stale copy.',
  cta: 'See pricing',
} as const;

export const AUTH_COPY = {
  h1: 'Start building yours.',
  sub: 'Two minutes. Then weigh a real call.',
  google: 'Continue with Google',
  email: 'Create account',
  foot: 'Self-contained. No integrations. Your data stays yours.',
} as const;

/** The AI tools a leader already runs, named under the hero. */
export const TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Cursor', 'Claude Code'] as const;
