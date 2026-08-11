# Voice profile subsystem

Last reconciled: 2026-08-10

Voice Profile is a dormant, unmounted capture subsystem retained for compatibility with existing memory records and the nested skill-generation harness. It is not a primary CTRL surface and must not be marketed as a current user capability until a one-tap, tested entry point exists.

Existing profiles live as one owner-scoped `user_memory` fact:

| Field | Value |
|---|---|
| `fact_key` | `ctrl_voice_profile` |
| `fact_category` | `preference` |
| `fact_subtype` | `communication_style` |
| `verification_status` | `verified` |
| `is_current` | `true` |

`src/hooks/useVoiceProfile.ts` reads and writes the fact. `src/components/edge/VoiceStyleProfileSheet.tsx` contains the former five-pick and paste-extract UI, but no current route imports it. `supabase/functions/_shared/memory-context-builder.ts` appends an existing profile to generated context, and `generate-skill-export` consumes it for the nested skill harness. The memory-context heading and the skill-export scrape expression are coupled and must change together.

The old anonymous Kit flow is retired and `/kit*` redirects to `/try`. Historical `ctrl_voice_profile` facts remain attached to their owners and continue to be protected by Row-Level Security.

The human voice of the audio briefing is a separate product contract. It is governed by the briefing script, conversational follow-up, and speech synthesis settings, not by this dormant writing-style profile.
