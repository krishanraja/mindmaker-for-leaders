# The quarterly pass

Every thirteenth run, alongside the weekly one. This is the pass that catches the standard being quietly wrong rather than incomplete.

## Re-score the held-out set

Run the current rubric against the ten held-back graded items and compare to what the person actually said.

Treat **"would not send" as the positive class**, because catching what they would reject is the job:

```
TP = they said would_not_send, gate said breaks
FP = they said send,           gate said breaks
FN = they said would_not_send, gate said holds
TN = they said send,           gate said holds

precision = TP / (TP + FP)
recall    = TP / (TP + FN)
TNR       = TN / (TN + FP)
```

**Report all three separately. Never a single agreement number.** Raw agreement is misleading whenever the classes are unbalanced, and they always are. A gate that says `holds` to everything scores well on agreement and is worthless.

The false positive count is the one to watch. It is the number that predicts whether people keep using the gate.

## Check for decay

Compare against the previous quarter. **True negative rate falls as the generator improves**, which is the finding that most threatens this whole architecture: as the work getting produced gets better, the gate sees fewer clear failures and its ability to spot the remaining ones degrades.

Recalibration is a scheduled event, not a response to complaints. If you wait for someone to complain, the gate has already lost the room.

Honest expectations: uncalibrated agreement on long-form judgment runs somewhere between 56 and 73 percent. Above 90 is achievable when calibrated on one person's labels in a narrow domain, and it is precedented mostly on much simpler tasks than this. Do not promise better before you measure.

## Re-score old labels when the rubric changed

Keep a frozen regression set: a fixed sample of graded items scored against both the frozen rubric and the current one.

**Divergence between the two separates a standard genuinely rising from a standard drifting.** Without it you cannot tell the difference, and they feel identical from the inside. A standard that has risen agrees with the person more than it used to. A standard that has drifted agrees with itself more than it used to.

## Report retirements

Criteria that have not fired in a quarter and were not resolved by a Type C proposal. List them with their last-fired date and ask the owner directly: retire, or fix?

Do not retire anything yourself. A criterion that stopped firing might be the one thing preventing a failure nobody has seen recently, which is what success looks like.

## The report

```
QUARTERLY, [person], [date]

HELD-OUT SET, n=10
  precision  0.80  (was 0.75)
  recall     0.80  (was 0.80)
  TNR        0.90  (was 0.95)  <- decay, watch this

REGRESSION SET, n=20
  frozen rubric agrees with them on 15
  current rubric agrees with them on 17
  the standard rose

CRITERIA
  7 current, 1 added this quarter, 0 retired
  C5 "Named owner" has not fired in 14 weeks

FOR [owner]
  1. Retire C5, or is it still doing work?
```

Four numbers, one question. Anything longer will not be read, and a quarterly report that goes unread is how a standard drifts for a year before anyone notices.
