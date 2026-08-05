# The sort

For someone who will not sit for a session, or when there is no facilitator. This is the self-serve instrument and it is what CTRL automates. Run it by hand the same way, so the output is identical.

## What it is

Thirty pieces of work, graded one at a time. Two poles and an escape. One line of reasoning each. About twenty minutes.

It works because recognition is easier than recall. Ask someone to describe their tone and you get "clear and professional," which is useless to everyone. Show them two things and ask which one they would send, and you get their actual standard without them ever having to articulate it.

## Building the items

**Six of their own work.** Real pieces they produced. The strongest signal available, because there is no question of whether the artefact is realistic.

**Twenty as ten matched pairs.** For each candidate construct from the transcripts, write two pieces on the same subject, same length, same register, differing on **one dimension**: that construct. One satisfies it, one violates it. Show them separately, at least four positions apart, never side by side.

The pair is the whole point. A pile tells you they rejected something. A matched pair tells you what they rejected it **for**, because everything else was held constant. That is the difference between a preference and a construct.

**Four from someone else.** Real work by a peer in the same surface. Without these the whole exercise is a self-reaction and you cannot tell a standard from a style.

## The held-out set

Ten of the thirty never train anything. They are the test.

**Hold out whole pairs, never individual items.** Three complete pairs, two of their own, two peer. If you hold out at random you split roughly half the pairs across the boundary and destroy the one thing the pair design gives you.

**Tell them there is a test. Never tell them which items.** Announcing the test set contaminates it, because it changes how they grade those specific items. Say it once in the preamble and reveal after.

## The preamble, say it exactly

> Most of these are deliberately mediocre. Some of them are yours. Rejecting a lot of them is the normal result and it is the useful one.
> Some of these are a test and I will not tell you which. There is no right answer and nobody else sees this.

Every clause is doing work. Pre-normalising the reject is the highest-efficacy debiasing move measured. "Some of them are yours" stops them pattern-matching for the trap. "Nobody else sees this" is the anonymity assurance, and it has to be specific about who does not see it, because vague reassurance measurably underperforms.

## The question, every time

> Would you send this?
> **Send** / **Would not send** / *(skip)*
> One line: what makes it that?

Two poles and an escape. **Skip is excluded from every calculation.** It is not a middle point and it must never be scored as one. The moment you offer a middle, people default to it, and the difference between adjacent points on any scale is inconsistent enough across a session to be worth nothing.

The one line is optional and you ask for it every single time. It is the highest-value thing the sort produces. The verdict tells you what. The line tells you why, and the why is what becomes a criterion.

## The manipulation check

At items 8, 16 and 24, after they have graded both halves of a pair, ask one extra question:

> Those two were meant to differ in one way: one names a specific client fact and the other does not. Is that the difference you saw?
> **Yes** / **No, the difference was...**

Three questions, about fifteen seconds.

This exists because the largest untested assumption in the whole method is that a matched pair actually differs on one dimension. If it varies on two, their grade gets attributed to the wrong one, the criterion that survives discriminates on the confound, and everything downstream looks correct and is not. It fails silently and it looks like success.

**If two of three come back wrong, stop.** Do not compile a rubric on top of a confounded item set. Rewrite the pairs.

## The indirect item

Once, around item 15:

> How common do you think it is for people in your role to send something like this?
> **Common** / **Uncommon**

Ask only about other people. Never "most people would send this, would you?", which asserts a norm and then asks about the self, and pushes the answer toward send. The original instrument works precisely because it removes self-implication and lets them project.

One item is a prompt to look, not a measurement. If their answer here diverges sharply from how they graded, note it as an observation and raise it as a question later. Do not resolve it.

## What never appears in a sort

No "describe your tone." No "rate your standards." No "what are your preferences." No sliders. No 1 to 5. No personality questions.

If you find yourself writing a question that asks someone to characterise themselves, you have left the instrument and gone back to the thing that does not work.

## Recording it

`grades.jsonl`, one row per item: the item, its origin, its pair, whether it was held out, the verdict, the line, and how long they took. Time is behavioural data. A nine-hundred-millisecond reject on something they later argue about tells you something the verdict does not.
