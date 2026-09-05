import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowRight, Check, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/lib/haptics';
import { OnboardingBrandMark } from './OnboardingBrandMark';
import {
  brandProgressForStep,
  onboardingThemeForProgress,
  type OnboardingStep,
} from './onboardingBrand';
import {
  companyAiLabel,
  companyFutureOptions,
  delayedDecisionExamples,
  extraSelfOptions,
  fallbackResult,
  sliderValueForKey,
  weekNeedsMeLabel,
  type CompanyFuture,
  type ExtraSelf,
  type OnboardingAnswers,
  type OnboardingResult,
} from './onboardingModel';
import { parseOnboardingDossier, type OnboardingDossier } from './onboardingDossier';

const db = supabase as unknown as SupabaseClient;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /^https:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/[a-z0-9_%-]+\/?(?:\?.*)?$/i;
const EASE = [0.22, 1, 0.36, 1] as const;

// Hero trust signals. Every entry must be a control that is IN PLACE in
// project-documentation/compliance/CONTROL_MATRIX.md, phrased within the limits
// docs/current/commercial.md sets on security claims. CTRL holds no SOC 2
// report and no ISO 27001 certificate, and does not process PHI, so no
// certification mark belongs on this page. /trust carries the full posture,
// including what is only in progress and what we have not done, so the hero
// links there rather than stating the absence in the copy.
const heroTrustSignals = [
  'Row-level security',
  'Field-level encryption',
  'Export or delete',
] as const;

function normalizeIdentity(value: string): string {
  const trimmed = value.trim();
  if (/^(?:www\.)?linkedin\.com\/in\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

interface GeneratedResult {
  twelve_months?: string;
  three_years?: string;
  archetype_title?: string;
  dossier?: unknown;
}

function readAttribution() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
  };
}

export function CtrlOnboarding() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [responseId] = useState(() => crypto.randomUUID());
  const [email, setEmail] = useState('');
  const [identityInput, setIdentityInput] = useState('');
  const [weekNeedsMe, setWeekNeedsMe] = useState(50);
  const [companyAi, setCompanyAi] = useState(50);
  const [extraSelf, setExtraSelf] = useState<ExtraSelf | null>(null);
  const [companyFuture, setCompanyFuture] = useState<CompanyFuture | null>(null);
  const [delayedDecision, setDelayedDecision] = useState('');
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [weekTouched, setWeekTouched] = useState(false);
  const [aiTouched, setAiTouched] = useState(false);
  const rowCreated = useRef(false);

  const currentIndex = ['identity', 'week', 'extra', 'ai', 'future', 'decision'].indexOf(step);
  const brandProgress = brandProgressForStep(step);
  const onboardingTheme = onboardingThemeForProgress(brandProgress);

  const ensureResponse = useCallback(async () => {
    if (rowCreated.current) return true;
    const attribution = readAttribution();
    const { error } = await db.from('cannes_responses').insert({
      id: responseId,
      source: 'direct',
      entry_variant: 'decide',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      utm_source: attribution.source,
      utm_medium: attribution.medium,
      utm_campaign: attribution.campaign,
    });
    if (!error) rowCreated.current = true;
    return !error;
  }, [responseId]);

  const begin = useCallback(async () => {
    setStep('identity');
    await ensureResponse();
  }, [ensureResponse]);

  const submitIdentity = useCallback(async () => {
    const trimmed = normalizeIdentity(identityInput);
    setStep('week');
    const isEmail = EMAIL_RE.test(trimmed);
    const isLinkedIn = LINKEDIN_RE.test(trimmed);
    if (!isEmail && !isLinkedIn) return;
    if (isEmail) setEmail(trimmed);
    await ensureResponse();
    void supabase.functions.invoke('enrich-profile', {
      body: isEmail
        ? { id: responseId, kind: 'email', email: trimmed }
        : { id: responseId, kind: 'linkedin', linkedin: trimmed },
    });
  }, [ensureResponse, identityInput, responseId]);

  const finish = useCallback(async () => {
    if (!extraSelf || !companyFuture || !delayedDecision.trim()) return;
    const answers: OnboardingAnswers = {
      weekNeedsMe,
      extraSelf,
      companyAi,
      companyFuture,
      delayedDecision: delayedDecision.trim(),
    };
    const local = fallbackResult(responseId, answers);
    setStep('thinking');
    await ensureResponse();

    try {
      const { data, error } = await supabase.functions.invoke<GeneratedResult>('generate-result', {
        body: {
          id: responseId,
          variant: 'decide',
          archetype: {
            key: local.archetypeKey,
            title: local.archetypeTitle,
            variant: local.archetypeVariant,
          },
          answers: {
            q1: weekNeedsMe,
            q2: extraSelf,
            q3: companyAi,
            q4: companyFuture,
            q5: delayedDecision.trim(),
          },
        },
      });
      if (error) throw error;
      setResult({
        ...local,
        archetypeTitle: data?.archetype_title || local.archetypeTitle,
        twelveMonths: data?.twelve_months || local.twelveMonths,
        threeYears: data?.three_years || local.threeYears,
        dossier: parseOnboardingDossier(data?.dossier),
      });
      if (parseOnboardingDossier(data?.dossier)?.status === 'ready') haptics.success();
    } catch {
      setResult(local);
    }

    window.setTimeout(() => setStep('result'), reducedMotion ? 0 : 900);
  }, [companyAi, companyFuture, delayedDecision, ensureResponse, extraSelf, reducedMotion, responseId, weekNeedsMe]);

  const correctIdentity = useCallback(async (value: string) => {
    const trimmed = normalizeIdentity(value);
    const isEmail = EMAIL_RE.test(trimmed);
    const isLinkedIn = LINKEDIN_RE.test(trimmed);
    if ((!isEmail && !isLinkedIn) || correcting) return false;
    setCorrecting(true);
    try {
      if (isEmail) setEmail(trimmed);
      const { data, error } = await supabase.functions.invoke<{ dossier?: unknown }>('enrich-profile', {
        body: isEmail
          ? { id: responseId, kind: 'email', email: trimmed }
          : { id: responseId, kind: 'linkedin', linkedin: trimmed },
      });
      if (error) throw error;
      const dossier = parseOnboardingDossier(data?.dossier);
      setResult((current) => current ? { ...current, dossier } : current);
      if (dossier?.status === 'ready') haptics.success();
      return Boolean(dossier);
    } catch {
      haptics.error();
      return false;
    } finally {
      setCorrecting(false);
    }
  }, [correcting, responseId]);

  const sendResult = useCallback(async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed) || sending || sent) return;
    setSendError(null);
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('subscribe-briefing', {
        body: { response_id: responseId, email: trimmed, consent: true },
      });
      if (error) throw error;
      setSent(true);
      void supabase.functions.invoke('send-result-email', {
        body: { id: responseId, email: trimmed, variant: 'decide' },
      });
    } catch {
      setSendError("I can't start your morning brief just now. Nothing was subscribed or sent. You can still continue into CTRL.");
    } finally {
      setSending(false);
    }
  }, [email, responseId, sending, sent]);

  const continueIntoCtrl = useCallback(async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      const { data } = await supabase.functions.invoke<{ handoff?: string }>('track-fork', {
        body: { id: responseId, destination: 'ctrl', variant: 'decide', consent: true, dossier_confirmed: Boolean(result?.dossier?.company.name || result?.dossier?.company.domain) },
      });
      if (data?.handoff) {
        try {
          sessionStorage.setItem('handoff_token', data.handoff);
        } catch {
          // Storage can be unavailable in private browsing. The URL still carries the token.
        }
        navigate(`/auth?mode=signup&h=${encodeURIComponent(data.handoff)}`);
        return;
      }
    } catch {
      // A cold account is still better than trapping the leader on a failed handoff.
    }
    navigate('/auth?mode=signup');
  }, [continuing, navigate, responseId, result?.dossier?.company.domain, result?.dossier?.company.name]);

  const screen = useMemo(() => {
    switch (step) {
      case 'intro':
        return <Intro brandProgress={brandProgress} onBegin={begin} onSignIn={() => navigate('/auth')} />;
      case 'identity':
        return (
          <IdentityStep
            value={identityInput}
            onChange={setIdentityInput}
            onContinue={submitIdentity}
            onSkip={() => setStep('week')}
          />
        );
      case 'week':
        return (
          <SliderStep
            question="Picture your week as it is now. How much of it actually needs you?"
            value={weekNeedsMe}
            label={weekTouched ? weekNeedsMeLabel(weekNeedsMe) : 'Drag to choose.'}
            touched={weekTouched}
            onChange={(value) => {
              setWeekNeedsMe(value);
              setWeekTouched(true);
            }}
            onContinue={() => setStep('extra')}
          />
        );
      case 'extra':
        return (
          <ChoiceStep
            question="If you had one extra version of yourself, what would they spend their time on?"
            options={extraSelfOptions}
            value={extraSelf}
            onChoose={(value) => {
              setExtraSelf(value as ExtraSelf);
              window.setTimeout(() => setStep('ai'), reducedMotion ? 0 : 280);
            }}
          />
        );
      case 'ai':
        return (
          <SliderStep
            question="How much of what your company does could a well-built AI handle today, if you let it?"
            value={companyAi}
            label={aiTouched ? companyAiLabel(companyAi) : 'Drag to choose.'}
            touched={aiTouched}
            onChange={(value) => {
              setCompanyAi(value);
              setAiTouched(true);
            }}
            onContinue={() => setStep('future')}
          />
        );
      case 'future':
        return (
          <ChoiceStep
            question="What kind of company do you actually want to be running in three years?"
            options={companyFutureOptions}
            value={companyFuture}
            onChoose={(value) => {
              setCompanyFuture(value as CompanyFuture);
              window.setTimeout(() => setStep('decision'), reducedMotion ? 0 : 280);
            }}
          />
        );
      case 'decision':
        return (
          <DecisionStep
            value={delayedDecision}
            onChange={setDelayedDecision}
            onSubmit={finish}
          />
        );
      case 'thinking':
        return <Thinking brandProgress={brandProgress} hasIdentity={Boolean(identityInput.trim())} />;
      case 'result':
        return result ? (
          <ResultStep
            brandProgress={brandProgress}
            result={result}
            email={email}
            sent={sent}
            sending={sending}
            sendError={sendError}
            continuing={continuing}
            correcting={correcting}
            onEmailChange={setEmail}
            onSend={sendResult}
            onContinue={continueIntoCtrl}
            onCorrectIdentity={correctIdentity}
          />
        ) : null;
      default:
        return null;
    }
  }, [aiTouched, begin, brandProgress, companyAi, companyFuture, continueIntoCtrl, continuing, correctIdentity, correcting, delayedDecision, email, extraSelf, finish, identityInput, navigate, reducedMotion, result, sendError, sendResult, sending, sent, step, submitIdentity, weekNeedsMe, weekTouched]);

  return (
    <main
      className="mymu-surface min-h-[100dvh] bg-[var(--onboarding-bg)] text-[var(--onboarding-fg)] transition-colors duration-700 motion-reduce:transition-none"
      style={onboardingTheme}
      data-onboarding-step={step}
      data-brand-progress={brandProgress.toFixed(2)}
    >
      {currentIndex >= 0 && (
        <div className="fixed inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[640px] items-center gap-2 px-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <OnboardingBrandMark progress={brandProgress} size={24} className="opacity-80" />
          <div className="ml-auto flex items-center gap-1.5" aria-label={`Step ${currentIndex + 1} of 6`}>
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className={`h-1 rounded-full transition-all duration-500 motion-reduce:transition-none ${index <= currentIndex ? 'w-5 bg-[var(--onboarding-accent-a)]' : 'w-2 bg-[var(--onboarding-fg-15)]'}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[640px] flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -7 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.34, ease: EASE }}
            className="flex min-h-[100dvh] w-full flex-1 flex-col"
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

function Intro({
  brandProgress,
  onBegin,
  onSignIn,
}: {
  brandProgress: number;
  onBegin: () => void;
  onSignIn: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col px-6 pb-8 pt-[max(5vh,3.5rem)] sm:px-10">
      <div className="flex items-center gap-3">
        <OnboardingBrandMark progress={brandProgress} size={34} animated />
        <span className="font-mymu-mono text-[11px] uppercase tracking-[0.24em] text-[var(--onboarding-fg-55)]">CTRL</span>
      </div>

      <div className="my-auto py-2">
        <p className="font-mymu-mono text-[11px] uppercase tracking-[0.22em] text-[var(--onboarding-fg-45)]">A quieter way through AI</p>
        <h1 className="mt-6 max-w-[18ch] font-mymu-serif text-[clamp(2.35rem,9vw,4.35rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
          What if you did not need to hold all of this in your head?
        </h1>
        <p className="mt-7 max-w-[30ch] font-mymu-serif text-[1.12rem] leading-[1.5] text-[var(--onboarding-fg-68)]">
          Tell CTRL what is pulling at you. It will turn that into a useful daily briefing, a sharper decision, and a better sense of what deserves you.
        </p>
      </div>

      <div className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
        <button type="button" onClick={onBegin} className="group flex min-h-14 items-center justify-between rounded-2xl bg-[var(--onboarding-action)] px-5 py-4 text-left font-mymu-serif text-lg font-semibold text-[var(--onboarding-action-ink)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)] motion-reduce:transform-none">
          Start with what is on my mind
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
        <button type="button" onClick={onSignIn} className="-my-2 min-h-11 self-start rounded-lg pr-3 font-mymu-serif text-base text-[var(--onboarding-fg-55)] underline-offset-4 transition-colors hover:text-[var(--onboarding-fg)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)]">
          I already use CTRL
        </button>
        <p className="font-mymu-mono text-[10px] uppercase tracking-[0.15em] text-[var(--onboarding-fg-32)]">About three minutes. No account needed.</p>

        <div className="mt-1 border-t border-[var(--onboarding-fg-08)] pt-4">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {heroTrustSignals.map((signal) => (
              <li
                key={signal}
                className="flex items-center gap-1.5 font-mymu-mono text-[10px] uppercase tracking-[0.15em] text-[var(--onboarding-fg-45)]"
              >
                <ShieldCheck className="h-3 w-3 shrink-0 text-[var(--onboarding-accent-a)]" aria-hidden="true" />
                {signal}
              </li>
            ))}
          </ul>
          <a
            href="/trust"
            className="-mx-1 inline-flex min-h-11 items-center rounded-lg px-1 font-mymu-serif text-[0.95rem] text-[var(--onboarding-fg-55)] underline-offset-4 transition-colors hover:text-[var(--onboarding-fg)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)]"
          >
            <span>
              How your data is protected
              <ArrowRight className="ml-1.5 inline h-3.5 w-3.5 align-[-0.1em]" aria-hidden="true" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

function IdentityStep({
  value,
  onChange,
  onContinue,
  onSkip,
}: {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const valid = EMAIL_RE.test(normalizeIdentity(value)) || LINKEDIN_RE.test(normalizeIdentity(value));
  return (
    <QuestionFrame
      question="Where should I start looking?"
      aside="A work email or your LinkedIn profile is enough. I will read what is already public about your company, check what changed recently, and show you everything I found before any of it follows you into CTRL."
    >
      <div className="mt-auto pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <input
          type="text"
          inputMode="url"
          autoComplete="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && valid) onContinue();
          }}
          placeholder="you@company.com or linkedin.com/in/you"
          aria-label="Work email or LinkedIn profile"
          className="w-full border-b border-[var(--onboarding-fg-25)] bg-transparent py-4 font-mymu-serif text-xl text-[var(--onboarding-fg)] outline-none placeholder:text-[var(--onboarding-fg-32)] focus:border-[var(--onboarding-fg-75)]"
        />
        <div className="mt-7 flex items-center justify-between">
          <button type="button" onClick={onSkip} className="min-h-11 rounded-lg pr-4 font-mymu-serif text-base text-[var(--onboarding-fg-48)] hover:text-[var(--onboarding-fg-80)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)]">Skip</button>
          <button type="button" onClick={onContinue} disabled={!valid} className="min-h-11 rounded-lg pl-4 font-mymu-serif text-lg text-[var(--onboarding-fg)] underline decoration-[var(--onboarding-accent-a)] underline-offset-8 transition-opacity disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)]">Next</button>
        </div>
      </div>
    </QuestionFrame>
  );
}

function SliderStep({
  question,
  value,
  label,
  touched,
  onChange,
  onContinue,
}: {
  question: string;
  value: number;
  label: string;
  touched: boolean;
  onChange: (value: number) => void;
  onContinue: () => void;
}) {
  return (
    <QuestionFrame question={question}>
      <div className="mt-auto pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <motion.p key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-7 font-mymu-serif text-lg italic ${touched ? 'text-[var(--onboarding-fg-85)]' : 'text-[var(--onboarding-fg-45)]'}`}>
          {label}
        </motion.p>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          onKeyDown={(event) => {
            const nextValue = sliderValueForKey(value, event.key);
            if (nextValue === null) return;
            event.preventDefault();
            onChange(nextValue);
          }}
          aria-label={question}
          aria-valuetext={label}
          className="mymu-range w-full"
        />
        <button type="button" onClick={onContinue} disabled={!touched} className="mt-10 ml-auto block min-h-11 rounded-lg pl-4 font-mymu-serif text-lg text-[var(--onboarding-fg)] underline decoration-[var(--onboarding-accent-a)] underline-offset-8 transition-opacity disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)]">Next</button>
      </div>
    </QuestionFrame>
  );
}

function ChoiceStep<T extends string>({
  question,
  options,
  value,
  onChoose,
}: {
  question: string;
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChoose: (value: T) => void;
}) {
  return (
    <QuestionFrame question={question} compact>
      <div className="mt-8 grid gap-3 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChoose(option.value)}
              className={`min-h-14 rounded-2xl border px-5 py-4 text-left font-mymu-serif text-[1.04rem] leading-[1.35] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)] motion-reduce:transition-none ${selected ? 'border-transparent bg-[var(--onboarding-action)] text-[var(--onboarding-action-ink)]' : value ? 'border-[var(--onboarding-fg-08)] text-[var(--onboarding-fg-35)]' : 'border-[var(--onboarding-fg-15)] text-[var(--onboarding-fg-88)] hover:border-[var(--onboarding-fg-35)] hover:bg-[var(--onboarding-fg-03)]'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </QuestionFrame>
  );
}

function DecisionStep({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <QuestionFrame question="What's the one decision you keep not making?" aside="Say it plainly. No one sees this but you.">
      <div className="mt-auto pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <textarea
          autoFocus
          rows={3}
          maxLength={180}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') onSubmit();
          }}
          placeholder={delayedDecisionExamples[0]}
          className="w-full resize-none border-b border-[var(--onboarding-fg-25)] bg-transparent py-3 font-mymu-serif text-xl leading-relaxed text-[var(--onboarding-fg)] outline-none placeholder:text-[var(--onboarding-fg-28)] focus:border-[var(--onboarding-fg-75)]"
        />
        <button type="button" onClick={onSubmit} disabled={value.trim().length < 4} className="mt-8 ml-auto block min-h-11 rounded-lg pl-4 font-mymu-serif text-lg text-[var(--onboarding-fg)] underline decoration-[var(--onboarding-accent-a)] underline-offset-8 transition-opacity disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)]">Show me what you see</button>
      </div>
    </QuestionFrame>
  );
}

function Thinking({ brandProgress, hasIdentity }: { brandProgress: number; hasIdentity: boolean }) {
  const reducedMotion = useReducedMotion();
  const milestones = hasIdentity
    ? ['Reading what you just told me', 'Resolving your company', 'Checking what changed recently', 'Keeping only what I can support']
    : ['Reading what you just told me', 'Finding the useful thread', 'Building your starting point'];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setActive((value) => Math.min(value + 1, milestones.length - 1)), 720);
    return () => window.clearInterval(timer);
  }, [milestones.length, reducedMotion]);

  return (
    <section className="flex flex-1 flex-col items-start justify-center px-6 py-16 sm:px-10" role="status" aria-live="polite">
      <div className="self-center rounded-[1.45rem] border border-[var(--onboarding-fg-08)] bg-[var(--onboarding-fg-03)] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.13)]">
        <OnboardingBrandMark progress={brandProgress} size={72} animated />
      </div>
      <div className="mt-12 w-full">
        <AnimatePresence mode="wait">
          <motion.p key={active} initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-mymu-serif text-[clamp(1.65rem,6vw,2.25rem)] leading-tight">
            {milestones[active]}<span aria-hidden="true">.</span>
          </motion.p>
        </AnimatePresence>
        <p className="mt-4 font-mymu-serif text-base italic text-[var(--onboarding-fg-52)]">This is private to you.</p>
        <div className="mt-9 flex gap-2" aria-hidden="true">
          {milestones.map((_, index) => (
            <motion.span key={index} className="h-1 flex-1 rounded-full bg-[var(--onboarding-fg-12)]" animate={{ backgroundColor: index <= active ? 'var(--onboarding-accent-a)' : 'var(--onboarding-fg-12)', scaleX: index === active && !reducedMotion ? [0.72, 1, 0.82] : 1 }} transition={{ duration: 0.62, ease: EASE }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultStep({
  brandProgress,
  result,
  email,
  sent,
  sending,
  sendError,
  continuing,
  correcting,
  onEmailChange,
  onSend,
  onContinue,
  onCorrectIdentity,
}: {
  brandProgress: number;
  result: OnboardingResult;
  email: string;
  sent: boolean;
  sending: boolean;
  sendError: string | null;
  continuing: boolean;
  correcting: boolean;
  onEmailChange: (value: string) => void;
  onSend: () => void;
  onContinue: () => void;
  onCorrectIdentity: (value: string) => Promise<boolean>;
}) {
  const canSend = EMAIL_RE.test(email.trim());
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState('');
  const dossier = result.dossier;
  const hasCompany = Boolean(dossier?.company.name || dossier?.company.domain);

  const applyCorrection = async () => {
    const corrected = await onCorrectIdentity(correction);
    if (corrected) {
      setShowCorrection(false);
      setCorrection('');
    }
  };

  return (
    <section className="flex flex-1 flex-col gap-8 px-6 pb-12 pt-[max(8vh,4.5rem)] sm:px-10">
      <div className="flex items-center gap-3"><OnboardingBrandMark progress={brandProgress} size={30} /><span className="font-mymu-mono text-[10px] uppercase tracking-[0.2em] text-[var(--onboarding-fg-45)]">Your CTRL starting point</span></div>

      {hasCompany && dossier ? (
        <CompanyRecognition dossier={dossier} />
      ) : (
        <div className="rounded-3xl border border-[var(--onboarding-fg-12)] bg-[var(--onboarding-fg-03)] p-6">
          <p className="font-mymu-mono text-[10px] uppercase tracking-[0.18em] text-[var(--onboarding-fg-42)]">Your world, not a persona</p>
          <p className="mt-3 max-w-[32ch] font-mymu-serif text-lg leading-relaxed text-[var(--onboarding-fg-72)]">I did not find enough company context to show you honestly. CTRL can start with what you told me and learn from there.</p>
        </div>
      )}

      <div>
        <h1 className="max-w-[19ch] bg-clip-text font-mymu-serif text-[clamp(2rem,7vw,3.2rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--onboarding-accent-a), var(--onboarding-accent-b))' }}>{result.archetypeTitle}</h1>
        <div className="mt-7 space-y-5 font-mymu-serif text-[1.06rem] leading-[1.58] text-[var(--onboarding-fg-78)]"><p>{result.twelveMonths}</p><p>{result.threeYears}</p></div>
      </div>

      <div className="rounded-3xl border border-[#22262e] bg-[#101319] p-6 text-[#e6eaf2] shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
        <p className="font-mymu-mono text-[10px] uppercase tracking-[0.18em] text-[#8b94a3]">What CTRL does next</p>
        <p className="mt-3 font-mymu-serif text-xl font-semibold leading-snug">It watches the AI world through the decisions and pressures you just named, then brings back only what changes something.</p>
        <ul className="mt-5 space-y-3 font-mymu-serif text-[0.98rem] text-[#aab1bd]">
          <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--onboarding-accent-a)]" />A short personal briefing you can hear or read</li>
          <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--onboarding-accent-a)]" />One decision at a time, checked against live evidence</li>
          <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--onboarding-accent-a)]" />Blind spots surfaced gently, when they matter</li>
        </ul>
      </div>

      <div className="mt-auto space-y-4 pb-[env(safe-area-inset-bottom)]">
        {hasCompany && !showCorrection && (
          <button type="button" onClick={() => setShowCorrection(true)} className="min-h-11 rounded-lg font-mymu-serif text-sm text-[var(--onboarding-fg-48)] underline-offset-4 hover:text-[var(--onboarding-fg)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)]">
            Not quite? Correct my starting point
          </button>
        )}
        {showCorrection && (
          <div className="rounded-2xl border border-[var(--onboarding-fg-15)] p-4">
            <label htmlFor="identity-correction" className="font-mymu-mono text-[10px] uppercase tracking-[0.16em] text-[var(--onboarding-fg-45)]">Work email or LinkedIn profile</label>
            <div className="mt-2 flex items-center gap-3 border-b border-[var(--onboarding-fg-20)]">
              <input id="identity-correction" value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder="linkedin.com/in/you" className="min-w-0 flex-1 bg-transparent py-3 font-mymu-serif text-base outline-none placeholder:text-[var(--onboarding-fg-32)]" />
              <button type="button" onClick={applyCorrection} disabled={correcting || (!EMAIL_RE.test(normalizeIdentity(correction)) && !LINKEDIN_RE.test(normalizeIdentity(correction)))} className="min-h-11 font-mymu-serif text-sm font-semibold disabled:opacity-35">
                {correcting ? 'Checking…' : 'Check again'}
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="Where should the morning brief go?" className="min-w-0 flex-1 border-b border-[var(--onboarding-fg-20)] bg-transparent py-3 font-mymu-serif text-lg text-[var(--onboarding-fg)] outline-none placeholder:text-[var(--onboarding-fg-38)] focus:border-[var(--onboarding-fg-55)]" />
          <button type="button" onClick={onSend} disabled={!canSend || sending || sent} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--onboarding-fg-15)] px-4 font-mymu-serif text-base font-semibold text-[var(--onboarding-fg)] disabled:opacity-40 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? <Check className="h-4 w-4" /> : null}
            {sent ? 'Briefing on' : 'Start morning brief'}
          </button>
        </div>
        {sendError ? (
          <p role="status" aria-live="polite" className="rounded-xl border border-[var(--onboarding-fg-15)] bg-[var(--onboarding-fg-03)] px-4 py-3 font-mymu-serif text-sm leading-relaxed text-[var(--onboarding-fg-72)]">{sendError}</p>
        ) : (
          <p className="font-mymu-serif text-sm leading-relaxed text-[var(--onboarding-fg-48)]">One email each morning, with audio. No login needed. One click to stop.</p>
        )}
        <button type="button" onClick={onContinue} disabled={continuing} className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-[var(--onboarding-action)] px-5 py-4 text-left font-mymu-serif text-lg font-semibold text-[var(--onboarding-action-ink)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--onboarding-accent-a)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--onboarding-bg)] motion-reduce:transform-none">
          {hasCompany ? 'Yes, this is my world' : 'Let CTRL start here'}
          {continuing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
        </button>
        <p className="font-mymu-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[var(--onboarding-fg-32)]">The useful shape of your answers comes with you. Your exact words do not.</p>
      </div>
    </section>
  );
}

function CompanyRecognition({ dossier }: { dossier: OnboardingDossier }) {
  const newest = dossier.strength.newestSignalAt
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(dossier.strength.newestSignalAt))
    : null;
  const providerLabel = `${dossier.strength.providerCount} ${dossier.strength.providerCount === 1 ? 'source' : 'sources'}`;
  const signalLabel = `${dossier.strength.signalCount} ${dossier.strength.signalCount === 1 ? 'signal' : 'signals'}`;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#253039] bg-[#0d1116] text-[#e9edf3] shadow-[0_24px_80px_rgba(0,0,0,0.28)]" aria-label="Company context found">
      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-4">
          {dossier.company.logoUrl ? (
            <img src={dossier.company.logoUrl} alt="" className="h-12 w-12 rounded-xl border border-white/10 bg-white object-contain p-1.5" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 font-mymu-serif text-lg font-semibold text-emerald-200">{(dossier.company.name ?? dossier.company.domain ?? 'C').slice(0, 1)}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-mymu-mono text-[10px] uppercase tracking-[0.19em] text-emerald-300">I found your world</p>
            <h2 className="mt-2 truncate font-mymu-serif text-2xl font-semibold tracking-[-0.02em]">{dossier.company.name ?? dossier.company.domain}</h2>
            {(dossier.person.role || dossier.person.name) && <p className="mt-1 font-mymu-serif text-sm text-[#9ca7b5]">{[dossier.person.name, dossier.person.role].filter(Boolean).join(' · ')}</p>}
          </div>
          <Check className="mt-1 h-5 w-5 shrink-0 text-emerald-300" aria-label="Company resolved" />
        </div>

        <div className="mt-5 flex flex-wrap gap-x-2 gap-y-1 font-mymu-mono text-[10px] uppercase tracking-[0.12em] text-[#7f8997]">
          <span>{signalLabel}</span><span aria-hidden="true">·</span><span>{providerLabel}</span>{newest && <><span aria-hidden="true">·</span><span>fresh to {newest}</span></>}
        </div>

        {/* Saying where this came from turns the strongest suspicion in the
            product ("how did you know all that about me?") into the proof
            point it should be. All of it is public, and none of it is kept
            unless the leader confirms it below. */}
        <p className="mt-3 font-mymu-serif text-[13px] leading-relaxed text-[#7f8997]">
          All of this is public information. Nothing is kept until you say it is right.
        </p>
      </div>

      {dossier.signals.length > 0 && (
        <div className="border-t border-white/8 px-6 py-5 sm:px-7">
          <p className="font-mymu-mono text-[10px] uppercase tracking-[0.18em] text-[#7f8997]">What changed around you</p>
          <div className="mt-3 divide-y divide-white/8">
            {dossier.signals.slice(0, 2).map((signal) => (
              <a key={signal.url} href={signal.url} target="_blank" rel="noreferrer" className="group flex min-h-14 items-start gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mymu-serif text-[0.98rem] font-semibold leading-snug text-[#dfe5ec] group-hover:text-white">{signal.title}</span>
                  <span className="mt-1 block font-mymu-mono text-[9px] uppercase tracking-[0.11em] text-[#788391]">{signal.source}{signal.verified ? ` · ${signal.sourceCount} reports` : ''}</span>
                </span>
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[#65707d]" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function QuestionFrame({ question, aside, compact = false, children }: { question: string; aside?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <section className={`flex flex-1 flex-col px-6 pb-10 pt-[max(13vh,6.5rem)] sm:px-10 ${compact ? '' : 'min-h-[100dvh]'}`}>
      <h1 className="max-w-[22ch] font-mymu-serif text-[clamp(1.7rem,6vw,2.55rem)] leading-[1.13] tracking-[-0.025em]">{question}</h1>
      {aside && <p className="mt-4 max-w-[34ch] font-mymu-serif text-base italic leading-relaxed text-[var(--onboarding-fg-52)]">{aside}</p>}
      {children}
    </section>
  );
}
