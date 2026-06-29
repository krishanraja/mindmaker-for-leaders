// InlineProfileSetup - the lightweight, cockpit-native onboarding that REPLACED
// the 40-minute voice OnboardingInterview (CTRL-SYSTEM-SPEC s3: cold-start is the
// cockpit, onboarding is inline + lightweight, never a gate-by-interview).
//
// It renders INSIDE the Home feed zone (in place of the headline deck) for a NEW
// leader, or as the server profile-gate's unlock path (data.needsProfile). One
// ask per screen: industry -> role -> a few interests -> done. Each pick is warm,
// tappable, and instant; the whole thing is ~20 seconds and writes the exact
// gate-critical facts the feed personalizes on (useInlineProfile + SeedBeatsPrompt).

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useInlineProfile } from '@/hooks/useInlineProfile';
import { SeedBeatsPrompt } from '@/components/briefing/SeedBeatsPrompt';

// Curated, plain-language starter sets. "Other" reveals a free-text input so we
// never box a leader out; the value saved is whatever they pick or type.
const INDUSTRIES = [
  'SaaS / Software',
  'Fintech',
  'E-commerce / Retail',
  'Healthcare',
  'Media / Marketing',
  'Professional services',
  'Manufacturing / Logistics',
  'Education',
];
const ROLES = [
  'Founder / CEO',
  'COO / Operations',
  'CTO / Engineering',
  'CFO / Finance',
  'CMO / Marketing',
  'Product',
  'Sales / Revenue',
];

type Step = 'industry' | 'role' | 'interests';

export interface InlineProfileSetupProps {
  variant: 'mobile' | 'desktop';
  /** True when the server gate forces this (no skip). False = an invitation. */
  gated: boolean;
  /** What the gate still needs ('vertical'|'role'|'interests'). When provided,
      the flow starts at the first missing step so known facts aren't re-asked. */
  missing?: string[];
  /** Saved + interests handled - re-pull the cockpit so the feed unlocks. */
  onComplete: () => void;
  /** Browse first (only offered when not a hard gate). */
  onSkip?: () => void;
}

// First step to show given what the gate still needs. Default: the full flow.
function initialStep(missing?: string[]): Step {
  if (!missing || missing.length === 0) return 'industry';
  if (missing.includes('vertical')) return 'industry';
  if (missing.includes('role')) return 'role';
  return 'interests';
}

export function InlineProfileSetup({ variant, gated, missing, onComplete, onSkip }: InlineProfileSetupProps) {
  const { saveFacts, saving } = useInlineProfile();
  const [step, setStep] = useState<Step>(() => initialStep(missing));
  const [industry, setIndustry] = useState('');
  const [role, setRole] = useState('');
  const [customOpen, setCustomOpen] = useState<null | 'industry' | 'role'>(null);
  const [custom, setCustom] = useState('');

  const desktop = variant === 'desktop';

  const pick = (which: 'industry' | 'role', value: string) => {
    haptics.light();
    if (which === 'industry') {
      setIndustry(value);
      setStep('role');
    } else {
      setRole(value);
      // Persist both facts now; the interests step rides on top.
      void saveFacts({ industry, role: value }).then((ok) => {
        if (ok) setStep('interests');
      });
    }
    setCustomOpen(null);
    setCustom('');
  };

  const submitCustom = () => {
    const v = custom.trim();
    if (!v || !customOpen) return;
    pick(customOpen, v);
  };

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'w-full rounded-2xl border border-accent/25 bg-[linear-gradient(180deg,#101620,#0a0e12)] p-6',
          desktop && 'max-w-md',
        )}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/12 text-accent">
          <Sparkles className="h-5 w-5" />
        </span>

        {step === 'interests' ? (
          <>
            <h2 className="mt-3 text-[18px] font-extrabold tracking-tight text-foreground">
              One more - what should I watch for you?
            </h2>
            <p className="mt-2 max-w-[44ch] text-pretty text-[13px] leading-relaxed text-muted-foreground">
              Tap any that fit. I will pull the AI-native news that matters to your work; you can change these anytime.
            </p>
            <div className="mt-4">
              <SeedBeatsPrompt onAnyAdded={() => haptics.light()} onDismiss={onComplete} />
            </div>
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onComplete();
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-bold text-accent-foreground transition hover:brightness-110"
            >
              <Check className="h-4 w-4" /> All set - show my feed
            </button>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-[18px] font-extrabold tracking-tight text-foreground">
              {step === 'industry' ? 'Let me get to know you' : "Nice - and what's your role?"}
            </h2>
            <p className="mt-2 max-w-[44ch] text-pretty text-[13px] leading-relaxed text-muted-foreground">
              {step === 'industry'
                ? 'Two quick taps and I will curate the AI-native news that actually matters to your business.'
                : 'So I can order the feed for the calls your job actually owns.'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(step === 'industry' ? INDUSTRIES : ROLES).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={saving}
                  onClick={() => pick(step, opt)}
                  className="rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground transition hover:border-accent/40 hover:text-accent disabled:opacity-60"
                >
                  {opt}
                </button>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() => setCustomOpen(step)}
                className="rounded-full border border-dashed border-border px-3.5 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition hover:border-accent/40 hover:text-accent disabled:opacity-60"
              >
                Something else
              </button>
            </div>

            {customOpen === step && (
              <div className="mt-3 flex gap-2">
                <input
                  autoFocus
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitCustom(); }}
                  placeholder={step === 'industry' ? 'Your industry' : 'Your role'}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-accent/50"
                />
                <button
                  type="button"
                  onClick={submitCustom}
                  disabled={saving || !custom.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-accent px-3 text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                  aria-label="Continue"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            )}

            {/* progress + skip */}
            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-1.5" aria-hidden="true">
                {(['industry', 'role', 'interests'] as Step[]).map((s) => (
                  <span
                    key={s}
                    className={cn('h-1.5 w-1.5 rounded-full', s === step ? 'bg-accent' : 'bg-muted')}
                  />
                ))}
              </div>
              {!gated && onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Browse first
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
