import { Check, Minus, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLAN_MATRIX } from '@/constants/planMatrix';
import { EDGE_PRO_PRICE_LONG } from '@/constants/billing';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import { useAuth } from '@/components/auth/AuthProvider';
import { HeroBackdrop } from '@/components/public/HeroBackdrop';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PRICING } from '@/components/public/publicCopy';

// The interactive pricing surface: the one with a live checkout button. A
// willing buyer should never have to hunt for it, so it is linked from the
// paywall, Settings, the post-decision upgrade moment and the public header.
// PLAN_MATRIX is the single source of truth for what each tier includes, shared
// with the Settings tab so the two can never drift.
function cell(value: string | true | false, tier: 'free' | 'pro') {
  if (value === true) {
    return <Check className={tier === 'pro' ? 'h-4 w-4 text-accent' : 'h-4 w-4 text-muted-foreground'} strokeWidth={2.6} />;
  }
  if (value === false) return <Minus className="h-4 w-4 text-muted-foreground/40" strokeWidth={2.4} />;
  return <span className="text-xs text-foreground/90">{value}</span>;
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, isProcessing, subscribe } = useEdgeSubscription();

  const onSubscribe = async () => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }
    const url = await subscribe();
    if (url) window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader omit="/upgrade" />

      <section className="relative overflow-hidden px-5 py-14 text-center sm:px-8 sm:py-16">
        <HeroBackdrop weight="quiet" />
        <div className="relative z-10 mx-auto w-full max-w-3xl">
          <h1 className="mx-auto max-w-[22ch] text-balance font-display text-[26px] font-extrabold leading-[1.06] tracking-[-0.03em] sm:text-[41px]">
            {PRICING.h1}
          </h1>
          <p className="mx-auto mt-4 max-w-[60ch] text-balance text-[15px] leading-[1.55] text-muted-foreground sm:text-base">
            {PRICING.sub}
          </p>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="grid grid-cols-[1fr,auto,auto] items-center gap-x-4 gap-y-2.5 sm:gap-x-6">
              <div />
              <div className="text-center">
                <p className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free</p>
                <p className="font-display text-[11px] text-muted-foreground/70">$0</p>
              </div>
              <div className="text-center">
                <p className="font-display text-xs font-semibold uppercase tracking-wider text-accent">Edge Pro</p>
                <p className="font-display text-[11px] text-muted-foreground/70">{EDGE_PRO_PRICE_LONG}</p>
              </div>

              {PLAN_MATRIX.map((row) => (
                <div key={row.label} className="contents">
                  <span className="py-1 text-sm text-foreground/90">{row.label}</span>
                  <span className="flex items-center justify-center">{cell(row.free, 'free')}</span>
                  <span className="flex items-center justify-center">{cell(row.pro, 'pro')}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              {hasAccess ? (
                <p className="text-sm font-medium text-accent">You are on Edge Pro. Thank you.</p>
              ) : (
                <button
                  onClick={onSubscribe}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-display text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {PRICING.cta} <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">{PRICING.note}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/70">{PRICING.fine}</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
