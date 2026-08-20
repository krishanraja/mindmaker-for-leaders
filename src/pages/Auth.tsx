import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useAuth } from '@/components/auth/AuthProvider';
import { CtrlMonogram } from '@/components/brand/CtrlMonogram';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignIn, setIsSignIn] = useState(() => searchParams.get('mode') !== 'signup');
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const handoff = searchParams.get('h');
    if (!handoff) return;
    try {
      sessionStorage.setItem('handoff_token', handoff);
    } catch {
      /* The URL remains the fallback while this page is open. */
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="mymu-surface flex h-screen-safe items-center justify-center bg-[#0a0908]">
        <CtrlMonogram size={38} animated={!reducedMotion} />
      </div>
    );
  }

  return (
    <main className="mymu-surface min-h-[100dvh] bg-[#0a0908] px-6 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] text-[#f5f1ea] sm:px-10">
      <div className="mx-auto flex w-full max-w-[520px] items-center justify-between">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f1ea]">
          <CtrlMonogram size={30} />
          <span className="font-mymu-mono text-[10px] uppercase tracking-[0.24em] text-[#f5f1ea]/55">CTRL</span>
        </button>
        <button type="button" onClick={() => navigate('/')} className="flex min-h-11 items-center gap-2 font-mymu-serif text-sm text-[#f5f1ea]/50 transition-colors hover:text-[#f5f1ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f1ea]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[520px] items-center py-10">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full"
        >
          <p className="font-mymu-mono text-[10px] uppercase tracking-[0.2em] text-[#f5f1ea]/38">
            {isSignIn ? 'Pick up where you left off' : 'Keep your starting point'}
          </p>
          <h1 className="mt-5 max-w-[12ch] font-mymu-serif text-[clamp(2.5rem,9vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            {isSignIn ? 'Welcome back.' : 'Let CTRL remember what matters.'}
          </h1>
          <p className="mb-8 mt-5 max-w-[34ch] font-mymu-serif text-lg leading-relaxed text-[#f5f1ea]/58">
            {isSignIn ? 'Your brief, decisions and memory are waiting.' : 'Save what CTRL learns, and let it get more useful each morning.'}
          </p>

          <div className="mb-8 flex gap-6 border-b border-[#f5f1ea]/12">
            <AuthModeButton active={isSignIn} onClick={() => setIsSignIn(true)}>Sign in</AuthModeButton>
            <AuthModeButton active={!isSignIn} onClick={() => setIsSignIn(false)}>New here</AuthModeButton>
          </div>

          {isSignIn ? <SignInForm /> : <SignUpForm />}

          {/* The single cheapest thing that keeps CTRL out of a procurement
              conversation. A personal address means the account is the
              leader's own, and it never lands on an IT asset register. */}
          {!isSignIn && (
            <p className="mt-5 max-w-[38ch] font-mymu-serif text-sm leading-relaxed text-[#f5f1ea]/45">
              Your personal email works best here. CTRL is yours, not your company's.
            </p>
          )}

          <button type="button" onClick={() => navigate('/')} className="mt-7 font-mymu-serif text-sm text-[#f5f1ea]/42 underline-offset-4 hover:text-[#f5f1ea] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f1ea]">
            I only want the no-login daily brief
          </button>
        </motion.div>
      </div>
    </main>
  );
}

function AuthModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`relative min-h-11 pb-3 font-mymu-serif text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f1ea] ${active ? 'text-[#f5f1ea]' : 'text-[#f5f1ea]/38 hover:text-[#f5f1ea]/70'}`}
    >
      {children}
      {active && <span className="absolute inset-x-0 bottom-0 h-px bg-[#f5f1ea]" />}
    </button>
  );
}
