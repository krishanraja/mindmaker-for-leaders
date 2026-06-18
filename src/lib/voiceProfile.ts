export const VOICE_PROFILE_PREFIX = "voice_profile.";

export const VOICE_PROFILE_KEYS = {
  signoff: "voice_profile.signoff",
  archetype: "voice_profile.archetype",
  sentenceLength: "voice_profile.sentence_length",
  firstPerson: "voice_profile.first_person",
  punctuation: "voice_profile.punctuation",
  hardRules: "voice_profile.hard_rules",
  sampleVoice: "voice_profile.sample_voice",
  disagreement: "voice_profile.disagreement",
} as const;

export type VoiceProfileKey = (typeof VOICE_PROFILE_KEYS)[keyof typeof VOICE_PROFILE_KEYS];

export type ContentArchetype =
  | "warm-direct"
  | "crisp-no-fluff"
  | "considered-formal"
  | "playful-sharp"
  | "story-lesson";

export type SentenceLengthSetting = "short-punchy" | "medium" | "long-flowing";
export type FirstPersonSetting = "heavy-I" | "we-mode" | "neutral";
export type PunctuationSetting = "em-dash" | "ellipsis" | "minimal" | "standard";
export type DisagreementSetting = "direct" | "context-first" | "ask-first";

export interface VoiceProfile {
  signoff?: string;
  archetype?: ContentArchetype;
  sentenceLength?: SentenceLengthSetting;
  firstPerson?: FirstPersonSetting;
  punctuation?: PunctuationSetting;
  hardRules?: string[];
  sampleVoice?: string;
  disagreement?: DisagreementSetting;
}

export const VOICE_DIMENSION_LABELS: Record<keyof VoiceProfile, string> = {
  signoff: "Sign-off",
  archetype: "Content archetype",
  sentenceLength: "Sentence length",
  firstPerson: "First-person preference",
  punctuation: "Punctuation signature",
  hardRules: "Hard rules",
  sampleVoice: "Sample voice",
  disagreement: "Disagreement style",
};

export function isVoiceProfileKey(key: string): key is VoiceProfileKey {
  return key.startsWith(VOICE_PROFILE_PREFIX);
}

export function voiceProfileRowsToObject(
  rows: Array<{ fact_key: string; fact_value: string | null }>,
): VoiceProfile {
  const profile: VoiceProfile = {};
  for (const row of rows) {
    const value = row.fact_value ?? "";
    switch (row.fact_key) {
      case VOICE_PROFILE_KEYS.signoff:
        profile.signoff = value;
        break;
      case VOICE_PROFILE_KEYS.archetype:
        profile.archetype = value as ContentArchetype;
        break;
      case VOICE_PROFILE_KEYS.sentenceLength:
        profile.sentenceLength = value as SentenceLengthSetting;
        break;
      case VOICE_PROFILE_KEYS.firstPerson:
        profile.firstPerson = value as FirstPersonSetting;
        break;
      case VOICE_PROFILE_KEYS.punctuation:
        profile.punctuation = value as PunctuationSetting;
        break;
      case VOICE_PROFILE_KEYS.hardRules:
        profile.hardRules = value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        break;
      case VOICE_PROFILE_KEYS.sampleVoice:
        profile.sampleVoice = value;
        break;
      case VOICE_PROFILE_KEYS.disagreement:
        profile.disagreement = value as DisagreementSetting;
        break;
    }
  }
  return profile;
}

export function voiceProfileToRows(
  profile: VoiceProfile,
): Array<{ fact_key: VoiceProfileKey; fact_value: string }> {
  const rows: Array<{ fact_key: VoiceProfileKey; fact_value: string }> = [];
  if (profile.signoff !== undefined && profile.signoff.trim()) {
    rows.push({ fact_key: VOICE_PROFILE_KEYS.signoff, fact_value: profile.signoff.trim() });
  }
  if (profile.archetype) {
    rows.push({ fact_key: VOICE_PROFILE_KEYS.archetype, fact_value: profile.archetype });
  }
  if (profile.sentenceLength) {
    rows.push({ fact_key: VOICE_PROFILE_KEYS.sentenceLength, fact_value: profile.sentenceLength });
  }
  if (profile.firstPerson) {
    rows.push({ fact_key: VOICE_PROFILE_KEYS.firstPerson, fact_value: profile.firstPerson });
  }
  if (profile.punctuation) {
    rows.push({ fact_key: VOICE_PROFILE_KEYS.punctuation, fact_value: profile.punctuation });
  }
  if (profile.hardRules && profile.hardRules.length > 0) {
    rows.push({
      fact_key: VOICE_PROFILE_KEYS.hardRules,
      fact_value: profile.hardRules.map((rule) => rule.trim()).filter(Boolean).join("\n"),
    });
  }
  if (profile.sampleVoice !== undefined && profile.sampleVoice.trim()) {
    rows.push({ fact_key: VOICE_PROFILE_KEYS.sampleVoice, fact_value: profile.sampleVoice.trim() });
  }
  if (profile.disagreement) {
    rows.push({ fact_key: VOICE_PROFILE_KEYS.disagreement, fact_value: profile.disagreement });
  }
  return rows;
}

export function isProfileMeaningful(profile: VoiceProfile): boolean {
  return Boolean(
    profile.signoff ||
      profile.archetype ||
      profile.sentenceLength ||
      profile.firstPerson ||
      profile.punctuation ||
      profile.sampleVoice ||
      profile.disagreement ||
      (profile.hardRules && profile.hardRules.length > 0),
  );
}
