# The working profile

One file per person. It is read by an AI at runtime and by the person themselves, and it has to survive both readers.

The design constraint that matters: **this file is going to be wrong about something, and the question is whether it is wrong loudly or quietly.** A field marked `AWAITING` is wrong loudly and someone fixes it. A field filled with a plausible guess is wrong quietly, and the person it is about finds out at the worst moment.

## Front matter

```yaml
version: 1
last_reviewed: 2026-08-04
review_interval: 90 days
owner: the person themselves
provenance: sort session 2026-08-04 plus 3 submitted artefacts
```

`owner` is the person, not you. They can edit it, and they should be told they can. A profile someone cannot change is a file about them rather than a file for them, and they will work around it instead of correcting it.

## The nine sections

**1. Owns.** Role, and what actually reports to them versus what they are merely involved in. These differ and the difference is usually stated plainly in a transcript.

**2. Recurring work.** What they do repeatedly, how often, who reviews it, what shape the output takes. Frequency first. Anything under weekly is not worth encoding.

**3. Domain expertise, headed "Evidenced, not claimed."**

| Domain | Level | Evidence | Can do unaided that a competent newcomer cannot | Last updated |
|---|---|---|---|---|

This is the load-bearing section. `Level` is expert or novice per domain, and **each one carries a consequence line**:

> Claude, day to day: EXPERT. Built his own scheduled briefing unprompted between two calls.
> Consequence: do not explain basics. Do not scaffold. He will read it as being talked down to.

Prior knowledge is the individual difference that actually predicts what helps someone. Scaffolding that helps a beginner measurably hurts an expert. This is why the section exists and why the consequence line is not optional: the level alone tells the model nothing about what to do differently.

**4. Artefacts.** A signed-off example, a rejected example, and **the difference in their own words**. Three fields, and the third one is worth more than the other two combined.

**5. Constructs.** The compiled criteria, or `AWAITING ELICITATION` with the reason:

> Do not populate these from the transcripts. Observed preferences are not the same thing as the dimensions they judge on, and guessing them produces a profile that is confidently wrong.

**6. Hard constraints.** What never appears in their output. Only things they demonstrated, never things you inferred. Each one carries its quote and date.

**7. Audience and purpose per output type.** Who reads each thing and what it has to do. Different outputs have different audiences and a single tone rule across all of them is how a profile becomes useless.

**8. Witnessed failure modes.** What has actually gone wrong, specifically, with what you saw. Negative specification is more precise than positive specification and it is the section people skip.

**9. Surface tone preference.** Labelled, in the file, as **cosmetic, self-declared, user-editable**.

That label is load-bearing. This is the one section built from what they said about themselves rather than what they did, it is the weakest evidence in the document, and it is also the section a reader will assume is the most authoritative because it is the most legible. Say what it is.

## The section that prevents the failure

Add a tenth if you have the evidence: **Correct priors.** Each line states what the model will do by default and what this person needs instead, with the quote:

> The model will default to producing documents and write-ups. He does not want them for progress reporting on this engagement.
> His words, 5 June: "We're very uncorporate as a client, so we don't want a deck or any detailed notes of what you've done."

Note the shape. It names the situation. It does not say "never produce a deck," because he was talking about progress reports on one engagement and he wants decks for everything else. This is the exact sentence that, rendered as an absolute, produced a profile its subject called crap.

**Any rule that came from a situated statement stays situated in the profile.** The situation is part of the rule, not context around it.

## The baseline

At the end, honestly:

> Baseline: 10 held-out items. Precision 0.80, recall 0.80, TNR 0.90 as of 2026-08-04.

Or:

> Baseline: none. No held-out set exists, because there was no sort. There is no honest way to measure whether this improved anything, only whether they kept using it.

The second version is not a failure to report. It is the report.

## Open items

What they owe you and what you still need. Dated. This is the section that makes the profile a live document rather than an artefact, and it is the one that gets the next session booked.

## What never goes in

- MBTI, DISC, Big Five, learning styles, any trait model. Learning styles are dead at an effect size of 0.04 and persona matching has no controlled evidence of improving any objective outcome.
- Anything you inferred and did not mark as inferred.
- A tone description built from adjectives. "Clear and professional" describes nobody.
- Anything about their personality. This is a working profile. It describes how they work.
