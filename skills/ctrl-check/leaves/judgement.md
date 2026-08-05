# The judgement pass

Runs only after the mechanical pass. Reads only the criteria in the loaded rubric, plus the two house lenses declared at the bottom of this file.

## Load order

Read `rubric/core.md`, then the surface leaf. **Before the submission.** If you have already read the submission, you have already formed an impression, and checking an impression against criteria is not the same operation as scoring criteria.

## Retrieve exemplars

Pull three to five of their own graded items from `exemplars/`, chosen as the closest matches to what you are reviewing, and read them with the verdict and the line they wrote about each.

Do not run this pass with the rubric alone. Retrieved exemplars moved one judging benchmark from 54.9 to 81.7 percent, which is a bigger effect than anything achieved by rewriting the rubric. A criterion describes the standard. An exemplar demonstrates it, and there is information in the demonstration that the description does not carry.

## Quote before you score

For every criterion, quote the exact passage first. Then score it.

If you cannot quote a specific passage, write `insufficient evidence` and move on. You may not score a criterion you cannot point at.

This is the mechanism that makes the difference between a review and a plausible essay about a review. The measured problem is specific: evaluation attends to the source three to five times less than generation does and barely reads the candidate answer. The quote is a forcing function against that, and it is the only one that works.

## Score

- `holds`: quote the passage that carries it
- `borderline`: name the single change that moves it to holds, or score it `breaks`
- `breaks`: quote the passage, name the criterion

Seven criteria maximum. Essential first, then pitfall, then important. If the rubric has more than seven for this surface, it should have been split into two passes and you should say so.

## The three lenses

Run them **independently**. Write each verdict before reading the next lens's criteria. Do not let them inform each other and do not let them debate. Debate measurably degrades consistency and the degradation does not recover.

**Lens 1: Standard.** Against the person's compiled criteria, and only those. This is the lens that can block, once the criteria have been measured. Everything it says is labelled **their rule** and names them.

**Lens 2: Evidence.** Is every claim earned, every number sourced, every quote real. Labelled **house check**. **Advisory only, permanently.**

**Lens 3: Signature.** Could this have been written by anyone. Labelled **house check**. **Advisory only, permanently.**

Lenses 2 and 3 are house-level and written rather than elicited from this person. They earn their place because the failures they catch are real and common. They may not block, and they may never be reported as the person's own rule. Somebody will eventually read a house check attributed to them, disagree with it, and lose confidence in everything else in the review. Label them correctly and that never happens.

## Where lenses disagree

Do not average and do not pick. Report the disagreement and escalate:

> Standard and Signature disagree on the opening. Standard holds it against C2. Signature reads it as generic. Worth a human look.

Disagreement between independent verifiers is signal, not noise. Verifiers that agree are right far more often than verifiers that split, and flattening a split into a single verdict throws away the most useful thing the panel produced.

## Never invent a criterion

If the piece has an obvious problem and no criterion covers it, say so as an uncovered observation:

> Not covered by the rubric: the second half repeats the first. Flagging, not scoring.

Then log it as `uncovered` in the ledger. **Uncovered lines are the most valuable rows in the ledger**, because they are the standard telling you what it does not yet contain, and `ctrl-capture` processes them first.

What you must not do is score it anyway against a criterion you made up on the spot. A rule system that fires outside its elicited envelope will fail silently, and this one will too.

## When you cannot tell

Say which criterion you could not evaluate and why. Do not guess.

A confident wrong review carrying someone's name costs more credibility than no review at all. If the submission type is genuinely novel, route to `rubric/general.md` and flag that you did.

## Revision

Every `breaks` carries a rewrite of that specific passage. Not the whole document, and not more than two passages.

A gate that only says no gets bypassed. That is not a prediction, it is what happens, and it happens within about a fortnight. The revision is what keeps the gate in the workflow.

**Anything you rewrite goes back through the mechanical pass and the provenance pass before it ships.** Your own revision is not exempt from the checks that caught the original, and a revision that skips them is an ungated write into a document that was being gated.

## Disposition

A criterion is `advisory` until its false-positive rate has been measured. Ship at warning level, watch the first ten reviews, tune the noise, and promote to blocking only once the false positives are gone.

An untrusted gate is worse than no gate. It consumes the authority you would need to introduce a real one later, and you only get to spend that once.
