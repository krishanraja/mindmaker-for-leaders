# Writing the package

## The description is 80 percent of the skill

The body cannot be read until the description has already decided to trigger. Roughly 1024 characters is the entire triggering surface and that is where the effort goes.

Five rules:

**1. First sentence, third person, under 100 characters, ends with a full stop.** "Generates board updates in the leader's voice." Not "I generate" and not "You can use this to."

**2. Five or more trigger phrases, in their actual language.** Take them from the transcript. Include the casual version, the partial request, and the adjacent topic they will use when they have forgotten what this is called.

> Use whenever [phrase 1], [phrase 2], [phrase 3], [phrase 4], or [phrase 5].

Real users type messily. If every trigger phrase is a clean command, it will not fire on anything anyone actually types.

**3. Push language.** "Do not produce X without consulting this skill first." Or "If in doubt, use this skill." The failure mode is under-triggering, not over-triggering, so descriptions should lean pushy.

**4. Third person throughout.** The description is read by a router deciding what to load, not by a person being addressed.

**5. Under 1024 characters total.** Hard limit.

Test it: write twenty realistic queries, including ones this skill should **not** handle, and check it fires on the right ones against everything else already loaded. Trigger accuracy is the number that matters and it is the one nobody measures.

## The body

**Imperative, no hedging.** "Use the client's name in the opening" not "you should consider using." No "consider", "it might be helpful", "you can". Hedging in an instruction file reads as optional and gets treated as optional.

**Every hard rule carries its reason in the next sentence.**

Bad:
> NEVER use bullet points.

Good:
> Avoid bullet points here. The board reads this as a continuous argument and bullets fragment it into a list of unrelated facts [C4].

The reason is what lets a model handle the case nobody wrote down. Without it you get literal compliance and no judgment, which is worse than no rule at all in any situation the rule did not anticipate.

**Under 500 lines.** Push detail into references.

**Do not restate the description.** The first paragraph of the body must be different language doing a different job.

**Every imperative ends with a pointer.** `[C3]` or `[E7f2]`. No exceptions. `NOT ESTABLISHED:` is always available when you have no pointer.

## Required sections, this order

```
## When this skill activates
## Workflow
## Voice and tone
## Gotchas
## Output format
## Learning loop
## References
```

**`## When this skill activates`** is operational context, not a restatement of the triggers. What situation are they actually in.

**`## Workflow`** is numbered steps with the reasoning attached.

**`## Voice and tone`** carries the structural rules and their hard rules verbatim. Include a fenced sample labelled `// target voice register` **only when a real sample exists**, either from their profile or a passage they quoted verbatim, reproduced word for word. If none exists, describe the register in prose and include no fenced block. Never invent a quotation and present it as their writing.

**`## Gotchas`** describes the mistake before prescribing the correction. "The model will open with a summary of last quarter. He already knows last quarter. Open with the number that moved [C2]." A gotcha that only states the correction leaves the reader unable to recognise the situation.

**`## Output format`** is a template or a structural guide, fenced where it helps.

**`## Learning loop`**, four to six lines, honest:

> After each run, note whether they kept it, edited it, or rejected it, and capture the single biggest correction in one line.
> Recurring corrections graduate into new Gotchas entries, which is where this skill actually gets sharper.
> Bring those corrections back so the standard can be updated properly.
> This does not update itself. It sharpens only when its runs are fed back.

Never claim auto-update. The claim is checkable and it is false, and the person will check.

**`## References`** points one level deep, each line saying when to read it:

> Read [rubric/core.md](rubric/core.md) before judging anything.

## Test prompts, exactly three

Messy, realistic, varied. The way someone types at nine on a Monday.

Good:
> ok so my sales team just posted their updates in slack and I need to get the board update done before my 10am. the usual format, pipeline is looking rough this week tbh. can you pull it together?

Bad, and reject this style:
> Please create a board update from the sales team data.

Checklist for the three together:
- at least one typo or casual abbreviation
- at least one piece of irrelevant context
- one trigger phrase inside a natural sentence rather than as a command
- three different shapes: a question, a statement, a fragment
- at least one that omits something important
- none structured like the examples in the description

## The words to avoid

These are the constructions that mark a document as machine-written regardless of what it says. Zero of them, anywhere in the package:

Em dashes. "In today's fast-paced world" and every variant. "It's not just X, it's Y." "Whether you're X or Y." "Let's dive in", "let's explore", "buckle up." "Unlock", "unleash", "supercharge", "elevate", "harness" as verbs. "Game changer", "seamless", "robust", "leverage", "synergy." "Delve", "tapestry", "testament to", "underscores", "pivotal." "The result?" or "The best part?" standing alone as a line. Rule-of-three lists where the third item is filler. Any sentence starting "Remember," or "Ultimately,."

Two structural tells worth checking by counting:

**Verbosity.** Models write two to three times as much as humans even under an explicit word cap, and the extra is mostly restatement. If a section is much longer than its neighbours, it is padding.

**Sentence length variance.** Five consecutive sentences of similar length is a machine rhythm. Humans vary, and they vary most when they care.

## The check that catches what the list cannot

**Could this have been written for anyone?**

If you could swap the name and publish it verbatim, it is not a skill about this person, it is a template with their name on it. This is the highest-consequence check in the file and the one no regex can run.

The answer is always the same: go back to the exemplars and the criteria and use their actual words. A package built from evidence cannot be generic, because the evidence was not.
