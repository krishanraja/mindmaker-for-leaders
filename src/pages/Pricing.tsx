import { Check, Minus, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLAN_MATRIX } from '@/constants/planMatrix';
import { EDGE_PRO_PRICE_LONG } from '@/constants/billing';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import { useAuth } from '@/components/auth/AuthProvider';
import { BrandLockup } from '@/components/landing/BrandLockup';

// Public pricing surface. Free is a real daily instrument; Edge Pro is the
// decision tier. A willing buyer should never have to hunt for this: it is linked
// from the paywall, Settings, and the post-decision upgrade moment.
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
      navigate('/auth');
      return;
    }
    const url = await subscribe();
    if (url) window.location.href = url;
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center px-5 py-10">
      <button onClick={() => navigate(user ? '/dashboard' : '/')} className="mb-8">
        <BrandLockup />
      </button>

      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Simple pricing</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Free is a real daily instrument. Edge Pro is the decision tier: it deepens the one thing CTRL does that general tools cannot.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="grid grid-cols-[1fr,auto,auto] gap-x-4 sm:gap-x-6 gap-y-2.5 items-center">
            <div />
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free</p>
              <p className="text-[11px] text-muted-foreground/70">$0</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Edge Pro</p>
              <p className="text-[11px] text-muted-foreground/70">{EDGE_PRO_PRICE_LONG}</p>
            </div>

            {PLAN_MATRIX.map((row) => (
              <div key={row.label} className="contents">
                <span className="text-sm text-foreground/90 py-1">{row.label}</span>
                <span className="flex items-center justify-center">{cell(row.free, 'free')}</span>
                <span className="flex items-center justify-center">{cell(row.pro, 'pro')}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            {hasAccess ? (
              <p className="text-sm text-accent font-medium">You are on Edge Pro. Thank you.</p>
            ) : (
              <button
                onClick={onSubscribe}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 transition disabled:opacity-60"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Upgrade to Edge Pro <ArrowRight className="h-4 w-4" /></>}
              </button>
            )}
            <p className="text-[11px] text-muted-foreground/70">Cancel anytime. Your free daily read and Automator stay free.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
