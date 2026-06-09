import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Zap,
  MessageSquare,
  Check,
  Mic,
  Radio,
  Download,
  Lightbulb,
  Shield,
  Command,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CtrlLogo } from './CtrlLogo';
import { cn } from '@/lib/utils';
import { VoiceDemo } from './VoiceDemo';
import { FF } from '@/lib/flags';

const PILLARS = [
  {
    icon: Brain,
    title: 'Memory Web',
    description: 'A living map of what you know, what you want, and how you think. Voice in. AI reads it out.',
    accent: 'from-violet-500/30 to-purple-600/10',
    glow: 'group-hover:shadow-violet-500/20',
  },
  {
    icon: Zap,
    title: 'Team Instructions',
    description: 'Turn your thinking into clear instructions for anyone on your team - or any AI.',
    accent: 'from-amber-500/30 to-orange-600/10',
    glow: 'group-hover:shadow-amber-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Context Export',
    description: 'One click to ChatGPT, Claude, Cursor, or any AI. No plugins, no permissions.',
    accent: 'from-emerald-500/30 to-teal-600/10',
    glow: 'group-hover:shadow-emerald-500/20',
  },
];

const FLOW_STEPS = [
  {
    icon: Mic,
    label: 'Voice a thought',
    detail: 'Hold to record. We transcribe and structure it.',
  },
  {
    icon: Brain,
    label: 'It organises itself',
    detail: 'Facts, patterns, and decisions cluster in your Memory Web.',
  },
  {
    icon: Download,
    label: 'Export anywhere',
    detail: 'ChatGPT, Claude, Cursor, Gemini, or raw Markdown.',
  },
  {
    icon: Lightbulb,
    label: 'Every decision gets clearer',
    detail: 'Daily briefings cite the parts of you that matter most today.',
  },
];

const TRUST = [
  'No integrations needed',
  'Encrypted at rest',
  'Export to any AI',
  'Delete anytime',
];

const TARGETS = ['ChatGPT', 'Claude', 'Gemini', 'Cursor', 'Claude Code', 'Any LLM'];

/* ------------------------------------------------------------------ */
/*  Live memory web preview - decorative network                       */
/* ------------------------------------------------------------------ */
function MemoryWebPreview() {
  const nodes = [
    { x: 50, y: 50, r: 22, label: 'You', primary: true },
    { x: 18, y: 22, r: 12, label: 'VP Eng', cat: 'identity' },
    { x: 82, y: 28, r: 11, label: 'Series B', cat: 'business' },
    { x: 14, y: 70, r: 10, label: 'Ship Q4', cat: 'objective' },
    { x: 86, y: 76, r: 11, label: 'Hiring', cat: 'blocker' },
    { x: 50, y: 92, r: 9, label: 'Async first', cat: 'preference' },
    { x: 50, y: 12, r: 9, label: 'Strategic', cat: 'pattern' },
  ];

  const catColor: Record<string, string> = {
    identity: '#a78bfa',
    business: '#60a5fa',
    objective: '#34d399',
    blocker: '#f87171',
    preference: '#fbbf24',
    pattern: '#f472b6',
  };

  return (
    <div className="relative aspect-square w-full max-w-[520px]">
      {/* Glow halo */}
      <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl" />

      <svg
        viewBox="0 0 100 100"
        className="relative w-full h-full"
        aria-hidden="true"
      >
        {/* Connecting lines */}
        {nodes.slice(1).map((n, i) => (
          <motion.line
            key={`line-${i}`}
            x1={50}
            y1={50}
            x2={n.x}
            y2={n.y}
            stroke="hsl(var(--accent))"
            strokeWidth="0.2"
            strokeOpacity="0.3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.3 + i * 0.08 }}
          />
        ))}

        {/* Pulse ring on primary */}
        <motion.circle
          cx={50}
          cy={50}
          r={26}
          stroke="hsl(var(--accent))"
          strokeWidth="0.3"
          fill="none"
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
        />

        {/* Nodes */}
        {nodes.map((n, i) => (
          <motion.g
            key={n.label}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: i * 0.08, type: 'spring' }}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r / 6}
              fill={n.primary ? 'hsl(var(--accent))' : catColor[n.cat || ''] || '#fff'}
              fillOpacity={n.primary ? 0.9 : 0.18}
              stroke={n.primary ? 'hsl(var(--accent))' : catColor[n.cat || ''] || '#fff'}
              strokeWidth="0.3"
            />
            <text
              x={n.x}
              y={n.y + n.r / 4 + 3}
              textAnchor="middle"
              fontSize="2.4"
              fill="hsl(var(--foreground))"
              fillOpacity={n.primary ? 1 : 0.7}
              fontWeight={n.primary ? 600 : 400}
            >
              {n.label}
            </text>
          </motion.g>
        ))}
      </svg>

      {/* Floating labels around the web */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="absolute -left-2 top-4 rounded-full bg-card/80 backdrop-blur border border-border/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-lg"
      >
        45 memories
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="absolute -right-2 top-1/3 rounded-full bg-card/80 backdrop-blur border border-border/60 px-2.5 py-1 text-[10px] font-medium text-emerald-400 shadow-lg"
      >
        Health 87%
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="absolute -left-4 bottom-8 rounded-full bg-card/80 backdrop-blur border border-border/60 px-2.5 py-1 text-[10px] font-medium text-accent shadow-lg"
      >
        +3 today
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Flow                                                      */
/* ------------------------------------------------------------------ */
function FlowSection() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((v) => (v + 1) % FLOW_STEPS.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="border-t border-border/40 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-12 gap-12 items-start">
          <div className="col-span-4 sticky top-24">
            <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium mb-3">
              How it works
            </p>
            <h2 className="text-3xl font-bold text-foreground leading-tight">
              From a voiced thought to a clearer decision.
            </h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              No integrations to install. No permissions to grant. Speak. We
              organise. You export.
            </p>
          </div>

          <div className="col-span-8 space-y-3">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === active;
              return (
                <motion.div
                  key={step.label}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'relative rounded-2xl border p-6 transition-all duration-300 cursor-default',
                    isActive
                      ? 'border-accent/30 bg-accent/[0.04] shadow-[0_0_0_1px] shadow-accent/10'
                      : 'border-border/50 bg-card/30',
                  )}
                >
                  <div className="flex items-start gap-5">
                    <div
                      className={cn(
                        'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-mono">
                          0{i + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-foreground">
                          {step.label}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Pillars                                                   */
/* ------------------------------------------------------------------ */
function PillarsSection() {
  return (
    <section className="border-t border-border/40 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium mb-3">
            What you get
          </p>
          <h2 className="text-3xl font-bold text-foreground leading-tight">
            Three surfaces. One portable mind.
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
                className={cn(
                  'group relative rounded-2xl border border-border/60 bg-card/40 p-8',
                  'hover:border-accent/40 hover:bg-card/70 transition-all duration-300',
                  'hover:shadow-xl',
                  p.glow,
                )}
              >
                <div
                  className={cn(
                    'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
                    p.accent,
                  )}
                />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5 group-hover:bg-accent/15 transition-colors">
                    <Icon className="h-5 w-5 text-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Briefing teaser                                           */
/* ------------------------------------------------------------------ */
function BriefingSection() {
  return (
    <section className="border-t border-border/40 py-24">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium mb-3">
            Daily briefing
          </p>
          <h2 className="text-3xl font-bold text-foreground leading-tight mb-4">
            News, in the voice of you.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-md">
            We watch the topics that matter to you and deliver a 3-minute audio
            briefing that cites the parts of your Memory Web it touches. Steer
            it by voice anytime.
          </p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-accent" />
              Personalised from your interests and facts
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-accent" />
              Cites the memories it draws from
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-accent" />
              Voice-steerable: "More on X, less on Y"
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Radio className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Today's briefing
              </p>
              <p className="text-xs text-muted-foreground">
                3 interests, 45 memories, ~3 min
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            {['API and platform launches', 'Vertical vs horizontal SaaS', 'PLG motion updates'].map(
              (chip) => (
                <div
                  key={chip}
                  className="inline-flex items-center gap-1.5 mr-1.5 px-2.5 py-1 rounded-full bg-secondary/60 border border-border/60 text-[11px] text-foreground"
                >
                  <span className="text-muted-foreground">#</span>
                  {chip}
                </div>
              ),
            )}
          </div>

          {/* Fake waveform */}
          <div className="flex items-center gap-0.5 h-12 mb-4 px-1">
            {Array.from({ length: 48 }).map((_, i) => {
              const h = 30 + Math.abs(Math.sin(i * 0.6)) * 70;
              return (
                <motion.div
                  key={i}
                  className="flex-1 rounded-full bg-accent/40"
                  initial={{ height: '20%' }}
                  animate={{ height: `${h}%` }}
                  transition={{
                    duration: 0.6 + (i % 5) * 0.1,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    delay: i * 0.02,
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0:00</span>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
              <Mic className="h-3.5 w-3.5" />
              Steer
            </button>
            <span>3:14</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Privacy                                                   */
/* ------------------------------------------------------------------ */
function PrivacySection() {
  return (
    <section className="border-t border-border/40 py-24">
      <div className="max-w-5xl mx-auto px-8 text-center">
        <Lock className="h-6 w-6 text-accent mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground leading-tight mb-3">
          Your data stays yours.
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
          No Slack, no email, no calendar integrations. CTRL only knows what you
          tell it - and you can export, delete, or move it at any time.
        </p>
        <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground/80 flex-wrap">
          {TRUST.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-accent" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Final CTA                                                 */
/* ------------------------------------------------------------------ */
function FinalCTA({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="border-t border-border/40 py-24">
      <div className="max-w-3xl mx-auto px-8 text-center">
        <h2 className="text-4xl font-bold text-foreground leading-tight mb-4">
          Two minutes from voice to clarity.
        </h2>
        <p className="text-base text-muted-foreground mb-8">
          Free to start. No credit card. No integrations.
        </p>
        <Button
          onClick={onGetStarted}
          size="lg"
          className="h-14 px-10 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-2xl shadow-accent/30"
        >
          Get Started Free
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main desktop landing                                               */
/* ------------------------------------------------------------------ */
export function DesktopLanding() {
  const navigate = useNavigate();
  const handleGetStarted = () => navigate('/auth');
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);

  return (
    <div className="relative w-full overflow-x-hidden overflow-y-auto h-screen-safe scrollbar-hide bg-background text-foreground">
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-accent/[0.07] blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/[0.05] blur-3xl" />
      </div>

      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/mindmaker-favicon.png" alt="" className="h-6 w-6" />
            <CtrlLogo className="h-3.5 w-auto" />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#what" className="hover:text-foreground transition-colors">
              What you get
            </a>
            <a href="#briefing" className="hover:text-foreground transition-colors">
              Briefing
            </a>
            <a href="#privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </button>
            <Button
              onClick={handleGetStarted}
              size="sm"
              className="h-9 px-4 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero - asymmetric split */}
      <section className="relative z-10">
        <div className="max-w-7xl mx-auto px-8 pt-20 pb-28 grid grid-cols-12 gap-12 items-center">
          <motion.div
            style={{ opacity: heroOpacity, y: heroY }}
            className="col-span-7"
          >
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 mb-6"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Mindmaker
              </span>
              <span className="text-[11px] text-muted-foreground/50">·</span>
              <span className="text-[11px] text-muted-foreground">CTRL v1</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-[64px] leading-[1.04] font-bold tracking-tight text-foreground"
            >
              Your portable memory<br />
              for every{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-accent via-emerald-400 to-accent bg-clip-text text-transparent">
                  AI conversation
                </span>
              </span>{' '}
              and decision.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-lg text-muted-foreground mt-6 max-w-xl leading-relaxed"
            >
              Voice your thoughts. Watch them organise themselves into a living
              map of how you think. Export to any AI - ChatGPT, Claude, Cursor -
              in one click. No plugins. No permissions. Just you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex items-center gap-4 mt-8"
            >
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="h-12 px-6 text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl shadow-accent/20"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2 h-12 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Command className="h-3.5 w-3.5" />
                Sign in
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center gap-6 mt-8 text-xs text-muted-foreground/80"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-accent" />
                2 min to clarity
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-accent" />
                Export anywhere
              </span>
            </motion.div>

            {/* Flagged: landing voice/text demo - only mounts when flag is on */}
            {FF.landingVoiceDemo() && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                className="mt-8 max-w-lg"
              >
                <VoiceDemo />
              </motion.div>
            )}
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="col-span-5 flex justify-center"
          >
            <MemoryWebPreview />
          </motion.div>
        </div>

        {/* Export targets strip */}
        <div className="border-y border-border/40 bg-card/20">
          <div className="max-w-7xl mx-auto px-8 py-6 flex items-center gap-8 flex-wrap">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium flex items-center gap-2">
              <Download className="h-3 w-3" />
              One-click export to
            </p>
            <div className="flex items-center gap-8 flex-1">
              {TARGETS.map((t) => (
                <span
                  key={t}
                  className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div id="how">
        <FlowSection />
      </div>
      <div id="what">
        <PillarsSection />
      </div>
      <div id="briefing">
        <BriefingSection />
      </div>
      <div id="privacy">
        <PrivacySection />
      </div>
      <FinalCTA onGetStarted={handleGetStarted} />

      <footer className="border-t border-border/40 py-8">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between text-xs text-muted-foreground/60">
          <div className="flex items-center gap-2">
            <img src="/mindmaker-favicon.png" alt="" className="h-4 w-4 opacity-60" />
            <span>Mindmaker - CTRL</span>
          </div>
          <p>Self-contained. No Slack. No email. No calendar. Just your voice and your context.</p>
        </div>
      </footer>
    </div>
  );
}
