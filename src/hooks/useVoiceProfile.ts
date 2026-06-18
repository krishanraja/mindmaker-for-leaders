import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  parseVoiceProfile,
  VOICE_PROFILE_FACT_KEY,
  type VoiceProfile,
} from "@/types/voiceProfile";

/**
 * Load and persist the leader's self-identified voice profile in user_memory.
 * Works for anonymous kit sessions and full accounts - the profile survives
 * upgradeAnonymousSession because it stays on the same auth.uid().
 */
export function useVoiceProfile() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("user_memory")
        .select("fact_value, updated_at")
        .eq("user_id", user.id)
        .eq("fact_key", VOICE_PROFILE_FACT_KEY)
        .eq("is_current", true)
        .maybeSingle();

      const parsed = parseVoiceProfile(data?.fact_value as string | undefined);
      if (parsed && data?.updated_at) {
        parsed.updatedAt = data.updated_at as string;
      }
      setProfile(parsed);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (next: VoiceProfile): Promise<{ ok: boolean; error?: string }> => {
      setSaving(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return { ok: false, error: "Sign in to save your voice profile." };
        }

        const payload: VoiceProfile = {
          ...next,
          updatedAt: new Date().toISOString(),
        };

        // Retire any prior row so only one current profile exists.
        await supabase
          .from("user_memory")
          .update({ is_current: false })
          .eq("user_id", user.id)
          .eq("fact_key", VOICE_PROFILE_FACT_KEY)
          .eq("is_current", true);

        const { error } = await supabase.from("user_memory").insert({
          user_id: user.id,
          fact_key: VOICE_PROFILE_FACT_KEY,
          fact_category: "preference",
          fact_subtype: "communication_style",
          fact_label: "Writing voice",
          fact_value: JSON.stringify(payload),
          fact_context: "Self-identified voice profile for skill generation",
          source_type: "form",
          confidence_score: 1,
          verification_status: "verified",
          is_current: true,
          temperature: "hot",
          importance: 8,
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        setProfile(payload);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not save profile.",
        };
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return {
    profile,
    loading,
    saving,
    hasProfile: !!profile,
    saveProfile,
    refetch: fetchProfile,
  };
}
