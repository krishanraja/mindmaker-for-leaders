import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AutomatorArchetype,
  DeliverableCandidate,
} from "@/components/automator/automatorModel";

/**
 * useSkillSuggestions
 *
 * Mines RECURRING DELIVERABLE candidates for the Automator's Suggestions
 * screen - the concrete, repeatable artifacts a leader produces over and over
 * ("Your weekly investor update", "Turn a discovery call into a proposal").
 *
 * Source order (most-grounded first):
 *   1. MINED from the brain: blockers/decisions in user_memory + user_decisions
 *      that read like a recurring deliverable. We keep ONLY ones that name a
 *      clear artifact - never a vague strategic problem ("Hiring Challenge").
 *      We classify each into an archetype + write a "why we picked this" reason.
 *   2. CURATED fallback, seeded by ROLE / SECTOR facts (identity/business in
 *      user_memory). If the brain is thin we still suggest sharp, concrete
 *      deliverables a leader in that role actually ships.
 *
 * Quiet on errors - this is auxiliary surface and must never block the page.
 * Returns up to `limit` candidates (default 3), mined first, topped up with
 * curated so the screen always shows a useful 3-4.
 */

interface UseSkillSuggestions {
  candidates: DeliverableCandidate[];
  loading: boolean;
  /** True when at least one candidate came from the brain (drives the badge). */
  hasMined: boolean;
  refetch: () => void;
}

export function useSkillSuggestions(limit: number = 3): UseSkillSuggestions {
  const [candidates, setCandidates] = useState<DeliverableCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMined, setHasMined] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const curated = curatedFor(null, null).slice(0, limit);
        setCandidates(curated);
        setHasMined(false);
        return;
      }

      const [blockersRes, decisionsRes, factsRes, companyRes] = await Promise.all([
        supabase
          .from("user_memory")
          .select("id, fact_value, fact_label, importance, created_at")
          .eq("user_id", user.id)
          .eq("fact_category", "blocker")
          .eq("is_current", true)
          .neq("verification_status", "rejected")
          .order("importance", { ascending: false, nullsFirst: false })
          .limit(8),
        supabase
          .from("user_decisions")
          .select("id, decision_text, created_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("user_memory")
          .select("fact_category, fact_value, fact_label")
          .eq("user_id", user.id)
          .in("fact_category", ["identity", "business"])
          .eq("is_current", true)
          .limit(12),
        // Best-effort firmographics from L0 enrichment (enrich-company-context
        // -> company_context). RLS-filtered to empty if unreadable; never throws.
        supabase
          .from("company_context")
          .select("apollo_data")
          .eq("leader_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Role / sector seed from identity + business facts (for curated copy).
      const { role, sector } = readRoleSector(factsRes.data ?? []);
      // Industry from real firmographics sharpens the peer label when present.
      const industry = readIndustry(companyRes?.data ?? null);
      const peers = peerLabel(role, industry || sector);

      // Mine deliverable candidates from blockers + decisions.
      const mined: DeliverableCandidate[] = [];
      for (const b of blockersRes.data ?? []) {
        const cand = candidateFromPain(
          `blocker-${b.id}`,
          b.fact_value as string,
          "blocker",
        );
        if (cand) mined.push(cand);
      }
      for (const d of decisionsRes.data ?? []) {
        const cand = candidateFromPain(
          `decision-${d.id}`,
          d.decision_text as string,
          "decision",
        );
        if (cand) mined.push(cand);
      }

      // Dedupe mined by title (different pains can map to the same deliverable).
      const seenTitles = new Set<string>();
      const minedUnique = mined.filter((c) => {
        const k = c.title.toLowerCase();
        if (seenTitles.has(k)) return false;
        seenTitles.add(k);
        return true;
      });

      // Top up with curated (role/sector-seeded), skipping titles already mined.
      // Reframe curated in the confident peer voice ("your peers are using this")
      // grounded in the leader's role + company profile. Mined candidates keep
      // their own grounded reason (they come from the leader's actual pains).
      const curated = curatedFor(role, sector)
        .filter((c) => !seenTitles.has(c.title.toLowerCase()))
        .map((c) => ({ ...c, reasonLead: `${peers} are using this` }));

      const merged = [...minedUnique, ...curated].slice(0, limit);
      setCandidates(merged);
      setHasMined(minedUnique.length > 0);
    } catch (err) {
      console.warn("useSkillSuggestions: fetch failed", err);
      setCandidates(curatedFor(null, null).slice(0, limit));
      setHasMined(false);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return { candidates, loading, hasMined, refetch: fetchSuggestions };
}

/* ------------------------------------------------------------------ */
/* Mining: pain text -> a concrete deliverable candidate (or null)     */
/* ------------------------------------------------------------------ */

/**
 * Map a pain (blocker / active decision) onto a recurring DELIVERABLE, when one
 * is clearly implied. Returns null for vague strategic problems ("hiring is
 * hard") - those are not deliverables and must never become a suggestion.
 *
 * The rule (locked): a candidate must name a thing the leader PRODUCES on a
 * cadence. We detect the deliverable by keyword, then frame a concrete title +
 * a grounded "why we picked this" reason that references the pain.
 */
function candidateFromPain(
  id: string,
  rawText: string,
  source: "blocker" | "decision",
): DeliverableCandidate | null {
  const text = (rawText || "").trim();
  if (text.length < 8) return null;
  const lower = text.toLowerCase();

  const match = DELIVERABLE_MATCHERS.find((m) =>
    m.keywords.some((k) => lower.includes(k)),
  );
  if (!match) return null;

  const sourceLabel =
    source === "blocker"
      ? "You flagged this as a recurring drag"
      : "It is on your desk right now";

  return {
    id,
    title: match.title,
    reasonLead: sourceLabel,
    reasonRest: ` - ${truncate(text, 88)}.`,
    effortChip: match.effortChip,
    frequencyChip: match.frequencyChip,
    archetype: match.archetype,
    mined: true,
    seedText: text,
    seedKind: source,
  };
}

interface DeliverableMatcher {
  keywords: string[];
  title: string;
  archetype: AutomatorArchetype;
  effortChip: string;
  frequencyChip: string;
}

/**
 * Keyword -> deliverable map. Ordered most-specific first. Only fires on words
 * that name a produced artifact, so a generic "hiring is hard" never matches
 * (no deliverable keyword), while "weekly hiring update" matches the report.
 */
const DELIVERABLE_MATCHERS: DeliverableMatcher[] = [
  {
    keywords: ["investor update", "investor report"],
    title: "Your investor update",
    archetype: "report",
    effortChip: "~45 min each",
    frequencyChip: "repeats monthly",
  },
  {
    keywords: ["board", "board pack", "board update", "board deck"],
    title: "Your board one-pager",
    archetype: "report",
    effortChip: "~2 hrs",
    frequencyChip: "repeats monthly",
  },
  {
    keywords: ["proposal", "sow", "statement of work", "quote"],
    title: "A discovery call into a proposal",
    archetype: "proposal",
    effortChip: "~30 min each",
    frequencyChip: "several a week",
  },
  {
    keywords: ["follow up", "follow-up", "outreach", "cold email", "intro email"],
    title: "Your follow-up message",
    archetype: "outreach",
    effortChip: "~10 min each",
    frequencyChip: "daily",
  },
  {
    keywords: ["meeting notes", "recap", "summary", "minutes", "call summary"],
    title: "A meeting into a recap",
    archetype: "summary",
    effortChip: "~15 min each",
    frequencyChip: "most days",
  },
  {
    keywords: ["status update", "weekly update", "team update", "standup", "stand-up"],
    title: "Your weekly team update",
    archetype: "report",
    effortChip: "~30 min each",
    frequencyChip: "repeats weekly",
  },
  {
    keywords: ["report", "brief", "briefing"],
    title: "Your recurring report",
    archetype: "report",
    effortChip: "~45 min each",
    frequencyChip: "repeats weekly",
  },
];

/* ------------------------------------------------------------------ */
/* Role / sector reading + curated fallback                            */
/* ------------------------------------------------------------------ */

/** Pull a clean industry string from stored Apollo firmographics, if present. */
function readIndustry(company: { apollo_data?: unknown } | null): string | null {
  const apollo = company?.apollo_data as { industry?: unknown } | null | undefined;
  const industry = apollo && typeof apollo.industry === "string" ? apollo.industry.trim() : "";
  return industry.length > 0 && industry.length <= 28 ? industry : null;
}

/**
 * The confident peer descriptor for the suggestion framing ("your peers are
 * using this"). Grounded in the leader's role + company profile - never a
 * fabricated cohort count. Falls back to "Leaders like you" when role is thin.
 */
function peerLabel(role: string | null, sectorOrIndustry: string | null): string {
  const r = (role || "").toLowerCase();
  let who = "Leaders like you";
  if (/found|ceo|owner|chief exec/.test(r)) who = "Founders";
  else if (/sales|revenue|account|bd|business development/.test(r)) who = "Sales leaders";
  else if (/market|growth|brand|content/.test(r)) who = "Marketing leaders";
  else if (/ops|operation|coo/.test(r)) who = "Ops leaders";
  else if (/product|cpo|head of product|pm\b/.test(r)) who = "Product leaders";
  const s = (sectorOrIndustry || "").trim();
  if (s && s.length <= 28) {
    return who === "Leaders like you" ? `Leaders at ${s} companies` : `${who} at ${s} companies`;
  }
  return who;
}

function readRoleSector(
  facts: { fact_category: string; fact_value: string; fact_label: string }[],
): { role: string | null; sector: string | null } {
  let role: string | null = null;
  let sector: string | null = null;
  for (const f of facts) {
    const v = (f.fact_value || "").toLowerCase();
    const l = (f.fact_label || "").toLowerCase();
    if (!role && (l.includes("role") || l.includes("title") || f.fact_category === "identity")) {
      role = v;
    }
    if (!sector && (l.includes("sector") || l.includes("industry") || f.fact_category === "business")) {
      sector = v;
    }
  }
  return { role, sector };
}

/**
 * Curated, concrete deliverables seeded by role. Even with zero brain data the
 * leader sees sharp recurring artifacts, never vague problems. Founder/exec
 * leaning by default (CTRL's audience), nudged by detected role keywords.
 */
function curatedFor(role: string | null, _sector: string | null): DeliverableCandidate[] {
  const isSales = !!role && /sales|account|revenue|bd|business development/.test(role);
  const isMarketing = !!role && /market|content|growth|brand/.test(role);

  const founder: DeliverableCandidate[] = [
    {
      id: "curated-investor",
      title: "Your weekly investor update",
      reasonLead: "Founders write one on a cadence",
      reasonRest: " - same shape every time, so it is a clean first skill.",
      effortChip: "~45 min each",
      frequencyChip: "repeats weekly",
      archetype: "report",
      mined: false,
    },
    {
      id: "curated-proposal",
      title: "A discovery call into a proposal",
      reasonLead: "Same shape each time",
      reasonRest: ": notes in, a first proposal out.",
      effortChip: "~30 min each",
      frequencyChip: "several a week",
      archetype: "proposal",
      mined: false,
    },
    {
      id: "curated-board",
      title: "Your monthly board one-pager",
      reasonLead: "High effort, same structure",
      reasonRest: " every month - the kind of slog a skill removes.",
      effortChip: "~2 hrs",
      frequencyChip: "repeats monthly",
      archetype: "report",
      mined: false,
    },
  ];

  const sales: DeliverableCandidate[] = [
    {
      id: "curated-proposal",
      title: "A discovery call into a proposal",
      reasonLead: "Same shape each time",
      reasonRest: ": call notes in, a first proposal out.",
      effortChip: "~30 min each",
      frequencyChip: "several a week",
      archetype: "proposal",
      mined: false,
    },
    {
      id: "curated-followup",
      title: "Your post-call follow-up",
      reasonLead: "You send one after every call",
      reasonRest: " - same beats, in your voice.",
      effortChip: "~10 min each",
      frequencyChip: "daily",
      archetype: "outreach",
      mined: false,
    },
    {
      id: "curated-pipeline",
      title: "Your weekly pipeline update",
      reasonLead: "Same report every week",
      reasonRest: ": what moved, what is at risk, what is next.",
      effortChip: "~30 min each",
      frequencyChip: "repeats weekly",
      archetype: "report",
      mined: false,
    },
  ];

  const marketing: DeliverableCandidate[] = [
    {
      id: "curated-recap",
      title: "A meeting into a recap",
      reasonLead: "You write these constantly",
      reasonRest: " - decisions, owners, next steps.",
      effortChip: "~15 min each",
      frequencyChip: "most days",
      archetype: "summary",
      mined: false,
    },
    {
      id: "curated-update",
      title: "Your weekly team update",
      reasonLead: "Same update every week",
      reasonRest: ": wins, risks, what is next.",
      effortChip: "~30 min each",
      frequencyChip: "repeats weekly",
      archetype: "report",
      mined: false,
    },
    {
      id: "curated-proposal",
      title: "A brief into a first draft",
      reasonLead: "Same shape each time",
      reasonRest: ": a brief in, a first draft out.",
      effortChip: "~30 min each",
      frequencyChip: "several a week",
      archetype: "proposal",
      mined: false,
    },
  ];

  if (isSales) return sales;
  if (isMarketing) return marketing;
  return founder;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "...";
}
