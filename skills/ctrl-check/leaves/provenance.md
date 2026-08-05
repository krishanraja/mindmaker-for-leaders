# The provenance pass

Mandatory for anything that is **about** a person rather than **by** them: a skill file, a project instruction file, a working profile, a set of custom instructions, a context file.

This is the pass that catches the specific failure the whole chain exists to prevent, and it is deterministic. No judgment, no taste, no reading for meaning. A claim either resolves to something someone said or it does not.

## The failure, so you know what you are looking for

A CEO said, about how a consultant should report progress on one engagement:

> "We're very uncorporate as a client, so we don't want a deck or any detailed notes of what you've done."

A generated instruction file rendered that as:

> FORBIDDEN: Do not create decks for him.

He read it and said it was crap, because he wants decks. He wants them constantly, from his team, for clients. He did not want written progress reports from one consultant on one engagement.

Nothing was misquoted. The quote was verbatim, the date was right, the attribution was correct. The extraction was still wrong, because **a situated statement was rendered as a standing rule** and the situation was dropped somewhere between the profile and the instruction file.

The profile, incidentally, was fine. It carried the quote, the date and the framing. The render is where it broke. That is why this pass runs on the artefact rather than on the source.

## Run it

For every factual assertion, figure, date, name, quote and imperative in the document:

**1. Find its pointer.** `[C3]` for a criterion or `[E7f2]` for an evidence id.

**2. No pointer is a `breaks`.** Quote the sentence. There is no exception for a rule that is obviously true, and there is no exception for a rule you agree with. A rule that survives without a pointer reads exactly like a rule that was invented, and the reader cannot tell the difference at the moment it matters.

**3. Resolve the pointer.** It must point at a live row. A pointer to something deleted or superseded is a `breaks`.

**4. Check the situated flag.** This is the one that catches the failure above.

If the evidence row is marked `situated`, the rule may only be stated in its situation:

> For progress updates on this engagement, lead with the decision [E12]

Not:

> Never produce a deck.

**A standing rule whose only support is situated evidence is a `breaks`.** Say which evidence row, quote its situation, and give the corrected situated form as the revision.

**5. Check every quotation.** Anything presented as their writing must be a verbatim substring of a real evidence quote. Not close, not cleaned up, not tidied for grammar. If it is not a substring, it was fabricated and it comes out.

This is the check that catches the model inventing a plausible sample of someone's voice, which it will do, and which is the fastest single way to lose the person the document is about.

**6. Check the AWAITINGs survived.** Every `AWAITING` in the source profile must still be present. A field that was honestly empty and is now confidently full is the worst outcome available, because the honesty was there and something removed it.

## The report

```
PROVENANCE
[n] claims checked
[n] resolve
[n] unresolved:
  "the exact sentence" - no pointer
  "the exact sentence" - [E12] is situated ("about progress reports on this
     engagement"), stated here as a standing rule
  "the exact quoted passage" - not a substring of any evidence quote
[n] AWAITING fields in the source, [n] present in this document
```

## What to do with an unresolved claim

Two options and no third:

**Delete it**, or **rewrite it as:**

```
NOT ESTABLISHED: <the thing it was going to assert>
```

Never leave it in with a caveat. A hedged unsourced rule is still an unsourced rule and the hedge is the first thing that gets dropped when someone copies the line somewhere else.

## Why this is worth the tedium

A flagged gap is useful. Somebody fills it, usually in the next conversation, because a visible hole is an obvious task.

An invented rule spreads. It gets copied into the next document, quoted back in a meeting, and built on. Nobody checks it, because it reads exactly like the rules that are real. And the person who eventually finds it is the person it is about, which is the worst possible discovery order.

One invented detail costs more trust than ten correct ones earn.
