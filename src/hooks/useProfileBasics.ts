import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileBasics {
  companyName: string | null;
  role: string | null;
  loading: boolean;
}

/**
 * useProfileBasics - pulls the leader's company name and role from their
 * captured facts. Used by surfaces that want to personalise without a full
 * memory-context fetch (e.g. the paywall sample header).
 *
 * Quiet on errors: returns nulls so callers fall back to generic copy.
 */
export function useProfileBasics(): ProfileBasics {
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("user_memory")
          .select("fact_key, fact_value")
          .eq("user_id", user.id)
          .eq("is_current", true)
          .in("fact_key", ["company_name", "company", "role", "title"]);

        if (error || !data) {
          if (!cancelled) setLoading(false);
          return;
        }

        const byKey = new Map<string, string>();
        for (const row of data) {
          if (typeof row.fact_value === "string" && row.fact_value.trim()) {
            byKey.set(row.fact_key, row.fact_value.trim());
          }
        }
        if (!cancelled) {
          setCompanyName(byKey.get("company_name") || byKey.get("company") || null);
          setRole(byKey.get("role") || byKey.get("title") || null);
        }
      } catch (err) {
        console.warn("useProfileBasics: load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { companyName, role, loading };
}
