import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { BrandLockup } from '@/components/landing/BrandLockup';
import {
  KIT_SCOPE_VARS,
  KitCard,
  KitEyebrow,
  KitHeadline,
  KitSub,
  KitPrimaryButton,
  KitLinkish,
} from '@/components/kit/kitPrimitives';
import { supabase } from '@/integrations/supabase/client';
import { emitEvent } from '@/lib/track';

/**
 * Public email-capture landing page (/download, behind FF.publicCapture).
 *
 * A cold visitor (no session, no auth) trades an email for the CTRL starter
 * kit link. Built from the kit brand primitives since this is the front door
 * into the Kit engine funnel, same audience and same look as the kit portal;
 * the outer shell stays on the app's forced-dark tokens.
 *
 * Submission never talks to a third party from the browser: it calls the
 * capture-lead edge function, which validates + forwards to the marketing
 * webhook server-side.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const HONEYPOT_STYLE: CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: 0,
  width: '1px',
  height: '1px',
  opacity: 0,
  overflow: 'hidden',
};

type Phase = 'form' | 'submitting' | 'success' | 'error';

function readUtm() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || 'direct',
    utm_medium: params.get('utm_medium') || 'organic',
    utm_campaign: params.get('utm_campaign') || 'mm_ctrl_capture_page',
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined,
  };
}

export default function CaptureLanding() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot; real visitors never fill this
  const [phase, setPhase] = useState<Phase>('form');
  const [errorMessage, setErrorMessage] = useState('');

  const goToKit = () => {
    navigate('/kit?utm_source=capture&utm_medium=organic&utm_campaign=mm_ctrl_capture_page');
  };

  const submit = async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setPhase('error');
      setErrorMessage('Enter a valid email address.');
      return;
    }
    setPhase('submitting');
    const utm = readUtm();
    try {
      const { data, error } = await supabase.functions.invoke('capture-lead', {
        body: {
          email: trimmed,
          website,
          ...utm,
          page_url: window.location.href,
        },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        setPhase('error');
        setErrorMessage('Something went wrong. Try again.');
        return;
      }
      setPhase('success');
      // once=false: this is a real per-submission conversion event, not a
      // page view. The default session dedupe (built for "landed") would
      // silently drop a second genuine submission after a page reload.
      void emitEvent(
        'capture_submitted',
        { utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign },
        false,
      );
    } catch {
      setPhase('error');
      setErrorMessage('Something went wrong. Try again.');
    }
  };

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background text-foreground">
      <header className="shrink-0 flex items-center justify-center px-4 py-4">
        <button type="button" onClick={() => navigate('/')} aria-label="Mindmaker CTRL, go home">
          <BrandLockup />
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-4 pb-6">
        <div style={KIT_SCOPE_VARS} className="w-full max-w-sm">
          <KitCard>
            {phase === 'success' ? (
              <div className="text-center">
                <KitEyebrow className="mx-auto">THE CTRL STARTER KIT</KitEyebrow>
                <KitHeadline className="mx-auto">Check your inbox</KitHeadline>
                <KitSub className="mx-auto">Your kit link is on the way.</KitSub>
                <div className="mt-5">
                  <KitLinkish onClick={goToKit}>Or start right now</KitLinkish>
                </div>
              </div>
            ) : (
              <>
                <KitEyebrow>THE CTRL STARTER KIT</KitEyebrow>
                <KitHeadline>Get your starter kit</KitHeadline>
                <KitSub>
                  Two minutes of talking builds a portable context file of you. Every AI tool
                  you use starts knowing your world. We will email you your kit link.
                </KitSub>

                <div className="mt-5 space-y-3">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && phase !== 'submitting') void submit();
                    }}
                    placeholder="you@company.com"
                    aria-label="Email"
                    className="w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none transition-all"
                    style={{ background: '#FCFCFB', borderColor: 'var(--kit-line)', color: 'var(--kit-ink)' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--kit-acc)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--kit-acc-soft)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--kit-line)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />

                  {/* Honeypot: hidden from real visitors. A filled value means a bot. */}
                  <input
                    type="text"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={HONEYPOT_STYLE}
                  />

                  {phase === 'error' && (
                    <p role="alert" className="text-sm" style={{ color: 'var(--kit-clay)' }}>
                      {errorMessage}
                    </p>
                  )}

                  <KitPrimaryButton
                    disabled={phase === 'submitting'}
                    onClick={() => void submit()}
                  >
                    {phase === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Email me the kit
                  </KitPrimaryButton>
                </div>

                <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--kit-faint)' }}>
                  No spam. Four short emails at most, unsubscribe in one click.
                </p>
              </>
            )}
          </KitCard>
        </div>
      </main>
    </div>
  );
}
