/**
 * VoiceDemo - Unauthenticated landing demo (FF.landingVoiceDemo).
 *
 * Purely client-side. No network calls, no AI, no cost.
 * Shows a text input, derives 3-5 "fact node" chips via regex heuristics,
 * animates them as a mini node cluster, then shows a CTA to /auth.
 *
 * Gated: render nothing when FF.landingVoiceDemo() is false.
 * No em dashes anywhere in this file.
 */

import { useState, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FF } from '@/lib/flags';

/* ------------------------------------------------------------------ */
/*  Fact extraction - fully client-side, zero network                  */
/* ------------------------------------------------------------------ */

type FactCategory = 'role' | 'org' | 'goal' | 'challenge' | 'topic';

interface FactNode {
  id: string;
  label: string;
  category: FactCategory;
}

const ROLE_WORDS = [
  'cto', 'ceo', 'cpo', 'coo', 'vp', 'head of', 'director', 'manager',
  'founder', 'co-founder', 'engineer', 'designer', 'pm', 'product manager',
  'lead', 'principal', 'staff', 'senior', 'architect', 'analyst', 'consultant',
  'marketing', 'sales', 'ops', 'operations', 'devops', 'infra', 'data scientist',
];

const ORG_SIGNALS = [
  'startup', 'series a', 'series b', 'series c', 'seed', 'pre-seed',
  'enterprise', 'scale-up', 'agency', 'team of', 'company', 'org', 'division',
  'department', 'squad', 'tribe', 'studio', 'lab', 'corp', 'llc', 'ltd',
  'remote', 'distributed', 'global',
];

const GOAL_WORDS = [
  'ship', 'launch', 'build', 'grow', 'scale', 'hire', 'recruit', 'expand',
  'deliver', 'improve', 'increase', 'drive', 'achieve', 'complete', 'finish',
  'reach', 'hit', 'close', 'deploy', 'release', 'migrate', 'integrate',
  'automate', 'optimize', 'optimise', 'streamline', 'accelerate', 'raise',
];

const CHALLENGE_WORDS = [
  'blocked', 'stuck', 'struggling', 'challenge', 'problem', 'issue', 'difficult',
  'hard', 'failing', 'slow', 'behind', 'missed', 'debt', 'unclear', 'confused',
  'overloaded', 'overwhelmed', 'too much', 'not enough', 'broken', 'buggy',
  'conflict', 'misaligned', 'churn', 'burn rate', 'runway',
];

function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ');
}

function truncate(phrase: string, max = 18): string {
  const trimmed = phrase.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + '…';
}

function toTitleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractFacts(raw: string): FactNode[] {
  const norm = normalise(raw);
  const words = norm.split(/\s+/);
  const facts: FactNode[] = [];
  const seen = new Set<string>();

  function addFact(label: string, cat: FactCategory) {
    const key = label.toLowerCase();
    if (seen.has(key) || label.length < 2) return;
    seen.add(key);
    facts.push({ id: `${cat}-${key}`, label: toTitleCase(label), category: cat });
  }

  // --- Role detection (bigrams + single tokens) ---
  for (const phrase of ['head of', 'co-founder', 'product manager', 'data scientist']) {
    if (norm.includes(phrase)) addFact(phrase, 'role');
  }
  for (const w of words) {
    if (ROLE_WORDS.includes(w)) addFact(w, 'role');
  }

  // --- Org / size hints ---
  for (const signal of ORG_SIGNALS) {
    if (norm.includes(signal)) {
      addFact(signal, 'org');
      break; // one org chip max
    }
  }

  // --- Goal verbs: grab verb + next noun-ish word if present ---
  for (let i = 0; i < words.length; i++) {
    if (GOAL_WORDS.includes(words[i])) {
      const next = words[i + 1];
      const label = next && next.length > 2 ? `${words[i]} ${next}` : words[i];
      addFact(label, 'goal');
      break; // one goal chip max
    }
  }

  // --- Challenge keywords ---
  for (const w of words) {
    if (CHALLENGE_WORDS.includes(w)) {
      addFact(w, 'challenge');
      break; // one challenge chip max
    }
  }

  // --- Fallback: split into noun-ish phrases (3-8 chars) if we have < 3 ---
  if (facts.length < 3) {
    const candidates = raw
      .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && t.length <= 14 && !/^(i|a|an|the|and|or|but|my|me|we|our|this|that|is|are|was|were|have|has|do|does|for|to|of|in|on|at|by|with|from|about|it|its|not|no|so|then|when|who|what|how|why|where|be|been|will|can|could|would|should|may|might|am|you|your|their|they|them|its|was)$/i.test(t));
    for (const c of candidates) {
      if (facts.length >= 5) break;
      addFact(c, 'topic');
    }
  }

  return facts.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/*  Category visual config                                             */
/* ------------------------------------------------------------------ */

const CAT_STYLE: Record<FactCategory, { bg: string; border: string; text: string; dot: string }> = {
  role:      { bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  text: 'text-violet-300',  dot: 'bg-violet-400' },
  org:       { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  goal:      { bg: 'bg-accent/10',      border: 'border-accent/30',      text: 'text-accent',      dot: 'bg-accent' },
  challenge: { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-300',     dot: 'bg-red-400' },
  topic:     { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-300',   dot: 'bg-amber-400' },
};

/* ------------------------------------------------------------------ */
/*  Node cluster - animated chips arranged in a soft arc              */
/* ------------------------------------------------------------------ */

function NodeCluster({ facts }: { facts: FactNode[] }) {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      role="list"
      aria-label="Extracted fact nodes"
      className="flex flex-wrap gap-2 justify-center"
    >
      {facts.map((fact, i) => {
        const style = CAT_STYLE[fact.category];
        return (
          <motion.div
            key={fact.id}
            role="listitem"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 12 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            transition={
              reducedMotion
                ? { duration: 0.15, delay: i * 0.04 }
                : { type: 'spring', stiffness: 320, damping: 22, delay: i * 0.07 }
            }
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium',
              'select-none',
              style.bg,
              style.border,
              style.text,
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
            {truncate(fact.label)}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Connecting lines SVG decoration                                    */
/* ------------------------------------------------------------------ */

function ChipConnector() {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="relative h-6 flex items-center justify-center pointer-events-none" aria-hidden="true">
      <svg className="w-24 h-6 opacity-30" viewBox="0 0 96 24">
        <motion.path
          d="M 48 0 Q 20 12 0 24"
          stroke="hsl(var(--accent))"
          strokeWidth="0.8"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.2 }}
        />
        <motion.path
          d="M 48 0 L 48 24"
          stroke="hsl(var(--accent))"
          strokeWidth="0.8"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.3 }}
        />
        <motion.path
          d="M 48 0 Q 76 12 96 24"
          stroke="hsl(var(--accent))"
          strokeWidth="0.8"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.4 }}
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main VoiceDemo component                                           */
/* ------------------------------------------------------------------ */

type Phase = 'idle' | 'result';

export function VoiceDemo() {
  // Guard: render nothing when flag is off (byte-for-byte unchanged hero).
  if (!FF.landingVoiceDemo()) return null;

  return <VoiceDemoInner />;
}

function VoiceDemoInner() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [input, setInput] = useState('');
  const [facts, setFacts] = useState<FactNode[]>([]);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const extracted = extractFacts(trimmed);
    setFacts(extracted.length > 0 ? extracted : [{ id: 'fallback', label: 'Your context', category: 'topic' }]);
    setPhase('result');
  }

  function handleReset() {
    setPhase('idle');
    setInput('');
    setFacts([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <section
      aria-label="Try a preview of your AI double"
      className={cn(
        'w-full rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-6',
        'shadow-[0_0_40px_-8px] shadow-accent/10',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Star className="h-3.5 w-3.5 text-accent flex-shrink-0" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-[0.15em] text-accent font-medium">
          Preview - no account needed
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        See how CTRL reads your work context in seconds. This is a local illustration only - no data leaves your browser.
      </p>

      <AnimatePresence mode="wait">
        {phase === 'idle' ? (
          <motion.div
            key="idle"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor={inputId} className="sr-only">
                  Say one thing about your work
                </label>
                <input
                  id={inputId}
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Say one thing about your work..."
                  maxLength={280}
                  autoComplete="off"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl text-sm',
                    'bg-background/60 border border-border/70',
                    'text-foreground placeholder:text-muted-foreground/50',
                    'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40',
                    'transition-colors',
                  )}
                />
              </div>
              <Button
                type="submit"
                disabled={!input.trim()}
                size="sm"
                className="w-full h-9 text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
              >
                See your AI double
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Centre node */}
            <div className="flex justify-center">
              <motion.div
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 20 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <span className="text-xs font-semibold text-accent">You</span>
              </motion.div>
            </div>

            <ChipConnector />

            <NodeCluster facts={facts} />

            {/* Preview label */}
            <p className="text-center text-[10px] text-muted-foreground/60 pt-1">
              Preview only - facts detected from your input. Full version learns over time.
            </p>

            {/* CTA */}
            <div className="flex flex-col items-center gap-2 pt-1">
              <a
                href="/auth"
                className={cn(
                  'inline-flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-semibold',
                  'bg-accent text-accent-foreground hover:bg-accent/90',
                  'shadow-lg shadow-accent/20 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                )}
              >
                Save your AI double
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
              >
                Try a different input
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
