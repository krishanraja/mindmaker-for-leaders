import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Radio, ArrowUpRight, X, ArrowRight, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useOnceFlag } from '@/hooks/useOnceFlag';
import { cn } from '@/lib/utils';

interface TourStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * The loop, in four beats. Plain language, benefit-first - readable by a
 * non-technical leader with no prior context. This is the spine of the
 * product: capture -> profile -> briefing -> export.
 */
const STEPS: TourStep[] = [
  {
    icon: Brain,
    title: 'Build your Memory Web',
    body: 'Voice or type your thoughts. CTRL turns them into a private map of who you are, what you are working on, and how you think.',
  },
  {
    icon: Zap,
    title: 'Sharpen your Edge',
    body: 'Your leadership profile, built from your Memory Web. Generate board memos, strategy docs, and emails that sound like you.',
  },
  {
    icon: Radio,
    title: 'Hear your morning Briefing',
    body: 'A short audio briefing every morning, tuned to your real priorities - not the same generic news everyone else gets.',
  },
  {
    icon: ArrowUpRight,
    title: 'Take your context anywhere',
    body: 'One click loads everything into ChatGPT, Claude, Cursor, or any AI tool. No more re-explaining yourself every time.',
  },
];

export function WelcomeTour() {
  const { isAuthenticated } = useAuth();
  const [seen, markSeen] = useOnceFlag('welcome_tour_v1');
  const [index, setIndex] = useState(0);

  const open = isAuthenticated && !seen;
  const isLast = index === STEPS.length - 1;

  const close = useCallback(() => {
    markSeen();
    setIndex(0);
  }, [markSeen]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= STEPS.length - 1) {
        markSeen();
        return 0;
      }
      return i + 1;
    });
  }, [markSeen]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Keyboard: Esc skips, arrows navigate.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, next, back]);

  if (!open) return null;

  const step = STEPS[index];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="welcome-tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to CTRL"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl"
        >
          {/* Skip */}
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip tour"
          >
            Skip <X className="h-3.5 w-3.5" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                <Icon className="h-7 w-7 text-accent" />
              </div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                Step {index + 1} of {STEPS.length}
              </p>
              <h2 className="mb-3 text-2xl font-bold text-foreground">{step.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="mt-7 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to step ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-6 bg-accent' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {index > 0 ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 transition-colors"
            >
              {isLast ? 'Start with your first thought' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
