import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { BrandLockup } from '@/components/landing/BrandLockup';
import {
  CAPTURE_SCOPE_VARS,
  CaptureCard,
  CaptureEyebrow,
  CaptureHeadline,
  CaptureSub,
  CapturePrimaryButton,
  CaptureLinkish,
} from '@/components/capture/capturePrimitives';
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

  // The Kit is retired. This used to open /kit; that route now 301s to /try,
  // so it points there directly rather than through a redirect that costs a
  // round trip and loses the query string on some clients.
  const goToKit = () => {
    navigate('/try?utm_source=capture&utm_medium=organic&utm_campaign=mm_ctrl_capture_page');
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
        <div style={CAPTURE_SCOPE_VARS} className="w-full max-w-sm">
          <CaptureCard>
            {phase === 'success' ? (
              <div className="text-center">
                <CaptureEyebrow className="mx-auto">THE CTRL STARTER KIT</CaptureEyebrow>
                <CaptureHeadline className="mx-auto">Check your inbox</CaptureHeadline>
                <CaptureSub className="mx-auto">Your kit link is on the way.</CaptureSub>
                <div className="mt-5">
                  <CaptureLinkish onClick={goToKit}>Or start right now</CaptureLinkish>
                </div>
              </div>
            ) : (
              <>
                <CaptureEyebrow>THE CTRL STARTER KIT</CaptureEyebrow>
                <CaptureHeadline>Get your starter kit</CaptureHeadline>
                <CaptureSub>
                  Two minutes of talking builds a portable context file of you. Every AI tool
                  you use starts knowing your world. We will email you your kit link.
                </CaptureSub>

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
                    style={{ background: '#FCFCFB', borderColor: 'var(--capture-line)', color: 'var(--capture-ink)' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--capture-acc)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--capture-acc-soft)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--capture-line)';
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
                    <p role="alert" className="text-sm" style={{ color: 'var(--capture-clay)' }}>
                      {errorMessage}
                    </p>
                  )}

                  <CapturePrimaryButton
                    disabled={phase === 'submitting'}
                    onClick={() => void submit()}
                  >
                    {phase === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Email me the kit
                  </CapturePrimaryButton>
                </div>

                <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--capture-faint)' }}>
                  No spam. Four short emails at most, unsubscribe in one click.
                </p>
              </>
            )}
          </CaptureCard>
        </div>
      </main>
    </div>
  );
}
