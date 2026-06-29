import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * The warm-handoff consumer (CTRL side of the portfolio hive mind).
 *
 * When a leader arrives from Make Your Mind Up having opted in at the fork, the
 * URL carries `?h=<token>`. This resolves that consented, CATEGORISED signal
 * (an anxiety lane, never the raw q5) and stages a single honest confirmation:
 * "here's what I think is on your mind - want me to start there?" On yes, it
 * seeds ONE inferred blocker fact, so the feed and briefing start warm instead
 * of cold. Honours CTRL's honesty model: the fact is `inferred`, not `verified`,
 * and the leader confirms it before it lands. Self-dismissing, once per leader.
 */

const LANE_PHRASE: Record<string, string> = {
  orchestration: 'getting AI agents wired into how your team actually works',
  org: 'what AI changes about your team and headcount',
  economics: 'the build-versus-buy and cost maths on AI',
  tools: 'which AI tools to standardise on',
  product: 'rebuilding how you go to market with AI',
  governance: 'the policy and guardrails for AI use',
  security: 'your AI security exposure',
  model: 'which models to bet on',
  proof: 'proving AI is actually paying off',
};

const TOKEN_KEY = 'handoff_token';
const DONE_KEY = 'handoff_done';

interface Signal {
  entryVariant?: string;
  anxietyLane?: string;
  companyDomain?: string;
  archetypeTitle?: string;
}

function readToken(): string | null {
  try {
    const url = new URLSearchParams(window.location.search);
    return url.get('h') || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function HandoffWelcome() {
  const { user } = useAuth();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let done = false;
    try {
      done = localStorage.getItem(DONE_KEY) === '1';
    } catch {
      /* private mode */
    }
    if (done) return;
    const token = readToken();
    if (!token) return;

    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('resolve-handoff', {
          body: { token },
        });
        if (active && !error && data?.ok && data.signal) setSignal(data.signal as Signal);
      } catch {
        /* silent: a missing handoff just means no warm start */
      }
      try {
        sessionStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!signal || hidden) return null;
  const phrase = LANE_PHRASE[signal.anxietyLane ?? ''] ?? 'the AI shift in your business';

  const finish = () => {
    try {
      localStorage.setItem(DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const confirm = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await supabase.from('user_memory').insert({
        user_id: user.id,
        fact_key: 'handoff_focus',
        fact_category: 'blocker',
        fact_label: "What you're weighing",
        fact_value: phrase,
        fact_context: `Arrived from Make Your Mind Up (${signal.entryVariant ?? 'fork'}); lane ${signal.anxietyLane ?? 'unknown'}`,
        source_type: 'enrichment',
        verification_status: 'inferred',
        confidence_score: 0.75,
        is_high_stakes: false,
        is_current: true,
      });
    } catch {
      /* best-effort: never block the leader on a seed write */
    }
    setSaving(false);
    finish();
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-xl backdrop-blur sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96">
      <p className="text-sm leading-relaxed text-foreground">
        Make Your Mind Up sent you over with a head start. From what you told it, the thing on your
        mind is <span className="font-semibold text-primary">{phrase}</span>. Want me to start there?
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={saving}
          className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          Yes, start there
        </button>
        <button
          type="button"
          onClick={finish}
          className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50"
        >
          Not quite
        </button>
      </div>
    </div>
  );
}
