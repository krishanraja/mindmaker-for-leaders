import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { ConsiderationStone } from '@/components/decision-map/ConsiderationStone';
import { DecisionRunning } from '@/components/operator/decision/DecisionRunning';
import { buildDecisionMemo } from '@/components/operator/decision/decisionMemo';
import { HeroBackdrop } from '@/components/public/HeroBackdrop';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { WeighDemo } from '@/components/public/WeighDemo';
import { TRY } from '@/components/public/publicCopy';

/**
 * /try - the page that shows the work before it asks for anything.
 *
 * Act one is a worked weigh a visitor can open and check. Act two is theirs:
 * the input runs the REAL decision-engine, signing them in anonymously first so
 * "no account, no card" is literally true. The server's own free cap (three
 * runs a month per user) is the cap the fine print promises; when it bites, the
 * page says so and points at signing up rather than failing silently.
 *
 * The anonymous session is the same user their account becomes: AuthProvider's
 * signUp converts an anonymous user in place, so "make an account and it stays"
 * holds and the weigh is waiting for them in /dashboard.
 */
export default function TryPage() {
  const navigate = useNavigate();
  const [statement, setStatement] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    start,
    starting,
    isRunning,
    isComplete,
    error,
    upgradeRequired,
    upgradeMessage,
    decisionCase,
    claims,
    evidence,
    tensions,
  } = useDecisionEngine();

  const [open, setOpen] = useState<string | null>(null);
  const busy = signingIn || starting || isRunning;
  const ready = statement.trim().length >= 8;

  const submit = useCallback(async () => {
    if (!ready || busy) return;
    setSessionError(null);

    // The engine authenticates the caller. A visitor with no session gets an
    // anonymous one, which is a real user row the weigh can belong to.
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      setSigningIn(true);
      const { error: signInError } = await supabase.auth.signInAnonymously();
      setSigningIn(false);
      if (signInError) {
        setSessionError(
          signInError.message?.includes('disabled')
            ? 'Weighing without an account is unavailable right now. Create one and it runs straight away.'
            : 'Could not start a session. Try again, or create an account.',
        );
        return;
      }
    }

    await start(statement.trim());
  }, [ready, busy, start, statement]);

  const copyMemo = useCallback(async () => {
    if (!decisionCase) return;
    try {
      await navigator.clipboard.writeText(buildDecisionMemo(decisionCase, claims, evidence, tensions));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked; the Keep path still works */
    }
  }, [decisionCase, claims, evidence, tensions]);

  const evidenceFor = useMemo(() => {
    const byClaim = new Map<string, typeof evidence>();
    for (const e of evidence) {
      const list = byClaim.get(e.claim_id) ?? [];
      list.push(e);
      byClaim.set(e.claim_id, list);
    }
    return byClaim;
  }, [evidence]);

  const showTheirWeigh = busy || isComplete || Boolean(error) || upgradeRequired;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader omit="/try" />

      {/* ACT ONE: a weigh that already happened. */}
      <section className="relative overflow-hidden px-5 py-14 text-center sm:px-8 sm:py-16">
        <HeroBackdrop weight="quiet" />
        <div className="relative z-10 mx-auto w-full max-w-3xl">
          <span className="inline-block font-display text-[10.5px] font-bold uppercase tracking-[0.13em] text-accent">
            {TRY.eyebrow}
          </span>
          <h1 className="mx-auto mt-4 max-w-[20ch] text-balance font-display text-[26px] font-extrabold leading-[1.06] tracking-[-0.03em] sm:text-[41px]">
            {TRY.h1}
          </h1>
          <p className="mx-auto mt-4 max-w-[58ch] text-balance text-[15px] leading-[1.55] text-muted-foreground sm:text-base">
            {TRY.sub}
          </p>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8">
        <div className="mx-auto w-full max-w-3xl text-center">
          <WeighDemo stagger />
          <p className="mt-5 text-[13px] text-muted-foreground">{TRY.prov}</p>
        </div>
      </section>

      {/* ACT TWO: theirs. */}
      <section className="border-t border-border px-5 py-12 sm:px-8 sm:py-[74px]">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h2 className="mx-auto max-w-[28ch] text-balance font-display text-[23px] font-extrabold leading-[1.14] tracking-[-0.025em] sm:text-[33px]">
            {TRY.act2H}
          </h2>
          <p className="mx-auto mt-4 max-w-[58ch] text-[14.5px] leading-[1.62] text-muted-foreground sm:text-base">
            {TRY.act2Sub}
          </p>

          <div className="mx-auto mt-6 flex max-w-[560px] flex-col gap-2.5 sm:flex-row">
            <input
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder={TRY.placeholder}
              disabled={busy}
              aria-label="The decision you are weighing"
              className="flex-1 rounded-xl border border-border bg-popover px-4 py-3 text-left text-sm text-foreground placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-60"
            />
            <button
              onClick={submit}
              disabled={!ready || busy}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-6 py-3 font-display text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {TRY.button}
            </button>
          </div>

          <p className="mx-auto mt-3.5 max-w-[560px] text-[12px] text-muted-foreground/80">{TRY.fine}</p>

          {sessionError && <p className="mt-4 text-sm text-destructive">{sessionError}</p>}
          {error && !sessionError && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {upgradeRequired && (
            <div className="mx-auto mt-6 max-w-[560px] rounded-2xl border border-border bg-card p-5 text-left">
              <p className="text-sm leading-relaxed text-foreground">{upgradeMessage}</p>
              <button
                onClick={() => navigate('/auth?mode=signup')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 font-display text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90"
              >
                Create an account <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Their weigh, live. */}
          {showTheirWeigh && busy && (
            <div className="mx-auto mt-8 max-w-[600px]">
              <DecisionRunning
                stage={decisionCase?.stage ?? 'decomposing'}
                statement={statement.trim()}
                decisionCase={decisionCase}
                claims={claims}
              />
            </div>
          )}

          {isComplete && claims.length > 0 && (
            <div className="mx-auto mt-8 max-w-[600px] space-y-2 text-left">
              {claims.map((c) => (
                <ConsiderationStone
                  key={c.id}
                  claim={c}
                  evidence={evidenceFor.get(c.id) ?? []}
                  expanded={open === c.id}
                  onToggle={() => setOpen(open === c.id ? null : c.id)}
                />
              ))}
            </div>
          )}

          {isComplete && (
            <div className="mx-auto mt-7 max-w-[560px] rounded-2xl border border-accent/25 bg-gradient-to-b from-accent/[0.07] to-transparent p-6 text-left">
              <p className="text-[14.5px] leading-relaxed text-foreground">{TRY.handoff}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  onClick={() => navigate('/auth?mode=signup')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 font-display text-[13px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
                >
                  {TRY.keepCta} <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={copyMemo}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 font-display text-[13px] font-bold text-foreground transition-colors hover:bg-secondary/60"
                >
                  {copied ? <Check className="h-4 w-4 text-accent" /> : null}
                  {copied ? 'Copied' : TRY.shareCta}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
