---
name: ctrl-intake
description: Elicit a person's actual standard by having them grade real work, never by asking them to describe it. Use when setting up a new client or colleague, running an onboarding or discovery session, capturing how someone judges work, working out what good looks like to them, building a working profile, processing call transcripts or meeting recordings into usable context, or when an AI output does not sound like someone and you need to find out what they actually want. Also use before writing any skill, project instruction, or profile for a named individual. Trigger on "set up a new client", "onboard", "discovery session", "what does good look like to them", "build their profile", "capture their standard", "process this transcript", "it does not sound like them", "work out what they want", "kick off with", "intake". Do not write a profile for anyone without running this skill first. Guessing produces a profile that is confidently wrong, and they will see it before you do.
version: 1.0.0
last_reviewed: 2026-08-04
owner: Krish Raja
chain_stage: "1-2"
---

# CTRL Intake

This is stage 1 and 2 of the chain. It produces the raw material every later stage depends on, and it is the only stage where a human is in the room.

You are not collecting opinions. You are collecting graded behaviour. What someone says about their own standard and what they actually do diverge by 10 to 30 percent on anything they feel judged about, and one published study found participants self-reporting 65 percent on a dimension the logs put at 47 percent. Same people, same study. Design around that gap rather than hoping it is not there.

## Which file to read

| The situation | Read |
|---|---|
| They will sit for a live session and can send you real work first | `leaves/live-session.md` |
| They will not sit for a session, or you have no facilitator | `leaves/sort.md` |
| You have call recordings, meeting transcripts, or their writing, and nothing else yet | `leaves/transcripts.md` |

Most engagements need two. Transcripts first to build the candidate pool, then a live session or a sort to grade it. Read them in that order. Never skip straight from transcripts to a profile.

## Three rules that always apply

**1. A transcript produces candidates. Only grading produces rules.**
Anything you extract from something someone said is a candidate, marked situated, carrying the exact quote and the situation it was said in. It is not a preference until they have separated two pieces of work on it. This is the single rule that prevents the failure this skill exists to prevent: a comment about one document becoming a standing rule about all documents.

**2. Never supply the dimension.**
Do not offer them a construct, not even to help them along. The moment you name the axis, you are measuring your judgment instead of theirs. Ask which two of three go together and let them tell you why. If they stall, ask for the two most similar and what the third one is instead.

**3. An empty field is honest. An invented one is not.**
Any field you cannot evidence reads `AWAITING` with one line on what would fill it. It does not read as a guess and it does not silently disappear. A flagged gap is useful and someone will fill it. An invented rule spreads, and the person it is about is the one who finds it.

## What you produce

Write into a folder named for the person, `<firstname>-<lastname>/`:

- `evidence.jsonl`, one row per thing they actually said or did, with the verbatim quote, the source, the date, and whether it was situated
- `constructs.md`, the dimensions they judge on, in their words, with both poles
- `grades.jsonl`, every artefact you showed them and what they said about it
- `session-notes.md`, what happened, what you could not get, what to ask next time

Nothing else. Do not write a summary document. The summary is what the next stage produces and writing one now anchors it on your reading rather than their grading.

## When you cannot get something

Say which field you could not fill and why. Do not reason from what you did get to what you did not. Observed preferences are not the same thing as the dimensions someone judges on, and the gap between them is exactly where a confidently wrong profile comes from.

## What comes next

Run `ctrl-compile` on this folder. It turns constructs into criteria and tells you which ones survive a discrimination test.

## Keywords

intake, onboarding, discovery, elicitation, repertory grid, triadic, working profile, standard, taste, judgment, what good looks like, client setup, kick off, transcript, meeting notes, sort, grading
