# Package shape

## The layout

```
<skill-name>/
├── SKILL.md              router only, hard cap 80 lines
├── rubric/
│   ├── core.md           always-on criteria, 3 to 5
│   ├── <surface>.md      per-surface criteria
│   └── general.md        explicit fallback when nothing matches
├── exemplars/
│   ├── INDEX.md          contents, required once this is over 100 lines
│   └── <n>.md            their own graded work, verbatim
├── references/
│   ├── company-context.md
│   └── voice-profile.md  only when a real profile exists
└── evals/
    └── holdout.jsonl     the 10 held-back graded items
```

## Why the router is thin

Loading works in three levels and it is a file mechanism, not a metaphor. The name and description are always in context, about 100 words. The body loads only when the description matches. Bundled files load only when something points at them.

So the heaviest skills have the thinnest instructions. The router holds a routing table, when to use, an escape hatch, a fallback leaf and keywords. Everything substantial lives in a leaf.

**References one level deep only.** If a standard is two hops from the router, it does not exist. Nothing points at a file that points at another file.

## The fallback leaf is not optional

`rubric/general.md` exists so the router always has somewhere to send an unfamiliar case. Without it, an unmatched artefact either gets judged against the wrong leaf or gets nothing, and the second one fails silently.

## Frontmatter

```yaml
---
name: writing-board-updates
description: >
  <under 1024 characters, third person, see leaves/writing.md>
license: Proprietary. Built for <person> by <you>.
compatibility: Designed for Claude Code, Claude.ai, and compatible agent platforms.
metadata:
  author: <you>
  version: "1.0"
  built_from: sort session 2026-08-04
  baseline: precision 0.80 recall 0.80 tnr 0.90 n=10
  status: verified
---
```

Two fields most packages omit and should not:

**`built_from`** is provenance at the package level. When someone asks where this came from in three months, the answer is in the file rather than in your memory.

**`status`** is `draft`, `provisional` or `verified`, and it means something specific:

| status | means |
|---|---|
| `draft` | built from what they said. No grading, no test. |
| `provisional` | constructs elicited, no held-out set, so no measurement exists |
| `verified` | held-out set scored, numbers in `baseline` |

A provisional package says so wherever it ends up, not only in the UI it was built in. This is the field that stops a thin package being mistaken for a tested one six months later by someone who was not there.

## Name rules

Lowercase, numbers and single hyphens. Maximum 64 characters. Starts with a letter, no leading or trailing hyphen, no consecutive hyphens. Gerund form where natural: `writing-board-updates`, `reviewing-proposals`.

Never vague. `helper`, `utils`, `tools`, `assistant` are not names, they are placeholders that survived.

## The three files that ship alongside

**`01-test-prompts.txt`**, exactly three, messy, realistic. See `leaves/writing.md`.

**`02-maintenance-card.txt`**, a quarterly drift check. Is it still triggering? Are the gotchas still the real mistakes? Does the output still match? Five questions and a closing line: if it has stopped triggering or stopped producing the right thing, regenerating from fresh graded work is cheaper than patching by hand.

**`03-install-guide.txt`**. Put the same content somewhere the person can read **before** they download. An install guide sealed inside the thing it explains how to install is a joke the user does not find funny.

## Exemplars matter more than you think

Ship their own graded work with the package, labelled with what they said about it. Retrieved exemplars moved one judging benchmark from 54.9 to 81.7 percent, which is a larger effect than anything achieved by rewording a rubric.

The gate reads these. So does any model producing work against them. A rubric describes the standard. An exemplar demonstrates it, and the demonstration carries information the description cannot.

Keep the verbatim. Do not clean them up. A tidied exemplar is your writing, not theirs.

## The skill count ceiling

The API accepts a maximum of eight skills per request. That is a hard cap, not a quality guideline, and no published number establishes a quality ceiling below it.

Keep the count low anyway, for a reason that is not the cap: every description competes for attention with every other description, and selection is the failure mode. Five well-routed skills beat eight overlapping ones. Pressure to add a ninth is a signal to split a leaf, not to add a skill.
