---
name: ctrl-compile
description: Turn graded work into a rubric that actually separates good from bad, and a working profile that admits what it does not know. Use after an intake or sort session, when turning constructs into criteria, building a rubric, writing someone's working profile, working out which of their stated rules are real, testing whether a rule discriminates, or preparing the standard a review gate will run against. Also use when a rubric feels vague, when every piece of work passes it, or when someone asks what this person actually judges on. Trigger on "compile the standard", "build the rubric", "turn this into criteria", "write their profile", "which rules are real", "does this criterion work", "the rubric passes everything". Do not write a rubric without running this skill first. A rubric that a bad piece of work also passes is worse than no rubric, measurably so.
version: 1.0.0
last_reviewed: 2026-08-04
owner: Krish Raja
chain_stage: "3"
---

# CTRL Compile

Stage 3 of the chain. Input is a folder from `ctrl-intake`. Output is a rubric, a profile, a held-out set and an import file.

The job here is mostly deletion. You will receive 8 to 15 constructs and ship 5 to 8 criteria. The ones that die are the point: a rubric that everything passes is not a standard, it is a description of the medium.

## Which file to read

| You are doing this | Read |
|---|---|
| Turning constructs into machine-checkable criteria, running the discrimination test | `leaves/criteria.md` |
| Writing the working profile, deciding what is evidenced versus declared | `leaves/profile.md` |
| Producing the file a CTRL account can import | `reference/ctrl-import.md` |

Do the criteria first. The profile references them.

## Before you start: the precondition

If `ctrl-intake` recorded a manipulation check and two of three came back wrong, **stop**. The item pairs were confounded and every grade is attributed to the wrong dimension. Say so and send it back. Compiling a rubric on top of confounded grading produces a standard that is internally consistent and about nothing.

If no manipulation check exists because the session was live rather than a sort, proceed, but note in the profile that this was not tested.

## Three rules that always apply

**1. Every criterion must survive a discrimination test.** Run it against the graded items. If accepted and rejected work fail it at similar rates, delete it. The test in one sentence: **would a bad piece of work also pass this?** A naive generated rubric scored 42.9 percent where no rubric at all scored 55.6, which is nearly thirteen points worse than nothing. If you ship an untested rubric you have made the system worse and you will not know.

**2. Every criterion carries where it came from.** The triad or the item numbers, the date, and the person's own words for both poles. Not because provenance is tidy, but because when someone disagrees with a criterion six weeks from now, "that came from the session on 4 August, here is the pair" ends the argument and "the model inferred it" starts a different and worse one.

**3. Seven criteria maximum per surface.** At ninety percent compliance per instruction, ten instructions all land together about a third of the time. If an eighth is genuinely needed, split the surface into two passes rather than adding it. Essential first, then pitfall, then important, then optional, because position measurably changes which criteria get applied and late ones drop first.

## What you produce

```
<person>/
├── rubric/
│   ├── core.md          the always-on criteria, 3 to 5
│   └── <surface>.md     per-surface criteria
├── working-profile.md
├── evals/holdout.jsonl  the 10 held-back graded items
└── ctrl-import.json     the machine-readable version
```

## Report the kill rate

Every time, in one line: how many constructs came in, how many criteria survived, and which ones died with the numbers.

If nothing died, the discrimination test is not working and the whole standard is suspect. If more than roughly seventy percent died, the item pairs were not isolating single dimensions and the problem is upstream in the sort, not here. Either way, say the number rather than shipping quietly.

## What comes next

`ctrl-build` turns this into a skill package. `ctrl-check` runs work against it.

## Keywords

rubric, criteria, discrimination test, held-out set, working profile, compile, standard, constructs, poles, weights, evidenced, AWAITING, kill rate
