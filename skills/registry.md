# Managed skill registry

The five CTRL chain skills, what each one is for, and when it was last looked at.
Chain stage numbers follow the CTRL Harness Chain build specification, revision 3
(INGEST 1, SORT 2, COMPILE 3, GENERATE 4, SCRUB 5, CRITIQUE 6, PROVENANCE/MEASURE 7, DELIVER 8, LEARN 9).

| Name | Purpose | Chain stage | Owner | Version | Last reviewed | Last evaluation | Trigger accuracy |
|---|---|---|---|---|---|---|---|
| `ctrl-intake` | Elicit a person's actual standard by having them grade real work, never by asking them to describe it. | 1-2 | Krish Raja | 1.0.0 | 2026-08-04 | 2026-08-04 | unmeasured |
| `ctrl-compile` | Turn graded work into a rubric that actually separates good from bad, and a working profile that admits what it does not know. | 3 | Krish Raja | 1.0.0 | 2026-08-04 | 2026-08-04 | unmeasured |
| `ctrl-build` | Build a skill package for a named person from their compiled rubric, where every rule points at the evidence it came from. | 4 | Krish Raja | 1.0.0 | 2026-08-04 | 2026-08-04 | unmeasured |
| `ctrl-check` | Review work against a specific person's own standard before it goes out, and refuse rather than guess where their standard has not been set. | 5-7 | Krish Raja | 1.0.0 | 2026-08-04 | 2026-08-04 | unmeasured |
| `ctrl-capture` | Run the weekly pass that turns review history into proposed changes to a person's standard, and route each one to the named owner as a yes or no. | 9 | Krish Raja | 1.0.0 | 2026-08-04 | 2026-08-04 | unmeasured |

Trigger accuracy reads `unmeasured` for all five because nothing instruments it yet.
That is the honest value, not a placeholder for a good one. Instrumentation lands in a later phase,
and until it does, no claim about how often these fire correctly belongs in this table.

## Three rules

**1. Every change to a skill bumps `version` and `last_reviewed`.**
Both live in that skill's own front matter, and both are copied into the row above in the same edit.
A file that changed while its dates stood still makes this registry a document that lies about its contents,
which is worse than not having one.

**2. The quarterly pass reads this registry first.**
It flags any skill whose `chain_stage` disagrees with the specification numbering above,
and any skill whose `last_reviewed` is more than 90 days old. Both are questions raised to the owner, not edits.
The staleness this catches is the operator's, and it has already fired once:
`ctrl-capture` shipped as Stage 8 after the revision-3 renumbering moved LEARN to 9.

**3. A skill that has not fired in a quarter is a question for its owner, not a deletion.**
Silence means the trigger phrasing is wrong, or the work it covers did not come up, or it quietly stopped being needed.
Those three ask for different responses and only the owner can tell them apart.
