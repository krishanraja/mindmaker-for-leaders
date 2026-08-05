# Phase 0.5: the hand run

One person (you), one day, zero code. This runs the whole chain by hand using the five `skills/ctrl-*` skills, so the two largest assumptions in the design get measured BEFORE the sort UI is built, and the [U] thresholds get tuned on real data instead of guesses. CH-17 in CHALLENGE.md is the mandate; `skills/ctrl-intake/leaves/sort.md` is the protocol this follows.

**The one rule that makes this a valid test:** generate the items with PROMPT 2 below, exactly as written, in a fresh Claude chat. That prompt is what `build-sort` will ship in Phase 2, verbatim. If a pair comes out bad, do not quietly fix it; grade it as it came out and note it. A curated item set would measure you as a facilitator, not the generator, and the result would be thrown away.

## What you need

- One or two call transcripts (Fireflies export is fine) or 3 to 5 pieces of your real recent writing, pasted.
- Six pieces of your own past work on one surface (client emails, board updates, or LinkedIn posts; pick ONE surface).
- Four pieces of someone else's public writing in the same surface (a peer's real LinkedIn posts or published memos; attributed, public).
- About 20 minutes for the sort itself; an hour total.

## Step 1: candidates (PROMPT 1)

Fresh Claude chat. Paste this, then your transcript(s):

```
You are extracting CANDIDATES, not rules. Nothing you produce is a preference.

1. Every candidate carries at least one verbatim quote. If you cannot quote it,
   do not produce it. Paraphrase is not evidence.
2. Mark every candidate SITUATED and state the situation in the speaker's own
   framing. A statement made about one artefact, one meeting or one moment is
   about that thing until they tell you otherwise.
3. Do NOT produce a contrast pole. You have not seen them separate anything.
   The sort produces it.
4. Do NOT infer a rule from a preference, or a preference from an observation.
   "He asked for bullets once" is an observation. It is not "he wants bullets."
5. If the source contradicts itself, produce both candidates and flag the
   conflict. Do not resolve it. You do not have the evidence to.
6. Produce no more than 12 candidates per source, ranked by how often the
   speaker returned to the point unprompted, which is the only frequency
   signal you have.

Output each candidate as:
CANDIDATE <n>: <one line, the dimension you think they judge work on>
QUOTE: "<verbatim>"
SITUATION: <what this was about, in the speaker's framing>

TRANSCRIPT FOLLOWS:
```

Keep the top 5 candidates (most-returned-to). These feed Step 2.

## Step 2: matched pairs (PROMPT 2, the load-bearing one)

Fresh Claude chat (do not reuse the Step 1 chat). Paste this, filling in the three blocks at the end:

```
You are generating a paired-opposite forced sort for one person.

For EACH candidate construct below, produce TWO matched pairs (four artefacts
per construct, 20 artefacts total for 5 constructs).

A matched pair is two artefacts on the same subject, same length, same
register, same facts, differing on exactly ONE dimension: the construct.
One SATISFIES the emergent pole. One VIOLATES it.

Rules. Each one is load-bearing; skipping any invalidates the instrument.

1. Vary ONLY the target dimension. Same subject, same names, same numbers,
   same structure, length within 10 percent. If satisfying the construct
   forces a second change (shorter sentences shrink the piece), compensate
   elsewhere so length stays matched.
2. The violating half is COMPETENT work. It would pass review at most
   companies. Not a strawman, not sloppy, no errors. The only thing wrong
   with it is the dimension.
3. Both halves are deliberately mid-grade on everything EXCEPT the target
   dimension, so no other quality signal separates them.
4. Write in this person's world: use the CONTEXT block for plausible clients,
   numbers and situations. Never reuse their real sentences.
5. For each pair, write INTENDED_DIMENSION: one plain sentence naming the
   single difference ("one names a specific client fact, the other could be
   for anyone"). This is the answer key. It is never shown before grading.
6. No em dashes anywhere.

Output per pair:
PAIR <construct-n>.<1|2>
INTENDED_DIMENSION: <one sentence>
ITEM A (satisfies): <the artefact>
ITEM B (violates): <the artefact>

SURFACE: <the one surface you picked, e.g. "client status emails">
CONTEXT: <3 lines: your company, role, the kind of clients/numbers that are plausible>
CONSTRUCTS:
<paste the top 5 candidates from Step 1, each with its quote>
```

## Step 3: assemble the deck (33 screens)

- 30 unique items: your 6 own + the 20 generated + the 4 peer pieces.
- Shuffle once. Matched-pair halves at least 4 positions apart. Your own items mid-to-late, never first.
- Mark 10 as held out BEFORE grading: 3 complete pairs (6 items), 2 own, 2 peer. Whole pairs only, never split one.
- Add 3 repeats: re-show items from positions 1 to 10 again at least 8 positions later (screens 31 to 33 are fine). These measure self-agreement (CH-12) and score nothing else.

## Step 4: grade (the 20 minutes)

Read the preamble aloud to yourself first, it is part of the instrument:

> Most of these are deliberately mediocre. Some are yours. Rejecting a lot of them is the normal result and it is the useful one.
> Some of these are a test and I will not tell you which. There is no right answer and nobody else sees this.

Per item: **Send / Would not send / (skip)**, plus one line: what makes it that? Log one JSON line per grade:

```jsonl
{"pos":1,"item":"pair3.1A","verdict":"would_not_send","why":"reads like it could be for anyone","ms":9000}
```

At positions 8, 16 and 24 (after grading, on a pair you have now seen both halves of), answer the OPEN form first, then check the key:

> In one line: what is the difference between those two?

Log: `{"manip_pos":8,"pair":"3.1","your_answer":"...","matches_key":true}`

At position 15, once: "How common do you think it is for people in your role to send something like this? Common / Uncommon" (log it, move on).

## Step 5: score it (feed the numbers back)

- **Pair-split rate** (the halt metric, CH-09): of the 10 pairs, how many did you split (sent the satisfier, rejected the violator)? At or above 7 of 10: the generator isolates dimensions, Phase 2 proceeds. 4 to 6: proceed flagged. Below 4: the generator is confounded; Phase 3 does not start until the pair prompt is fixed.
- **Open-question hits**: of the 3 manipulation checks, how many of your open answers matched the key?
- **Self-agreement** (CH-12): of the 3 repeats, how many matched your first verdict?
- **Gap distribution** (tunes the 0.30 threshold): run `skills/ctrl-compile` over the 20 training grades (hold-out excluded) and record every candidate criterion's gap.
- **Accept-side count** (CH-08): how many of the 20 training items did you mark Send? Below 4 means the instrument starves the discrimination test and the item mix needs rebalancing, not the threshold.

## What to send back

The `grades.jsonl`, the pair-split count, the 3 manipulation lines, the 3 repeat results, and the `ctrl-import.json` that ctrl-compile emits. Those five things tune Phase 2 and 3 and validate the Phase 1 schema against real rows. A week later, run `skills/ctrl-capture` once over anything the compiled standard has been used on; one real ledger line closes the loop the whole chain exists to create.
