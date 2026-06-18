/**
 * Structured voice profile stored in user_memory (fact_key: ctrl_voice_profile).
 * Written by VoiceStyleProfileSheet; consumed by buildMemoryContext + prompt.ts.
 */
export type VoiceSignoff = "cheers" | "thanks" | "sincerely" | "none";
export type VoiceDisagreement = "direct" | "context-first" | "question-led";
export type VoiceContentArchetype = "argument" | "story-lesson" | "data-take" | "how-to";
export type VoiceSentenceLength = "short-punchy" | "medium" | "long-flowing";
export type VoiceFirstPerson = "heavy-I" | "balanced" | "minimal-I";
export type VoicePunctuation = "em-dash" | "ellipsis" | "minimal" | "formal";

export interface VoiceProfile {
  signoff: VoiceSignoff;
  disagreement: VoiceDisagreement;
  contentArchetype: VoiceContentArchetype;
  sentenceLength: VoiceSentenceLength;
  firstPerson: VoiceFirstPerson;
  punctuationStyle: VoicePunctuation;
  hardRules: string[];
  sampleVoice?: string;
  updatedAt?: string;
  source?: "kit" | "context" | "settings";
}

export const VOICE_PROFILE_FACT_KEY = "ctrl_voice_profile";

export function parseVoiceProfile(raw: string | null | undefined): VoiceProfile | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as VoiceProfile;
    if (!parsed.signoff || !parsed.contentArchetype) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function voiceProfileSummary(profile: VoiceProfile): string {
  const parts = [
    profile.sentenceLength.replace(/-/g, " "),
    profile.contentArchetype.replace(/-/g, " "),
    profile.firstPerson.replace(/-/g, " "),
  ];
  return parts.join(" · ");
}
