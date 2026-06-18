# Voice Profile

The Voice Profile is the leader's self-identified style fingerprint. It tells the Automator (and any future skill-building surface) how the output should sound, so generated skills produce text that reads like the leader wrote it rather than generic AI prose.

## Why self-identification, not document collection

Recognition is far cheaper than recall. Asking a leader to "describe your communication style" forces three jobs (build a mental model of the question, introspect, articulate) before they can answer. Showing them concrete chips ("Cheers, mate" vs "Sincerely") and asking "which is closer to you?" reduces the decision to seconds and produces behaviorally specific data. See `_upgrade/APPENDIX-A-intake-theory.md` for the full theory.

The Kit's `VoiceStyleProfileSheet` runs three steps of recognition picks (90 seconds total) and writes structured rows. No document upload, no introspection essay.

## Data model

Voice rows live in `user_memory`. No new table, no new column.

| Column | Value |
|---|---|
| `fact_category` | `'preference'` |
| `fact_key` | one of the `voice_profile.*` keys below |
| `fact_value` | the leader's setting for that dimension |
| `source_type` | `'form'` (chip pick) or `'voice'` (voice capture) |
| `verification_status` | `'verified'` (leader picked it themselves) |
| `is_current` | `true` |

RLS owner-scopes by `user_id`, which is satisfied for both authenticated and anonymous (Kit) sessions because `auth.uid()` is the same key.

## The eight dimensions

Constants in `supabase/functions/_shared/voice-profile/keys.ts` (Deno edge functions) and `src/lib/voiceProfile.ts` (client React).

| `fact_key` | Dimension | Example value | Used in the skill body |
|---|---|---|---|
| `voice_profile.signoff` | Sign-off | `Cheers, Krish` | `## Voice and tone` end-of-message rule |
| `voice_profile.archetype` | Content archetype | `story-lesson` | Macro-structure of the generated text |
| `voice_profile.sentence_length` | Sentence length | `short-punchy` | Per-sentence target inside the body |
| `voice_profile.first_person` | First-person preference | `heavy-I` | Perspective anchor in the body |
| `voice_profile.punctuation` | Punctuation signature | `em-dash` | Micropattern rule + voice-regression gotcha |
| `voice_profile.hard_rules` | Never-say rules (one per line) | `never start with "I hope this finds you well"` | Verbatim hard rules in the body |
| `voice_profile.sample_voice` | Free-text sample | 2-3 sentences the leader actually wrote | Fenced code block under `// target voice register` |
| `voice_profile.disagreement` | Disagreement style | `context-first` | How the output handles pushback |

## Consumption pipeline

1. `useVoiceProfile.save(profile, source)` upserts the rows on the client.
2. `buildMemoryContext(supabase, userId, ...)` in `supabase/functions/_shared/memory-context-builder.ts` runs a dedicated query against `user_memory` filtered on `fact_key LIKE 'voice_profile.%'` and returns:
   - `voiceProfile: string` - a `## Voice & Style Profile` markdown block
   - `voiceProfileRecord: Partial<Record<VoiceProfileKey, string>>` - the same data as a typed map
   The voice section is NOT injected into the main `context` string by default; only callers that opt in receive it (preserves token budget for briefing and other unrelated callers).
3. `generate-skill-export/index.ts` passes the markdown block into `buildSkillUserPrompt({ voiceProfile, ... })` as the `VOICE_PROFILE` field.
4. The prompt (`prompt.ts`) requires the body to include a `## Voice and tone` section when `VOICE_PROFILE` is non-empty, and the references array to include a `voice-profile.md` companion file.
5. `quality-gate.ts` runs an advisory `body.voiceLockSurfaced` check that flags (but does not block) skills that should have surfaced voice rules but did not.

## Voice-lock triage

The Four Honest Tests in the prompt include VOICE-LOCK as the fourth passing category. A workflow that says "draft LinkedIn posts in my voice" passes:

- REPEATABLE (LinkedIn posts are a recurring output)
- BOUNDED (the trigger is "LinkedIn post")
- VOICE-LOCK (the output must be in the leader's voice)

Result: archetype `voice-lock`, not `saved_style`. The skill body carries the verbatim voice rules; the saved_style routing is reserved for genuinely universal preferences with no bounded trigger ("make everything I write more confident").

## Anonymous Kit flow

Kit students enter via `/kit?code=...`, which auto-creates an anonymous Supabase session. They redeem, complete intake, ship their kit, then see `VoiceProfileCard` above `SendPackCard`. The voice profile saves under the anonymous `user_id`. When they tap `SaveProfileCard` to upgrade, `upgradeAnonymousSession()` converts the anonymous user into a named CTRL Free account - all `user_memory` rows (including `voice_profile.*`) and `kit_redemptions` rows stay linked because `auth.uid()` is preserved across upgrade.

## Touchpoints

| File | Role |
|---|---|
| `supabase/functions/_shared/voice-profile/keys.ts` | Deno-side constants + dimension labels |
| `src/lib/voiceProfile.ts` | Client-side constants, `VoiceProfile` interface, `voiceProfileRowsToObject` / `voiceProfileToRows` codec |
| `src/hooks/useVoiceProfile.ts` | Read + upsert hook used by the Kit sheet and any future capture surface |
| `src/components/kit/VoiceStyleProfileSheet.tsx` | The three-step recognition sheet |
| `src/components/kit/VoiceProfileCard.tsx` | KitHome entry point that triggers the sheet |
| `src/components/kit/SaveProfileCard.tsx` | Anonymous-only side-door upgrade CTA, shown once a voice profile exists |
| `supabase/functions/_shared/memory-context-builder.ts` | Adds `voiceProfile` + `voiceProfileRecord` to `MemoryContextResult` |
| `supabase/functions/generate-skill-export/prompt.ts` | Four Honest Tests + `## Voice and tone` requirement + `voice-profile.md` reference |
| `supabase/functions/generate-skill-export/quality-gate.ts` | `body.voiceLockSurfaced` advisory check |
