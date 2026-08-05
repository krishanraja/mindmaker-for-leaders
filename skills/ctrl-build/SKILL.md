---
name: ctrl-build
description: Build a skill package for a named person from their compiled rubric, where every rule points at the evidence it came from. Use when producing a skill, a project instruction file, a set of custom instructions, a context file, or a markdown brain for someone, when packaging a working profile into something an AI will actually load, or when an existing skill needs rewriting because it invented rules nobody stated. Also use before handing any AI instruction file to the person it is about. Trigger on "build their skill", "write the project instructions", "package this up", "turn the profile into a skill", "make the SKILL.md", "write their context file", "this skill has rules they never said". Do not write an instruction file for a named individual without running this skill first. An invented rule is damage that spreads, and the subject is the person who finds it.
version: 1.0.0
last_reviewed: 2026-08-04
owner: Krish Raja
chain_stage: "4"
---

# CTRL Build

Stage 4. Input is a compiled folder from `ctrl-compile`. Output is an installable package.

The generator is subordinate to the standard, not the other way round. You are filling a governed mould from evidenced fields. You are not writing a document about someone.

## Which file to read

| You are doing this | Read |
|---|---|
| Laying out the package, deciding what goes in the router and what goes in a leaf | `leaves/package.md` |
| Writing the description, the body, the gotchas, the test prompts | `leaves/writing.md` |

Read both. The package shape decides what the writing has to fit into.

## The one rule this skill exists to enforce

**Every rule carries a pointer.**

Every imperative sentence in the body ends with `[C3]` for a criterion or `[E7f2]` for an evidence id. If you want to write a rule and you have no pointer for it, write this instead and move on:

```
NOT ESTABLISHED: <the thing you were going to assert>
```

A flagged gap is useful and somebody fills it. An invented rule reads identically to a real one, spreads through everything built on top of it, and the reader finds out which it was at the worst possible moment.

**You may not generalise a situated statement.** If the evidence row says situated with situation "about progress reports on this engagement", you may write:

> For progress updates on this engagement, lead with the decision [E12]

and you may not write:

> Never produce a deck.

The second sentence is the failure this entire chain exists to prevent. It came from an accurate quote, correctly dated, correctly attributed, and it was still wrong, because the situation was part of the rule and got dropped.

## Three more rules

**1. Explain why, never just what.** Every MUST or NEVER carries its reason in the next sentence. A model extends reasoning correctly to cases nobody anticipated. It breaks on arbitrary rules, and so does a human reading it.

**2. Never fabricate a quotation.** Include a sample of someone's writing only when a real one exists, and reproduce it word for word. If none exists, describe the register in prose and include no quoted example. This applies to the body, the reference files, and anywhere else a quote could appear.

**3. Preserve every AWAITING.** If the profile says a field is not established, the package says so too. Do not quietly fill it because the package looks thin. A thin honest package is a working document. A padded one is a liability with your name on it.

## Do not restate the description in the body

The description decides whether the skill triggers. The body is what happens after it does. If the first paragraph of the body is the description in different words, you have wasted the one place where operational detail goes.

## What comes next

Run `ctrl-check` on the package before it goes anywhere. Never review a package in the same conversation you built it in: paste it into a fresh session. Asking a model to check what it just wrote recovers a small fraction of what the same check recovers when the work arrives as someone else's.

## Keywords

skill, SKILL.md, package, project instructions, custom instructions, context file, markdown brain, frontmatter, description, triggers, gotchas, test prompts, provenance, pointer, build
