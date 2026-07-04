# Decision engine eval

Two layers guard the decision engine's quality. Run both before shipping any change to the reframe / decompose / verify / advise prompts or the AI-native classifier.

## 1. Deterministic layer (CI, automatic)

The AI-native classifier and the output sanitizer are pure and unit-tested. These run in CI on every PR:

- `supabase/functions/_shared/decision-ai-native.test.ts` pins the reframe classifier, including the human-agent guard (so "hire two more support agents" reframes rather than being mistaken for an AI decision).
- `supabase/functions/_shared/sanitize.test.ts` pins the no-em-dash sanitizer that holds model output to the house rule.

Run locally: `npm run test`.

## 2. LLM layer (manual, pre-release)

`golden-set.json` is the fixture: 10 synthetic operator profiles spanning the ICP (sparse novice to rich power user, plus 2 adversarial). Each entry carries the profile, the input decision, and the EXPECTED output characteristics, written before running anything.

The bar (each output scored 1 to 5 on all four axes, must score >= 3 on each):

1. **Factual accuracy vs profile.** The answer fits the leader's real role/industry/objectives.
2. **Personalization specificity (the swap-test).** Swapping in a different profile must materially change the output. `gp01` (fintech CFO) and `gp02` (healthcare COO) share the identical input on purpose: their answers MUST diverge (unit economics vs HIPAA/BAA). If they do not, the personalization is cosmetic (score 1).
3. **Actionability.** Ends in a concrete next move.
4. **Voice / tier fit.** Advisory chief-of-staff register, calibrated confidence, no em dashes.

Adversarial profiles (`gp09` garbage input, `gp10` off-topic HR): the engine must NOT hallucinate a confident answer. Confidence must be low and it must reframe or ask for scope, never fabricate profile context.

### How to run the manual eval

1. Create a throwaway test user, seed its brain (industry + role + one objective) via `user_memory`.
2. POST the profile's `input_decision` to the deployed `decision-engine` function with the user's JWT.
3. Poll `decision_cases` for `stage = 'complete'`, then read `reframed_statement`, `recommendation`, `counter_case`, `confidence`.
4. Score against the profile's `expected_output_characteristics` and the four axes above.
5. Destroy the test user (cascades its rows). Never leave test data.

Commit updated expectations here whenever the product's decision behaviour changes, so this file stays the source of truth for "good".
