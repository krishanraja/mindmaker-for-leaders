# Transcripts, recordings and existing writing

What to do with call recordings, meeting notes, Fireflies or Granola transcripts, emails and documents someone wrote.

## The one thing to understand before you start

**A transcript is a rich source of candidates and a poor source of truth.**

This is not a caution, it is the operating rule. What people say about their own behaviour and what they do diverge by 10 to 30 percent on anything they feel judged about. The mechanism splits in two: some of it is conscious impression management, which anonymity reduces, and some of it is genuine mis-remembering, which persists under full anonymity and cannot be designed away.

So a transcript tells you what to test. It does not tell you what is true.

## The failure this prevents, concretely

A CEO said, about how a consultant should report progress on one engagement:

> "We're very uncorporate as a client, so we don't want a deck or any detailed notes of what you've done."

That became, in a generated instruction file:

> FORBIDDEN: Do not create decks for him.

He read it and said it was crap, because he does want decks. He wanted them from his team, for clients, all the time. The statement was about one situation. The rule was about all output, forever.

Nothing in that sentence was misquoted. The quote was accurate, the date was right, and the extraction was still wrong, because a situated statement was rendered as a standing rule. That is the failure mode, it is the most common one in this whole discipline, and the rest of this file exists to stop it.

## Extraction rules

**1. Quote or do not produce.** Every candidate carries a verbatim quote from the source. If you cannot quote it, you did not find it. Paraphrase is not evidence and a paraphrase you wrote is not something they said.

**2. Mark everything situated, and say what the situation was.** In their framing, not yours. "About progress reports on this engagement." "About the one deck he showed the board in March." A statement is about the thing it was about until they tell you otherwise, and they have not told you otherwise yet.

**3. Do not produce a contrast pole.** You have not watched them separate anything. Leave it empty. The grading produces it. A contrast pole you invented is the guess that makes the whole profile confidently wrong.

**4. Do not infer a rule from a preference or a preference from an observation.** "He asked for bullets once" is an observation. It is not "he wants bullets." It is certainly not "never write him a paragraph."

**5. Contradictions stay contradictions.** If the source contradicts itself, produce both candidates and flag it. Do not pick. You do not have the evidence to pick and choosing quietly is how a wrong rule gets laundered into a confident one.

**6. Twelve candidates maximum per source.** Rank by how often they returned to the point unprompted, which is the only frequency signal a transcript actually gives you.

**7. Nothing you produce may contain "always", "never", "must" or "forbidden"** outside a quoted span. A candidate is not a rule and it may not be phrased like one, because the phrasing survives longer than the caveat.

## What transcripts are genuinely good for

Three things, and they are worth the read:

- **Prior knowledge, with the consequence attached.** Watch what they do, not what they claim. Someone who built their own scheduled briefing between two calls is an expert and scaffolding will read as condescension. Someone who has never opened the settings page is a novice and skipping the explanation will lose them. Grade each domain expert or novice and write the consequence next to it. Scaffolding that helps a beginner measurably hurts an expert, and prior knowledge is the individual difference that actually predicts this, unlike every trait model.
- **Decision rights.** Who signs off what. This is usually stated plainly and rarely wrong.
- **Delivery constraints already discovered.** Which tool, which channel, what was already tried and failed. Write these down with the date so nobody rediscovers them.

## What transcripts are not good for

Constructs. The dimensions someone judges on. Their standard.

Leave those `AWAITING ELICITATION` and write the reason next to them:

> Do not populate these from the transcripts. Observed preferences are not the same thing as the dimensions they judge on, and guessing them produces a profile that is confidently wrong.

## The two-minute version for someone who will not sit down

Some people will never do a session or a sort. There is one move left, and it takes two minutes:

**Hand them four of their own past documents and ask which two they would send today.**

That is a four-item sort. It is thin and it is real, which beats thick and invented. Do it at the end of a meeting they were already in.

## Pasted writing

If they paste real writing, that is ground truth for voice and it beats anything they say about their own style.

Take from it: sentence shapes with real examples, verbatim sentences worth keeping, the words they actually use, the constructions that never appear. Do not take adjectives. Do not build a dimension table of enums. A voice standard is exemplars, shapes and a kill list, and the moment it becomes a set of labels it has stopped describing anyone in particular.

**Never fabricate a sample.** If no real writing exists, describe the register in prose and include no quoted example. An invented quote attributed to someone is the fastest way to lose them, and they will notice, because it is their own writing they are looking at.

## Output

`evidence.jsonl`, one row per extraction:

```json
{"id":"e001","kind":"utterance","quote":"we don't want a deck or any detailed notes of what you've done","body":"does not want written progress reports on this engagement","source_label":"Scope call","source_ref":"2026-06-05","occurred_at":"2026-06-05","situated":true,"situation":"about how the consultant reports progress on this engagement"}
```

Then `constructs.md` with candidates only, every one carrying its evidence ids, every contrast pole empty.
