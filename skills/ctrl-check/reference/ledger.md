# The observation ledger

One line per distinct finding, appended after every review, silently. Never mentioned in the review output.

## Location

`ledger/YYYY-Www.md`, one file per week, alongside the person's compiled folder. Create it with a header row if it does not exist.

## Format

Pipe delimited, one line per finding:

```
DATE | SURFACE | CRITERION | VERDICT | QUOTE | DISPOSITION
```

| Field | Contents |
|---|---|
| `DATE` | ISO date |
| `SURFACE` | what was reviewed: proposal, email, deck, skill, post |
| `CRITERION` | the exact criterion name from the rubric, or `uncovered` |
| `VERDICT` | holds, borderline, breaks, or uncovered |
| `QUOTE` | the passage, truncated to about 15 words |
| `DISPOSITION` | `accepted` if the human took the note, `rejected` if they pushed back, `unknown` if there was no response |

Example:

```
2026-08-04 | proposal | Earned claim | breaks | "we help organisations unlock their potential" | accepted
2026-08-04 | proposal | uncovered | uncovered | "second half repeats the first" | unknown
2026-08-05 | email | Earned claim | breaks | "delighted to connect and explore synergies" | rejected
```

## The two row types that matter most

**`uncovered` rows are the most valuable lines in the file.** They are the standard telling you what it does not yet contain. `ctrl-capture` processes them first, and they are how a rubric grows from the work rather than from a workshop.

**`rejected` rows are the most urgent.** The gate said breaks and the human disagreed. Two of those on the same criterion means the criterion is wrong, badly phrased, or firing too broadly. False positives are what get a gate ignored, and a gate that gets ignored cannot be fixed later because the credibility is spent.

## Capturing the disposition

You will often not know whether the note was taken. Write `unknown` rather than guessing.

If the person responds to the review in the same conversation, capture it. If they argue with a verdict, that is `rejected` and it is the most useful thing they will do all week. Log it without defending the verdict.

## Two rows that are not output findings

**Method corrections.** When the person corrects how the work gets done rather than what one artefact says, it does not fit the six-field line and it must not be forced into one. Write it to `ledger/method-YYYY-Www.md` in the shape `DATE | ARTEFACT | CLASS | THE CORRECTION | SCOPE`, and see `ctrl-capture/leaves/method.md`.

The test for which one you are looking at: **if fixing only the artefact in front of you leaves the problem intact, it is a method correction.** These are rarer, worth more, and the class most likely to be agreed with in conversation and then lost.

**Trigger events.** One line per session, to `ledger/trigger-YYYY-Www.md`:

```
DATE | SKILL | fired | kept | undertrigger-phrasing
```

`undertrigger` is the valuable one: the person described work this skill covers and it did not load. Capture their exact phrasing, because that phrasing is the fix and it goes into the description's trigger list.

## What never goes in the ledger

- No commentary. Six fields, nothing else.
- No summary rows.
- No entry for a criterion you did not actually score.
- Nothing about who wrote the submission. The ledger is about the standard, not about people.

## What reads it

`ctrl-capture`, weekly. Nothing at runtime. The ledger is written by the gate and read by the learning pass, and no other process touches it.

That separation matters: a ledger that gets read during a review becomes an input to the review, and then the gate is scoring work against its own history instead of against the standard.
