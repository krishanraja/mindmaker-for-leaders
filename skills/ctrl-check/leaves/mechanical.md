# The mechanical pass

Pass or fail. No judgment anywhere in this file. Run it first, report every violation with the offending text quoted, and run it even when the judgment layer cannot run at all.

This layer is reliable in a way the next one is not. Treat that as a feature: on a submission where the standard has not been elicited yet, this pass is still worth the review.

## Banned constructions

Every one of these is an automatic `breaks`. Quote the offending text.

| Kill | Why |
|---|---|
| Em dashes, anywhere | House rule. Not stylistic, not negotiable. Count them: a draft full of them was not written by a person who writes. |
| "In today's fast-paced world" and every variant | Opens on nothing. Delete the sentence and the piece is unchanged. |
| "It's not just X, it's Y" | A shape, not a thought. |
| "Whether you're X or Y" | Addresses everyone, lands on nobody. |
| "Let's dive in", "let's explore", "buckle up" | Announces the content instead of being it. |
| "Unlock", "unleash", "supercharge", "elevate", "harness" as verbs | Do nothing a plain verb would not do better. |
| "Game changer", "seamless", "robust", "leverage", "synergy" | Claims with no content. |
| "Delve", "tapestry", "testament to", "underscores", "pivotal" | Nobody says these out loud. |
| "The result?" or "The best part?" as a standalone line | Manufactured suspense about a fact. |
| Rule-of-three lists where the third item is filler | Count them. The third is usually there for rhythm. |
| Any sentence starting "Remember," or "Ultimately," | Both signal a summary the piece did not earn. |

## Structural checks

**Opens on a claim, not a windup.** If the first sentence could be deleted with no loss, it is a `breaks`.

**Every claim earned.** Any assertion of a number, an outcome or a result with no source, no example and no named instance is a `breaks`. **This is the single most common way slop passes as substance**, and it is the one people argue about, because the claim is usually true. True and unsourced is still a `breaks` in a document going to a client.

**Nothing only they could have written.** If the piece could be published verbatim by anyone with the name swapped, it is a `breaks`.

This is the highest-consequence check here and the only one in this file that needs a moment's thought. Run it by asking what in the piece could not have been written by someone who had never met them. If the answer is nothing, say so.

**Sentence length variance.** Five or more consecutive sentences within roughly fifteen percent of the same length. Machine rhythm.

**Paragraph opener repetition.** Three or more paragraphs opening the same structural way.

**Verbosity.** Any section substantially longer than its neighbours, roughly 1.4 times the median, is padding until proven otherwise. Models write two to three times as much as humans even under an explicit cap, and the surplus is mostly restatement.

## Their own kill list

If the compiled folder contains a personal kill list, run it and treat it as **blocking**.

The house list above is written rather than elicited, so it warns. Their list came out of what they actually rejected, so it blocks. That asymmetry is deliberate: a rule someone demonstrated outranks a rule somebody wrote down, including this file.

## The excess vocabulary check

If a corpus of their pre-2023 writing exists, compare word frequencies and flag anything anomalous.

Carry this caveat and mean it: **whether this separates cleanly at one person's corpus size is unverified.** Run it, report it, and treat a flag as a prompt to look rather than a verdict. If it does not separate the known-good from the known-bad on their held-out items, say so and drop the check rather than keeping a signal that does not signal.

## Structural conformance, for skill and instruction files only

- Router under 80 lines
- No reference more than one hop from the router
- Description under 1024 characters, third person, five or more trigger phrases, push language present
- Body does not restate the description
- Every MUST or NEVER followed by its reason
- Exactly three test prompts, none of them clean
- Name lowercase with single hyphens, under 64 characters
- Every `AWAITING` from the source profile still present

## What this pass may never do

No judgment. If a check requires reading for meaning, it belongs in `leaves/judgement.md`.

The value of this file is that it is right every single time and costs nothing to run. The moment it starts making calls, it inherits the failure modes of the layer above and loses the one property that makes it worth running first.
