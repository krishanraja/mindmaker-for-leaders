import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  VOICE_DIMENSION_LABELS,
  VOICE_PROFILE_KEYS,
  VOICE_PROFILE_PREFIX,
  isProfileMeaningful,
  voiceProfileRowsToObject,
  voiceProfileToRows,
  type VoiceProfile,
  type VoiceProfileKey,
} from "@/lib/voiceProfile";

interface UseVoiceProfileResult {
  profile: VoiceProfile;
  hasProfile: boolean;
  loading: boolean;
  save: (
    next: VoiceProfile,
    source?: "form" | "voice",
  ) => Promise<{ ok: boolean; error?: string }>;
  refetch: () => Promise<void>;
}

const EMPTY_PROFILE: VoiceProfile = {};

export function useVoiceProfile(): UseVoiceProfileResult {
  const [profile, setProfile] = useState<VoiceProfile>(EMPTY_PROFILE);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfile(EMPTY_PROFILE);
        setHasProfile(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_memory")
        .select("fact_key, fact_value")
        .eq("user_id", user.id)
        .eq("is_current", true)
        .like("fact_key", `${VOICE_PROFILE_PREFIX}%`);
      if (error) {
        console.warn("useVoiceProfile: fetch failed", error);
        setProfile(EMPTY_PROFILE);
        setHasProfile(false);
        return;
      }
      const next = voiceProfileRowsToObject(
        (data ?? []).map((row) => ({
          fact_key: row.fact_key as string,
          fact_value: (row.fact_value as string | null) ?? null,
        })),
      );
      setProfile(next);
      setHasProfile(isProfileMeaningful(next));
    } catch (err) {
      console.warn("useVoiceProfile: fetch threw", err);
      setProfile(EMPTY_PROFILE);
      setHasProfile(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const save = useCallback<UseVoiceProfileResult["save"]>(
    async (next, source = "form") => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return { ok: false, error: "No session - sign in or redeem a Kit first." };
        }
        const rows = voiceProfileToRows(next);
        if (rows.length === 0) {
          return { ok: false, error: "Add at least one voice dimension before saving." };
        }
        const now = new Date().toISOString();
        const upserts = rows.map((row) => ({
          user_id: user.id,
          fact_key: row.fact_key,
          fact_category: "preference" as const,
          fact_label: VOICE_DIMENSION_LABELS[mapKeyToDimensionLabel(row.fact_key)],
          fact_value: row.fact_value,
          confidence_score: 0.95,
          source_type: source,
          verification_status: "verified" as const,
          is_current: true,
          updated_at: now,
        }));
        const { error } = await supabase
          .from("user_memory")
          .upsert(upserts, { onConflict: "user_id,fact_key" });
        if (error) {
          console.warn("useVoiceProfile: upsert failed", error);
          return { ok: false, error: error.message };
        }
        await fetchProfile();
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("useVoiceProfile: save threw", err);
        return { ok: false, error: msg };
      }
    },
    [fetchProfile],
  );

  return {
    profile,
    hasProfile,
    loading,
    save,
    refetch: fetchProfile,
  };
}

function mapKeyToDimensionLabel(key: VoiceProfileKey): keyof VoiceProfile {
  switch (key) {
    case VOICE_PROFILE_KEYS.signoff:
      return "signoff";
    case VOICE_PROFILE_KEYS.archetype:
      return "archetype";
    case VOICE_PROFILE_KEYS.sentenceLength:
      return "sentenceLength";
    case VOICE_PROFILE_KEYS.firstPerson:
      return "firstPerson";
    case VOICE_PROFILE_KEYS.punctuation:
      return "punctuation";
    case VOICE_PROFILE_KEYS.hardRules:
      return "hardRules";
    case VOICE_PROFILE_KEYS.sampleVoice:
      return "sampleVoice";
    case VOICE_PROFILE_KEYS.disagreement:
      return "disagreement";
  }
}
