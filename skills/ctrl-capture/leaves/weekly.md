# The weekly pass

## 1. Parse and group

Read every ledger line from this week and the previous four. Group by criterion.

## 2. Apply two strikes

One occurrence: nothing. Two or more within the five weeks: candidate.

## 3. Sort into three types, process in this order

**Type A, uncovered.** The gate had no criterion for something that kept mattering. Highest value, process first. These are the standard telling you what it does not contain, and they are the only source of genuinely new criteria that did not come from a workshop.

**Type B, false positive.** The gate said `breaks` and the human pushed back, twice or more, on the same criterion.

**This is the most urgent thing you will ever find.** The criterion is wrong, badly phrased, or firing too broadly. False positives are what get a gate ignored, and an ignored gate cannot be repaired later because the credibility has already been spent. Two rejections on the same criterion promote it here automatically, without waiting for anything else.

**Type C, drift.** A criterion that has not fired at all in five weeks. Either it is solved and can be retired, or it stopped working. **Flag it, do not assume which, and propose no change.**

A Type C proposal is a question with no delta attached. This is the one case where you may raise something with zero occurrences, and it is allowed only because it asks rather than acts.

## 4. Write the proposal

Append to `proposals-log.md`. Never overwrite.

```
## Week 2026-W32

### PROPOSED: [one line, what changes]
TYPE:      A uncovered | B false positive | C drift
SURFACE:   proposal | email | deck | skill
OWNER:     [whose standard this is. A named person.]
EVIDENCE:  [n] occurrences across [n] weeks
  1. [date] "[quote]" -> [disposition]
  2. [date] "[quote]" -> [disposition]
DELTA:     [the exact text to append or amend, written out in full.
            Omit entirely for Type C.]
IF WRONG:  [what breaks if this is accepted and turns out to be a mistake]
STATUS:    awaiting [owner]
```

**`IF WRONG` is not decoration.** It is the field that makes the owner's decision cheap, and writing it forces you to state a falsifiable consequence instead of a preference. A proposal you cannot write an `IF WRONG` for is a proposal you have not thought through, and it should not be sent.

**`DELTA` is written out in full.** Not "tighten the wording on C3." The exact replacement text, ready to paste. An owner should be able to answer without opening another file.

## 5. On rejection

Log it as `rejected`. Do not argue and do not re-propose the same thing next week.

Two rejections on the same criterion promote it to Type B, which is the most urgent thing the system can find. An owner disagreeing twice is not obstruction, it is the clearest possible signal that the criterion is wrong.

## Worked example

Ledger over three weeks:

```
2026-W30 | proposal | uncovered | uncovered | "second half repeats the first" | unknown
2026-W31 | proposal | uncovered | uncovered | "restates the intro in the close" | accepted
2026-W31 | email    | Earned claim | breaks | "delighted to explore synergies" | rejected
2026-W32 | email    | Earned claim | breaks | "excited about the opportunity to" | rejected
```

Two candidates.

The repetition observation appeared twice and is Type A. Propose a criterion, name the observable, state what breaks if it is wrong.

`Earned claim` fired twice on emails and was pushed back both times. That is Type B and it goes first in the message. The criterion is probably right for proposals and wrong for emails, and the likely delta is a scope change rather than a rewrite. Say that in the proposal and let the owner decide.

Note what does not appear: nothing from a single occurrence, and no summary of the week.
