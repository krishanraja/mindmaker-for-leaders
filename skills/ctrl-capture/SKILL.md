---
name: ctrl-capture
description: Run the weekly pass that turns review history into proposed changes to a person's standard, and route each one to the named owner as a yes or no. Use when running the weekly capture, processing the observation ledger, reviewing what the standard learned, proposing a rule change, updating a rubric from evidence, or when asked what keeps coming up, what is being missed, what the system has learned, or whether a standard has gone stale. Also use when someone complains that the gate keeps flagging the same thing wrongly, or says a rule is out of date. Trigger on "weekly capture", "what did we learn", "update the standard", "process the ledger", "what keeps coming up", "the gate is wrong about", "is this rule still right". Do not edit a standard by hand. Every change goes through this skill as a proposal to a named human, because a standard that changes without a decision is a standard nobody owns.
version: 1.0.0
last_reviewed: 2026-08-04
owner: Krish Raja
chain_stage: "9"
---

# CTRL Capture

Stage 9. The closed loop, and the only thing in the chain that changes a standard.

**You do not edit any standard. You write a proposal. A named human accepts or rejects it.**

## Which file to read

| You are doing this | Read |
|---|---|
| The weekly run: parsing the ledger, finding candidates, writing proposals | `leaves/weekly.md` |
| A correction about how the work gets done rather than about one output | `leaves/method.md` |
| The quarterly run: re-scoring the held-out set, checking for decay, retiring criteria | `leaves/quarterly.md` |

Every thirteenth run does all three.

## Three signals, not one

Most designs record only the first of these. The second is the one an expert actually produces.

| Signal | Records | Where |
|---|---|---|
| **Output correction** | the gate scored this, the human agreed or did not | the ledger, `leaves/weekly.md` |
| **Method correction** | the human said something about how the work gets done | `leaves/method.md` |
| **Trigger accuracy** | did the skill fire when it should have | one line per session, see below |

**Trigger accuracy is the cheapest signal available and almost nobody records it.** The description is most of a skill and undertriggering is the failure mode, so log two things: sessions where the skill fired and the person kept the output, and sessions where it should have fired and did not, with the phrasing they used. That phrasing goes straight into the trigger list, which is the highest-leverage edit any skill ever gets.

## Inputs

This week's ledger file, the previous four weeks, the method ledger, trigger events, the current rubric leaves, and `proposals-log.md`.

## The filter that makes this work

**Two strikes.** One occurrence: do nothing, leave it logged, do not mention it. Two or more across five weeks: it becomes a candidate.

This single rule is the difference between a standard that sharpens and one that accumulates noise until nobody reads it. A single occurrence is an observation. Someone had a bad Tuesday, or the document was unusual, or the reviewer was wrong. Two is a pattern.

## Routing

Proposals go to **the named owner of that standard**, in one message. Not to whoever runs the system and not to whoever built it. A standard belongs to the person whose judgment it encodes, and routing a change to anyone else quietly transfers ownership.

Not a report and not a summary of the week. Just the decisions they need to make, each answerable yes or no.

**If there are no candidates, say so in one line and stop.** A weekly pass that always finds something is a weekly pass inventing things to justify itself.

## Applying an approved change

**Append as an itemised bullet with a counter. Never rewrite the file.**

One documented consolidation pass took an accumulated context from 18,282 tokens down to 122, destroying 99.3 percent of what had built up and dropping nearly ten points of accuracy in a single step. The mitigation is not care, it is a mechanism, and the mechanism is: append, never rewrite.

**When a criterion is superseded, delete the old line.** Do not leave it in with a note. Keeping the previous version beside the current one is not neutral, it is an active tax on every future read.

**If a leaf reaches seven criteria, do not add an eighth.** Propose splitting it into two gates that run as separate passes.

**Every accepted change carries a deletion.** New criterion, retire one. New gotcha, remove one that has not fired in a quarter. New trigger phrase, drop one that never matched. New leaf, the router got shorter. The binding constraint is context occupied, not tokens spent, and a pass that only adds looks like progress for about four months before it starts degrading everything around it. State the size delta in every proposal.

## Never

- Never edit a standard file directly.
- Never propose a delta from fewer than two occurrences.
- Never rewrite, consolidate, tidy or reorganise an existing file.
- Never propose a change to a standard whose owner has not been named.
- Never report a single agreement number without precision and recall alongside it.
- Never attach a delta to a drift proposal. Drift asks a question; it does not propose an answer.
- Never review your own recent output looking for method problems. A model auditing itself for what to improve degrades measurably and produces a confident changelog while doing it. Corrections come from the person or from the ledger.
- Never measure this loop by corrections captured. Measure it by **repeat corrections declining**. If only volume rises, the deltas are not landing.

## Keywords

weekly capture, ledger, learning loop, two strikes, proposal, rule change, false positive, drift, uncovered, retire, recalibrate, precision, recall, what did we learn
