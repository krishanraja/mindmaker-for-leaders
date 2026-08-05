# The CTRL import file

Alongside the human-readable files, write `ctrl-import.json`. It costs one extra write and it is the difference between a managed engagement that ends and one that becomes an account.

The markdown files stay the source of truth. You edit those. This is a derived artefact, regenerated whenever the rubric changes, and nothing depends on CTRL being reachable to produce it.

## Why it exists

A managed engagement produces a standard by hand. That standard then rots, because nobody is running the weekly pass and nobody is measuring drift. CTRL is the maintenance layer for exactly that problem.

If this file exists and matches CTRL's schema, surfacing a customer's profile in CTRL later is one endpoint reading a file you already have. If it does not exist, it is a migration project and it will not happen.

## Shape

```json
{
  "version": 1,
  "generated_at": "2026-08-04",
  "subject": {
    "name": "James Harrabin",
    "email": "james@dothinkdo.com",
    "org": "DoThinkDo"
  },
  "evidence": [
    {
      "id": "e001",
      "kind": "utterance",
      "quote": "we don't want a deck or any detailed notes of what you've done",
      "body": "does not want written progress reports on this engagement",
      "source_label": "Scope call",
      "source_ref": "2026-06-05",
      "occurred_at": "2026-06-05",
      "situated": true,
      "situation": "about how the consultant reports progress on this engagement"
    }
  ],
  "constructs": [
    {
      "id": "k001",
      "scope": "person",
      "emergent_pole": "it has actually seen the client",
      "contrast_pole": "it could be for anyone",
      "rationale": "if they can tell we wrote it before we met them, the rest of it doesn't matter",
      "observable": "a named client fact appearing before the third paragraph",
      "status": "elicited",
      "evidence_ids": ["e003", "e011", "e019"]
    }
  ],
  "criteria": [
    {
      "id": "C3",
      "construct_id": "k001",
      "scope": "person",
      "surface": "proposal",
      "name": "Earned claim",
      "check_text": "A named client fact appears before the third paragraph.",
      "weight": "essential",
      "holds_example": "...",
      "breaks_example": "...",
      "n_rejected": 9,
      "n_rejected_failing": 7,
      "n_accepted": 11,
      "n_accepted_failing": 1,
      "disc_verdict": "keep",
      "provenance": {
        "session": "sort 2026-08-04",
        "items": [3, 11, 19]
      },
      "disposition": "advisory"
    }
  ],
  "holdout": [
    {
      "item_id": "s021",
      "body": "...",
      "origin": "own",
      "pair_id": null,
      "verdict": "would_not_send",
      "why": "reads like it was written before the meeting"
    }
  ],
  "baseline": {
    "n": 10,
    "precision": 0.80,
    "recall": 0.80,
    "tnr": 0.90,
    "measured_at": "2026-08-04"
  }
}
```

## Rules

**Field names match CTRL's tables exactly.** `evidence`, `constructs`, `criteria` map to those tables one for one. If a field name drifts, the import stops being one endpoint and becomes a mapping layer, which is where these things die.

**`disposition` is always `advisory` on import.** A criterion elicited by hand has not been measured in CTRL's loop yet and does not get blocking authority on arrival. It earns that after the weekly pass has seen it fire and not be argued with.

**`situated` and `situation` survive.** They are the whole point. An import that flattens them reintroduces the failure at the boundary.

**`baseline` is null when there was no held-out set.** Do not compute a number from the training items to fill the field. A missing baseline is information. A fabricated one is the thing this entire chain exists to prevent.

**Never write a criterion with `disc_verdict: "untested"` into `criteria`.** Untested constructs go in the `constructs` array with `status: "elicited"` and stay there. The rubric is only the ones that survived.

## Regenerating

Regenerate this file whenever the markdown changes, at the end of a `ctrl-capture` run, or before handing anything to a customer. It is derived. It is never edited by hand, and if you find yourself editing it, edit the markdown and regenerate instead.
