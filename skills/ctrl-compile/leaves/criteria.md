# Constructs to criteria

Six steps, in order. Do not reorder them and do not skip step C.

## A. Cluster on grades, not on words

Two constructs are the same criterion when **the items targeting them were graded the same way**, at roughly 0.8 agreement or above across the training items.

Do not cluster on how similar the construct text sounds. Two people, or one person on two days, will use the same words for different dimensions and different words for the same one. Clustering on text merges exactly the constructs you most need to keep apart, and the diagnosis for a large team is usually that the same labels are being used differently rather than that people disagree.

Expect 8 to 15 in, 5 to 8 out.

## B. Write each survivor in this shape

```markdown
### C3. Earned claim
- Emergent pole (their words): "it has actually seen the client"
- Contrast pole (their words): "it could be for anyone"
- Rationale: "if they can tell we wrote it before we met them, the rest of it doesn't matter"
- Observable: a named client fact appearing before the third paragraph
- Check: holds / borderline / breaks
- Weight: essential
- Discrimination: 7 of 9 rejected fail this (0.78). 1 of 11 accepted fails it (0.09). Gap 0.69. KEEP.
- Provenance: sort session 2026-08-04, items 3, 11, 19
```

Rules for the block:

- **Both poles are theirs, verbatim.** If you cleaned up the grammar you have changed the construct. Untidied is correct.
- **The observable is the criterion.** Everything above it is context. If you cannot say what someone would point at in the artefact, you have a value, not a criterion, and it cannot be checked.
- **The check is binary.** No numeric score, no percentage, no five-point scale. An aggregate number hides which criterion failed, and which criterion failed is the entire value of a review.

## C. The discrimination test

Against the training items only. Never the held-out set.

```
reject_fail_rate = rejected items that fail this / rejected items
accept_fail_rate = accepted items that fail this / accepted items
gap              = reject_fail_rate - accept_fail_rate
```

| Condition | Verdict |
|---|---|
| Fewer than 4 rejected or fewer than 4 accepted | `untested`. Not enough data. Do not load it, do not delete it. |
| gap below 0.30 | `delete`. It does not separate their work. |
| gap 0.30 or above and reject_fail_rate at least 0.5 | `keep` |
| anything else | `untested` |

The 0.30 threshold is a starting default, not a finding. It is set so a criterion has to be failed by at least three more rejects than accepts out of ten of each, which survives one or two coding errors. **Log the observed gap for every candidate the first few times you run this and tune it against real distributions.** Do not carry a number you have never looked at.

`untested` criteria go into the profile as `AWAITING` with the counts, not into the rubric. They are the standard telling you what it does not yet contain, which is more useful than it sounds.

## D. Weights

`essential` / `important` / `optional` / `pitfall`. Pitfall carries negative weight: it is the thing that spoils the piece rather than the thing that makes it good.

Load order in the file: essential, then pitfall, then important, then optional. Non-negotiables go at the top because position changes which criteria actually get applied and the bottom of a list is where things quietly stop mattering.

## E. Name them in their words

The criterion name comes from the emergent pole, shortened, in their vocabulary. "Earned claim." "Actually seen the client." Not "Client Specificity Score." Not "Personalisation Criterion."

They will read this file. If it sounds like a consultant wrote it, they will not trust that it came from them, and they will be right to check.

## F. Every line carries a pointer

Provenance is the triad or the item numbers, plus the date. It goes on the criterion and it survives into every artefact built from it. If a criterion cannot name where it came from, it did not come from them.

## The three things that will go wrong

**Everything passed.** The criteria are describing the format rather than the standard. Look at what the rejected pieces have in common that the accepted ones do not, and if you cannot see it, the sort items were too similar to each other.

**Everything died.** The pairs were not isolating single dimensions. This is an upstream problem in item generation and no amount of loosening the threshold fixes it. Say so and rebuild the pairs.

**One criterion explains everything.** Usually means the pairs all varied on the same confound, often length or formality. Check the pairs before believing it.
