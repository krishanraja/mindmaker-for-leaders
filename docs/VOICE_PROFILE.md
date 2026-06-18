# Voice Profile

The Voice Profile is the leader's self-identified style fingerprint. It tells the Automator (and any future skill-building surface) how the output should sound, so generated skills produce text that reads like the leader wrote it rather than generic AI prose.

## Why self-identification, not document collection

Recognition is far cheaper than recall. Asking a leader to "describe your communication style" forces three jobs (build a mental model of the question, introspect, articulate) before they can answer. Showing them concrete chips ("Cheers, mate" vs "Sincerely") and asking "which is closer to you?" reduces the decision to seconds and produces behaviorally specific data. See `_upgrade/APPENDIX-A-intake-theory.md` for the full theory.

`VoiceStyleProfileSheet` (in `src/components/edge/`) captures the profile via FIVE recognition picks (how / structure / sentence / first-person / sign-off, roughly 90 seconds) OR a paste-extract power path: the leader pastes real writing they already wrote, and the `extract-voice-profile` edge function derives all 8 dimensions in one LLM pass. No document collection, no introspection essay.

## Data model

The voice profile is a SINGLE JSON fact in `user_memory`. No new table, no new column, and NOT a set of `voice_profile.*` rows.

| Column | Value |
|---|---|
| `fact_key` | `ctrl_voice_profile` |
| `fact_category` | `'preference'` |
| `fact_subtype` | `'communication_style'` |
| `fact_value` | a JSON object holding all 8 dimensions (see below) |
| `verification_status` | `'verified'` (leader picked it or pasted their own writing) |
| `is_current` | `true` |

RLS owner-scopes by `user_id`, which is satisfied for both authenticated and anonymous (Kit) sessions because `auth.uid()` is the same key.

## The eight dimensions

The `fact_value` JSON object carries these keys. Types in `src/types/voiceProfile.ts`; read/write via `src/hooks/useVoiceProfile.ts`.

| JSON key | Dimension | Example value | Used in the skill body |
|---|---|---|---|
| `signoff` | Sign-off | `Cheers, Krish` | `## Voice and tone` end-of-message rule |
| `disagreement` | Disagreement style | `context-first` | How the output handles pushback |
| `contentArchetype` | Content archetype | `story-lesson` | Macro-structure of the generated text |
| `sentenceLength` | Sentence length | `short-punchy` | Per-sentence target inside the body |
| `firstPerson` | First-person preference | `heavy-I` | Perspective anchor in the body |
| `punctuationStyle` | Punctuation signature | `em-dash` | Micropattern rule + voice-regression gotcha |
| `hardRules[]` | Never-say rules (array) | `never start with "I hope this finds you well"` | Verbatim hard rules in the body |
| `sampleVoice?` | Free-text sample (optional) | 2-3 sentences the leader actually wrote | Fenced code block under `// target voice register` |

## Consumption pipeline

1. `useVoiceProfile.save(profile)` upserts the single `ctrl_voice_profile` fact on the client.
2. `buildMemoryContext(supabase, userId, ...)` in `supabase/functions/_shared/memory-context-builder.ts` reads the `ctrl_voice_profile` fact from `user_memory` and returns:
   - `voiceProfile: string` - a `## Voice & Style Profile` markdown block
   - `voiceProfileRecord: VoiceProfile` - the same data as a typed object (see `src/types/voiceProfile.ts`)
   The voice section is NOT injected into the main `context` string by default; only callers that opt in receive it (preserves token budget for briefing and other unrelated callers).
3. `generate-skill-export/index.ts` passes the markdown block into `buildSkillUserPrompt({ voiceProfile, ... })` as the `VOICE_PROFILE` field.
4. The prompt (`prompt.ts`) requires the body to include a `## Voice and tone` section when `VOICE_PROFILE` is non-empty, and the references array to include a structured 8-dimension `voice-profile.md` companion file. It forbids fabricated voice samples: reproduce the leader's real sample verbatim, otherwise describe the register, never invent a quote.
5. `quality-gate.ts` runs the full gate (17/17, including a required `## Learning loop` section) plus an advisory `body.voiceLockSurfaced` check that flags (but does not block) skills that should have surfaced voice rules but did not.

## Voice-lock triage

The Four Honest Tests in the prompt include VOICE-LOCK as the fourth passing category. A workflow that says "draft LinkedIn posts in my voice" passes:

- REPEATABLE (LinkedIn posts are a recurring output)
- BOUNDED (the trigger is "LinkedIn post")
- VOICE-LOCK (the output must be in the leader's voice)

Result: archetype `voice-lock`, not `saved_style`. The skill body carries the verbatim voice rules; the saved_style routing is reserved for genuinely universal preferences with no bounded trigger ("make everything I write more confident").

## Anonymous Kit flow

Kit students enter via `/kit?code=...`, which auto-creates an anonymous Supabase session. They redeem, complete intake, ship their kit, then see `KitVoiceProfileCard`. The voice profile saves as the `ctrl_voice_profile` fact under the anonymous `user_id`. When they upgrade, `upgradeAnonymousSession()` converts the anonymous user into a named CTRL Free account - all `user_memory` rows (including `ctrl_voice_profile`) and `kit_redemptions` rows stay linked because `auth.uid()` is preserved across upgrade.

## Touchpoints

| File | Role |
|---|---|
| `src/types/voiceProfile.ts` | The `VoiceProfile` type holding the 8 dimensions |
| `src/hooks/useVoiceProfile.ts` | Read + upsert hook for the single `ctrl_voice_profile` fact |
| `src/components/edge/VoiceStyleProfileSheet.tsx` | The five-pick recognition sheet plus the paste-extract power path |
| `src/components/kit/KitVoiceProfileCard.tsx` | Kit entry point that triggers the sheet |
| `supabase/functions/extract-voice-profile/index.ts` | Derives the 8 dimensions from pasted real writing in one LLM pass |
| `supabase/functions/_shared/memory-context-builder.ts` | Adds `voiceProfile` + `voiceProfileRecord` to `MemoryContextResult` |
| `supabase/functions/generate-skill-export/prompt.ts` | Four Honest Tests + `## Voice and tone` requirement + structured `voice-profile.md` + no-fabricated-samples rule |
| `supabase/functions/generate-skill-export/quality-gate.ts` | Full 17/17 gate (incl. required `## Learning loop`) + `body.voiceLockSurfaced` advisory check |
