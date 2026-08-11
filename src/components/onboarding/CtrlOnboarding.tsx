import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { CtrlMonogram } from '@/components/brand/CtrlMonogram';
import { supabase } from '@/integrations/supabase/client';
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

const db = supabase as unknown as SupabaseClient;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EASE = [0.22, 1, 0.36, 1] as const;

type Step = 'intro' | 'identity' | 'week' | 'extra' | 'ai' | 'future' | 'decision' | 'thinking' | 'result';

interface GeneratedResult {
  twelve_months?: string;
  three_years?: string;
  archetype_title?: string;
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
  const [step, setStep] = useState<Step>('intro');
  const [responseId] = useState(() => crypto.randomUUID());
  const [email, setEmail] = useState('');
  const [weekNeedsMe, setWeekNeedsMe] = useState(50);
  const [companyAi, setCompanyAi] = useState(50);
  const [extraSelf, setExtraSelf] = useState<ExtraSelf | null>(null);
  const [companyFuture, setCompanyFuture] = useState<CompanyFuture | null>(null);
  const [delayedDecision, setDelayedDecision] = useState('');
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [weekTouched, setWeekTouched] = useState(false);
  const [aiTouched, setAiTouched] = useState(false);
  const rowCreated = useRef(false);

  const currentIndex = ['identity', 'week', 'extra', 'ai', 'future', 'decision'].indexOf(step);

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
    const trimmed = email.trim();
    setStep('week');
    if (!EMAIL_RE.test(trimmed)) return;
    await ensureResponse();
    void supabase.functions.invoke('enrich-profile', {
      body: { id: responseId, kind: 'email', email: trimmed },
    });
  }, [email, ensureResponse, responseId]);

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
      });
    } catch {
      setResult(local);
    }

    window.setTimeout(() => setStep('result'), reducedMotion ? 0 : 900);
  }, [companyAi, companyFuture, delayedDecision, ensureResponse, extraSelf, reducedMotion, responseId, weekNeedsMe]);

  const sendResult = useCallback(async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed) || sending || sent) return;
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
    } finally {
      setSending(false);
    }
  }, [email, responseId, sending, sent]);

  const continueIntoCtrl = useCallback(async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      const { data } = await supabase.functions.invoke<{ handoff?: string }>('track-fork', {
        body: { id: responseId, destination: 'ctrl', variant: 'decide', consent: true },
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
  }, [continuing, navigate, responseId]);

  const screen = useMemo(() => {
    switch (step) {
      case 'intro':
        return <Intro onBegin={begin} onSignIn={() => navigate('/auth')} />;
      case 'identity':
        return (
          <IdentityStep
            email={email}
            onEmailChange={setEmail}
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
        return <Thinking />;
      case 'result':
        return result ? (
          <ResultStep
            result={result}
            email={email}
            sent={sent}
            sending={sending}
            continuing={continuing}
            onEmailChange={setEmail}
            onSend={sendResult}
            onContinue={continueIntoCtrl}
          />
        ) : null;
      default:
        return null;
    }
  }, [aiTouched, begin, companyAi, companyFuture, continueIntoCtrl, continuing, delayedDecision, email, extraSelf, finish, navigate, reducedMotion, result, sendResult, sending, sent, step, submitIdentity, weekNeedsMe, weekTouched]);

  return (
    <main className="mymu-surface min-h-[100dvh] bg-[#0a0908] text-[#f5f1ea]">
      {currentIndex >= 0 && (
        <div className="fixed inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[640px] items-center gap-2 px-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <CtrlMonogram size={24} className="opacity-80" />
          <div className="ml-auto flex items-center gap-1.5" aria-label={`Step ${currentIndex + 1} of 6`}>
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className={`h-1 rounded-full transition-all ${index <= currentIndex ? 'w-5 bg-[#f5f1ea]/70' : 'w-2 bg-[#f5f1ea]/15'}`}
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

function Intro({ onBegin, onSignIn }: { onBegin: () => void; onSignIn: () => void }) {
  return (
    <section className="flex flex-1 flex-col px-6 pb-10 pt-[max(8vh,4.5rem)] sm:px-10">
      <div className="flex items-center gap-3">
        <CtrlMonogram size={34} animated />
        <span className="font-mymu-mono text-[11px] uppercase tracking-[0.24em] text-[#f5f1ea]/55">CTRL</span>
      </div>

      <div className="my-auto py-12">
        <p className="font-mymu-mono text-[11px] uppercase tracking-[0.22em] text-[#f5f1ea]/45">A quieter way through AI</p>
        <h1 className="mt-6 max-w-[18ch] font-mymu-serif text-[clamp(2.35rem,9vw,4.35rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
          What if you did not need to hold all of this in your head?
        </h1>
        <p className="mt-7 max-w-[30ch] font-mymu-serif text-[1.12rem] leading-[1.5] text-[#f5f1ea]/68">
          Tell CTRL what is pulling at you. It will turn that into a useful daily briefing, a sharper decision, and a better sense of what deserves you.
        </p>
      </div>

      <div className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
        <button type="button" onClick={onBegin} className="group flex items-center justify-between rounded-2xl bg-[#f5f1ea] px-5 py-4 text-left font-mymu-serif text-lg font-semibold text-[#0a0908] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]">
          Start with what is on my mind
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
        <button type="button" onClick={onSignIn} className="-my-2 min-h-11 self-start rounded-lg pr-3 font-mymu-serif text-base text-[#f5f1ea]/55 underline-offset-4 transition-colors hover:text-[#f5f1ea] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]">
          I already use CTRL
        </button>
        <p className="font-mymu-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f1ea]/32">About three minutes. No account needed.</p>
      </div>
    </section>
  );
}

function IdentityStep({
  email,
  onEmailChange,
  onContinue,
  onSkip,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const valid = EMAIL_RE.test(email.trim());
  return (
    <QuestionFrame
      question="Your email. We'll do the homework."
      aside="We use it to understand your role and company so the next three minutes are about your world. You can skip this."
    >
      <div className="mt-auto pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && valid) onContinue();
          }}
          placeholder="you@company.com"
          aria-label="Email address"
          className="w-full border-b border-[#f5f1ea]/25 bg-transparent py-4 font-mymu-serif text-xl text-[#f5f1ea] outline-none placeholder:text-[#f5f1ea]/32 focus:border-[#f5f1ea]/75"
        />
        <div className="mt-7 flex items-center justify-between">
          <button type="button" onClick={onSkip} className="min-h-11 rounded-lg pr-4 font-mymu-serif text-base text-[#f5f1ea]/48 hover:text-[#f5f1ea]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]">Skip</button>
          <button type="button" onClick={onContinue} disabled={!valid} className="min-h-11 rounded-lg pl-4 font-mymu-serif text-lg text-[#f5f1ea] underline underline-offset-8 transition-opacity disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]">Next</button>
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
        <motion.p key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-7 font-mymu-serif text-lg italic ${touched ? 'text-[#f5f1ea]/85' : 'text-[#f5f1ea]/45'}`}>
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
        <button type="button" onClick={onContinue} disabled={!touched} className="mt-10 ml-auto block min-h-11 rounded-lg pl-4 font-mymu-serif text-lg text-[#f5f1ea] underline underline-offset-8 transition-opacity disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]">Next</button>
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
              className={`rounded-2xl border px-5 py-4 text-left font-mymu-serif text-[1.04rem] leading-[1.35] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899] ${selected ? 'border-transparent bg-[#f5f1ea] text-[#0a0908]' : value ? 'border-[#f5f1ea]/8 text-[#f5f1ea]/35' : 'border-[#f5f1ea]/15 text-[#f5f1ea]/88 hover:border-[#f5f1ea]/35 hover:bg-[#f5f1ea]/[0.03]'}`}
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
          className="w-full resize-none border-b border-[#f5f1ea]/25 bg-transparent py-3 font-mymu-serif text-xl leading-relaxed text-[#f5f1ea] outline-none placeholder:text-[#f5f1ea]/28 focus:border-[#f5f1ea]/75"
        />
        <button type="button" onClick={onSubmit} disabled={value.trim().length < 4} className="mt-8 ml-auto block min-h-11 rounded-lg pl-4 font-mymu-serif text-lg text-[#f5f1ea] underline underline-offset-8 transition-opacity disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]">Show me what you see</button>
      </div>
    </QuestionFrame>
  );
}

function Thinking() {
  return (
    <section className="flex flex-1 flex-col items-start justify-center px-6 py-16 sm:px-10" role="status" aria-live="polite">
      <div className="self-center"><CtrlMonogram size={150} animated /></div>
      <div className="mt-14 space-y-4">
        <p className="font-mymu-serif text-[clamp(1.75rem,6vw,2.4rem)] leading-tight">Reading what you just told me.</p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="font-mymu-serif text-lg italic text-[#f5f1ea]/55">Finding the useful thread.</motion.p>
      </div>
      <motion.div className="mt-10 h-px bg-gradient-to-r from-[#ec4899] to-[#f97316]" initial={{ width: 0 }} animate={{ width: 76 }} transition={{ duration: 1.6, ease: EASE }} />
    </section>
  );
}

function ResultStep({
  result,
  email,
  sent,
  sending,
  continuing,
  onEmailChange,
  onSend,
  onContinue,
}: {
  result: OnboardingResult;
  email: string;
  sent: boolean;
  sending: boolean;
  continuing: boolean;
  onEmailChange: (value: string) => void;
  onSend: () => void;
  onContinue: () => void;
}) {
  const canSend = EMAIL_RE.test(email.trim());
  return (
    <section className="flex flex-1 flex-col gap-8 px-6 pb-12 pt-[max(8vh,4.5rem)] sm:px-10">
      <div className="flex items-center gap-3"><CtrlMonogram size={30} /><span className="font-mymu-mono text-[10px] uppercase tracking-[0.2em] text-[#f5f1ea]/45">Your CTRL starting point</span></div>
      <div>
        <h1 className="max-w-[19ch] bg-gradient-to-br from-[#ec4899] to-[#f97316] bg-clip-text font-mymu-serif text-[clamp(2rem,7vw,3.2rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-transparent">{result.archetypeTitle}</h1>
        <div className="mt-7 space-y-5 font-mymu-serif text-[1.06rem] leading-[1.58] text-[#f5f1ea]/78"><p>{result.twelveMonths}</p><p>{result.threeYears}</p></div>
      </div>

      <div className="rounded-3xl bg-[#f5f1ea] p-6 text-[#0a0908]">
        <p className="font-mymu-mono text-[10px] uppercase tracking-[0.18em] text-[#0a0908]/45">What CTRL does next</p>
        <p className="mt-3 font-mymu-serif text-xl font-semibold leading-snug">It watches the AI world through the decisions and pressures you just named, then brings back only what changes something.</p>
        <ul className="mt-5 space-y-3 font-mymu-serif text-[0.98rem] text-[#0a0908]/72">
          <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0" />A short personal briefing you can hear or read</li>
          <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0" />One decision at a time, checked against live evidence</li>
          <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0" />Blind spots surfaced gently, when they matter</li>
        </ul>
      </div>

      <div className="mt-auto space-y-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-3 border-b border-[#f5f1ea]/20">
          <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="Where should the morning brief go?" className="min-w-0 flex-1 bg-transparent py-3 font-mymu-serif text-lg text-[#f5f1ea] outline-none placeholder:text-[#f5f1ea]/38" />
          <button type="button" onClick={onSend} disabled={!canSend || sending || sent} className="flex min-h-11 items-center gap-2 rounded-lg pr-3 font-mymu-serif text-base text-[#f5f1ea] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? <Check className="h-4 w-4" /> : null}
            {sent ? 'Briefing on' : 'Start it'}
          </button>
        </div>
        <p className="font-mymu-serif text-sm leading-relaxed text-[#f5f1ea]/48">One email each morning, with audio. No login needed. One click to stop.</p>
        <button type="button" onClick={onContinue} disabled={continuing} className="flex w-full items-center justify-between rounded-2xl bg-[#f5f1ea] px-5 py-4 text-left font-mymu-serif text-lg font-semibold text-[#0a0908] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
          Let CTRL start here
          {continuing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
        </button>
        <p className="font-mymu-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[#f5f1ea]/32">The useful shape of your answers comes with you. Your exact words do not.</p>
      </div>
    </section>
  );
}

function QuestionFrame({ question, aside, compact = false, children }: { question: string; aside?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <section className={`flex flex-1 flex-col px-6 pb-10 pt-[max(13vh,6.5rem)] sm:px-10 ${compact ? '' : 'min-h-[100dvh]'}`}>
      <h1 className="max-w-[22ch] font-mymu-serif text-[clamp(1.7rem,6vw,2.55rem)] leading-[1.13] tracking-[-0.025em]">{question}</h1>
      {aside && <p className="mt-4 max-w-[34ch] font-mymu-serif text-base italic leading-relaxed text-[#f5f1ea]/52">{aside}</p>}
      {children}
    </section>
  );
}
