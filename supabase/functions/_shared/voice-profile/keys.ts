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

export const VOICE_PROFILE_DIMENSION_LABELS: Record<VoiceProfileKey, string> = {
  [VOICE_PROFILE_KEYS.signoff]: "Sign-off",
  [VOICE_PROFILE_KEYS.archetype]: "Content archetype",
  [VOICE_PROFILE_KEYS.sentenceLength]: "Sentence length",
  [VOICE_PROFILE_KEYS.firstPerson]: "First-person preference",
  [VOICE_PROFILE_KEYS.punctuation]: "Punctuation signature",
  [VOICE_PROFILE_KEYS.hardRules]: "Hard rules",
  [VOICE_PROFILE_KEYS.sampleVoice]: "Sample voice",
  [VOICE_PROFILE_KEYS.disagreement]: "Disagreement style",
};

export type VoiceProfileRecord = Partial<Record<VoiceProfileKey, string>>;

export function isVoiceProfileKey(key: string): key is VoiceProfileKey {
  return key.startsWith(VOICE_PROFILE_PREFIX);
}
